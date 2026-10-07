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

Ver también [[verified-runtime-facts]].

**Why:** son errores silenciosos: compilan, los tests unitarios pasan y la ruta queda abierta, rota o gastando cuota.
**How to apply:** en cada review, buscá estas combinaciones en todo `src/`, no solo en el diff. Ver también [[prod-env-config]] y [[dev-tools-design]].
