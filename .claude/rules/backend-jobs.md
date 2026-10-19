---
paths:
  - "backend/src/**/*cron*.ts"
  - "backend/src/**/*.processor.ts"
  - "backend/src/**/*.listener.ts"
  - "backend/src/api-football/**"
  - "backend/src/polls/task.service.ts"
  - "backend/src/stats/**"
---

# Crons, colas BullMQ e ingesta de API-Football (backend)

## Crons (`@nestjs/schedule`)

- `@nestjs/schedule` **no** evita que dos ejecuciones se pisen: si una corrida tarda más que el intervalo (el live score corre cada 30 s), arranca otra en paralelo. Todo cron tiene que ser idempotente y, si escribe, usar escrituras condicionales (`updateMany({ where: { id, status: <leído> } })`, flags como `market_created: false`).
- Si hace falta exclusión real (por ejemplo, para correr varias instancias del backend), lock en Redis con `SET <key> 1 'EX' <ttl> 'NX'` y salir si no se obtiene.
- Envolvé el cuerpo en `try/catch` y logueá con `this.logger`. Dentro de un loop, un error de un ítem no tiene que cortar a los demás (`try/catch` por ítem, como `handleMarketAutoCreation`).
- Procesá en lotes (`take: 50` + loop) cuando la consulta puede traer muchas filas, como en `subscriptions.cron.ts`.
- Logs de cada tick en `debug`, no en `log`: si no, ensucian la consola cada pocos segundos.
- Los crons no emiten por socket: publican en Redis (`match_updates`, `league_live_updates`) y el gateway re-emite. Para avisar a otro módulo, `eventEmitter.emit('dominio.accion', payload)`.

## API-Football

- Toda llamada pasa por `ApiFootballHttp` (`src/api-football/http/`). No crees otro cliente axios con la API key.
- Cada request consume cuota del plan. Antes de agregar un cron que llame a la API, bajar un intervalo o sacar el filtro `tracked: true`, avisá cuántas requests por día suma.
- Leé primero de la DB o de Redis y llamá a la API solo para lo que cambió o está en vivo.
- Los mapeos de la API van en `mappers/` y los upserts en `upserts/`. No mezcles el formato crudo de la API con el modelo de Prisma en el cron.
- Liga y temporada: no sumes más `128` / `2026` hardcodeados (ya hay varios). Usá `ID_LEAGUE_ARG` del `ConfigService` o una constante compartida.
- Al terminar un partido o cambiar un fixture, invalidá las keys de Redis afectadas (`match:details:v1:<id>`, `fixtures:...`, `live_scores:league:<id>`).

## BullMQ

- Cola registrada en el módulo con `BullModule.registerQueue({ name })`, inyectada con `@InjectQueue(name)`; el worker extiende `WorkerHost` con `@Processor(name)`. Hoy existe `bets-queue` (job `persist-bet`).
- Los jobs pueden ejecutarse más de una vez (reintentos, caída del worker): el procesamiento tiene que ser idempotente. Usá un id generado antes de encolar (como `betId`) para que un segundo intento choque contra el unique en vez de duplicar.
- El payload del job es JSON: nada de `Date`, clases ni `BigInt`. Mandá timestamps numéricos y reconstruí (`new Date(timestamp)`).
- Si el job falla, logueá y **relanzá** el error para que BullMQ lo marque como fallido. No lo tragues.
- Un `process()` que recibe un `job.name` que no conoce tiene que loguearlo; hoy se ignoran en silencio.

## Listeners (`@OnEvent`)

- Atrapan sus propios errores y no relanzan: el que emitió el evento ya terminó su flujo.
- Notificaciones al usuario: `NotificationsService` para persistir + método del `ChatGateway` para el push a la sala `user:<id>`.
