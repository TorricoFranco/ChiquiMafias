---
name: verified-runtime-facts
description: Comportamientos de Nest, Prisma 6, ioredis, Throttler y Discord verificados empíricamente en este repo (guards globales vs WS, $executeRaw con void, Redis caído, límites de Discord)
metadata:
  type: project
---

Verificado el 2026-10-06 (review de apelaciones y soporte), para no re-verificarlo en cada review:

- **Guards globales (`APP_GUARD`) no corren en gateways WS.** `SocketModule` crea `GuardsContextCreator(container)` sin config, así que `getGlobalMetadata` devuelve `[]`. Que `JwtAuthGuard`/`UserStatusGuard` usen `switchToHttp` no rompe los sockets. El ban en sockets solo se mira en el handshake (`authenticateSocket`, lee la DB); un socket ya conectado no se corta al banear.
- **Prisma 6.19 + Postgres 15:** `tx.$executeRaw\`SELECT pg_advisory_xact_lock(hashtext(${key}))\`` funciona (devuelve 1, el parámetro va como `$1` text). Con `$queryRaw` falla: "Failed to deserialize column of type 'void'". Los parámetros string van tipados como text (para uuid hace falta `::uuid`). Timeout default de transacción interactiva: 5s.
- **ioredis 5 con defaults** (`enableOfflineQueue: true`, `maxRetriesPerRequest: 20`): con Redis caído un `GET` tarda ~11s en rechazar (medido). Un `try/catch` con fallback en un guard de cada request no degrada bien sin chequear `redis.status` o poner un timeout.
- **Throttler:** storage en memoria (por instancia) y tracker por `req.ip`; `main.ts` no setea `trust proxy`. Si prod tiene un proxy delante, los límites por IP se comparten entre todos los usuarios.
- **Redis de prod:** `--appendonly yes`, sin `maxmemory`, o sea noeviction: las keys sin TTL no se desalojan solas.
- **Discord:** el contenido de un mensaje admite hasta 2000 caracteres y el valor de un campo de embed, hasta 1024. El bot (`discord-bot/index.js`, `messageCreate`) manda `message: message.content`, que es `''` si el staff solo adjunta una imagen, y no mira `response.ok`.

- **Dinero (leído el 2026-10-06):** la liquidación paga `floor(stake * pozoReal / stakeGanador)`, sin comisión. Las cuotas que se muestran (`odds.util`) suman un `VIRTUAL_POOL` de 10000 que la liquidación no usa: un único apostador ve ~2.00 y cobra 1.00. Al 2026-10-06 no estaba confirmado si es intencional. La Wallet se crea recién en el primer `addCoins`, y sin Wallet `POST /wallet/my-balance` da 400.

- **Schema (verificado en la DB de dev el 2026-10-07):** la tabla `"Wallet"` no tiene `@@map` (`User` sí: `users`). `"userId"` es `text` y `balance` es `integer`, así que `$queryRaw` lo devuelve como `number` y el parámetro string no necesita cast. `UserSubscription.mpExternalRef` es obligatorio y único. Los ítems de regalo de racha y suscripción existen en `"StoreItem"` de dev; la DB de dev se puede consultar en solo lectura con `docker exec football_postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" ...'`, sin leer `.env`.

- **Mercado Pago, visto en la DB de dev (2026-10-07):** las tablas son `processed_payments`, `user_subscriptions` y `coin_orders` (con `@@map`). En `processed_payments` los ids hex de 32 son preapprovals, los de 10 dígitos (`70315…`) son `authorized_payments` y los de 12 dígitos son `/v1/payments`, así que `subscription_authorized_payment` sí llega. El primer cobro se procesa entre 15 s y ~1,5 min después de autorizar, con un caso de ~50 min. Varias suscripciones de agosto pasaron a GRACE (`endsAt` = +48 h) ~1,5 min después del checkout: coincide con la notificación de la factura en `scheduled`.

**Why:** cada punto costó una prueba real (contenedor descartable, script con ioredis o lectura del código de Nest). Son preguntas que vuelven en las reviews de guards, locks y bot.
**How to apply:** usalos como punto de partida, pero si cambió una versión mayor (Prisma, Nest, ioredis), re-verificá. Relacionado: [[recurring-bug-patterns]].
