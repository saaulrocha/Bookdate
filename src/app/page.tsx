
"use client";

import * as React from "react";
import { useState, useMemo, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Import Input
import { Label } from "@/components/ui/label"; // Import Label
import { Clock, Calendar as CalendarIcon, Loader2, User, Mail } from "lucide-react";
import { format, startOfDay, parse } from "date-fns";
import { es } from 'date-fns/locale'; // Import Spanish locale
import { db } from "@/lib/firebase/config";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  Timestamp,
  doc,
  getDoc,
  orderBy,
  type DocumentData, // Import DocumentData
  type Query, // Import Query type
  onSnapshot // Import onSnapshot for real-time updates
} from "firebase/firestore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// Removed incorrect import: import { useFirestoreQuery } from "@tanstack/react-query-firebase";
import { useToast } from "@/hooks/use-toast";
import type { Appointment, Availability } from "@/types";
import { generateTimeSlots, getAvailableSlots, formatDisplayTime } from "@/lib/utils";
import { defaultWorkingHours, slotIntervalMinutes } from "@/types";

// Query keys
const APPOINTMENTS_QUERY_KEY_CLIENT = "clientAppointments"; // Use distinct keys if needed
const AVAILABILITY_QUERY_KEY_CLIENT = "clientAvailability";
const AVAILABLE_SLOTS_QUERY_KEY = "availableSlots"; // Keep this for the derived data
const APPOINTMENTS_QUERY_KEY = "appointments"; // Shared admin key
const AVAILABILITY_QUERY_KEY = "availability"; // Shared admin key

// --- Fetching Logic for Real-time Updates ---

