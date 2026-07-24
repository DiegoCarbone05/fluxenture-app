# Context: migrar Track & Trace (Correo Argentino) del frontend al backend

> Documento de handoff generado desde el repo frontend (`macrotools-app`) para que Claude implemente
> el servicio de tracking en `servisub-back`. Contiene el código actual, el contrato esperado y los
> gotchas concretos de la migración.

---

## 1. Objetivo

Hoy el scraping de Correo Argentino corre **en el navegador** (Angular), en
`projects/macrotool/src/app/shared/services/track-and-trace.ts`. Eso solo funciona dentro de Electron
(`webSecurity: false`), porque desde la web pura CORS bloquea el POST a `correoargentino.com.ar`.

Se ve claramente en el consumidor actual (`views/pages/tnt/cds-viewer/cds-viewer.ts`):

```ts
if (this.isElectron()) {
  if (this.cd()?.trackingCompleted) {
    this.loadTrackingFromLocal(this.cd()!.tnt);   // usa lo persistido en Mongo
  } else {
    this.trackAndTrace.trackPackage(trackingNumber).then(res => this.loadTracking(res)); // scrapea + putCd
  }
} else {
  this.loadTrackingFromLocal(this.cd()!.tnt);      // en web NUNCA se actualiza
}
```

**Resultado esperado de esta migración:** el backend expone el tracking como servicio HTTP, el
frontend borra `track-and-trace.ts` y la app web (`fluxenture.web.app`) queda funcionalmente igual que
la de escritorio. Electron deja de ser requisito para el módulo T&T.

---

## 2. Código actual del frontend (fuente de verdad a portar)

`projects/macrotool/src/app/shared/services/track-and-trace.ts`:

```ts
private readonly API_URL = 'https://www.correoargentino.com.ar/sites/all/modules/custom/ca_forms/api/wsFacade.php';

async trackPackage(cnNumber: string): Promise<Tnt[]> {
  const cookie = "cookie";   // <-- basura, ver §5
  const pais = "AR";
  const producto = "CD";

  const headers = new Headers();
  headers.append('Accept', 'text/html, */*; q=0.01');
  headers.append('Accept-Language', 'es-ES,es;q=0.9');
  headers.append('Connection', 'keep-alive');
  headers.append('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
  headers.append('Origin', 'https://www.correoargentino.com.ar');
  headers.append('Referer', 'https://www.correoargentino.com.ar/');
  headers.append('Sec-Fetch-Dest', 'empty');
  headers.append('Sec-Fetch-Mode', 'cors');
  headers.append('Sec-Fetch-Site', 'same-origin');
  headers.append('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36');
  headers.append('X-Requested-With', 'XMLHttpRequest');
  headers.append('sec-ch-ua', '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"');
  headers.append('sec-ch-ua-mobile', '?0');
  headers.append('sec-ch-ua-platform', '"Windows"');
  if (cookie) headers.append('Cookie', cookie);

  const body = `action=ondnc&id=${encodeURIComponent(cnNumber)}&producto=${encodeURIComponent(producto)}&pais=${encodeURIComponent(pais)}`;

  const response = await fetch(this.API_URL, { method: 'POST', headers, body, redirect: 'follow' });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

  // Extracción: el response es un fragmento HTML con una tabla
  const html = this.htmlParser(await response.text()).querySelectorAll('table tbody tr');
  const tnts: Tnt[] = [];
  html.forEach((row: any) => {
    tnts.push(new Tnt(
      row.querySelector('td:nth-child(1)').textContent,  // date
      row.querySelector('td:nth-child(2)').textContent,  // plant
      row.querySelector('td:nth-child(3)').textContent,  // history
      row.querySelector('td:nth-child(4)').textContent,  // status
    ));
  });
  return tnts;
}
```

### Request upstream, resumido

| Campo | Valor |
|---|---|
| URL | `https://www.correoargentino.com.ar/sites/all/modules/custom/ca_forms/api/wsFacade.php` |
| Método | `POST` |
| Content-Type | `application/x-www-form-urlencoded; charset=UTF-8` |
| Body | `action=ondnc&id={trackingNumber}&producto=CD&pais=AR` |
| Respuesta | `text/html` — fragmento con `<table>` de 4 columnas |

