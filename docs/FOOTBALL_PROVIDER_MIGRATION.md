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
2. **Vincular los IDs** de Highlightly con los de la base y preparar la temporada (equipos,
   partidos, participantes y escudos). Dry-run primero, después `--apply`; se puede repetir sin
   duplicar:

   ```bash
   # desde el contenedor del backend (tiene la DATABASE_URL, tsconfig-paths y CLOUDINARY_*)
   docker exec football_backend npx ts-node -r tsconfig-paths/register scripts/link-provider-ids.ts      --slug liga-profesional --season 2026 --league-ext 109712 --decisions /tmp/liga.json        # informe
   docker exec football_backend npx ts-node -r tsconfig-paths/register scripts/link-provider-ids.ts      --slug liga-profesional --season 2026 --decisions /tmp/liga.json --apply                    # escribe
   ```

   - La competición se identifica por su `slug` y la temporada tiene que existir en la base.
     `--league-ext` (ID de la liga en Highlightly) hace falta solo la primera vez.
   - **Equipos (ERS RF-A10):** los ya vinculados entran por su vínculo; solo el nombre exacto y
     único se vincula solo. Todo lo que se parezca a un equipo libre de la base (por nombre o por
     calendario) queda **a confirmar**, y lo que no se parece a nada queda **a crear**.
   - **Archivo de decisiones:** si `--decisions` apunta a un archivo que no existe, la pasada en seco
     lo escribe con los equipos a confirmar (`pending`, con sus candidatos) y a crear (`create`).
     Se edita (`link` + `teamId`, `create` + `name` para corregir el nombre, `skip`) y se vuelve a
     correr con el mismo `--decisions`. Si una decisión es inválida no se aplica nada.
   - **Con `--apply`:** crea los equipos nuevos junto con su vínculo, escribe los vínculos de liga,
     equipos y partidos, registra los participantes en `LeagueTeams` y copia a Cloudinary
     (carpeta `team-badges`) el escudo de cada participante que todavía no esté ahí.
   - Sin `--source-file` pide la temporada a Highlightly (unos 5 pedidos, necesita
     `HIGHLIGHTLY_API_KEY`). Con `--source-file <json>` usa partidos ya bajados y no hace pedidos.

   Nota: Highlightly nombra distinto las fechas del Apertura (`Regular Season - N`) que la base
   (`Apertura - N`); el script compara con la ronda que traduce la estrategia del formato. Los
   partidos con ronda distinta *y* más de 72 h de diferencia no se aplican solos: quedan en "a revisar".
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
   - **Orden de `/last-five-games` y `/head-2-head`: verificado, vienen del más reciente al más
     viejo.** `form` se muestra en el orden recibido (`RecentForm.tsx`), así que con Highlightly el
     último partido queda a la izquierda. Falta confirmar qué orden entregaba API-Football; si era
     del más viejo al más reciente hay que ordenar por fecha en `PrematchServiceApi`.
   - Verificado con una respuesta real: los eventos vienen en orden cronológico, `statistics[0]` es
     el local, y las sustituciones traen `assistingPlayerId` y el nombre del que entra.

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

## Activar la Copa Argentina

La Copa se crea apagada (migración `add_copa_argentina`): ni sincroniza ni tiene apuestas, pero ya
aparece en `GET /competitions` y en el menú de Ligas. Pasos, con `FOOTBALL_PROVIDER=highlightly`:

1. **Migraciones** (`migrate deploy` en prod): `add_copa_argentina`, `add_bracket_slots` y
   `add_bracket_draw_and_audit`. Son aditivas.
2. **Vincular la liga y dar de alta los equipos** con el script de vinculación. La primera vez lleva
   `--league-ext 111414`; revisá el archivo de decisiones antes del `--apply`:

   ```bash
   docker exec football_backend npx ts-node -r tsconfig-paths/register scripts/link-provider-ids.ts \
     --slug copa-argentina --season 2026 --league-ext 111414 --decisions /tmp/copa.json
   docker exec football_backend npx ts-node -r tsconfig-paths/register scripts/link-provider-ids.ts \
     --slug copa-argentina --season 2026 --decisions /tmp/copa.json --apply
   ```

   Crea los equipos que faltan con su escudo en Cloudinary y registra los 64 participantes.
3. **Activar la sincronización** (una vez por día):

   ```sql
   UPDATE "CompetitionSeason" cs SET sync_enabled = true, last_fixtures_sync_at = NULL
   FROM "Leagues" l WHERE l.id = cs.league_id AND l.slug = 'copa-argentina' AND cs.season = 2026;
   ```

   `last_fixtures_sync_at = NULL` hace que sincronice en el minuto siguiente. La primera corrida crea los
   partidos de la temporada, con la ronda deducida por cantidad de partidos, y arma el cuadro
   reconstruyéndolo desde lo jugado.
4. **Sorteo (opcional).** Si el cuadro reconstruido queda espejado respecto del oficial, o en una
   temporada nueva sin rondas jugadas, el presidente carga el orden oficial con
   `POST /admin/competitions/copa-argentina/bracket/draw`. Una llave mal resuelta (por ejemplo un W.O.
   sin marcador) se corrige con `PATCH .../bracket/slots/:ronda/:lugar`. Todo queda auditado en
   `GET .../bracket/changes`.
5. **Apuestas**: recién cuando se decida, `bets_enabled = true` en la misma temporada. El mercado es 1X2
   sobre los 90 minutos y un partido definido por penales es empate.

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

**Con la Copa Argentina** (datos reales: 63 partidos, sincroniza una vez por día y no tiene tabla) un día
sin partidos suma 1 pedido. Un día con 7 partidos de Liga y 2 de Copa gasta ~49 %; el peor día (15 de Liga
7 a la vez + 4 de Copa 2 a la vez) llega a ~78 % con la config actual y ~54 % con la optimizada.

B Nacional, Libertadores y Sudamericana siguen como **estimaciones** en la calculadora
(`node scripts/dev/football-quota.mjs`): completalas con datos reales antes de activarlas.

Optimizaciones disponibles (no aplicadas): `fixtures-sync` cada 30 min en vez de 10 (es un dato de la
temporada: `CompetitionSeason.fixtures_sync_minutes`), pedir eventos
solo desde el pitazo, y tomar las estadísticas del detalle del partido (`/matches/{id}` ya trae
eventos y estadísticas en una sola llamada).
