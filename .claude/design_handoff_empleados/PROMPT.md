# Prompt para pegar en el chat de Claude Code

Copiá y pegá el bloque de abajo en Claude Code, con el repo `macrotools-app` abierto y esta
carpeta (`design_handoff_empleados/`) accesible.

---

Tengo un rediseño de la pantalla **Empleados** de MacroTools / Fluxenture y quiero implementarlo en
este repo Angular.

La especificación completa está en `design_handoff_empleados/README.md` y el diseño de referencia
en `design_handoff_empleados/Empleados v3.dc.html` (abrilo en el navegador para verlo:
escritorio arriba, Android abajo). Los `.dc.html` son **referencias de diseño**, no código para
copiar: hay que recrearlos con los patrones del repo (componentes standalone, Signals, SCSS,
Angular Material M2, `EmployeeService`, pipes existentes).

Antes de escribir código:

1. Leé `CLAUDE.md` y `design_handoff_empleados/README.md` completos.
2. Leé `projects/macrotool/src/app/views/pages/eployees/` (html, scss, ts),
   `shared/components/sidenav/`, `shared/components/toolbar/`,
   `shared/constants/typesValues.constant.ts`, `shared/models/Employee.ts`,
   `core/services/api/employees/employee.service.ts`, `styles.scss` y `global.scss`.
3. Resolvé conmigo los 4 puntos de la sección **"Pendientes de decisión"** del README
   (métrica de ausentes, columna de acceso al sistema, paginación, bottom nav en móvil).
   No inventes campos en el backend.

Después implementá en este orden, verificando con `npm start` en cada paso:

**Paso 1 — Escritorio.** Reescribí `eployees.html` + `eployees.scss` + `eployees.ts` con:
encabezado de página (título 28/800 + subtítulo, chip de usuario y botón "Nuevo empleado"),
grilla de 4 métricas y tarjeta-tabla con barra de herramientas (buscar, sector, estado, orden,
exportar), cabecera de columnas, filas densas, estado vacío y pie de paginación.
Todos los valores exactos están en el README (sección "1. Empleados — Escritorio").

**Paso 2 — Estado y filtros.** Signals `term`, `sector`, `status`, `asc`, `access`;
computed `filtered` (los tres filtros combinan con AND) y `stats`.
Mantené el `debounceTime(300)` y el query param `?q=` que ya existen.

**Paso 3 — Móvil Android (Material 3).** Search bar acoplada de 56dp radio 28, filter chips de
32dp radio 8, lista de tres líneas con avatar de 40dp y nombre en Title Case, FAB de 56dp con
radio 16, y navigation bar de 80dp con indicador píldora 64×32.
Ojo: `styles.scss` fuerza `button { border-radius: 55px !important }` y rompe el FAB M3.

**Paso 4 — Sidenav.** Fondo plano `#ffffff`, sin `box-shadow` inset y sin la barrita `::before`
del item activo.

Reglas no negociables del diseño:

- **Cero `box-shadow` en todo el diseño.** Ni tarjetas, ni FAB, ni botones, ni hover.
- **Sin bordes decorativos.** Solo hairlines estructurales de tabla `1px solid #f0f0f0`.
- Paleta y tipografía exactamente las del README; no agregues colores nuevos.
- Escritorio en Plus Jakarta Sans; móvil en Roboto con el tracking de M3.
- Reusá lo que ya existe (`EmpSectorPipePipe`, `AddEmployee`, `Prompt`, `EmployeeService`,
  keyframe `fade-in`) en vez de duplicarlo.
- No toques otros módulos (TnT, Ausencias, Documentos, SGI) salvo el sidenav compartido.

Al terminar, listame qué quedó pendiente y qué decisiones de backend hacen falta.
