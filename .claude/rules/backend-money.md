---
paths:
  - "backend/src/wallet/**"
  - "backend/src/bets/**"
  - "backend/src/subscriptions/**"
  - "backend/src/webhook/**"
  - "backend/src/coin-shop/**"
  - "backend/src/store/**"
  - "backend/src/streaks/**"
  - "backend/src/mercado-pago/**"
---

# Dinero, monedas y concurrencia (backend)

Estas carpetas mueven monedas o dinero real. Un bug acá significa doble gasto, saldo negativo o premios pagados dos veces.

## Saldo

- Débitos y créditos pasan siempre por `WalletService.subtractCoins` / `addCoins` (`backend/src/wallet/wallet.service.ts`). Nada de `wallet.update` sueltos.
  - `subtractCoins(op, txClient?)` y `addCoins(op, txClient?)` aceptan el `tx` de un `prisma.$transaction` externo; usalo para que el movimiento y lo que compres, actives o marques como reclamado queden en la misma transacción.
  - `addCoins` bloquea la fila de la wallet (`SELECT … FOR UPDATE`) antes de calcular y aplica el tope `MAX_COIN_BALANCE` (250000, `wallet/constants/wallet.constants.ts`). El recorte nunca baja un saldo que ya estaba arriba del tope. Lo pagado con plata real (packs, regalos y bono de suscripción) va con `enforceCap: false`.
  - Con `txClient` ninguno de los dos toca Redis: después del commit llamá a `walletService.syncBalanceCache(userId)`. Sin `txClient` lo hacen ellos.
- Los claims de recompensas (racha, encuestas, órdenes de packs) marcan con `updateMany` condicional (`where: { …, claimed: false }` / `status: PENDING`) y acreditan solo si `count > 0`.
- El débito es un **update condicional**: `where: { userId, balance: { gte: amount } }`. Nunca "leer saldo → validar en JS → escribir".
- Cada movimiento de saldo crea su `CoinTransaction` en la misma transacción.
- Después de cambiar el saldo en la DB, la key Redis `wallet:<userId>:balance` tiene que quedar sincronizada, siempre **después del commit** (si la transacción hace rollback, Redis no puede quedar con un saldo que no existe).
- Los montos son `Int` y siempre `> 0`: se validan en el DTO (class-validator) **y** en el service.

## Apuestas (`bets/`)

- La colocación es atómica en Redis vía Lua (`bets.scripts.ts`, `redis.eval` en `bets.service.ts`) y el worker BullMQ (`bets.processor.ts`) la persiste. No mover la validación de saldo o estado fuera del script.
- Máquina de estados del mercado: `OPEN → LOCKED → SETTLED | REFUNDED`. Toda transición usa un **lock optimista**: `updateMany({ where: { id, status: <estado leído> } })` y abortar si `count === 0`, dentro de `prisma.$transaction`.

## Pagos y webhooks (Mercado Pago)

- Validar la firma (`MERCADO_PAGO_WEBHOOK_SECRET`) antes de procesar.
- Suscripciones: el alta, los regalos y el bono de upgrade salen con el **primer cobro aprobado** (`subscription_authorized_payment`), nunca con la autorización del preapproval. Solo el evento que pasa la suscripción de PENDING a ACTIVE es el alta; los demás son renovaciones sin regalos.
- Un `where` con un campo en `undefined` (por ejemplo `external_reference` faltante) Prisma lo ignora y afecta a todas las filas: validá la referencia antes de usarla.
- Reembolsos y contracargos de packs: la orden pasa de APPROVED a REJECTED con update condicional y se descuenta con `walletService.debitUpTo(op, tx)` hasta donde alcance el saldo; lo que falta se loguea para revisión manual.
- El procesamiento es **idempotente**: el `ProcessedPayment` (unique `paymentId`) se inserta en la misma transacción que entrega los beneficios. Un `P2002` significa "ya procesado" → responder OK sin repetir nada.
- Las llamadas a la API de MP reintentan solo ante 5xx o errores de red, nunca ante 4xx.

## Antes de terminar

- Todo cambio acá lleva su test unitario (`*.spec.ts` al lado del service, con Prisma mockeado y un `$transaction` que ejecuta el callback; ver `bets.service.spec.ts`) y `npm run test:unit` en verde.
- Pedí revisión al subagente `backend-reviewer`.
