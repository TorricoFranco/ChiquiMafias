# ERS — Soporte multi-competición y Copa Argentina

Especificación de requisitos para que ChiquiMafias soporte varias competiciones (Copa Argentina,
y a futuro B Nacional, Libertadores y Sudamericana) y varias temporadas, sin romper la Liga
Profesional actual y sin depender de un proveedor de datos.

| | |
|---|---|
| Estado | Aprobado en lo funcional; pendiente de revisión técnica por fase. No hay código escrito. |
| Fecha | 2026-10-21 |
| Relacionado | `docs/FOOTBALL_PROVIDER_MIGRATION.md` (migración a Highlightly), `docs/ARCHITECTURE.md` |

---

## 1. Introducción

### 1.1 Propósito

Definir qué tiene que cambiar para que una competición nueva se agregue **con datos y configuración,
no reescribiendo código**, y especificar la primera competición nueva: la Copa Argentina.

### 1.2 Alcance

- **Parte A — Base multi-competición.** Identidad de las competiciones, temporadas, formatos, crons,
  API, apuestas, chat y frontend. Vale para cualquier torneo futuro.
- **Parte B — Copa Argentina.** Formato de eliminación directa, cuadro, mercados y pantallas.

Fuera de alcance: rankings de goleadores (ver §11), B Nacional, Libertadores y Sudamericana (solo se
valida que el diseño los soporte).

### 1.3 Definiciones

| Término | Significado |
|---|---|
| **Competición** | Un torneo con identidad propia y estable: Liga Profesional, Copa Argentina… Hoy es una fila de `Leagues`. |
| **Temporada** | Una edición de una competición (Copa Argentina 2026, Liga 2026/27). |
| **Temporada actual** | La única que se muestra al usuario para esa competición. |
| **Formato** | Cómo se juega una temporada: liga dividida (Apertura/Clausura), eliminación directa, grupos + eliminación. |
| **Fase / ronda** | Subdivisión de una temporada: `Apertura - 5`, `32avos de final`, `Final`. |
| **Cuadro** | El árbol de una eliminación directa: qué ganador cruza con cuál. |
| **Proveedor** | Fuente de datos deportivos (API-Football, Highlightly), detrás de `FootballDataProvider`. |
| **slug** | Identificador de texto de una competición, igual en dev y prod (`copa-argentina`). |

---

## 2. Situación actual

### 2.1 Lo que ya está preparado

- **Datos de partidos genéricos.** `Matches`, `MatchEvents`, alineaciones y estadísticas cuelgan de
  `league_id` + `season`. Un partido de Copa es un partido más con otra liga: **no hacen falta modelos
  aparte**.
- **Equipos como identidad permanente.** `Teams` es el club; no cambia al ascender o descender.
  `LeagueTeams (liga, equipo, temporada)` registra dónde juega cada año.
- **Crons de vivo por partido.** Eventos, alineaciones, estadísticas y marcador trabajan sobre
  partidos marcados `tracked`, sin importar la liga.
- **Proveedor desacoplado.** `FootballDataProvider` + `ProviderRef` (ver doc de migración).
- **Liquidación 1X2 a los 90 minutos** (`backend/src/bets/utils/match-outcome.util.ts`): un partido
  que termina por alargue (`AET`) o penales (`PEN`) es **empate**; `PST`, `CANC`, `ABD`, `AWD` y `WO`
  se reembolsan. Es la regla que necesita la Copa y ya está en uso en los playoffs de la Liga.
- **Modelo `Rounds`** (liga, temporada, nombre, fase, tipo, orden): existe pero no se usa.

### 2.2 Lo que está atado a "Liga Profesional 2026"

