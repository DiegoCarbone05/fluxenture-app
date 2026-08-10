# Handoff: Rediseño de la vista Empleados (MacroTools / Fluxenture)

## Overview

Rediseño de la pantalla **Empleados** (`main/app-pages/eployees`) de MacroTools / Fluxenture:
pasa de una búsqueda con grilla de tarjetas a un **panel con métricas + tabla filtrable** en
escritorio, y a una **lista Material 3 nativa de Android** en móvil.

Objetivos del rediseño:

1. Ver el estado de la plantilla sin tener que buscar (métricas arriba).
2. Comparar empleados en filas densas en vez de tarjetas sueltas.
3. Filtrar por sector y estado, ordenar y exportar sin abrir diálogos.
4. En móvil, respetar las convenciones de Android (Material 3) en vez de replicar el layout de escritorio.
5. **Cero sombras y cero bordes decorativos** en todo el diseño (decisión explícita del cliente).

## About the Design Files

Los archivos `.dc.html` de este bundle son **referencias de diseño hechas en HTML**: prototipos que
muestran el aspecto y comportamiento buscados, **no código para copiar y pegar**. La tarea es
**recrear estos diseños dentro del código Angular existente** (Angular 20 standalone + Angular
Material M2 + SCSS), usando los patrones ya establecidos del repo: componentes standalone, Signals,
`flux-toolbar`, `flux-navbar`, pipes existentes (`EmpSectorPipePipe`), `EmployeeService`, etc.

Para abrirlos: cada `.dc.html` se abre directamente en el navegador (necesita `support.js` y la
carpeta `assets/` que están en este mismo bundle, al lado del HTML).

## Fidelity

**Alta fidelidad (hifi).** Colores, tipografías, tamaños, espaciados e interacciones son
definitivos. Se espera recreación pixel-perfect usando SCSS + Angular Material del repo.
Todos los valores están listados abajo; si un valor no está acá, tomarlo del `.dc.html`.

## Archivos de diseño incluidos

| Archivo | Qué es |
|---|---|
| `Empleados.dc.html` | **Espejo fiel del estado actual** (escritorio + móvil). Sirve de línea base para comparar. No implementar. |
| `Empleados v2.dc.html` | Paso intermedio: misma estructura de tarjetas, mejor densidad y filtros. Referencia opcional. |
| `Empleados v3.dc.html` | **El diseño a implementar**: escritorio (panel + tabla) y móvil (Android Material 3). |
| `android-frame.jsx` | Marco de dispositivo Android usado solo para el mock. No se implementa. |
| `assets/` | Logo e ilustraciones, tomadas del propio repo. |

---

## Screens / Views

### 1. Empleados — Escritorio (1440 × 900)

**Propósito:** el/la responsable de RRHH ve el estado de la plantilla, busca, filtra y actúa sobre
cada empleado (ver, editar, eliminar, dar/quitar acceso).

**Layout:** dos columnas.

- **Sidenav** (columna izquierda, fija): `width: 264px`, `background: #ffffff`,
  `padding: 20px 16px`, sin sombra ni borde.
- **Contenido** (columna derecha, scroll vertical): `background: #f8f8f8`,
  `padding: 28px 32px 40px`.
  Orden vertical: encabezado → 4 métricas → tarjeta-tabla.

#### 1.1 Sidenav (reusar `flux-navbar` existente)

Es el `Sidenav` actual (`shared/components/sidenav/`), con dos cambios:

- Fondo plano `#ffffff` (hoy es `#e7e7e7a8` + `backdrop-filter: blur(20px) saturate(2)`).
- Quitar el `box-shadow: inset -1px 0 0 rgba(0,0,0,0.096)`.

Todo lo demás igual a lo que ya existe:

- Marca: logo `flux-logo-icon.png` 32×32, `border-radius: 8px`, `object-fit: contain`; gap 10px;
  texto "Fluxenture" 21px / 700 / `#222227`; `padding: 8px 8px 28px`.
- Nav: `display: flex; flex-direction: column; gap: 6px`.
- Item: `padding: 11px 14px`, `border-radius: 12px`, `gap: 12px`, 15px / 500, color `#35353c`,
  icono Material Symbols 22px (`FILL 0, wght 300`). Hover `background: rgba(0,0,0,0.05)`.
