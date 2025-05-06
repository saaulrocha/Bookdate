# BookDate - Aplicación de Reserva de Citas

Este es un proyecto de inicio de Next.js creado por Saúl Rocha. BookDate permite a los clientes reservar citas y a los administradores gestionar la disponibilidad y las reservas.

## Cómo Empezar

Para iniciar el entorno de desarrollo, sigue estos pasos:

1.  **Instalar dependencias:**
    ```bash
    npm install
    ```
2.  **Configurar variables de entorno:**
    Crea un archivo `.env.local` en la raíz del proyecto y añade tus credenciales de Firebase:
    ```plaintext
    NEXT_PUBLIC_FIREBASE_API_KEY="TU_API_KEY"
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="TU_AUTH_DOMAIN"
    NEXT_PUBLIC_FIREBASE_PROJECT_ID="TU_PROJECT_ID"
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="TU_STORAGE_BUCKET"
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="TU_MESSAGING_SENDER_ID"
    NEXT_PUBLIC_FIREBASE_APP_ID="TU_APP_ID"
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="TU_MEASUREMENT_ID" # Opcional

3.  **Ejecutar la aplicación de desarrollo:**
    ```bash
    npm run dev
    ```
    Esto iniciará la aplicación Next.js en `http://localhost:9002` (o el puerto configurado).
    ```

## Estructura del Proyecto

-   **`src/app/`**: Contiene las rutas principales de la aplicación utilizando el App Router de Next.js.
    -   `page.tsx`: La vista principal para que los clientes reserven citas.
    -   `admin/page.tsx`: El panel de administración para gestionar citas y disponibilidad.
    -   `login/page.tsx`: La página de inicio de sesión para administradores.
    -   `layout.tsx`: El layout principal de la aplicación.
    -   `globals.css`: Estilos globales y variables de tema CSS (Tailwind/ShadCN).
-   **`src/components/`**: Componentes reutilizables de React.
    -   `ui/`: Componentes de ShadCN UI.
    -   `providers/`: Proveedores de contexto (Autenticación, React Query).
    -   `app-header.tsx`: El componente de cabecera de la aplicación.
-   **`src/lib/`**: Utilidades y configuraciones.
    -   `firebase/config.ts`: Configuración e inicialización de Firebase.
    -   `utils.ts`: Funciones de utilidad (manipulación de fechas, slots, etc.).
-   **`src/hooks/`**: Hooks personalizados de React.
    -   `use-auth.ts`: Hook para gestionar el estado de autenticación de Firebase.
    -   `use-toast.ts`: Hook para mostrar notificaciones (toasts).
-   **`src/ai/`**: Código relacionado con GenAI (Genkit).
    -   `ai-instance.ts`: Instancia y configuración de Genkit.
    -   `flows/`: Flujos de Genkit (si los hay).
-   **`src/types/`**: Definiciones de tipos TypeScript.
-   **`docs/`**: Documentación del proyecto.
    -   `blueprint.md`: Descripción general de la aplicación y guías de estilo.
    -   `firestore-schema.md`: Esquema de la base de datos Firestore.
-   **`public/`**: Archivos estáticos.

## Funcionalidades Principales

-   **Interfaz de Calendario:** Permite a los clientes ver los huecos disponibles y a los administradores gestionar las citas.
-   **Gestión de Citas:** Los clientes pueden reservar, cancelar o reprogramar. Los administradores gestionan horarios y bloqueos.
-   **Notificaciones por Email:** (TODO) Automatización de correos para confirmaciones, recordatorios y cancelaciones.
-   **Autenticación de Admin:** Página de login segura para acceder al panel de administración.

## Tecnologías Utilizadas

-   Next.js (App Router)
-   React
-   TypeScript
-   Firebase (Authentication, Firestore)
-   Tailwind CSS
-   ShadCN UI
-   React Query (para gestión del estado del servidor)
-   date-fns (para manipulación de fechas)
-   Lucide React (iconos)

## Próximos Pasos / Mejoras

-   Impleementar el envío real de notificaciones por email.
-   Guardar la configuración del horario laboral del admin en Firestore.
-   Añadir pruebas unitarias e integrales.
-   Mejorar la accesibilidad (ARIA).
-   Optimizar el rendimiento y la carga de datos.
****