`producto=CD` y `pais=AR` están hardcodeados en el frontend. Modelarlos como parámetros con esos
valores por default (a futuro puede haber otros productos de Correo Argentino).

---

## 3. Modelo de datos: ya existe en el backend

No hay que crear DTOs nuevos. `com.fluxenture.core.cd.domain.Tnt` ya coincide 1:1 con el modelo del
frontend (`shared/models/Tnt.model.ts`):

```java
@Data @NoArgsConstructor @AllArgsConstructor
public class Tnt {
    private String date;
    private String plant;
    private String history;
    private String status;
}
```

Y `Cd` ya tiene `private List<Tnt> tnt;`, que se persiste en la colección `tnt` de Mongo vía
`CdEntity` y se actualiza en `CdRepositoryImpl.update()` (ya hace `update.set("tnt", ...)`).

**Conclusión: el contrato JSON no cambia.** El frontend espera exactamente
`[{ "date": "...", "plant": "...", "history": "...", "status": "..." }]`.

---

## 4. Diseño propuesto (respetando la arquitectura hexagonal del repo)

Todo vive dentro del bounded context existente `core/cd/`, porque `Tnt` ya es parte de ese dominio.

```
core/cd/
├── domain/
│   └── TrackingProvider.java                 (NUEVO - puerto de salida)
├── application/
│   ├── TrackPackageUseCase.java              (NUEVO - scrapeo puro, sin persistencia)
│   └── RefreshCdTrackingUseCase.java         (NUEVO - scrapea + persiste en el Cd)
└── infrastructure/
    ├── input/rest/CdController.java          (MODIFICAR - 2 endpoints nuevos)
    └── output/tracking/
        └── CorreoArgentinoTrackingAdapter.java  (NUEVO - implementa TrackingProvider)
```

### Puerto de dominio

```java
package com.fluxenture.core.cd.domain;

public interface TrackingProvider {
    List<Tnt> track(String trackingNumber);
}
```

Dejar el adapter como `@Service`/`@Component` inyectado por interfaz, igual que `CdRepository` ↔
`CdRepositoryImpl`. Así mañana se puede sumar otro correo (OCA, Andreani) sin tocar el use case.

### Endpoints nuevos en `CdController` (`@RequestMapping("/cds")`)

| Endpoint | Uso | Devuelve |
|---|---|---|
| `GET /cds/tracking/{trackingNumber}` | consulta viva, sin tocar Mongo | `List<Tnt>` |
| `PUT /cds/{id}/tracking` | scrapea y persiste el resultado en ese `Cd` | `Cd` actualizado |

`PUT /cds/{id}/tracking` es el endpoint principal: reemplaza el read‑modify‑write que hoy hace el
cliente (`trackPackage()` → `loadTracking()` → `putCd()`), que es propenso a pisar datos porque manda
el objeto `Cd` entero desde el navegador.

`GET /cds/tracking/{trackingNumber}` queda para consultas ad‑hoc (por ejemplo validar un número de
seguimiento en el diálogo de alta antes de guardar la CD).

### Seguridad: no hay que tocar nada

`SecurityConfig` ya aplica `anyRequest().authenticated()` y solo `/auth/**` es público. Los endpoints
bajo `/cds` heredan la protección JWT, y el frontend ya adjunta el `Bearer` token vía
`authInterceptor`. **No agregar `permitAll()` para estos endpoints.**

---

## 5. Gotchas de la migración (leer antes de escribir código)

Estos son los puntos donde una traducción literal del código del navegador se rompe en Java:

1. **`jsoup` NO inserta `<tbody>` automáticamente; el navegador SÍ.**
   El frontend usa `querySelectorAll('table tbody tr')` y funciona porque `DOMParser` inyecta el
   `<tbody>` implícito. En jsoup, `select("table tbody tr")` puede devolver **cero filas** si el HTML
   crudo no trae `<tbody>` explícito. Usar `select("table tr")` y filtrar:
   ```java
   for (Element row : doc.select("table tr")) {
       Elements tds = row.select("td");
       if (tds.size() < 4) continue;   // saltea la fila de headers (<th>) y filas vacías
       ...
   }
   ```