- Item activo: `background: #0468d7`, color `#ffffff`, weight 600. (Quitar la barrita
  `::before` de 4×24px: sobre fondo azul no aporta.)
- Ítems y iconos: `track_changes` Track & Trace · `people` Empleados · `event_busy` Ausencias ·
  `description` Documentos · `falling` SGI.

#### 1.2 Encabezado de página

Fila `space-between`, `margin-bottom: 22px`.

- Izquierda: `<h1>` "Empleados" 28px / 800 / `#1a1a2e` / `letter-spacing: -0.4px`, y debajo
  subtítulo 14px / 500 / `#6c757d` con el texto `"{total} empleados · {operativos} operativos en esta página"`.
- Derecha, dos botones (gap 12px, alto 40px, `border-radius: 55px`, sin borde ni sombra):
  - Chip de usuario: `background: #f1f1f1`, color `#35353c`, 14px / 600, icono
    `account_circle` 22px `#5a6480`, texto `Hola, <strong>{usuario}</strong>`.
    Hover `#e9e9e9`. Abre el mismo `mat-menu` de logout que hoy tiene `flux-toolbar`.
  - Botón primario: `background: #0468d7`, color `#ffffff`, 14px / 700, `padding: 0 20px`,
    icono `add` 20px, texto "Nuevo empleado". Hover `rgb(5, 87, 180)`. Abre `AddEmployee`.

> Nota: en escritorio este encabezado **reemplaza** a `flux-toolbar`. El toolbar sigue usándose
> en móvil / resto de módulos.

#### 1.3 Métricas (4 tarjetas)

`display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px`.

Tarjeta: `background: #ffffff`, `border-radius: 12px`, `padding: 16px 18px`, **sin borde ni sombra**,
`display: flex; flex-direction: column; gap: 10px`, animación `fade-in 0.3s ease-in-out`
(el keyframe ya existe en `global.scss`).

Contenido de cada tarjeta:

1. Fila superior `space-between`:
   - Label 11px / 700 / uppercase / `letter-spacing: 0.5px` / `#7a8090`.
   - Círculo de icono 34×34, `border-radius: 50%`, icono Material Symbols 19px (`wght 400`).
2. Valor 32px / 800 / `#1a1a2e` / `line-height: 1.1` / `letter-spacing: -0.5px`.
3. Fila de variación (gap 4px): icono `trending_up` / `trending_down` 15px, delta 12px / 700,
   y texto "vs. mes anterior" 12px / 500 / `#9aa0ac`.

| Métrica | Icono | Fondo icono | Color icono | Delta mock | Color delta | Fuente de datos |
|---|---|---|---|---|---|---|
| Total empleados | `groups` | `rgba(4,104,215,0.1)` | `#0468d7` | `+4` `trending_up` | `#11734b` | `EmployeeService` |
| Operativos | `check_circle` | `#d4edbc` | `#11734b` | `+6` `trending_up` | `#11734b` | `employees.filter(isOperational)` |
| Ausentes del mes | `event_busy` | `#ecf2fd` | `#3d7dc7` | `−2` `trending_down` | `#3d7dc7` | **`AbsentService`** (ver "Pendientes") |
| Inactivos | `person_off` | `#ffcfc9` | `#b10202` | `+1` `trending_up` | `#b10202` | `employees.filter(!isOperational)` |

#### 1.4 Tarjeta-tabla

Contenedor: `background: #ffffff`, `border-radius: 12px`, `overflow: hidden`, sin borde ni sombra.

**a) Barra de herramientas** — `display: flex; align-items: center; gap: 12px; padding: 14px 16px`.

- Buscador: `flex: 1; max-width: 420px`, alto 40px, `border-radius: 10px`,
  `background: rgba(0,0,0,0.045)`, `padding: 0 14px`, gap 10px.
  Icono `search` 20px `#7a8090`; input sin borde, 14px, placeholder
  "Buscar por nombre, DNI o legajo".
- Dos `<select>`: alto 40px, `padding: 0 12px`, `border-radius: 10px`, `background: #f1f1f1`,
  sin borde, 13px / 600 / `#35353c`.
  - Sector: `Sector: todos` · `Desmalezado` · `Limpieza` · `Administracion`
    (labels exactos de `EMPLOYEE_SECTOR` en `typesValues.constant.ts`).
  - Estado: `Estado: todos` · `Operativo` · `Inactivo`.
