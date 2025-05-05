
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, ShieldCheck, CalendarDays, Loader2 } from 'lucide-react'; // Added CalendarDays
import { useAuthContext } from '@/components/providers/auth-provider';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AppHeader() {
  const { user, isLoading: isLoadingAuth } = useAuthContext();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isNavigatingLogin, setIsNavigatingLogin] = useState(false); // Separate state for login navigation
  const [isNavigatingAdmin, setIsNavigatingAdmin] = useState(false); // Separate state for admin navigation
  const router = useRouter();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      if (!auth) {
        throw new Error("Firebase Auth no está inicializado.");
      }
      await signOut(auth);
      toast({ title: "Sesión Cerrada", description: "Has cerrado sesión correctamente." });
      router.push('/'); // Redirect to home after logout
    } catch (error: any) {
      console.error("Fallo al cerrar sesión:", error);
      toast({ title: "Fallo al Cerrar Sesión", description: error.message || "No se pudo cerrar sesión.", variant: "destructive" });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm"> {/* Added styling */}
      <div className="container flex h-16 items-center justify-between px-4 md:px-8"> {/* Adjusted height and padding */}
        <Link href="/" className="flex items-center space-x-2 transition-transform hover:scale-105">
          <CalendarDays className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg text-foreground">BookDate</span>
        </Link>
        <div className="flex items-center space-x-2">
          {isLoadingAuth ? (
            <Button variant="ghost" size="sm" disabled>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Cargando...
            </Button>
          ) : user ? (
            <>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-foreground hover:text-primary hover:bg-primary/10" // Adjusted hover style
                onClick={() => setIsNavigatingAdmin(true)}
                disabled={isNavigatingAdmin}
              >
                <Link href="/admin">
                  {isNavigatingAdmin ? (
                     <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                     <ShieldCheck className="mr-1 h-4 w-4" />
                  )}
                   Panel Admin
                </Link>
              </Button>
              <Button
                variant="outline" // Changed to outline for distinction
                size="sm"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="border-destructive text-destructive hover:bg-destructive/10" // Destructive styling
              >
                {isLoggingOut ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="mr-1 h-4 w-4" />
                )}
                Cerrar Sesión
              </Button>
            </>
          ) : (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-foreground hover:text-primary hover:bg-primary/10" // Adjusted hover style
              onClick={() => setIsNavigatingLogin(true)}
              disabled={isNavigatingLogin}
            >
              <Link href="/login">
                {isNavigatingLogin ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="mr-1 h-4 w-4" />
                )}
                Login Admin
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
