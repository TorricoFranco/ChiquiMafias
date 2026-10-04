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
  - `subtractCoins(op, txClient?)` acepta el `tx` de un `prisma.$transaction` externo; usalo para que el débito y lo que compres o actives queden en la misma transacción.
  - `addCoins(op)` abre su propia transacción y **no** acepta `tx`; además aplica el tope `MAX_COIN_BALANCE` (50000). Si necesitás acreditar dentro de una transacción externa, avisá en vez de duplicar la lógica.
- El débito es un **update condicional**: `where: { userId, balance: { gte: amount } }`. Nunca "leer saldo → validar en JS → escribir".
- Cada movimiento de saldo crea su `CoinTransaction` en la misma transacción.
- Después de cambiar el saldo en la DB, la key Redis `wallet:<userId>:balance` tiene que quedar sincronizada (`WalletService` ya lo hace; si escribís por fuera, también).
- Los montos son `Int` y siempre `> 0`: se validan en el DTO (class-validator) **y** en el service.

## Apuestas (`bets/`)

- La colocación es atómica en Redis vía Lua (`bets.scripts.ts`, `redis.eval` en `bets.service.ts`) y el worker BullMQ (`bets.processor.ts`) la persiste. No mover la validación de saldo o estado fuera del script.
- Máquina de estados del mercado: `OPEN → LOCKED → SETTLED | REFUNDED`. Toda transición usa un **lock optimista**: `updateMany({ where: { id, status: <estado leído> } })` y abortar si `count === 0`, dentro de `prisma.$transaction`.

## Pagos y webhooks (Mercado Pago)

- Validar la firma (`MERCADO_PAGO_WEBHOOK_SECRET`) antes de procesar.
- El procesamiento es **idempotente**: el `ProcessedPayment` (unique `paymentId`) se inserta en la misma transacción que entrega los beneficios. Un `P2002` significa "ya procesado" → responder OK sin repetir nada.
- Las llamadas a la API de MP reintentan solo ante 5xx o errores de red, nunca ante 4xx.

## Antes de terminar

- Todo cambio acá lleva su test unitario (`*.spec.ts` al lado del service, con Prisma mockeado y un `$transaction` que ejecuta el callback; ver `bets.service.spec.ts`) y `npx jest src/` en verde.
- Pedí revisión al subagente `backend-reviewer`.