| Lugar | Qué tiene fijo |
|---|---|
| `backend/src/fixture/fixture.service.ts` | `LEAGUE_API_ID = 128`, claves `fixtures:128:…`, `calendar:128:…` |
| `backend/src/standings/standings.service.ts` | `api_league_id: 128`; solo entiende `APERTURA` / `CLAUSURA` |
| `backend/src/football/cron/fixtures-sync.cron.ts`, `standings.cron.ts` | `LEAGUE_ID = 128`, `SEASON = 2026` |
| `backend/src/football/cron/liveScoreCron.ts` | Toma la liga del **primer** partido activo: con dos ligas en juego, una no se actualiza |
| `backend/src/bets/bets-cron.ts` | Título `"… - Torneo Argentino"`; mercado vinculado por `api_fixture_id` |
| `backend/src/matches/matches.service.ts` | `chatActive` depende de `lineup_fetched` |
| `backend/src/football/mappers/*` | `ROUND_MAP`, `mapApiGroupStage`: lógica Apertura/Clausura |
| Controllers de fixture y standings | Rutas sin competición; `tournament` limitado a `APERTURA | CLAUSURA` |
| `new_frontend/app/match/[id]` y su modal | UUID de liga fijo `6a2a03c5-…` y `season="2026"` |
| `new_frontend/features/league/hooks/useLueague.ts` | `CURRENT_SEASON = '2026'`, `SOCKET_LEAGUE_ID = '128'` |
| `new_frontend/features/league/components/CompetitionSidebarSelector.tsx` | Lista fija de competiciones (Copa, Libertadores y Sudamericana como "próximamente") |
| `new_frontend/features/league/hooks/leagueData2026.ts` | Equipos y zonas de 2026 escritos a mano |

**Hallazgo a verificar en prod:** el UUID `6a2a03c5-…` es el de la base de dev. En prod la liga tiene
otro UUID, salvo que la base se haya cargado desde un respaldo de dev.

### 2.3 Hallazgos que condicionan el diseño

| # | Hallazgo | Consecuencia |
|---|---|---|
| H-1 | `LeagueTeams` **nunca se llena** (el código que la escribía está comentado). | Hoy "quién juega la Liga 2026" se deduce de partidos y tabla. Se resuelve en RF-A08. |
| H-2 | Con Highlightly **no se crean equipos sin vincular** (`FootballRefsService.resolveTeam`). | Los equipos del Ascenso no existen en la base: sus partidos se saltearían. Se resuelve en RF-A07. |
| H-3 | **Los mercados se vinculan al partido por `api_fixture_id`**, y `bets-cron` excluye partidos y equipos sin IDs de API-Football. | **Ningún partido de la Copa creado por Highlightly tendría mercado.** Se resuelve en RF-A12. |
| H-4 | **El cierre del mercado se calcula una sola vez** (inicio − 5 min) y no se recalcula. | Si un partido se adelanta, se puede apostar con el partido en juego. Pasa hoy en la Liga. Se resuelve en RF-A13. |
| H-5 | **`chatActive` depende de las alineaciones.** | En partidos sin alineaciones (medido en la Copa) el chat no se abre nunca. Se resuelve en RF-A14. |
| H-6 | El `128` funciona con Highlightly solo como **ancla** para encontrar la fila de la liga. | Acoplamiento a eliminar (RF-A01), no un bug. |

---

## 3. Actores

| Actor | Interés |
|---|---|
| Usuario | Ver partidos, cuadro, tabla y estadísticas en vivo de la temporada actual; apostar y chatear. |
| Administrador | Dar de alta temporadas, cargar el sorteo de la Copa, revisar vinculaciones, corregir el cuadro. |
| Crons | Sincronizar fixtures, tablas y datos en vivo dentro de la cuota del proveedor. |

---

## 4. Parte A — Requisitos de la base multi-competición

### 4.1 Identidad, temporadas y datos

| ID | Requisito |
|---|---|
| **RF-A01** | Cada competición tiene un **slug** único y estable, igual en todos los entornos y ajeno a cualquier proveedor. La Liga Profesional es `liga-profesional`. |
| **RF-A02** | Cada **temporada** se registra con: año de inicio, etiqueta visible (`2026`, `2026/27`), formato, si es la actual, si se sincroniza, si tiene apuestas, la frecuencia de sincronización y fechas de inicio y fin. Agregar una temporada es agregar una fila. |
| **RF-A03** | Los datos de distintas temporadas y competiciones **nunca se mezclan**: toda consulta, clave de caché, sala de socket y endpoint lleva competición y temporada. |
| **RF-A04** | **Solo se muestra la temporada actual.** Cada competición tiene **exactamente una** temporada actual. Las anteriores quedan guardadas en la base, pero la API pública no las expone y el front no las muestra. |
| **RF-A05** | Una temporada nueva de una competición recién se marca como actual cuando la anterior terminó. En la Copa Argentina nunca se superponen. |

