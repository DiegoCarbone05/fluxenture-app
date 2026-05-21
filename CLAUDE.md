# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**MacroTools / Fluxenture** is an Angular 20 web application (optionally wrapped in Electron 38) for HR and logistics management. It integrates with a Spring Boot 3 backend and Google Drive for file storage. Primary deployment target is `fluxenture.web.app`.

## Commands

### Web development
```bash
npm start          # Angular dev server at http://localhost:4200
npm run build      # Production web build → dist/fluxetnure/
npm test           # Karma + Jasmine unit tests
```

### Single test
```bash
ng test --include="**/path/to/component.spec.ts"
```

### Electron (optional desktop wrapper)
```bash
npm run dev             # Angular dev server + Electron together
npm run electron-build  # Full Electron production build
npm run electron-pack   # Package without installer (for local testing)
```

## Architecture

Angular source lives entirely in `projects/macrotool/src/app/` and is organized into four top-level directories:

```
core/       – Guards, interceptors, and all API/business services
shared/     – SharedModule: every Angular Material import + reusable components/pipes
views/      – Feature pages, auth screens, dialogs, and ViewsService
electron/   – Optional Electron main process (TypeScript, compiled to dist/electron/)
```

### Routing

Two lazy-loaded module groups:
- `/` → `AuthModule` (login, splash — unguarded)
- `/main` → `PagesModule` (all features — protected by `authGuard`)

Inside `PagesModule`, all feature routes render as children of the `Pages` shell component:

| Path | Feature |
|------|---------|
| `app-pages/tnt` | Track & Trace (Correo Argentino scraping) |
| `app-pages/tnt/cds-viewer/:id` | CD detail viewer |
| `app-pages/eployees` | Employee management |
| `app-pages/eployees/:id` | Employee detail (LPO) |
| `app-pages/absents` | Absence management |
| `app-pages/absents/:id` | Absence detail |
| `app-pages/docs` | Document management |
| `app-pages/sgi` | SGI module |

### API Services (`core/services/api/`)

All API services extend `BaseApiService<T>`, which holds the shared `HttpClient` and the base API URL. **The active backend URL is hardcoded in `base-api.service.ts:12`** — switch between local (`localhost:8080`), LAN (`192.168.100.41:8080`), or production (`fluxenture.servaltek.com`) there.

Each service caches data in a `signal<T[]>()` and exposes it via a typed `Signal<T[]>` getter. Mutations (POST/PUT/DELETE) automatically trigger a refresh of the local signal via `tap()`.

| Service | Endpoint | Signal |
|---------|----------|--------|
| `AuthService` | `/auth` | `user: Signal<UserDto \| null>` |
| `EmployeeService` | `/employees` | `employees: Signal<EmployeeDTO[]>` |
| `AbsentService` | `/absents` | `absents`, `absentResponseDTO` |
| `CdService` | `/cds` | `cds: Signal<Cd[]>` |
| `StorageService` | `/storage` | — (file upload/download proxy to Google Drive) |

### Auth flow

1. `AuthService.login()` stores the JWT as `flux_token` in localStorage.
2. `authInterceptor` attaches `Authorization: Bearer <token>` to every outgoing request.
3. `authGuard` calls `AuthService.verifySession()` (which calls `GET /auth/me`) before allowing access to protected routes.

### SharedModule

`shared/shared.module.ts` declares and re-exports all Angular Material modules and the shared UI components (`Sidenav`, `Toolbar`, `Titlebar`, `StatusChip`, `CdStatusChip`) and pipes (`TntStatusPipePipe`, `AbstentTypePipe`, `DocTypePipe`, `EmpSectorPipePipe`). Import `SharedModule` in any feature module to get all of the above.

### Key implementation details

- **Non-standalone components:** All components use `standalone: false` (configured in `angular.json` schematics). Every new component must be declared in an `NgModule`.
- **Zoneless:** The app uses `provideZonelessChangeDetection()`. Use Signals or `markForCheck()` for triggering updates — `setTimeout`/`setInterval` side-effects won't trigger CD automatically.
- **Electron detection:** `AppService.isElectron` is a signal set at startup by checking `navigator.userAgent` for `"electron"`. Use it to conditionally show desktop-only UI.
- **ViewsService:** Cross-cutting UI service. Use `viewsSvc.prompt()` for confirmation dialogs and `viewsSvc.openSidenav()` / `viewsSvc.getIsMobile()` for layout control.
- **Google Drive files:** Open via `ViewsService.openDriveFile(docId)`, which resolves a `Doc` entity to its `driveFileId` before opening the Drive URL.

## Environment / Backend URL

The backend URL is not in an environment file — it is set directly in `projects/macrotool/src/app/core/services/base-api.service.ts`. Comment/uncomment the appropriate line when switching targets.
