# MacroTools Project Context

## Overview
MacroTools es una aplicación diseñada para la gestión de Recursos Humanos (RRHH) y logística. Aunque se puede compilar para escritorio con **Electron 38**, su arquitectura está optimizada para ser una **Aplicación Web** robusta usando **Angular 20**.

- **Project Name:** MacroTools / Fluxenture
- **Build ID:** com.fluxenture.app
- **Web Priority:** Optimizado para despliegue en `fluxenture.web.app`.

## Architecture

### 1. Frontend (Renderer Process / Web)
Ubicado en `projects/macrotool/`.
- **Framework:** Angular 20.
- **Estado:** Uso intensivo de **Angular Signals** (`signal`, `computed`, `effect`) para un flujo de datos reactivo y eficiente.
- **UI:** Angular Material 20.2 con estilos SCSS personalizados.
- **Servicios Clave:**
    - `AbsentService`: Gestión de inasistencias y reportes mensuales.
    - `EmployeeService`: Gestión centralizada de empleados con refresco automático.
    - `ElectronService`: Capa de abstracción para comunicación IPC (opcional).
- **Herramientas PDF:** Generación dinámica en el cliente usando `jspdf` y `html2pdf.js`.

### 2. Desktop Wrapper (Electron - Opcional)
Ubicado en `electron/`.
- **Entry Point:** `electron/main.ts`.
- **Configuración:** `nodeIntegration: true`, `contextIsolation: false`, `webSecurity: false` (para facilitar el scraping de servicios de tracking).
- **Servicios:** `FsService` y `EventService` para interactuar con el sistema de archivos si se corre localmente.

## Backend Integration
- **API:** Spring Boot 3 con arquitectura hexagonal.
- **Almacenamiento:** Integración directa con Google Drive.
- **Endpoints:** 
    - `/absents`: Gestión de inasistencias.
    - `/employees`: Gestión de personal.
    - `/storage`: Proxy para subida/descarga de archivos en la nube.

## Key Features
- **Track & Trace:** Servicio de scraping para Correo Argentino.
- **LPO (Legajo Por Operario):** Automatización de la carpeta de empleado en Drive.
- **IPP (Impacto en Planilla):** Cálculo automático de ausentismo.

## Development Workflow
- `npm run dev`: Inicia el entorno de desarrollo (Angular + Electron).
- `npm run start`: Inicia solo la versión Web (Angular).
- `npm run build`: Genera el bundle para producción web.
