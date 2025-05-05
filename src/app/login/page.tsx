
"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, LogIn } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("test@example.com"); // Default test user email
  const [password, setPassword] = useState("password123"); // Default test user password
  const [isLoading, setIsLoading] = useState(false); // Loading state for the sign-in process
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true); // Start loading
    try {
      if (!auth) {
         throw new Error("Firebase Auth no está inicializado.");
      }
      // Attempt sign in
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Inicio de Sesión Exitoso",
        description: "Redirigiendo al panel de administración...",
      });
      router.push("/admin"); // Redirect to admin page on successful login
    } catch (error: any) {
      console.error("Fallo en inicio de sesión:", error);
      let errorMessage = "Fallo en inicio de sesión. Por favor, comprueba tus credenciales.";
       // Provide more specific error messages based on Firebase error codes
       if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
          errorMessage = "Correo electrónico o contraseña inválidos.";
       } else if (error.code === 'auth/invalid-email') {
         errorMessage = "Por favor, introduce una dirección de correo electrónico válida.";
       } else if (error.code === 'auth/api-key-not-valid') {
         errorMessage = "Clave API de Firebase inválida. Por favor, comprueba la configuración.";
       } else if (error.message) {
          errorMessage = error.message; // Use Firebase's message if available
       }

      toast({
        title: "Fallo en Inicio de Sesión",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false); // Stop loading regardless of success or failure
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
             <LogIn className="h-6 w-6 text-primary" /> Inicio de Sesión Admin
          </CardTitle>
          <CardDescription>
             Introduce tu correo y contraseña para acceder al panel de administración. (Test: test@example.com / password123)
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading} // Disable input while loading
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading} // Disable input while loading
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Iniciando Sesión...
                </>
              ) : (
                "Iniciar Sesión"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