### 4.2 Sincronización

| ID | Requisito |
|---|---|
| **RF-A06** | El sincronizador de fixtures y el de tablas recorren las temporadas con `sync_enabled`, **cada una con su frecuencia** (la Copa, una vez por día). No se crean crons por competición. |
| **RF-A07** | El marcador en vivo funciona con **partidos de varias competiciones a la vez**: los partidos activos se agrupan por competición. |
| **RF-A08** | La lógica de cada formato (rondas, fases, tabla) vive en una **estrategia** por formato: `LIGA_DIVIDIDA` (Apertura/Clausura), `ELIMINACION`, `GRUPOS_Y_ELIMINACION`, `LIGA`. Un formato nuevo es un archivo nuevo. |

### 4.3 Equipos y participantes

| ID | Requisito |
|---|---|
| **RF-A09** | **Alta de equipos nuevos.** Al preparar una temporada, el script de vinculación detecta equipos del proveedor que no existen en la base y, con `--apply`, los crea y los vincula. Nunca se crean equipos desde los crons. |
| **RF-A10** | **Protección contra fusionar clubes distintos.** Los equipos que ya tienen vínculo con el proveedor activo no son candidatos para otros equipos. Para los demás, solo la coincidencia **exacta** se acepta sola; las aproximadas se confirman a mano en el informe. (Ejemplos de riesgo: `CA Estudiantes` y Estudiantes de La Plata; los Gimnasia de Mendoza, Jujuy y La Plata; los San Martín.) |
| **RF-A11** | Al preparar una temporada se registran sus **participantes** en `LeagueTeams`. Ascensos y descensos quedan resueltos con datos. |
| **RF-A11b** | **Escudos:** al dar de alta un equipo, su logo del proveedor se **copia a Cloudinary** y se guarda en `Teams.logo_url`. El front lo usa cuando el equipo no tiene escudo propio (`/escudos-api/…`). No se enlaza directo a la imagen del proveedor. |

### 4.4 Apuestas (dinero)

| ID | Requisito |
|---|---|
| **RF-A12** | **El mercado se vincula al partido por su id interno** (`Market.match_id`) y se liquida por ahí. `fixtureId` queda como dato histórico. Sin esto, un partido sin `api_fixture_id` no puede tener mercado. |
| **RF-A13** | **Un mercado nunca acepta apuestas con el partido empezado.** (a) Si cambia la fecha de un partido, se recalcula el cierre de su mercado abierto. (b) El mercado se cierra en cuanto el partido deja de estar "no empezado", sin importar la hora de cierre. Aplica también a la Liga. |
| **RF-A13b** | El título del mercado sale del nombre de la competición. |
| **RF-A13c** | Una temporada solo abre mercados si tiene `bets_enabled`. Una competición recién agregada arranca con apuestas apagadas hasta que esté lista. |
| **RF-A13d** | Se mantiene la regla actual: postergado (`PST`), cancelado, abandonado o resuelto en escritorio (`AWD`, `WO`) **se reembolsa al instante**. |

### 4.5 Chat

| ID | Requisito |
|---|---|
| **RF-A14** | **El chat de un partido se abre cuando el partido empieza y se cierra cuando termina, siempre.** No depende de las alineaciones ni de ningún otro dato. "Empieza" = deja de estar no empezado; "termina" = estado final (`FT`, `AET`, `PEN`, `AWD`, `WO`, `CANC`, `ABD`). El backend decide y el front solo lo refleja: **hay que cambiar la lógica en los dos lados.** |

### 4.6 Seguridad

| ID | Requisito |
|---|---|
| **RNF-S01** | **Parámetros validados antes de usarlos.** `slug` y temporada se validan contra las competiciones y temporadas existentes antes de consultar o cachear. Nunca se arma una clave de Redis con texto sin validar (evita llenar Redis con claves inventadas). |
| **RNF-S02** | **Consultas acotadas.** `GET …/matches` tiene rango de fechas máximo y paginación. |
| **RNF-S03** | **Salas de socket validadas.** Unirse a la sala de una competición exige que exista y que la temporada sea la actual. |
| **RNF-S04** | **Administración protegida y auditada.** Los endpoints de admin llevan `RolesGuard` + `@Roles(ADMIN)` y DTOs estrictos. Toda carga o corrección de temporadas y cuadros queda registrada (quién, cuándo, qué), como `PriceChangeLog`. |
| **RNF-S05** | **Archivos de carga validados.** El sorteo se rechaza completo si un dato no valida (ver §7.4); nunca se aplica a medias. |

