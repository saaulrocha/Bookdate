
import type { Metadata } from 'next';
import Link from 'next/link'; // Import Link
import { Inter } from 'next/font/google'; // Changed to Inter for a clean look
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ReactQueryProvider } from '@/components/providers/query-provider'; // Import the provider
import { AuthProvider } from '@/components/providers/auth-provider'; // Import AuthProvider
import { AppHeader } from '@/components/app-header'; // Import the new AppHeader

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' }); // Use Inter font

export const metadata: Metadata = {
  title: 'BookDate - Reserva de Citas', // Updated title
  description: 'Reserva y gestiona tus citas fácilmente.', // Updated description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es"> {/* Set language to Spanish */}
      <body className={`${inter.variable} font-sans antialiased`}>
        <ReactQueryProvider> {/* Wrap with QueryClientProvider */}
          <AuthProvider> {/* Wrap with AuthProvider */}
            <div className="min-h-screen flex flex-col bg-gradient-to-br from-background to-secondary/30"> {/* Added gradient */}
              <AppHeader /> {/* Use the new header */}
              {/* Apply fade-in animation to the main content area */}
              <main className="flex-grow container mx-auto p-4 md:p-8 animate-fade-in" style={{ animation: 'fade-in 0.5s ease-out forwards' }}>
                {children}
              </main>
              <footer className="text-center p-4 text-muted-foreground text-sm">
                <span>Desarrollado por Saúl Rocha</span> {/* Translated footer */}
              </footer>
              <Toaster />
            </div>
          </AuthProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