- Espaciador `flex: 1`.
- Botón orden: alto 40px, `background: #f1f1f1`, `border-radius: 10px`, 13px / 600 / `#5a6480`,
  icono `swap_vert` 19px, texto `A → Z` / `Z → A` (alterna). Hover `#e9e9e9`.
- Botón Exportar: alto 40px, `background: rgba(4,104,215,0.1)`, color `#0468d7`, 13px / 700,
  `border-radius: 10px`, icono `download` 19px. Hover `rgba(4,104,215,0.18)`.

**b) Cabecera de columnas** — `display: grid`,
`grid-template-columns: 1.5fr 1.3fr 120px 130px 150px 132px`, `padding: 10px 16px`,
`background: #f7f7f7`, `border-bottom: 1px solid #f0f0f0`,
11px / 700 / uppercase / `letter-spacing: 0.5px` / `#7a8090`.
Columnas: **Empleado y sector · Contacto · Ingreso · Estado · Acceso al sistema · Acciones**
(la última alineada a la derecha).

**c) Filas** — misma grilla, `align-items: center`, `column-gap: 12px`, `padding: 10px 16px`,
`border-bottom: 1px solid #f0f0f0`, hover `background: #f7f8fa`, cursor pointer
(clic en la fila navega al detalle `/main/app-pages/eployees/:id`).
Zebra opcional: filas impares `#fbfbfd`.

1. **Empleado y sector** (flex, gap 10px): avatar 38×38 círculo `#0468d7`, texto blanco 14px / 700,
   `letter-spacing: 0.5px`, con **iniciales de nombre y apellido**. Al lado, columna:
   - Nombre 14px / 700 / `#1a1a2e`, `text-overflow: ellipsis`.
   - Fila (gap 6px): chip de legajo `N° {employeeID}` 10px / 700 / `#0468d7` sobre
     `rgba(4,104,215,0.1)`, `border-radius: 50px`, `padding: 0 7px`; y sector
     11px / 600 / uppercase / `letter-spacing: 0.4px` / `#9aa0ac` (via `EmpSectorPipePipe`).
2. **Contacto** (columna): email 13px / `#35353c` con ellipsis; teléfono
   `font-family: monospace`, 12px / 600 / `#4a6fa5` / `letter-spacing: 0.3px` (mismo tratamiento
   que `.cd-tracking` en `tnt.scss`).
3. **Ingreso**: icono `event` 14px `#9aa0ac` + fecha `dd/MM/yyyy` 12px / 600 / `#6c757d`.
4. **Estado**: chip `padding: 2px 10px 2px 7px`, `border-radius: 50px`, 11px / 700 / uppercase,
   icono 14px (`wght 500`).
   - Operativo → `background: #d4edbc`, color `#11734b`, icono `check`.
   - Inactivo → `background: #ffcfc9`, color `#b10202`, icono `close`.
5. **Acceso al sistema**: switch 38×22, `border-radius: 50px`, `padding: 2px`,
   track `#0468d7` (on) / `#c9cdd6` (off), knob 18×18 blanco sin sombra,
   `transition: background 0.2s ease`; al lado texto 12px / 600:
   "Activo" `#11734b` / "Sin acceso" `#9aa0ac`. `stopPropagation` en el clic.
6. **Acciones** (alineadas a la derecha, gap 2px): tres botones 34×34 circulares, fondo
   transparente, icono 18px (`wght 300`):
   - `visibility` `#5a6480`, hover `rgba(0,0,0,0.05)` → abrir legajo/archivo.
   - `edit` `#0468d7`, hover `rgba(4,104,215,0.1)` → `AddEmployee` con datos.
   - `delete` `#d1002d`, hover `rgba(209,0,45,0.08)` → `Prompt` de confirmación.

**d) Estado vacío** (dentro de la tarjeta): columna centrada, `padding: 64px 24px`,
ilustración `undraw_no-data_ig65.svg` 180px, título 16px / 700 / `#1a1a2e` "Sin resultados",
texto 14px / 500 / `#999` "Probá con otro nombre, sector o estado."

**e) Pie / paginación** — `space-between`, `padding: 10px 16px`, `border-top: 1px solid #f0f0f0`.
Izquierda: `"1 – {n} de {total} empleados"` 12px / 600 / `#7a8090`.
Derecha: flecha `chevron_left` (34×34, `background: #f5f5f5`, color `#c9cdd6`, deshabilitada),
páginas 34×34 (activa `#0468d7` blanco 13px / 700; inactivas `#5a6480` 13px / 600),
flecha `chevron_right` (`background: #f1f1f1`, color `#5a6480`).
Puede implementarse con `mat-paginator` reestilizado, como ya se hace en `tnt.scss`.

