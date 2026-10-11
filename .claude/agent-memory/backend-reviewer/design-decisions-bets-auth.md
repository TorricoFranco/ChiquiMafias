---
name: design-decisions-bets-auth
description: Decisiones confirmadas - liquidación automática de mercados por Matches (PEN=Empate, AET por goles, PST/CANC/ABD/AWD/WO=reembolso) y hash de refresh bcrypt(sha256(token)) con fallback legacy
metadata:
  type: project
---

Confirmado el 2026-10-10:

- `BetsCronService.handleMarketSettlement` liquida mercados automáticos (LOCKED, `isManual: false`) leyendo `Matches` (lo escribe LiveScoreCron con `goals.home/away` de API-Football, que en AET incluye el alargue). Regla: FT/AET/PEN por goles (PEN → Empate), PST/CANC/ABD/AWD/WO → REFUNDED, el resto espera sin timeout. La opción ganadora se busca por nombre (snapshot en `market.metadata`) o 'Empate'.
- Refresh token: se guarda `bcrypt(sha256hex(token))` porque bcrypt trunca a 72 bytes y todos los refresh de un usuario comparten ese prefijo. Hay fallback a `bcrypt.compare(token crudo)` para hashes viejos; contra un hash nuevo nunca matchea. Es código muerto 7d (JWT_REFRESH_EXPIRES_IN) después del deploy y se puede borrar.
- La rotación ahora es estricta (sin período de gracia): el front (`new_frontend/lib/apiFetch.ts`) serializa los refresh con single-flight + `navigator.locks`.

**Why:** decisiones explícitas del caller al pedir la revisión; la AET/PEN es convención propia, no 1X2 estándar a 90'.
**How to apply:** no re-reportar estas reglas como bugs; sí revisar que los cambios futuros las respeten. Ver [[redis-balance-sync-pattern]].
