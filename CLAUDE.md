# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**MacroTools / Fluxenture** is an Angular 20 web application for HR and logistics management. It integrates with a Spring Boot 3 backend and Google Drive for file storage. Deployment target is `fluxenture.web.app`.

## Commands

### Web development
```bash
npm start          # Angular dev server at http://localhost:4200 (auto-opens)
npm run build      # Production web build → dist/fluxetnure/
npm test           # Karma + Jasmine unit tests
```

### Single test
```bash
ng test --include="**/path/to/component.spec.ts"
```

## Architecture

Angular source lives entirely in `projects/macrotool/src/app/` and is organized into three top-level directories:

```
core/       – Guards, interceptors, and all API/business services
shared/     – Reusable standalone components, pipes, directives, models, constants
views/      – Feature pages, auth screens, dialogs, and ViewsService
```

### Bootstrap

`main.ts` boots the standalone `App` component via `bootstrapApplication` with these providers:
- `provideZonelessChangeDetection()` — **no Zone.js**
- `provideHttpClient(withInterceptors([authInterceptor]))`
- `provideRouter(APP_ROUTES, withComponentInputBinding())` — route params bind directly to component `@Input()`s
- `provideAnimationsAsync()`

### Routing

All routes are functional `Routes` arrays in `*.routes.ts` files using `loadComponent` (no `NgModule`-based lazy loading):

- [app.routes.ts](projects/macrotool/src/app/app.routes.ts) — top-level: `''` loads `AUTH_ROUTES`, `'main'` loads `PAGES_ROUTES` (guarded by `authGuard`), `'**'` redirects to `splash`.
- [auth.routes.ts](projects/macrotool/src/app/views/auth/auth.routes.ts) — `login`, `''` (splash, guarded).
- [pages.routes.ts](projects/macrotool/src/app/views/pages/pages.routes.ts) — renders feature components as children of the `Pages` shell under `app-pages/*`.

| Path | Feature |
|------|---------|
| `main/app-pages/tnt` | Track & Trace (Correo Argentino scraping) |
| `main/app-pages/tnt/cds-viewer/:id` | CD detail viewer |
| `main/app-pages/eployees` | Employee management (note: the route is intentionally spelled `eployees`) |
| `main/app-pages/eployees/:id` | Employee detail (LPO) |
| `main/app-pages/absents` | Absence management |
| `main/app-pages/absents/:id` | Absence detail |
| `main/app-pages/docs` | Document management |
| `main/app-pages/sgi` | SGI module |

### API services (`core/services/api/`)

All API services extend `BaseApiService<T>`, which holds the injected `HttpClient` and the base API URL. **The active backend URL is hardcoded in [base-api.service.ts:10](projects/macrotool/src/app/core/services/base-api.service.ts:10)** — comment/uncomment to switch between local (`localhost:8080`), LAN (`192.168.100.41:8080`), or production (`fluxenture.servaltek.com`). There is no Angular environment file for this.

Stateful services cache data in a `signal<T[]>()` and expose it via a typed `Signal<T[]>` getter. Mutations (POST/PUT/DELETE) refresh the local signal via `tap()`.

| Service | Endpoint | Notes |
|---------|----------|-------|
| `AuthService` | `/auth` | exposes `user: Signal<UserDto \| null>` |
| `EmployeeService` | `/employees` | exposes `employees: Signal<EmployeeDTO[]>` |
| `AbsentService` | `/absents` | exposes `absents`, `absentResponseDTO` |
| `CdService` | `/cds` | exposes `cds: Signal<Cd[]>` |
| `DocsService` | `/docs` | also opens `AddDocDialog` directly |
| `StorageService` | `/storage` | file upload/download proxy to Google Drive |

### Auth flow

1. `AuthService.login()` stores the JWT as `flux_token` in `localStorage`.
2. `authInterceptor` attaches `Authorization: Bearer <token>` to every outgoing request.
3. `authGuard` calls `AuthService.verifySession()` (which hits `GET /auth/me`) before allowing access to protected routes.

### Key implementation details

- **All components, pipes, and directives are standalone** (`standalone: true`). Each one imports its own dependencies (Material modules, `CommonModule`, `RouterLink`, sibling components, pipes…) directly in its `imports: []` array. **There is no `SharedModule`, `PagesModule`, or `AuthModule`** — those were removed during the migration to standalone. When adding a UI dependency, import it directly in the consuming component.
- **Schematics caveat:** [angular.json](angular.json) still sets `standalone: false` for the component/directive/pipe schematics. This is **stale and contradicts the actual code** — when running `ng generate`, pass `--standalone` (or update the schematic defaults) and then add the generated symbol to the consumer's `imports: []`.
- **Zoneless change detection:** The app uses `provideZonelessChangeDetection()`. Prefer Signals; `setTimeout`/`setInterval` callbacks do not auto-trigger CD — use `signal.set()`, `ChangeDetectorRef.markForCheck()`, or `afterNextRender()`.
- **Router input binding:** `withComponentInputBinding()` is enabled — route params, query params, and `data` can be received via `@Input()` on the routed component instead of subscribing to `ActivatedRoute`.
- **ViewsService:** Cross-cutting UI service. Use `viewsSvc.prompt()` for confirmation dialogs and `viewsSvc.openSidenav()` / `viewsSvc.getIsMobile()` for layout control.
- **Google Drive files:** Open via `ViewsService.openDriveFile(docId)`, which resolves a `Doc` entity to its `driveFileId` before opening the Drive URL.