---

### 2. Empleados — Móvil / Android (412 × 892, Material 3)

**Propósito:** mismo trabajo en teléfono, con patrones nativos de Android. Tipografía **Roboto**
con el tracking de M3 (0.5 / 0.25 / 0.1 px según rol). Color primario de marca `#0468d7` en lugar
del morado por defecto de M3.

Estructura vertical: status bar del sistema → search bar → chips → scroll (métricas + lista) →
navigation bar; FAB flotante.

1. **Search bar acoplada (M3 docked search bar)** — `margin: 8px 16px 12px`, alto 56px,
   `border-radius: 28px`, `background: #f0f2f5`, sin borde ni sombra.
   - Botón `menu` 48×48 (`border-radius: 24px`), icono 24px `#49454f` → abre el drawer.
   - Input 16px, `letter-spacing: 0.5px`, color `#1d1b20`, placeholder "Buscar empleados".
   - Avatar de usuario 40×40, `border-radius: 20px`, `background: #0468d7`, iniciales
     14px / 500 blanco, `margin-right: 8px`.
2. **Filter chips (M3)** — fila scrollable horizontal, `padding: 0 16px 12px`, gap 8px.
   Chip: alto 32px, `border-radius: 8px`, 14px / 500 / `letter-spacing: 0.1px`, sin borde.
   - No seleccionado: `background: #f0f2f5`, color `#49454f`, `padding: 0 16px`.
   - Seleccionado: `background: rgba(4,104,215,0.14)`, color `#0468d7`,
     `padding: 0 16px 0 8px`, con icono `check` 18px (`wght 500`) al inicio.
   - Opciones: Todos / Operativos / Inactivos.
3. **Métricas** — fila scrollable horizontal, `padding: 0 16px 8px`, gap 8px.
   Tarjeta 148px, `border-radius: 12px`, `background: #f0f2f5`, `padding: 12px 16px 14px`.
   - Label 11px / 500 / uppercase / `letter-spacing: 0.5px` / `#49454f`, con
     **`min-height: 32px; line-height: 16px`** (reserva dos líneas para que todos los números
     queden sobre la misma línea base).
   - Valor 28px / 400 / `line-height: 36px` / `#1d1b20`.
   - Delta 12px / 500 / `letter-spacing: 0.4px` con el color de la métrica.
   - Icono 18px arriba a la derecha, con el color de la tabla de métricas.
4. **Subcabecera de lista** — `padding: 14px 16px 6px`, `space-between`:
   izquierda `"{n} resultados"` 14px / 500 / `#0468d7`; derecha botón de orden, alto 32px,
   `border-radius: 8px`, fondo transparente, icono `swap_vert` 18px + `A → Z` / `Z → A`
   14px / 500 / `#49454f`, hover `rgba(0,0,0,0.06)`.
5. **Lista (M3 three-line list item)** — `min-height: 88px`, `padding: 12px 16px`, gap 16px,
   **sin divisores, sin tarjetas, sin sombras**, hover `rgba(4,104,215,0.05)`.
   - Avatar 40×40, `border-radius: 20px`, `#0468d7`, iniciales 16px / 500.
   - Headline: nombre en **Title Case** (no mayúsculas), 16px / 400 / `letter-spacing: 0.5px` /
     `line-height: 24px` / `#1d1b20`.
   - Soporte línea 1: `N° {legajo} · {Sector}` — 14px / 400 / `letter-spacing: 0.25px` /
     `line-height: 20px` / `#49454f`.
   - Soporte línea 2: teléfono, mismo estilo.
   - Trailing: estado como chip alto 24px, `border-radius: 8px`, `padding: 0 8px`,
     11px / 500 / uppercase / `letter-spacing: 0.5px`, colores de estado
     (`#d4edbc`/`#11734b`, `#ffcfc9`/`#b10202`).
6. **FAB (M3)** — 56×56, **`border-radius: 16px`** (no círculo), `background: #0468d7`,
   icono `add` 24px blanco, `position: absolute; right: 16px; bottom: 120px`
   (16dp sobre la navigation bar), sin sombra.
   ⚠️ `styles.scss` tiene `button { border-radius: 55px !important; }` — hay que sobreescribirlo
   localmente para este FAB.
