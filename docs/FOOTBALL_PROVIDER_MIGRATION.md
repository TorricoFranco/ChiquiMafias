# Migración del proveedor de datos deportivos (API-Football → Highlightly)

Estado, decisiones y checklist de corte. La rama de integración es
`feat/highlightly-migration`; el proveedor se elige con `FOOTBALL_PROVIDER`
(`api-football` por defecto).

## Cómo está armado

- `backend/src/football/football-data.provider.ts`: puerto `FootballDataProvider`. Los crons y
  servicios solo hablan con él y con los tipos de `football.types.ts`.
- `providers/api-football/` y `providers/highlightly/`: cada uno traduce su formato crudo al contrato.
- `services/refs.service.ts` (`FootballRefsService`): traduce entre entidades internas (uuid) y los
  IDs del proveedor activo.
  - Con `api-football`: usa las columnas `api_*` y los upserts de siempre (comportamiento histórico).
  - Con otro proveedor: usa la tabla `ProviderRef`. **No crea** equipos, ligas ni partidos sin vincular
    (los saltea con un warning). Sí crea jugadores nuevos (sin `api_id`) y los vincula.
- Las columnas `Teams.api_team_id`, `Matches.api_fixture_id`, `Leagues.api_league_id` y `Players.api_id`
  son opcionales: las entidades creadas desde otro proveedor no las tienen.

## Variables de entorno

| Variable | Uso |
|---|---|
| `FOOTBALL_PROVIDER` | `api-football` (default) o `highlightly` |
| `API_FOOTBALL_KEY` | obligatoria con `api-football` |
| `HIGHLIGHTLY_API_KEY` | obligatoria con `highlightly` |

## Checklist de corte a Highlightly (dev y prod)

**No activar `FOOTBALL_PROVIDER=highlightly` antes de completar los puntos 1 a 3.** Sin vínculos, los
partidos no se actualizan.

1. **Aplicar las migraciones** (`npx prisma migrate dev` en dev; `migrate deploy` en prod, después de
   verificar el estado real de las migraciones del VPS). Hacerlo fuera de partidos en vivo: el
   `ALTER TABLE` toma un lock exclusivo por un instante.
2. **Vincular los IDs** de Highlightly con los de la base: equipos por nombre, partidos por
   local + visitante + ronda. Ver `PR de vinculación` (pendiente).
3. **Mercados abiertos (dinero).** Todo partido con un mercado `OPEN` o `LOCKED` tiene que tener su
   `ProviderRef` de `highlightly`; si no, no se actualiza ni se cierra y el mercado no se liquida.

   ```sql
   SELECT m.id, mk.status
   FROM "Market" mk
   JOIN "Matches" m ON m.api_fixture_id = mk."fixtureId"
   WHERE mk.status IN ('OPEN', 'LOCKED')
     AND NOT EXISTS (
       SELECT 1 FROM "ProviderRef" r
       WHERE r.entity = 'MATCH' AND r.entity_id = m.id AND r.provider = 'highlightly'
     );
   ```

   Tiene que devolver 0 filas. Idealmente, cortar entre fechas, sin partidos en juego.
4. Poner `HIGHLIGHTLY_API_KEY` y `FOOTBALL_PROVIDER=highlightly`, reiniciar, y mirar los logs del primer
   ciclo (`Equipo sin vincular`, `Partido activo … sin ID`).
5. Comparar contra API-Football en un partido en vivo: orden de `form` (últimos 5), sustituciones
   (`player` sale, `assist` entra), estados durante el juego.

## Volver a API-Football después de usar Highlightly

Los partidos creados bajo Highlightly tienen `api_fixture_id` en `null`. Volver a `api-football` crearía
duplicados de esos partidos y los ignoraría. Antes de volver hace falta un paso de reconciliación
(inverso a la vinculación). Las migraciones tampoco se pueden revertir a `NOT NULL` si ya hay filas
con `null`.

## Pendientes conocidos

- **Mercados de apuestas** solo se abren para partidos con `api_fixture_id` (la liquidación busca por
  ese campo). Un partido que cree solo Highlightly, como un playoff nuevo, no tiene mercado.
- `LiveScoreCron` toma la liga del primer partido activo: con dos ligas en juego una queda sin
  actualizar. Se resuelve al configurar las competiciones.
- Los nombres de jugadores en alineaciones de Highlightly vienen abreviados (`J. Randazzo`) y en eventos
  completos: el nombre guardado puede alternar. Un mismo jugador puede quedar duplicado (uno con ID de
  API-Football, otro de Highlightly).
- `stats_updated` llega con `stats: undefined` al front (el gateway lee `payload.stats` pero el cron
  publica un array). Es anterior a esta migración.
- `lineups-fetch` no tiene ventana de fecha: un partido viejo sin vínculo vuelve a avisar cada 5 min.

## Cuota de pedidos (Highlightly: 7.500 por día)

Calculadora: `node scripts/dev/football-quota.mjs`. Hace cero pedidos; los intervalos salen de los
crons. Para sumar una liga, completá su bloque en `LEAGUES` (`enabled: true`) con sus partidos por
temporada y por fecha.

Liga Profesional sola (15 partidos por fecha, límite 7.500):

| Día | Config actual | Optimizada |
|---|---|---|
| Sin partidos | 864 (11,5 %) | 384 (5,1 %) |
| 7 partidos, 4 a la vez | 2.740 (36,5 %) | 1.791 (23,9 %) |
| 14 partidos, 7 a la vez (pico) | 4.056 (54,1 %) | 2.638 (35,2 %) |
| Fecha completa en un día | 4.524 (60,3 %) | 3.039 (40,5 %) |

Pico de ritmo: ~11 pedidos por minuto con 7 partidos a la vez.

Con las 5 ligas activas (Copa Argentina, B Nacional, Libertadores y Sudamericana son **estimaciones**) un
día sin partidos gasta ~42 % y el pico llega a ~85 % con la config actual; con la optimizada, ~50 %.

Optimizaciones disponibles (no aplicadas): `fixtures-sync` cada 30 min en vez de 10, pedir eventos
solo desde el pitazo, y tomar las estadísticas del detalle del partido (`/matches/{id}` ya trae
eventos y estadísticas en una sola llamada).
