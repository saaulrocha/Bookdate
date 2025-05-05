
"use client";

import * as React from "react";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth, db, hasRequiredConfig } from "@/lib/firebase/config"; // Import auth and hasRequiredConfig
import { useAuth } from "@/hooks/use-auth"; // Import useAuth hook
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, XCircle, Loader2, LogOut } from "lucide-react";
import { format, startOfDay, parse, setHours, setMinutes } from "date-fns";
import { es } from 'date-fns/locale'; // Import Spanish locale
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  Timestamp,
  orderBy,
  setDoc,
  getDoc,
  type Query, // Import Query type
  onSnapshot // Import onSnapshot
} from "firebase/firestore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Appointment, Availability } from "@/types";
import { generateTimeSlots, formatDisplayTime } from "@/lib/utils";
import { defaultWorkingHours, slotIntervalMinutes } from "@/types";

// Define query keys
const APPOINTMENTS_QUERY_KEY = "appointments";
const AVAILABILITY_QUERY_KEY = "availability";
const APPOINTMENTS_QUERY_KEY_CLIENT = "clientAppointments"; // Client view key
const AVAILABILITY_QUERY_KEY_CLIENT = "clientAvailability"; // Client view key
const AVAILABLE_SLOTS_QUERY_KEY = "availableSlots"; // Client view slots


// ---- Fetching Logic (Real-time for Appointments, Query for Availability) ----

// Fetch appointments using onSnapshot within useQuery
const useAppointmentsRealtime = (date: Date | undefined) => {
  const queryClient = useQueryClient();
  const formattedDate = date ? format(date, "yyyy-MM-dd") : '';
  const queryKey = [APPOINTMENTS_QUERY_KEY, formattedDate];

  const { data, isLoading, error } = useQuery<Appointment[]>({
    queryKey: queryKey,
    queryFn: async () => {
      // Initial fetch
      if (!date || !db) return [];
      const start = Timestamp.fromDate(startOfDay(date));
      const end = Timestamp.fromDate(setMinutes(setHours(startOfDay(date), 23), 59));
      const q = query(
        collection(db, "appointments"),
        where("date", ">=", start),
        where("date", "<=", end),
        orderBy("date"),
        orderBy("time")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(docSnapshot => ({
        id: docSnapshot.id,
        ...(docSnapshot.data() as Omit<Appointment, 'id'>)
      }));
    },
    enabled: !!date && !!db,
    staleTime: Infinity, // Data is kept fresh by the subscription
  });

  useEffect(() => {
    if (!date || !db) return;

    const start = Timestamp.fromDate(startOfDay(date));
    const end = Timestamp.fromDate(setMinutes(setHours(startOfDay(date), 23), 59));
    const q = query(
      collection(db, "appointments"),
      where("date", ">=", start),
      where("date", "<=", end),
      orderBy("date"),
      orderBy("time")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const updatedAppointments = snapshot.docs.map(docSnapshot => ({
        id: docSnapshot.id,
        ...(docSnapshot.data() as Omit<Appointment, 'id'>)
      }));
      // Update the query cache which triggers re-render
      queryClient.setQueryData(queryKey, updatedAppointments);
       // Invalidate client slots when admin sees appointment changes
      queryClient.invalidateQueries({ queryKey: [AVAILABLE_SLOTS_QUERY_KEY, formattedDate] });
      // Also directly update client appointment view if needed, though invalidation might suffice
      queryClient.invalidateQueries({ queryKey: [APPOINTMENTS_QUERY_KEY_CLIENT, formattedDate] });
    }, (err) => {
      console.error("Error escuchando actualizaciones de citas:", err);
      // Handle error appropriately
    });

    // Cleanup subscription on unmount or when dependencies change
    return () => unsubscribe();
  }, [date, queryClient, formattedDate, queryKey]); // Add queryKey

  return { appointments: data ?? [], isLoadingAppointments: isLoading, appointmentsError: error };
};


// Fetch availability for a specific date (not real-time, uses invalidation)
const fetchAvailability = async (dateStr: string): Promise<Availability | null> => {
    if (!db) return null; // Handle case where db might not be initialized
    const docRef = doc(db, "availability", dateStr);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Availability;
    }
    return null; // Return null if no specific availability doc exists for the date
};


