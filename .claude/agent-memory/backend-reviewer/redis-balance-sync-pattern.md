---
name: redis-balance-sync-pattern
description: Riesgo recurrente del cache wallet:<id>:balance - SET absoluto post-commit con valor capturado en la tx pisa escrituras más nuevas; Lua debita Redis antes que la DB
metadata:
  type: project
---

Patrón recurrente a revisar en cualquier cambio de saldo: `syncBalanceCache(userId, balance)` hace un SET absoluto. La regla del repo (`.claude/rules/backend-money.md`) exige sincronizar **después del commit**, pero si el valor se capturó dentro de la tx y se escribe tarde (por ejemplo, un loop sobre N ganadores en `settleMarket`), un débito/crédito de otra request que commitea y sincroniza en el medio queda pisado por un valor viejo. Si lo pisado era un débito → Redis > DB → el Lua acepta apuestas sin respaldo → el processor (decrement sin condición) deja la DB negativa.

Además, `placeBet` (Lua) descuenta Redis antes de que el job `persist-bet` toque la DB: cualquier SET con el saldo de la DB mientras hay jobs pendientes "devuelve" ese stake en Redis (sistémico, pre-existente).

**Why:** detectado en la revisión del 2026-10-10 (settleMarket pasó de SET dentro de la tx a Map + sync post-commit).
**How to apply:** sugerir `syncBalanceCache(userId)` sin valor (relee la DB al momento del SET) en loops post-commit; no sugerir INCRBY por delta mientras el resto del código haga SET absoluto (mezclarlos duplica créditos). Relacionado: [[known-accepted-issues]].
