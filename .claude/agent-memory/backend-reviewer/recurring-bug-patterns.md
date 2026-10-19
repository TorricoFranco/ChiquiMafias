---
name: recurring-bug-patterns
description: Patrones de bug de auth/guards, sanciones, sockets y caché que se repiten en el backend de ChiquiMafias; revisarlos en cada review que toque controllers, gateways o servicios con caché
metadata:
  type: project
---

Patrones vistos en las revisiones del 2026-10-05 (cierre de rutas admin, jerarquía de sanciones, auth de sockets):

- `@Roles(...)` sin `@UseGuards(RolesGuard)` es solo metadata y no restringe nada. `@Public()` + `@Roles` deja la ruta en 403 permanente. Las dos combinaciones las detecta `src/auth/roles-guard-coverage.spec.ts`, junto con `@RequireTier` sin `TiersGuard`.
- Decoradores de ruta apilados por copy-paste (`@Get('x')` + `@Post('admin/add-coins')`): gana el de arriba y el resto se ignora sin avisar.
- Endpoints de debug o "prueba temporal" que quedan accesibles, o caché comentada antes de llamar a API-Football: cada request gasta cuota. Revisá cualquier ruta que llame a `ApiFootballHttp`.
- Sanciones: la regla es `assertCanSanction` (src/auth/utils), que lee los roles de la DB y exige un rol estrictamente superior. Toda acción nueva de ban, mute o timeout tiene que pasar por ahí. Un camino nuevo que sancione sin esa función es un bug.
- `role` e `isBanned` del HTTP salen del payload del JWT (jwt.strategy), con hasta 15m de atraso. Para decisiones de privilegio, leer el rol de la DB.
- Sockets: autenticar en `handleConnection` deja una carrera, porque Nest suscribe los handlers antes de que termine el await y un mensaje temprano rebota en `WsJwtGuard`. `/bets` ya usa un middleware `namespace.use` en `afterInit`. Al 2026-10-05, chat.gateway y matches.gateway (namespace por defecto) seguían autenticando en `handleConnection`.
- Fallback "stale" que lee la misma key con TTL que acaba de dar miss: es código muerto. Para tener stale real hace falta una segunda key con TTL más largo. En `getAggregatedData` (matches.service) se corrigió el 2026-10-05 con `pre_match:v2:stale:<id>` (TTL 7 días).
- Lectura de estado y después `update` sin condición (TOCTOU): en `resolveReport` se corrigió con `updateMany` + `count === 0`. Buscar el mismo patrón en otros cambios de estado.
- Agregado el 2026-10-06. Estado en una key de Redis que reemplaza un claim sin fallback: si la key falta, el claim del JWT se ignora. Corregido en `UserStatusGuard` (segunda pasada, 2026-10-06): sin key + token baneado → consulta la DB (si falla, queda baneado); Redis no listo o >200 ms → claim del token. Hueco aceptado: baneado sin key y con token viejo `isBanned:false` queda libre hasta el refresh (≤15m). Hueco abierto: key `'true'` gana siempre sobre la DB, así que un DEL fallido en `applyUnban` o un ban/unban concurrente deja al usuario bloqueado hasta reiniciar (propuesto: ir a la DB cuando key y token no coinciden).
- Agregado el 2026-10-06. Escrituras en Redis dentro de una transacción Prisma (antes del commit): `settleMarket` hace `redis.set(wallet:...)` por apuesta dentro de la tx (timeout default 5s) y `subtractCoins` con `txClient` también. Si la tx hace rollback, Redis queda con saldo fantasma y Lua deja apostarlo. `settleMarket` además pone `status SETTLED` en Redis antes de validar. Buscar el patrón en cualquier cambio que toque saldo o estado.
- Agregado el 2026-10-06. Apuestas: `placeBet` debita en Redis (Lua) y persiste por BullMQ (`persist-bet`, sin `attempts`, el processor no mira el estado del mercado). `settleMarket` lee apuestas y `totalStaked` de la DB, así que un settle antes de que corra el job deja la apuesta PENDING con el débito hecho. Cualquier test o flujo que liquide justo después de apostar tiene que esperar la persistencia.
- Agregado el 2026-10-06. DTOs nuevos en endpoints servicio a servicio (bot de Discord): con `forbidNonWhitelisted` e `@IsNotEmpty` pueden rechazar payloads reales del bot, y el bot no mira la respuesta, así que se pierden en silencio. Hay que contrastarlos con lo que manda `discord-bot/index.js` y `src/interactions/`.
- Límites de Discord: cualquier texto de usuario que se reenvía necesita `MaxLength` (contenido 2000, campo de embed 1024). Los tickets ya lo tienen. Los reportes (`details`) no lo tenían al 2026-10-06.