### 4.7 Requisitos no funcionales generales

| ID | Requisito |
|---|---|
| **RNF-A01** | **Compatibilidad.** Las rutas, claves y eventos actuales de la Liga siguen funcionando hasta que el front migre. Ninguna fase de la Parte A cambia lo que ve el usuario de la Liga. |
| **RNF-A02** | **Migraciones aditivas** e idempotentes (`IF NOT EXISTS`, backfill con `ON CONFLICT DO NOTHING`). |
| **RNF-A03** | **Independencia del proveedor.** Ningún ID de proveedor como identidad interna; los IDs externos solo en `ProviderRef`. |
| **RNF-A04** | **Cuota.** Cada competición se suma a `scripts/dev/football-quota.mjs` antes de activarse; el peor día queda por debajo del 80 % del límite. |
| **RNF-A05** | **Pruebas.** Cada estrategia de formato tiene tests con datos reales reducidos; el test de contrato entre proveedores cubre los campos nuevos. |
| **RNF-A06** | **Dinero.** Todo cambio en mercados pasa por plan previo y `backend-reviewer`. |

---

## 5. Diseño de la Parte A

### 5.1 Modelo de datos

Todo aditivo. No se borran ni renombran columnas.

```prisma
model Leagues {
  // … columnas actuales …
  slug          String  @unique   // 'liga-profesional', 'copa-argentina'
  short_name    String?
  neutral_venue Boolean @default(false)   // true en la Copa: no se dice "local"/"visitante"
  seasons       CompetitionSeason[]
}

enum CompetitionFormat {
  LIGA_DIVIDIDA          // Apertura / Clausura (Liga Profesional)
  LIGA                   // todos contra todos
  ELIMINACION            // Copa Argentina
  GRUPOS_Y_ELIMINACION   // Libertadores, Sudamericana
}

model CompetitionSeason {
  id                     String            @id @default(uuid())
  league_id              String
  season                 Int               // año de inicio: 2026
  label                  String            // lo que se muestra: '2026' o '2026/27'
  format                 CompetitionFormat
  is_current             Boolean           @default(false)
  sync_enabled           Boolean           @default(true)
  bets_enabled           Boolean           @default(false)
  fixtures_sync_minutes  Int               @default(10)
  standings_sync_minutes Int?              // null = el formato no tiene tabla
  starts_on              DateTime?
  ends_on                DateTime?
  last_fixtures_sync_at  DateTime?
  last_standings_sync_at DateTime?
  league                 Leagues           @relation(fields: [league_id], references: [id])

  @@unique([league_id, season])
}
// + índice único parcial en SQL: una sola temporada actual por competición
//   CREATE UNIQUE INDEX ... ON "CompetitionSeason"(league_id) WHERE is_current;

model Market {
  // … columnas actuales …
  match_id String?   // vínculo interno con Matches (RF-A12); fixtureId queda histórico
}
```

- **Backfill:** `slug = 'liga-profesional'` para la liga `api_league_id = 128`; una
  `CompetitionSeason` 2026 (`LIGA_DIVIDIDA`, actual, con apuestas, cada 10 minutos: lo que hace hoy);
  `Market.match_id` completado desde `fixtureId` para todos los mercados existentes.
- **`Matches.tournament`** sigue siendo "fase dentro de la temporada": `APERTURA` / `CLAUSURA` en la
  liga, `ELIMINACION` en la Copa, `GRUPOS` / `ELIMINACION` en Libertadores.
- **`Rounds`** se empieza a usar: cada estrategia registra las rondas con su **orden**.

### 5.2 Crons