export default function AdminPage() {
  const { user, isLoading: isLoadingAuth } = useAuth(); // Use the auth hook
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(startOfDay(new Date()));
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);


   // Use state for working hours, load/save from/to Firestore if needed
   const [workingHours, setWorkingHours] = useState({ start: "09:00", end: "17:00" }); // Keep as simple state for now

  const formattedDate = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
  const displayDate = selectedDate ? format(selectedDate, "PPP", { locale: es }) : ""; // Formatted date for display

   // Redirect if not logged in
   useEffect(() => {
    if (!isLoadingAuth && !user) {
      router.push("/login"); // Redirect to login page if not authenticated
    }
  }, [user, isLoadingAuth, router]);


  // --- React Query Hooks ---

   // Use the real-time hook for appointments
   const { appointments, isLoadingAppointments, appointmentsError } = useAppointmentsRealtime(selectedDate);


  const { data: availability, isLoading: isLoadingAvailability, error: availabilityError } = useQuery<Availability | null>({
    queryKey: [AVAILABILITY_QUERY_KEY, formattedDate],
    queryFn: () => fetchAvailability(formattedDate),
    enabled: !!selectedDate && !!user && !!db, // Ensure db is available
  });

  // Handle potential errors
  useEffect(() => {
    if (appointmentsError) {
      console.error("Error obteniendo citas:", appointmentsError);
      toast({ title: "Error", description: "No se pudieron cargar las citas.", variant: "destructive" });
    }
     if (availabilityError) {
      console.error("Error obteniendo disponibilidad:", availabilityError);
      toast({ title: "Error", description: "No se pudo cargar la disponibilidad.", variant: "destructive" });
    }
  }, [appointmentsError, availabilityError, toast]);


  // --- Mutations ---
  const cancelAppointmentMutation = useMutation({
    mutationFn: async (id: string) => {
       if (!db) throw new Error("Base de datos no inicializada");
       console.log("Intentando cancelar cita con ID:", id); // Keep this log for debugging deletion attempts
       // TODO: Implement email notification logic here before deleting
       console.log(`Simulando notificación para cancelación de cita ${id}`);
       await deleteDoc(doc(db, "appointments", id));
       console.log("Cita cancelada con éxito en Firestore (ID):", id); // Success log
    },
    onSuccess: (_, id) => {
      console.log(`Mutation onSuccess para ID: ${id}`); // Debug log
      // Invalidation triggers the real-time listener update & derived queries
      // The listener itself calls queryClient.setQueryData, updating the UI
      queryClient.invalidateQueries({ queryKey: [APPOINTMENTS_QUERY_KEY, formattedDate] });
      // Invalidate client-side queries too
      queryClient.invalidateQueries({ queryKey: [APPOINTMENTS_QUERY_KEY_CLIENT, formattedDate] });
      queryClient.invalidateQueries({ queryKey: [AVAILABLE_SLOTS_QUERY_KEY, formattedDate] });
      queryClient.invalidateQueries({ queryKey: [AVAILABILITY_QUERY_KEY_CLIENT, formattedDate] });

      toast({
        title: "Cita Cancelada",
        description: `Se canceló la cita con éxito.`,
      });
    },
    onError: (error: any, id) => {
       // Log the full error object for better debugging
       console.error(`Error detallado al cancelar cita ID: ${id}`, error);
       toast({
        title: "Error Cancelando Cita",
        // Check for specific Firebase permission errors if possible
        description: error?.code === 'permission-denied'
          ? `Permiso denegado. Verifica los permisos de Firestore.`
          : error?.message || `Fallo al cancelar la cita.`,
        variant: "destructive",
      });
    },
  });

  const updateAvailabilityMutation = useMutation({
    mutationFn: async ({ dateStr, updatedBlockedTimes }: { dateStr: string; updatedBlockedTimes: string[] }) => {
      if (!db) throw new Error("Base de datos no inicializada");
      const docRef = doc(db, "availability", dateStr);
      await setDoc(docRef, { blockedTimes: updatedBlockedTimes }, { merge: true }); // Use setDoc with merge to create or update
    },
    onSuccess: (_, variables) => {
      // Invalidate both admin and client availability queries
      queryClient.invalidateQueries({ queryKey: [AVAILABILITY_QUERY_KEY, variables.dateStr] });
      queryClient.invalidateQueries({ queryKey: [AVAILABILITY_QUERY_KEY_CLIENT, variables.dateStr] });
       // Invalidate slots query on client side
      queryClient.invalidateQueries({ queryKey: [AVAILABLE_SLOTS_QUERY_KEY, variables.dateStr] });
       // No need to invalidate appointments here unless availability affects them directly

      toast({
        title: "Disponibilidad Actualizada",
        description: `Disponibilidad para ${variables.dateStr} actualizada.`,
      });
    },
    onError: (error: any, variables) => {
      console.error(`Error actualizando disponibilidad para ${variables.dateStr}`, error);
      toast({
        title: "Error Actualizando Disponibilidad",
        description: error.message || `Fallo al actualizar la disponibilidad para ${variables.dateStr}.`,
        variant: "destructive",
      });
    },
  });


  // --- Event Handlers ---
  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date ? startOfDay(date) : undefined);
  };

  const handleCancelAppointment = (id: string | undefined) => {
    // Extra check for ID validity before confirming/mutating
    if (!id) {
      console.error("Intento de cancelar cita sin ID válido.");
      toast({
        title: "Error",
        description: "No se puede cancelar la cita porque falta el ID.",
        variant: "destructive",
      });
      return;
    }

    // Use window.confirm for simplicity, consider a modal dialog for better UX
    if (window.confirm(`¿Estás seguro de que quieres cancelar esta cita (ID: ${id})?`)) {
       console.log("Confirmación aceptada, mutando cancelación para ID:", id);
       // Pass the confirmed ID to the mutation
       cancelAppointmentMutation.mutate(id);
    } else {
       console.log("Confirmación de cancelación rechazada para ID:", id);
    }
  };

 const handleBlockTime = (time: string) => {
    if (!selectedDate) return;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const currentBlockedTimes = availability?.blockedTimes || [];
    const updatedBlockedTimes = [...currentBlockedTimes, time].sort();
    updateAvailabilityMutation.mutate({ dateStr, updatedBlockedTimes });
  };

  const handleUnblockTime = (time: string) => {
    if (!selectedDate) return;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const currentBlockedTimes = availability?.blockedTimes || [];
    const updatedBlockedTimes = currentBlockedTimes.filter(t => t !== time);
    updateAvailabilityMutation.mutate({ dateStr, updatedBlockedTimes });
  };

  const handleLogout = async () => {
     setIsLoggingOut(true);
     try {
       if (!auth) {
         throw new Error("Firebase Auth no está inicializado.");
       }
       await signOut(auth);
       toast({ title: "Sesión Cerrada", description: "Has cerrado sesión correctamente." });
       // The useEffect hook will handle the redirect to /login
     } catch (error: any) {
       console.error("Fallo al cerrar sesión:", error);
       toast({ title: "Fallo al Cerrar Sesión", description: error.message || "No se pudo cerrar sesión.", variant: "destructive" });
       setIsLoggingOut(false);
     }
   };


  // --- Derived State ---
  const timeSlots = useMemo(() => {
     // Generate slots based on current working hours state (could be loaded from settings)
    const startHour = parseInt(workingHours.start.split(':')[0], 10);
    const endHour = parseInt(workingHours.end.split(':')[0], 10);
    return generateTimeSlots(slotIntervalMinutes, { start: startHour, end: endHour });
  }, [workingHours]);

  const blockedTimesSet = useMemo(() => new Set(availability?.blockedTimes || []), [availability]);
  // appointments data is now managed by the real-time hook and updates automatically
  const bookedTimesSet = useMemo(() => new Set(appointments.map(app => app.time)), [appointments]);


  const isLoading = isLoadingAuth || isLoadingAppointments || isLoadingAvailability; // Consider auth loading too

   // Show loading state or redirect message while checking auth or data
   if (isLoadingAuth || !user || (!db && hasRequiredConfig)) { // Check if db init might be pending
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <span className="ml-4 text-xl text-muted-foreground">
           {isLoadingAuth || !user ? "Verificando acceso..." : "Conectando a la base de datos..."}
        </span>
      </div>
    );
  }


  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-foreground">Panel de Administración</h1>
         <Button variant="outline" onClick={handleLogout} disabled={isLoggingOut}>
           {isLoggingOut ? (
             <>
               <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cerrando Sesión...
             </>
           ) : (
             <>
                <LogOut className="mr-2 h-4 w-4" /> Cerrar Sesión ({user.email})
             </>
           )}
         </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Calendar View */}
        <Card className="lg:col-span-1 shadow-md rounded-lg">
          <CardHeader>
            <CardTitle>Vista de Calendario</CardTitle>
            <CardDescription>Selecciona una fecha para gestionar el horario.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              className="rounded-md border"
              disabled={(day) => day < startOfDay(new Date())} // Disable past dates
              locale={es} // Set calendar locale to Spanish
            />
          </CardContent>
        </Card>

        {/* Appointments & Availability */}
        <Card className="lg:col-span-2 shadow-md rounded-lg">
          <CardHeader>
            <CardTitle>Gestionar {selectedDate ? displayDate : "Horario"}</CardTitle>
             <CardDescription>
               {selectedDate
                 ? "Ver citas y gestionar huecos horarios disponibles."
                 : "Selecciona una fecha para ver el horario."}
             </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {(isLoadingAppointments || isLoadingAvailability) && ( // Show loader if either is loading
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Cargando horario...</span>
              </div>
            )}
             {!isLoadingAppointments && !isLoadingAvailability && selectedDate && ( // Only render content when both have loaded
              <>
                {/* Appointments List */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Citas</h3>
                  {appointments.length > 0 ? (
                    <ul className="space-y-2">
                      {/* IMPORTANT: Do not put console.log inside the render path of map */}
                      {/* Use React DevTools or conditional logging outside if needed */}
                      {appointments.map(app => (
                          <li key={app.id} className="flex justify-between items-center p-3 bg-secondary rounded-md">
                            <div>
                              <span className="font-medium">{formatDisplayTime(app.time)}</span> - {app.clientName} ({app.clientEmail})
                              <span className="text-xs text-muted-foreground ml-2">(ID: {app.id})</span> {/* Display ID helps debugging */}
                            </div>
                             {/* Use a closure to ensure the correct app.id is passed */}
                             <Button
                               variant="ghost"
                               size="sm"
                               className="text-destructive hover:bg-destructive/10"
                               onClick={() => handleCancelAppointment(app.id)}
                               disabled={cancelAppointmentMutation.isPending && cancelAppointmentMutation.variables === app.id}
                             >
                               {cancelAppointmentMutation.isPending && cancelAppointmentMutation.variables === app.id ? (
                                 <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                               ) : (
                                 <XCircle className="h-4 w-4 mr-1" />
                               )}
                               Cancelar
                             </Button>
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground text-sm">No hay citas programadas para esta fecha.</p>
                  )}
                </div>

                {/* Availability Management */}
                 <div>
                   <h3 className="text-lg font-semibold mb-2">Gestionar Disponibilidad</h3>
                   <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                     {timeSlots.map(slot => {
                       const isBlocked = blockedTimesSet.has(slot);
                       const isBooked = bookedTimesSet.has(slot);
                       // Disable if booked, or currently blocking/unblocking *this specific* slot
                      const isMutatingThisSlot = updateAvailabilityMutation.isPending && (
                          (isBlocked && !updateAvailabilityMutation.variables?.updatedBlockedTimes.includes(slot)) || // Currently unblocking this slot
                          (!isBlocked && updateAvailabilityMutation.variables?.updatedBlockedTimes.includes(slot)) // Currently blocking this slot
                      );
                       const isDisabled = isBooked || isMutatingThisSlot;


                       return (
                         <div key={slot} className="flex items-center space-x-2">
                           <Button
                             variant={isBlocked ? "destructive" : "outline"}
                             size="sm"
                             onClick={() => isBlocked ? handleUnblockTime(slot) : handleBlockTime(slot)}
                             disabled={isDisabled}
                             className={`w-full text-xs transition-colors duration-150 ${
                                isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                              } ${isBlocked ? 'bg-destructive/80 hover:bg-destructive/90 text-destructive-foreground' : 'hover:bg-secondary hover:text-secondary-foreground'}`} // Adjusted hover color
                           >
                             {formatDisplayTime(slot)}{" "}
                             {isBlocked ? "(Bloqueado)" : isBooked ? "(Reservado)" : "(Disponible)"}
                              {isMutatingThisSlot && (
                                 <Loader2 className="h-3 w-3 ml-1 animate-spin" />
                               )}
                           </Button>
                         </div>
                       );
                     })}
                   </div>
                 </div>
              </>
            )}
            {!isLoadingAppointments && !isLoadingAvailability && !selectedDate && ( // Show placeholder if no date selected and not loading
               <p className="text-muted-foreground text-sm text-center py-8">Por favor, selecciona una fecha del calendario.</p>
            )}
          </CardContent>
        </Card>
      </div>

       {/* Settings - Placeholder - Future: Load/Save from Firestore */}
       <Card className="shadow-md rounded-lg">
         <CardHeader>
           <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5 text-primary"/> Ajustes</CardTitle>
           <CardDescription>Gestionar horario laboral por defecto (Aún no se guarda).</CardDescription>
         </CardHeader>
         <CardContent className="space-y-4">
            {/* Basic Working Hours Example */}
            <div className="grid grid-cols-2 gap-4 max-w-md">
              <div>
                <Label htmlFor="start-time">Inicio Horario Laboral</Label>
                <Input id="start-time" type="time" value={workingHours.start} step={slotIntervalMinutes * 60} onChange={e => setWorkingHours(prev => ({ ...prev, start: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="end-time">Fin Horario Laboral</Label>
                <Input id="end-time" type="time" value={workingHours.end} step={slotIntervalMinutes * 60} onChange={e => setWorkingHours(prev => ({ ...prev, end: e.target.value }))} />
              </div>
            </div>
            {/* <Button className="bg-accent text-accent-foreground hover:bg-accent/90">Guardar Ajustes</Button> */}
            <p className="text-sm text-muted-foreground">La funcionalidad de guardar ajustes se añadirá más adelante.</p>
         </CardContent>
       </Card>
    </div>
  );
}