- Agregado el 2026-10-07 (rebalanceo de economía). Prisma: un campo `undefined` en `where` desaparece del filtro. En `updateMany` eso pega a toda la tabla (`handlePaymentFailure` con `mpExternalRef: paymentDetails.external_reference`). Cualquier `where` armado con datos de MP o del cliente necesita un guard `if (!x) return` antes.
- Suscripciones: decisión del usuario (2026-10-07): el alta sale solo con el primer cobro aprobado (`subscription_authorized_payment` `processed`); el preapproval autorizado se ignora. Lo que dependa de una key de Redis creada en el checkout tiene que sobrevivir días de `recycling` (la de upgrade pasó a 15 días y el alta vence las otras ACTIVE/GRACE sin depender de la key).
- Suscripciones: `EXPIRED` + `autoRenew: true` = vencida por falta de pago, su preapproval sigue vivo en MP y se reactiva si no hay otra ACTIVE. Un cobro que no reactiva cancela el preapproval después de cobrar. Hueco al 2026-10-07: el alta ("una sola vigente") vence ACTIVE y GRACE pero no cancela las EXPIRED+autoRenew ni toca las CANCELLATION_PENDING.
- Suscripciones: el cron (caso 1) pone `activeSubscriptionTier`/color/banner en null al vencer una GRACE o CANCELLATION_PENDING sin mirar si el usuario tiene otra ACTIVE. Cancelar y suscribirse a otro tier (la única forma de bajar de tier) deja al usuario sin beneficios mientras paga. Cualquier camino que deje dos suscripciones vivas por usuario cae en esto.
- Packs (2026-10-07): el crédito se ata al pago con `ProcessedPayment` `coin:<paymentId>` y la reversa con `coin:<id>:reversal`. Las órdenes acreditadas antes de eso no tienen la fila y no se revierten.
- `try/catch` de P2002 alrededor de toda una `$transaction` (coin-shop): también atrapa el P2002 de `wallet.create` en `creditInTx` (el `FOR UPDATE` no bloquea una fila que no existe, dos primeros créditos concurrentes chocan) y lo toma como "ya procesado". Acotar el catch al insert de idempotencia.
- La Wallet se crea recién en el primer `addCoins` (o en el upsert del pago de suscripción). Todo `coinTransaction.create` con `walletId: wallet?.id || ''` rompe por FK (P2003) para un usuario sin wallet.

Agregado el 2026-10-11 (revisión del PR de tipos de encuesta):

- `findUnique` + chequeo de estado en JS + `update` incondicional dentro de `$transaction`: en READ COMMITTED las dos requests leen el estado viejo y las dos escriben, así que el reembolso o el crédito sale dos veces. Visto en `polls.service.ts` (`approvePoll`, `rejectPoll`). El patrón correcto que ya usa el repo es `updateMany({ where: { id, status: <estado leído> } })` + abortar si `count === 0` (como en `bets` y en `claimAllPendingRewards`).
- `UserInventory` tratado como una sola fila por tipo de ítem: un mismo `ItemType` tiene varios `StoreItem` (el comprable y el regalo de suscripción, por ejemplo `poll_ticket_gold` para `CUSTOM_POLL`), así que `findFirst({ where: { type } })` es no determinista: se cobra de una fila y se devuelve en otra, convirtiendo un ítem exclusivo en comprable y al revés. Para devolver hay que guardar de qué ítem salió cada unidad (`Poll.ticketRefund`).
- Datos ocultos en el REST pero expuestos por el socket: los gateways re-emiten el hash completo de Redis a toda la sala, así que cualquier regla de visibilidad nueva en el service hay que replicarla en el gateway (en polls se resolvió con una sala `poll_<id>_voted` y un evento aparte con solo el total).
- Estado calculado desde Redis en el socket y desde la DB en el REST (`hasVoted`): si la key de Redis se pierde, los dos caminos se contradicen. El socket necesita el mismo fallback a la DB.
- Movimientos de inventario sin auditoría: las monedas tienen `CoinTransaction`, los consumibles no tienen nada equivalente, así que un cobro o una devolución mal hecha no es reconstruible.

Agregado el 2026-10-12 (revisión de encuestas oficiales vs comunidad):

- Campo nuevo con `@default(...)` + backfill corrido a mano en la DB de dev: en prod el `migrate deploy` solo agrega la columna con el default y las filas viejas quedan clasificadas al revés (`Poll.isOfficial` false para todas las oficiales históricas). El `UPDATE` de backfill tiene que ir dentro del SQL de la migración, no en una consola de dev. Como las migraciones no viajan por git ([[confirmed-design-decisions]]), en todo PR de schema hay que preguntar explícitamente por el backfill además de por la migración.
- Campo sensible que se trae en el `select` y se filtra después en JS (destructuring o spread condicional): funciona pero queda a un refactor de distancia de publicarse. El repo ya tiene el patrón bueno en la misma query (`votes: userId ? {...} : false`), así que el select condicional es la corrección natural y además ahorra el join.
- Orden calculado en JS sobre un `findMany` sin `orderBy`: los empates (muy comunes con `totalVotes` 0) salen en orden de heap de Postgres y la lista se reacomoda entre refetches. Cualquier criterio de orden nuevo necesita un desempate estable (`createdAt`).
- Listas "activas" que filtran solo por `status: 'ACTIVE'` e ignoran `startsAt`/`endsAt`: `approvePoll` acepta un `startsAt` futuro y pone ACTIVE igual, y el cron cierra con hasta 1 minuto de atraso, así que hay filas ACTIVE que `VoteService.loadVotablePoll` rechaza. Un ranking que asuma "ACTIVE = votable" las pone primeras y el voto falla.

Ver también [[verified-runtime-facts]].

**Why:** son errores silenciosos: compilan, los tests unitarios pasan y la ruta queda abierta, rota o gastando cuota.
**How to apply:** en cada review, buscá estas combinaciones en todo `src/`, no solo en el diff. Ver también [[prod-env-config]] y [[dev-tools-design]].