| Cron | Hoy | Propuesto |
|---|---|---|
| `fixtures-sync` | Liga `128`, temporada `2026`, cada 10 min | Recorre las temporadas con `sync_enabled`; sincroniza las que cumplieron su intervalo. La estrategia del formato traduce rondas y fases. Si cambia la fecha de un partido, recalcula el cierre de su mercado (RF-A13a). |
| `standings` | Liga `128`, cada 10 min | Solo temporadas con `standings_sync_minutes` |
| `LiveScoreCron` | Liga del primer partido activo | Agrupa los partidos activos por competición. Cierra el mercado cuando el partido empieza (RF-A13b). |
| Eventos, alineaciones, estadísticas, prematch | Por partido `tracked` | **Sin cambios** |
| `bets-cron` | Mercados 1X2 "Torneo Argentino", por `api_fixture_id` | Solo temporadas con `bets_enabled`; título de la competición; vínculo y liquidación por `match_id` |

### 5.3 API para el usuario

Rutas nuevas, todas con competición. **Solo responden la temporada actual** (RF-A04): una temporada
anterior devuelve 404. Las rutas actuales de la Liga quedan como alias hasta que el front migre.

| Método y ruta | Devuelve |
|---|---|
| `GET /competitions` | Competiciones activas: slug, nombre, logo, formato, si es cancha neutral, temporada actual |
| `GET /competitions/:slug` | Temporada actual: formato, fases y rondas en orden, ronda en juego |
| `GET /competitions/:slug/matches?round=&from=&to=&page=` | Partidos de la temporada actual (rango acotado, paginado) |
| `GET /competitions/:slug/live` | Marcadores en vivo |
| `GET /competitions/:slug/standings` | Tabla (404 si el formato no tiene) |
| `GET /competitions/:slug/bracket` | Cuadro (formatos con eliminación) |
| `GET /matches/:matchId` | Detalle de un partido, incluida su competición y si es cancha neutral (hoy el front escribe la liga a mano) |

Sockets: la sala del fixture en vivo pasa a ser por competición (validada, RNF-S03), sin el `'128'`.
Las salas por partido no cambian.

Administración (solo ADMIN, auditado):

| Método y ruta | Uso |
|---|---|
| `POST /admin/competitions/:slug/seasons` | Alta de una temporada (formato, etiqueta, fechas, frecuencias) |
| `PATCH /admin/competitions/:slug/seasons/:season` | Activar sync, apuestas, marcar como actual |
| `PUT /admin/competitions/:slug/seasons/:season/bracket` | Carga del sorteo (§7.4) |
| `PATCH /admin/competitions/:slug/seasons/:season/bracket/:slot` | Corrección manual de una llave |

### 5.4 Frontend

- **Página genérica de competición** `/torneos/[slug]`, con pestañas según el formato: *Partidos*
  (por ronda o fecha), *Tabla* (si tiene) y *Cuadro* (si tiene eliminación). Siempre la temporada actual.
- **La Liga Profesional conserva su vista actual** (Apertura/Clausura, anual, promedios, simulador):
  no se migra a la página genérica en esta etapa.
- `CompetitionSidebarSelector` y las páginas de partido leen la competición de la API.
- **Cancha neutral:** en competiciones con `neutral_venue` el front no muestra "local" ni "visitante"
  en ninguna pantalla (partido, fixture, cuadro, apuestas).
- **Chat:** el front abre y cierra el chat según lo que diga el backend (RF-A14), sin lógica propia
  basada en alineaciones.
- `leagueData2026.ts` se reemplaza por datos de `LeagueTeams` y de la tabla.

### 5.5 Preparar una temporada nueva (cada año)

1. `POST /admin/competitions/:slug/seasons` con el año, la etiqueta y el formato (sin apuestas).
2. Script de vinculación con `--dry-run`: equipos y partidos del proveedor contra la base.
3. Revisar el informe: equipos aproximados a confirmar, equipos nuevos a crear (RF-A10).
4. `--apply`: crea los equipos nuevos (con escudo en Cloudinary), vincula todo y registra los
   participantes.
5. En la Copa, cargar el sorteo (§7.4).
6. Cuando termina la temporada anterior, marcar la nueva como actual y activar las apuestas.

---

## 6. Parte B — Copa Argentina

> Verificado con datos reales de Highlightly (temporadas 2025 y 2026, 125 partidos, 2026-10-21).

### 6.1 Cómo funciona el torneo

