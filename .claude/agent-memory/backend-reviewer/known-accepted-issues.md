---
name: known-accepted-issues
description: Deuda conocida y aceptada en dinero/auth que no hay que re-reportar salvo que un diff la empeore (processor decrement, settleMarket sin addCoins, isProduction fijo)
metadata:
  type: project
---

Al 2026-10-10 el equipo ya conoce y dejó fuera de alcance:

- `bets.processor.ts` descuenta el stake con `wallet.update({ balance: { decrement } })` sin condición `gte` (puede dejar saldo negativo si Redis quedó por encima de la DB).
- `BetsService.settleMarket` acredita con `tx.wallet.update` y no con `walletService.addCoins` (sin tope `MAX_COIN_BALANCE`).
- `auth.controller.ts` tiene `isProduction = false` fijo (cookies del refresh).

**Why:** el caller los marcó como "ya conocidos, no reportar salvo que el diff los empeore".
**How to apply:** no listarlos como hallazgos; sí señalar si un cambio los vuelve más probables (por ejemplo, algo que deje Redis por encima de la DB alimenta el decrement sin condición). Ver [[redis-balance-sync-pattern]].
