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

**Why:** son errores silenciosos: compilan, los tests unitarios pasan y la ruta queda abierta, rota o gastando cuota.
**How to apply:** en cada review, buscá estas combinaciones en todo `src/`, no solo en el diff. Ver también [[prod-env-config]] y [[dev-tools-design]].