- Eliminación directa a **partido único**, **siempre en cancha neutral**.
- **64 equipos y 63 partidos** por temporada: Primera División y categorías inferiores (Primera
  Nacional, Primera B, Federal A, Primera C), por ejemplo Deportivo Camioneros, Tristán Suárez o
  Deportivo Armenio.
- **Seis rondas:** 32avos (32 partidos), 16avos (16), octavos (8), cuartos (4), semifinal (2) y final (1).
- **Sin alargue:** si termina igualado se define directamente por **penales**. En dos temporadas hubo
  32 partidos por penales y ninguno "tras alargue".
- Se juega de enero a noviembre, con semanas o meses entre rondas. Una edición nunca empieza sin que
  termine la anterior.
- El campeón clasifica a la Copa Libertadores y a la Supercopa Argentina.
- En Highlightly la competición es `111414`. La temporada 2026 va por semifinales: la final todavía
  no figura en los datos (se agrega cuando se conocen los finalistas).

### 6.2 Requisitos funcionales

| ID | Requisito |
|---|---|
| **RF-B01** | La Copa se registra como competición `copa-argentina` (cancha neutral) con temporada 2026 de formato `ELIMINACION`. |
| **RF-B02** | Se sincroniza **una vez por día**; durante los partidos rigen los crons de vivo como en la liga. |
| **RF-B03** | Los partidos tienen marcador, eventos, alineaciones y estadísticas en vivo, con la misma pantalla de partido que la liga, **sin "local" ni "visitante"**. |
| **RF-B04** | **Cuadro completo desde el inicio**, con los lugares por definir. |
| **RF-B05** | El sorteo se carga **una sola vez por temporada** (§7.4). Al terminar un partido, el ganador avanza solo a su lugar del cuadro. |
| **RF-B06** | Avanza el ganador **por penales** si el partido terminó igualado, y el ganador **en escritorio** (`AWD`, `WO`) si se resolvió así. |
| **RF-B07** | **Mercados en todos los partidos, 1X2 sobre el resultado de los 90 minutos.** Un partido definido por penales es **empate**, sin importar quién ganó la tanda. Es la regla que ya aplica `match-outcome.util.ts`. |
| **RF-B08** | Los equipos que no existen en la base se crean al preparar la temporada (RF-A09, RF-A10, RF-A11b). |
| **RF-B09** | Página `/torneos/copa-argentina` con pestañas *Partidos* (por ronda) y *Cuadro*. |
| **RF-B10** | **Las rondas se deducen por la cantidad de partidos**, no por el nombre del proveedor (los 32avos fueron `1st Round` en 2025 y `Round of 64` en 2026): 32 → 32avos, 16 → 16avos, 8 → octavos, 4 → cuartos, 2 → semifinal, 1 → final. |
| **RF-B11** | La pantalla del partido muestra lo que haya: en partidos con equipos del Ascenso puede no haber alineaciones y haber pocas estadísticas (§6.4). |
| **RF-B12** | El administrador puede **corregir una llave** del cuadro si un dato del proveedor la dejó mal; la corrección queda auditada. |

### 6.3 Modelo de datos del cuadro

```prisma
model BracketSlot {
  id                    String   @id @default(uuid())
  competition_season_id String
  round_order           Int      // 1 = 32avos … 6 = final
  position              Int      // lugar dentro de la ronda, de arriba hacia abajo
  match_id              String?  @unique   // se completa cuando el partido existe
  home_team_id          String?
  away_team_id          String?
  winner_team_id        String?
  manually_corrected    Boolean  @default(false)

  @@unique([competition_season_id, round_order, position])
}
```

- **Estructura implícita:** el ganador de la llave `p` de la ronda `r` va a la llave `⌈p / 2⌉` de la
  ronda `r + 1` (el 1 con el 2, el 3 con el 4…). No hace falta guardar de dónde viene cada lugar.
- Al cargar el sorteo se crean las 63 llaves: las 32 de 32avos con sus equipos y las demás vacías.
- Cuando el cron cierra un partido se completa `winner_team_id` y se propaga a la llave siguiente.
- Un partido del proveedor se asocia a su llave por equipos y ronda.

### 6.4 Datos que se necesitan del proveedor