2. **El header `Cookie: "cookie"` es basura.** En el frontend `cookie` es literalmente el string
   `"cookie"`. No portarlo. (Además el navegador ignora el header `Cookie` seteado a mano.) Si más
   adelante hace falta sesión, se resuelve con un `GET` previo a la home para levantar la cookie real.

3. **El orden de las filas importa.** El pipe `TntStatusPipePipe` del frontend toma `value[0].status`
   como "estado actual", o sea Correo Argentino devuelve **más nuevo primero**. Preservar el orden de
   la fuente tal cual; no ordenar por fecha (el formato de fecha viene como string, no ISO).

4. **`textContent` no trimea; `Element.text()` de jsoup sí colapsa espacios.** Es una mejora, pero
   cambia los valores respecto de lo ya persistido en Mongo. Usar `text().trim()` (y opcionalmente
   `replace(' ', ' ')` por los `&nbsp;`).

5. **Nunca pisar un `tnt` bueno con una lista vacía.** Si el scrapeo devuelve 0 filas (número
   inexistente, HTML cambiado, upstream caído), `RefreshCdTrackingUseCase` **no** debe escribir
   `tnt = []` en Mongo. Devolver el `Cd` sin modificar (o 404/422 según el caso), pero no destruir el
   historial guardado.

6. **Timeouts obligatorios.** Es un sitio externo lento y sin SLA. Configurar connect/read timeout
   (~5s / ~15s) en el `RestClient`. Sin timeout, un cuelgue de Correo Argentino cuelga hilos del API.
   El proyecto ya tiene virtual threads activados (`spring.threads.virtual.enabled: true`), así que el
   bloqueo es barato, pero igual hay que acotarlo.

7. **Errores upstream ≠ error nuestro.** Envolver fallos de red / HTTP != 2xx en una excepción propia
   (ej. `TrackingProviderException`) y mapearla a **502 Bad Gateway** en `GlobalExceptionHandler`
   (hoy todo cae en el handler genérico → 500). Reusar el DTO `ApiError` existente
   (`message`, `error`, `status`, `timestamp`).

8. **HTML frágil por naturaleza.** Si Correo Argentino cambia el markup, el parseo devuelve vacío en
   silencio. Loguear a `WARN` cuando el response es 200 pero no se extrajo ninguna fila, incluyendo el
   `trackingNumber`, para poder detectarlo sin debuggear a ciegas.

---

## 6. Implementación sugerida

### Dependencia nueva (`build.gradle.kts`)

```kotlin
implementation("org.jsoup:jsoup:1.18.3")
```

`RestClient` (Spring Framework 6.1) ya viene con `spring-boot-starter-web`, **no hace falta agregar
webflux/`WebClient`** para esto. Si preferís evitar `jsoup`, se puede parsear con regex, pero no lo
recomiendo: la tabla tiene celdas con markup interno.

### Esqueleto del adapter

```java
package com.fluxenture.core.cd.infrastructure.output.tracking;

@Service
public class CorreoArgentinoTrackingAdapter implements TrackingProvider {

    private static final String URL =
        "https://www.correoargentino.com.ar/sites/all/modules/custom/ca_forms/api/wsFacade.php";

    private final RestClient restClient;   // construido con timeouts + baseUrl + default headers

    @Override
    public List<Tnt> track(String trackingNumber) {
        String html = restClient.post()
            .uri(URL)
            .contentType(MediaType.APPLICATION_FORM_URLENCODED)
            .headers(h -> { /* User-Agent, Origin, Referer, X-Requested-With, sec-ch-ua, ... */ })
            .body("action=ondnc&id=" + URLEncoder.encode(trackingNumber, UTF_8)
                + "&producto=CD&pais=AR")
            .retrieve()
            .body(String.class);

        return parse(html);
    }

    private List<Tnt> parse(String html) {
        Document doc = Jsoup.parse(html);          // ver gotcha #1
        List<Tnt> result = new ArrayList<>();
        for (Element row : doc.select("table tr")) {
            Elements td = row.select("td");
            if (td.size() < 4) continue;
            result.add(new Tnt(
                td.get(0).text().trim(),   // date
                td.get(1).text().trim(),   // plant
                td.get(2).text().trim(),   // history
                td.get(3).text().trim())); // status
        }
        return result;
    }
}
```