7. **Navigation bar (M3)** — alto **80px**, `background: #f0f2f5`, `padding: 12px 0 16px`,
   `justify-content: space-around`, 5 destinos (uno por módulo).
   Cada destino: indicador píldora 64×32, `border-radius: 16px`; activo
   `background: rgba(4,104,215,0.14)` con icono `FILL 1` y color `#0468d7`, label 12px / 600;
   inactivo píldora transparente, icono `FILL 0` `#49454f`, label 12px / 500;
   `letter-spacing: 0.5px` en los labels.
   Labels: **Envíos · Empleados · Ausencias · Docs · SGI** (abreviados para que no corten).
   Iconos: `track_changes`, `people`, `event_busy`, `description`, `falling`.
   Esto **reemplaza en móvil** al patrón actual de hamburguesa + `mat-drawer mode="over"`;
   el drawer puede quedar para acciones secundarias.

---

## Interactions & Behavior

- **Buscar**: filtra por nombre, legajo o teléfono, case-insensitive, `includes`.
  Mantener el `debounceTime(300)` + `distinctUntilChanged()` y el query param `?q=` que ya existen
  en `eployees.ts`.
- **Filtro de sector**: coincidencia exacta con el sector del empleado; `todos` no filtra.
- **Filtro de estado**: `operativos` → `isOperational === true`; `inactivos` → `false`.
  Los tres filtros se combinan (AND).
- **Orden**: alterna A→Z / Z→A por nombre (`localeCompare`).
- **Toggle de acceso**: optimista, por fila, `stopPropagation` para no navegar al detalle.
- **Clic en fila / item**: `router.navigate(['/main','app-pages','eployees', id])`.
- **Acciones de fila**: ver / editar (`AddEmployee`) / eliminar (`Prompt` de confirmación),
  igual que en `docs.html`.
- **Vacío**: si no hay resultados, ocultar filas y mostrar el estado vacío dentro de la tarjeta;
  el pie muestra "Sin resultados".
- **Transiciones**: solo `fade-in 0.3s ease-in-out` al aparecer tarjetas y
  `background 0.2s ease` en el switch. Nada más.
- **Sin sombras, sin bordes decorativos** en ningún estado (incluye hover y foco).

## State Management

Signals en el componente (patrón zoneless ya usado en el repo):

| Estado | Tipo | Origen / disparador |
|---|---|---|
| `term` | `string` | input de búsqueda (debounce 300ms) + query param `q` |
| `sector` | `'todos' \| ESector` | `<select>` de sector |
| `status` | `'todos' \| 'operativos' \| 'inactivos'` | `<select>` / chips M3 |
| `asc` | `boolean` | botón de orden |
| `access` | `Record<string, boolean>` | switch por fila |
| `employees` | `Signal<Employee[]>` | `EmployeeService.getEmployeesSignal()` |
| `filtered` | `computed` | term + sector + status + asc |
| `stats` | `computed` | total / operativos / inactivos; ausentes desde `AbsentService` |

Datos requeridos por empleado: `name`, `employeeID` (legajo), `sector`, `email`, `cellPhone`
(o `phone`), `entryDate`, `isOperational`, `documentNumber`. Todos existen ya en
`shared/models/Employee.ts`.

## Design Tokens

**Colores de marca (ya en `styles.scss`)**

| Token | Valor | Uso |
|---|---|---|
| `--primary` | `#0468d7` | acento, activo, avatares, FAB |
| `--primary-hover` | `rgb(5,87,180)` | hover del botón primario |
| `--warn` | `#d1002d` | eliminar, badge de borradores |
| `--header-color` | `#f5f5f5` | toolbar (móvil / otros módulos) |

**Neutros del rediseño**

`#f8f8f8` fondo de contenido · `#ffffff` superficies · `#f7f7f7` cabecera de tabla ·
`#f1f1f1` botones y selects planos · `#e9e9e9` hover de esos botones ·
`#f7f8fa` hover de fila · `#fbfbfd` zebra · `#f0f0f0` hairline ·
`#1a1a2e` texto principal · `#35353c` texto secundario · `#6c757d` / `#7a8090` metadatos ·
`#9aa0ac` / `#b0b5c0` texto tenue · `#c9cdd6` deshabilitado · `#4a6fa5` monospace (teléfono).