| Dato | Endpoint de Highlightly | Ya soportado |
|---|---|---|
| Partidos de la temporada y sus rondas | `/matches?leagueId=111414&season=2026` | Sí (`getFixtures`) |
| Marcador en vivo y penales | `/matches?leagueId=…&date=…` | Sí (`getLiveFixtures`) |
| Eventos | `/events/{id}` | Sí |
| Alineaciones | `/lineups/{id}` | Sí, **pero no en todos los partidos** |
| Estadísticas | `/statistics/{id}` | Sí, **parciales en partidos chicos** |
| Equipos | De los partidos (no hay endpoint por liga) | Sí |
| Cuadro / orden del sorteo | **No disponible** | Carga única (§7.4) |
| Tabla | No aplica | — |

**Cobertura medida** en un partido de 32avos entre un equipo de Primera y uno de la B Metro
(Independiente Rivadavia - Estudiantes de Buenos Aires):

| Dato | Resultado |
|---|---|
| Marcador y penales | Completo |
| Eventos | Completo (15: goles, tarjetas y cambios, con minuto y jugador) |
| Alineaciones | **No hay** (formación `Unknown`, sin jugadores) |
| Estadísticas | **9 métricas** (un partido de Liga trae ~40) |

Conclusión: marcador, eventos y minuto en vivo están garantizados. Alineaciones y estadísticas
completas son probables solo entre equipos de Primera; se confirma en la primera ronda que se siga
en vivo. El cron de alineaciones deja de consultar cuando el partido termina: un partido sin
alineaciones gasta como mucho ~30 pedidos de más.

Impacto en la cuota: la sincronización diaria agrega 1 pedido por día; cada partido en vivo suma lo
mismo que uno de la liga (~180 pedidos). Se agrega a la calculadora antes de activar.

---

## 7. Decisiones

### 7.1 Tomadas

| ID | Decisión |
|---|---|
| D-01 | Sin modelos aparte por competición: todo cuelga de `league_id` + `season`. |
| D-02 | Equipos en una sola tabla; participación por temporada en `LeagueTeams`. |
| D-03 | Identidad de competición por `slug`, no por IDs de proveedor ni UUID de una base. |
| D-04 | Copa: cuadro completo desde el inicio, con el orden del sorteo cargado una vez por temporada. |
| D-05 | Copa: mercados de apuestas en todos los partidos. |
| D-06 | Front: página genérica de competición. **La Liga conserva su vista actual.** |
| D-07 | Escudos: logo del proveedor copiado a Cloudinary como respaldo. |
| D-08 | Mercado de la Copa: 1X2 sobre los 90 minutos; por penales es empate. |
| D-09 | Postergados, cancelados y resueltos en escritorio se reembolsan al instante (regla actual). |
| D-10 | El ganador en escritorio (`AWD`, `WO`) avanza en el cuadro. |
| D-11 | El chat se abre al empezar el partido y se cierra al terminar, siempre (backend y front). |
| D-12 | En la Copa no se muestra "local" ni "visitante": siempre es cancha neutral. |
| D-13 | Solo se muestra la temporada actual de cada competición; las anteriores quedan guardadas. |

### 7.2 Correcciones respecto del borrador

- Se elimina la validación del resultado contra los eventos antes de liquidar: la regla de los 90
  minutos ya está en `match-outcome.util.ts` (`AET` y `PEN` son empate) y la validación podía fallar
  por la cobertura parcial del Ascenso.

### 7.3 Pendientes

Ninguna decisión funcional pendiente. Quedan las revisiones técnicas de cada fase.

### 7.4 Carga del sorteo

Highlightly ya trae los 32 cruces de 32avos con sus equipos. Lo que falta es el **orden del cuadro**:
se carga **una sola vez por temporada**, como un JSON con los 32 cruces en el orden del cuadro
oficial, de arriba hacia abajo, con los nombres de los equipos (sin IDs):

```json
{
  "competition": "copa-argentina",
  "season": 2026,
  "firstRound": [
    ["River Plate", "Ciudad de Bolívar"],
    ["Gimnasia y Esgrima de Mendoza", "Gimnasia y Tiro"]
  ]
}
```

Validaciones (si una falla se rechaza todo, RNF-S05):

- Exactamente 32 cruces y 64 equipos distintos.
- Cada equipo se resuelve a uno solo de la base; si un nombre es ambiguo, se rechaza indicando cuál.
- Cada cruce coincide con un partido real de 32avos de esa temporada.