Mantener los headers del navegador (sobre todo `User-Agent`, `Origin`, `Referer` y
`X-Requested-With: XMLHttpRequest`): el endpoint `wsFacade.php` es interno del sitio y puede rechazar
requests sin ellos. Definirlos como constantes o en `application.yml` bajo una clave
`tracking.correo-argentino.*` para poder ajustarlos sin recompilar.

### `RefreshCdTrackingUseCase` (flujo)

1. Buscar el `Cd` por `id` (hoy `CdRepository` **no tiene** `findById` real —
   `getById()` está vacío y sin parámetros; hay que implementarlo o resolver por
   `trackingNumber` con una `Query` nueva).
2. `trackingProvider.track(String.valueOf(cd.getTrackingNumber()))`.
3. Si la lista viene vacía → devolver el `Cd` sin tocar (gotcha #5).
4. Si cambió respecto de `cd.getTnt()` → `cd.setTnt(nuevo)` y `cdRepository.update(cd)`.
5. Devolver el `Cd` actualizado.

Opcional pero recomendado: setear `trackingCompleted = true` automáticamente cuando el último estado
sea terminal, según el enum que ya existe en el frontend (`ETrackingStatus` en `Tnt.model.ts`):

```
ENTREGADO, ENTREGA EN SUCURSAL          → éxito (terminal)
EN ESPERA EN SUCURSAL                   → en curso
DOMICILIO CERRADO/1 VISITA
DOMICILIO CERRADO/2 VISITA
DEVUELTO AL REMITENTE                   → terminal (fallido)
PLAZO VENCIDO NO RECLAMADO              → terminal (fallido)
```

Si se implementa, conviene portar ese enum a `core/cd/domain/ETrackingStatus.java` (el repo ya usa
este patrón: `EAbsentType`, `EDocType`, `ESector`). Confirmar con el usuario antes de cambiar
automáticamente `trackingCompleted`, porque hoy ese flag lo controla el usuario con un checkbox.

---

## 7. Fase 2 (opcional, no implementar sin pedirlo)

- **Job programado** (`@Scheduled`) que refresque todos los `Cd` con `trackingCompleted == false` una
  o dos veces por día. Es el verdadero beneficio de tener esto en el backend: el historial se
  actualiza aunque nadie abra la pantalla. Ojo con el rate limiting hacia Correo Argentino
  (secuencial + delay entre requests, no en paralelo).
- **Cache corto** (5–15 min) por `trackingNumber` para evitar golpear el sitio en cada F5.

---

## 8. Qué va a cambiar del lado del frontend (para referencia)

Una vez que el backend esté listo, en `macrotools-app`:

- Se borra `projects/macrotool/src/app/shared/services/track-and-trace.ts`.
- `CdService` (`core/services/api/cd-api/cd.service.ts`, extiende `BaseApiService`) suma:
  ```ts
  refreshTracking(id: string) {
    return this.http.put<Cd>(`${this.endpoint}/${id}/tracking`, {})
      .pipe(tap(() => this.refreshCds().subscribe()));
  }
  ```
- `cds-viewer.ts` pierde la rama `if (this.isElectron())` y llama siempre a `refreshTracking()`.
- `add-pdf.ts` tiene un import de `TrackAndTrace` sin usar → se elimina.

Por eso el contrato de respuesta debe seguir siendo exactamente `Tnt` = `{date, plant, history, status}`
y `Cd` con la misma forma que ya devuelve `GET /cds/`.

---

## 9. Checklist de aceptación

- [ ] `GET /cds/tracking/12345678` con JWT válido → 200 + array de `Tnt` en orden más‑nuevo‑primero.
- [ ] Mismo request sin token → 401 (no tocar `SecurityConfig`).
- [ ] Número inexistente → 200 con `[]` (o 404 explícito), **nunca** 500.
- [ ] Correo Argentino caído / timeout → 502 con el DTO `ApiError`, no 500 genérico.
- [ ] `PUT /cds/{id}/tracking` persiste `tnt` en Mongo y el `GET /cds/` posterior lo refleja.
- [ ] `PUT /cds/{id}/tracking` con scrapeo vacío **no** borra el `tnt` previo.
- [ ] Test unitario del parser con un HTML de ejemplo guardado en `src/test/resources/`
      (capturar uno real con `curl` y fijarlo, para no depender de la red en los tests).