**Neutros Material 3 (móvil)**

`#1d1b20` on-surface · `#49454f` on-surface-variant · `#f0f2f5` surface-container ·
`rgba(4,104,215,0.14)` secondary-container de marca.

**Semánticos (ya en `global.scss` / `eployees.scss`)**

Operativo `#d4edbc` / `#11734b` · Inactivo `#ffcfc9` / `#b10202` ·
Médico / ausencias `#ecf2fd` / `#3d7dc7`.

**Tipografía**

- Escritorio: **Plus Jakarta Sans** (ya cargada en `global.scss`).
  28/800 título · 32/800 métrica · 15/700 y 14/700 nombres · 14/600 y 13/600 controles ·
  13/500 texto · 12/600 metadatos · 11/700 uppercase labels · 10/700 chips.
- Móvil: **Roboto** (ya cargada en `index.html`), tracking M3:
  16/400 (0.5px) headline · 14/400 (0.25px) soporte · 14/500 (0.1px) chips y botones ·
  28/400 métrica · 12/500 (0.5px) labels de nav · 11/500 (0.5px) chips de estado.
- Iconos: **Material Symbols Outlined**, `wght 300` en navegación y acciones, `wght 400–500`
  en iconos de estado/métrica.

**Radios** — 8px (chips M3) · 10px (inputs y botones de barra) · 12px (tarjetas) ·
16px (FAB M3 y píldora de nav) · 20–28px (avatar y search bar M3) · 50–55px (chips y botones pill).

**Espaciado** — escala de 4: 2 · 4 · 6 · 8 · 10 · 12 · 16 · 20 · 22 · 28 · 32.

**Sombras** — **ninguna.** No hay `box-shadow` en todo el diseño (ni bezel, ni tarjetas, ni FAB).
**Bordes** — solo hairlines estructurales de tabla `1px solid #f0f0f0`.

## Assets

Todos salen del propio repo (`projects/macrotool/`), no hay assets nuevos:

- `public/flux-logo-icon.png` — marca del sidenav.
- `src/assets/pictures/undraw_no-data_ig65.svg` — estado vacío / sin resultados.
- `src/assets/pictures/undraw_personal-info_yzls.svg` — estado inicial (solo en el espejo v1).
- `src/assets/pictures/login_background.webp` — fondo del body (visible detrás del sidenav en v1/v2).

## Pendientes de decisión (antes de implementar)

1. **"Ausentes del mes"** no sale de `/employees`: requiere `AbsentService` (`absentOfMonth`).
   Si no se quiere ese acoplamiento, reemplazar la métrica por otra de `/employees`
   (p. ej. "Altas del mes" desde `entryDate`).
2. **"Acceso al sistema"** no tiene campo en `Employee` ni en el backend.
   Opciones: (a) agregar `hasSystemAccess: boolean`, (b) derivarlo de `User`/`AuthService`,
   (c) eliminar la columna (la grilla pasa a `1.5fr 1.3fr 120px 130px 132px`).
3. **Paginación**: hoy la vista trae solo resultados de búsqueda. El diseño asume listado
   paginado (`1 – n de {total}`); hace falta endpoint paginado o paginar en cliente.
4. **Bottom navigation en móvil**: implica un componente nuevo (`flux-bottom-nav`) y decidir
   qué pasa con el `mat-drawer` actual en teléfonos.

## Archivos del repo a tocar

| Archivo | Cambio |
|---|---|
| `views/pages/eployees/eployees.html` | Reescribir: encabezado, métricas, tarjeta-tabla (escritorio) y lista M3 (móvil). |
| `views/pages/eployees/eployees.scss` | Reescribir con los tokens de este documento. Quitar sombras y bordes. |
| `views/pages/eployees/eployees.ts` | Agregar signals `sector`, `status`, `asc`, `access`; computed `filtered` y `stats`; mantener búsqueda con debounce y query param. |
| `shared/components/sidenav/sidenav.scss` | Fondo plano `#ffffff`, quitar `box-shadow` inset y la barrita `::before` del activo. |
| `shared/components/bottom-nav/` (nuevo) | Navigation bar M3 para móvil. |
| `styles.scss` | Revisar `button { border-radius: 55px !important }` (rompe el FAB M3 de 16px). |