Una vez guardado, el cuadro avanza solo. Las rondas ya jugadas se reconstruyen desde los partidos.

---

## 8. Plan por fases

Cada fase es un PR independiente contra la rama de integración. Las fases 1 a 5 no cambian lo que
ve el usuario de la Liga.

| Fase | Contenido | Requisitos |
|---|---|---|
| 1 | `Leagues.slug`, `CompetitionSeason` (una actual por competición), backfill de la Liga 2026 | RF-A01, RF-A02, RF-A04, RF-A05 |
| 2 | **Apuestas:** `Market.match_id` con backfill, liquidación por `match_id`, cierre al empezar y recálculo al reprogramar, `bets_enabled`, título por competición | RF-A12, RF-A13 a RF-A13d |
| 3 | **Chat** abierto y cerrado por el estado del partido, en backend y front | RF-A14 |
| 4 | Crons por temporada activa, live por competición, estrategias de formato | RF-A06 a RF-A08 |
| 5 | Alta controlada de equipos, escudos y participantes en el script de vinculación | RF-A09 a RF-A11b |
| 6 | API por competición (con alias y seguridad), salas de socket, front leyendo `GET /competitions` | RF-A03, RNF-S01 a RNF-S03 |
| 7 | Copa Argentina: estrategia `ELIMINACION`, cuadro con carga y corrección, página, cancha neutral | Parte B, RNF-S04, RNF-S05 |

Las fases 2 y 3 arreglan problemas que **ya existen en la Liga** (H-4 y H-5): conviene hacerlas
primero aunque la Copa tarde.

---

## 9. Casos críticos considerados

| Caso | Comportamiento esperado |
|---|---|
| Partido adelantado con el mercado abierto | Se recalcula el cierre; si ya empezó, se cierra en el acto (RF-A13). |
| Partido postergado | Mercado reembolsado al instante (D-09). |
| Partido por penales | Mercado: empate. Cuadro: avanza el ganador de la tanda (RF-B06, RF-B07). |
| Partido resuelto en escritorio | Mercado reembolsado; avanza el ganador administrativo (D-09, D-10). |
| Partido sin alineaciones | Chat abierto igual; pantalla sin alineaciones (RF-A14, RF-B11). |
| Dos competiciones con partidos en vivo a la vez | El live score consulta una vez por competición (RF-A07). |
| Final que aparece en el proveedor días antes de jugarse | La sincronización diaria la crea y se asocia a la llave de la final por equipos. |
| Dato malo del proveedor deja mal una llave | Corrección manual auditada (RF-B12). |
| Equipo nuevo con nombre parecido a uno existente | No se fusiona solo: se confirma a mano (RF-A10). |
| Nombre de ronda nuevo del proveedor | No afecta: las rondas se deducen por cantidad de partidos (RF-B10). |
| Competición agregada antes de estar lista | Sin apuestas hasta activarlas (RF-A13c). |

---

## 10. Riesgos

| Riesgo | Mitigación |
|---|---|
| Highlightly sin alineaciones y con pocas estadísticas en partidos del Ascenso (**medido**) | La pantalla maneja datos faltantes; el en vivo de marcador y eventos sí está |
| Nombres de rondas distintos entre años (**medido**) | Rondas por cantidad de partidos, con tests sobre 2025 y 2026 |
| Fusionar dos clubes distintos al dar de alta equipos | RF-A10: solo coincidencia exacta automática; lo demás, confirmación manual |
| Romper la Liga al parametrizar rutas o mercados | Alias de rutas, backfill de `match_id`, tests, suite e2e y `backend-reviewer` |
| Imágenes del proveedor que dejan de estar disponibles o no se pueden enlazar | Copia a Cloudinary al dar de alta (RF-A11b) |

---

## 11. Fuera de alcance, para después

- **Rankings de goleadores, asistencias y tarjetas.** Highlightly no tiene endpoint de ranking; se
  calcula desde `MatchEvents`, por competición y temporada, con cero pedidos. Requiere unificar los
  jugadores duplicados entre proveedores.
- Ver temporadas anteriores (historial): los datos quedan guardados para habilitarlo más adelante.
- B Nacional, Libertadores y Sudamericana: cada una es una `CompetitionSeason` más con su formato.