// Fetch appointments for a specific date using onSnapshot for real-time updates
const useAppointmentsForDate = (date: Date | undefined) => {
  const queryClient = useQueryClient();
  const formattedDate = date ? format(date, "yyyy-MM-dd") : '';
  const queryKey = [APPOINTMENTS_QUERY_KEY_CLIENT, formattedDate];

  const { data, isLoading, error } = useQuery<Appointment[]>({
    queryKey: queryKey,
    queryFn: async () => {
      if (!date || !db) return []; // Return empty array if no date or db
      const startTimestamp = Timestamp.fromDate(startOfDay(date));
      const endTimestamp = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
      const endTs = Timestamp.fromDate(endTimestamp);
      const q = query(
        collection(db, "appointments"),
        where("date", ">=", startTimestamp),
        where("date", "<=", endTs)
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

    const startTimestamp = Timestamp.fromDate(startOfDay(date));
    const endTimestamp = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
    const endTs = Timestamp.fromDate(endTimestamp);
    const q = query(
      collection(db, "appointments"),
      where("date", ">=", startTimestamp),
      where("date", "<=", endTs)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const updatedAppointments = snapshot.docs.map(docSnapshot => ({
        id: docSnapshot.id,
        ...(docSnapshot.data() as Omit<Appointment, 'id'>)
      }));
      queryClient.setQueryData(queryKey, updatedAppointments);
      // Invalidate derived slots query when appointments change
      queryClient.invalidateQueries({ queryKey: [AVAILABLE_SLOTS_QUERY_KEY, formattedDate] });
    }, (err) => {
      console.error("Error escuchando actualizaciones de citas:", err);
      // Optionally handle the error, e.g., set an error state
    });

    // Cleanup subscription on component unmount or date change
    return () => unsubscribe();
  }, [date, queryClient, formattedDate, queryKey]); // Add queryKey to dependencies

  return { appointments: data ?? [], isLoadingAppointments: isLoading, appointmentsError: error };
};

// Define the Firestore query for availability for the selected date
const useAvailabilityForDate = (date: Date | undefined) => {
   const queryClient = useQueryClient();
   const dateStr = date ? format(date, "yyyy-MM-dd") : "";
   const queryKey = [AVAILABILITY_QUERY_KEY_CLIENT, dateStr];
   const docRef = useMemo(() => db && dateStr ? doc(db, "availability", dateStr) : null, [dateStr]);

   const { data, isLoading, error, refetch } = useQuery<Availability | null>({
        queryKey: queryKey,
        queryFn: async () => {
            if (!docRef) return null;
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Availability : null;
        },
        enabled: !!docRef,
        staleTime: 5 * 60 * 1000, // Consider how often availability might change
    });

    // Listen for changes triggered by admin actions (via invalidation)
    useEffect(() => {
        if (dateStr) {
            // Use queryClient's subscription or refetching mechanisms.
            // Refetch when the query becomes stale or is invalidated.
            refetch();
        }
    }, [dateStr, refetch, queryClient]); // Ensure dependencies are correct

    return { availability: data, isLoadingAvailability: isLoading, availabilityError: error };
};

// --- Booking Mutation ---
const bookAppointment = async (appointmentData: Omit<Appointment, 'id' | 'createdAt'>): Promise<void> => {
    if (!db) throw new Error("Base de datos no inicializada");
    const finalData = {
        ...appointmentData,
        createdAt: Timestamp.now()
    };
   await addDoc(collection(db, "appointments"), finalData);
   // TODO: Implement email confirmation sending
   console.log("Simulando envío de correo de confirmación a:", appointmentData.clientEmail);
};

export default function Home() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(startOfDay(new Date()));
  const [selectedSlot, setSelectedSlot] = useState<string | undefined>();
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const formattedDate = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
  const displayDate = selectedDate ? format(selectedDate, "PPP", { locale: es }) : ""; // Formatted date for display

  // --- Use Real-time Data Hooks ---
  const { appointments, isLoadingAppointments, appointmentsError } = useAppointmentsForDate(selectedDate);
  const { availability, isLoadingAvailability, availabilityError } = useAvailabilityForDate(selectedDate);


  // --- Calculate Available Slots (Derived State) ---
  // Use queryKey that depends on the data length/content if possible, or just the date
   const { data: availableSlots = [], isLoading: isLoadingSlotsCalculated, error: slotsCalculationError } = useQuery<string[]>({
      queryKey: [AVAILABLE_SLOTS_QUERY_KEY, formattedDate], // Re-run when this key is invalidated
      queryFn: () => {
          console.log("Recalculando huecos para:", formattedDate); // Debug log
          // Generate all possible slots for the day
          const allSlots = generateTimeSlots(slotIntervalMinutes, {
              start: defaultWorkingHours.start,
              end: defaultWorkingHours.end
          });
          // Filter based on the fetched real-time data (already updated in query cache)
          const currentAppointments = queryClient.getQueryData<Appointment[]>([APPOINTMENTS_QUERY_KEY_CLIENT, formattedDate]) || [];
          const currentAvailability = queryClient.getQueryData<Availability | null>([AVAILABILITY_QUERY_KEY_CLIENT, formattedDate]);
          return getAvailableSlots(allSlots, currentAppointments, currentAvailability || undefined);
      },
      enabled: !!selectedDate && !isLoadingAppointments && !isLoadingAvailability, // Run only when date selected and data loaded
      // staleTime: 0, // Recalculate whenever invalidated
   });

   const isLoadingSlots = isLoadingAppointments || isLoadingAvailability || (!!selectedDate && isLoadingSlotsCalculated);
   const slotsError = appointmentsError || availabilityError || slotsCalculationError;

  // --- Booking Mutation ---
  const bookingMutation = useMutation({
     mutationFn: bookAppointment,
     onSuccess: (_, variables) => {
       // Invalidation will trigger the real-time listener to update the appointment list,
       // and the availableSlots query to refetch.
       queryClient.invalidateQueries({ queryKey: [APPOINTMENTS_QUERY_KEY_CLIENT, formattedDate] });
       queryClient.invalidateQueries({ queryKey: [AVAILABILITY_QUERY_KEY_CLIENT, formattedDate] });
       // Invalidate slots directly for immediate feedback if needed, though appointment invalidation should trigger it
       queryClient.invalidateQueries({ queryKey: [AVAILABLE_SLOTS_QUERY_KEY, formattedDate] });

       // Invalidate admin queries as well
       queryClient.invalidateQueries({ queryKey: [APPOINTMENTS_QUERY_KEY, formattedDate] });
       queryClient.invalidateQueries({ queryKey: [AVAILABILITY_QUERY_KEY, formattedDate] });

       toast({
         title: "¡Reserva Confirmada!",
         description: `Tu cita para el ${format(variables.date.toDate(), "PPP", { locale: es })} a las ${formatDisplayTime(variables.time)} está reservada.`,
       });
       // Reset form state
       setSelectedSlot(undefined);
       setClientName("");
       setClientEmail("");
     },
     onError: (error: any) => {
       toast({
         title: "Fallo en la Reserva",
         description: error.message || "No se pudo reservar la cita. Por favor, inténtalo de nuevo.",
         variant: "destructive",
       });
     },
   });

  // --- Event Handlers ---
  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date ? startOfDay(date) : undefined);
    setSelectedSlot(undefined); // Reset selected slot when date changes
  };

  const handleSlotSelect = (slot: string) => {
    setSelectedSlot(slot);
  };

  const handleBooking = (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission
    if (selectedDate && selectedSlot && clientName && clientEmail) {
      if (!/\S+@\S+\.\S+/.test(clientEmail)) {
           toast({ title: "Email Inválido", description: "Por favor, introduce una dirección de correo electrónico válida.", variant: "destructive" });
           return;
      }

       const appointmentData: Omit<Appointment, 'id' | 'createdAt'> = {
           clientName,
           clientEmail,
           date: Timestamp.fromDate(selectedDate),
           time: selectedSlot,
       };
       bookingMutation.mutate(appointmentData);

    } else {
      if (!selectedDate) toast({ title: "Información Incompleta", description: "Por favor, selecciona una fecha.", variant: "destructive" });
      else if (!selectedSlot) toast({ title: "Información Incompleta", description: "Por favor, selecciona un hueco horario.", variant: "destructive" });
      else if (!clientName) toast({ title: "Información Incompleta", description: "Por favor, introduce tu nombre.", variant: "destructive" });
      else if (!clientEmail) toast({ title: "Información Incompleta", description: "Por favor, introduce tu correo electrónico.", variant: "destructive" });
    }
  };

    // Handle potential errors from data fetching
    useEffect(() => {
      if (slotsError) {
        console.error("Error cargando datos del horario:", slotsError);
        // Display a general error message for slots
         toast({ title: "Error", description: "No se pudieron cargar los huecos horarios disponibles.", variant: "destructive" });
      }
       // Separate checks for specific data fetching errors if needed
       if (appointmentsError) {
          console.error("Error obteniendo citas:", appointmentsError);
          // toast({ title: "Error", description: "Could not load appointments.", variant: "destructive" });
       }
        if (availabilityError) {
            console.error("Error obteniendo disponibilidad:", availabilityError);
            // toast({ title: "Error", description: "Could not load availability.", variant: "destructive" });
        }
    }, [slotsError, appointmentsError, availabilityError, toast]);


  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* Date Selection */}
      <Card className="md:col-span-1 shadow-md rounded-lg transition-all duration-300 hover:shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Selecciona Fecha
          </CardTitle>
          <CardDescription>Elige una fecha disponible para tu cita.</CardDescription>
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

       {/* Time Slot Selection & Booking Form */}
       <Card className="md:col-span-2 shadow-md rounded-lg transition-all duration-300 hover:shadow-lg">
         <CardHeader>
           <CardTitle className="flex items-center gap-2">
             <Clock className="h-5 w-5 text-primary" />
             Huecos Disponibles {selectedDate ? `para el ${displayDate}` : ""}
           </CardTitle>
           <CardDescription>
             {selectedDate ? "Selecciona un hueco horario abajo para continuar." : "Por favor, selecciona una fecha primero."}
           </CardDescription>
         </CardHeader>
         <CardContent>
           {isLoadingSlots && (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Cargando huecos...</span>
              </div>
           )}
           {!isLoadingSlots && selectedDate && (
             availableSlots.length > 0 ? (
               <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                 {availableSlots.map((slot) => (
                   <Button
                     key={slot}
                     variant={selectedSlot === slot ? "default" : "outline"}
                     onClick={() => handleSlotSelect(slot)}
                     className={`transition-all duration-200 ${selectedSlot === slot ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2' : 'hover:bg-secondary hover:text-secondary-foreground'}`} // Adjusted hover color
                     disabled={bookingMutation.isPending} // Disable slots during booking
                   >
                     {formatDisplayTime(slot)} {/* Display formatted time */}
                   </Button>
                 ))}
               </div>
             ) : (
               <p className="text-muted-foreground text-center py-4">
                 {slotsError ? `Error cargando huecos. Por favor, inténtalo más tarde.` : "No hay huecos disponibles para esta fecha."}
                </p>
             )
           )}
           {!isLoadingSlots && !selectedDate && (
             <p className="text-muted-foreground text-center py-4">Selecciona una fecha para ver los horarios disponibles.</p>
           )}

           {/* Booking Form - Shown when a slot is selected */}
           {selectedDate && selectedSlot && (
             <form onSubmit={handleBooking} className="mt-6 border-t pt-6 space-y-4">
                <h3 className="text-lg font-semibold text-center mb-4">
                    Confirmar Detalles de la Reserva
                </h3>
                <p className="text-center text-muted-foreground mb-4">
                    Estás reservando para el <span className="font-semibold text-foreground">{displayDate}</span> a las <span className="font-semibold text-foreground">{formatDisplayTime(selectedSlot)}</span>.
                 </p>

                 {/* Name Input */}
                 <div className="space-y-2">
                    <Label htmlFor="clientName" className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" /> Nombre
                    </Label>
                    <Input
                      id="clientName"
                      type="text"
                      placeholder="Tu Nombre Completo"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      required
                      className="w-full"
                      disabled={bookingMutation.isPending}
                    />
                 </div>

                 {/* Email Input */}
                 <div className="space-y-2">
                    <Label htmlFor="clientEmail" className="flex items-center gap-2">
                         <Mail className="h-4 w-4 text-muted-foreground" /> Correo Electrónico
                    </Label>
                    <Input
                      id="clientEmail"
                      type="email"
                      placeholder="tu.correo@ejemplo.com"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      required
                      className="w-full"
                       disabled={bookingMutation.isPending}
                    />
                 </div>

                 {/* Submit Button */}
                 <div className="text-center pt-2">
                   <Button
                     type="submit"
                     className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90 transition-colors duration-200"
                     disabled={bookingMutation.isPending || !clientName || !clientEmail}
                   >
                      {bookingMutation.isPending ? (
                       <>
                         <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Reservando...
                       </>
                     ) : (
                        "Confirmar Reserva"
                     )}
                   </Button>
                 </div>
             </form>
           )}
         </CardContent>
       </Card>
    </div>
  );
}
