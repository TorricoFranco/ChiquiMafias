---
paths:
  - "backend/src/**/*.gateway.ts"
  - "backend/src/types/socket-events.ts"
  - "backend/src/filters/**"
  - "backend/src/pipes/**"
  - "backend/src/redis/**"
  - "backend/src/adapters/**"
---

# Tiempo real: gateways, Socket.IO y Pub/Sub de Redis (backend)

## Auth en sockets

- Los guards globales HTTP (`JwtAuthGuard`, `UserStatusGuard`) **no** cubren sockets. La auth se resuelve en `handleConnection`: token de `handshake.auth.token` → `authService.authenticateSocket(token)` → `client.data.user`. Sin token, el namespace raíz deja la conexión anónima (solo lectura) y `/bets` la desconecta.
- Usá `authenticateSocket`, que rechaza usuarios `BANNED`. `verifyToken` no chequea el baneo.
- Cada handler que necesita usuario lleva `@UseGuards(WsJwtGuard)`. Escribir en el chat suma `WsTimeoutGuard` (silenciados). Moderar: `@UseGuards(WsJwtGuard, RolesGuard)` + `@Roles(...)`. Tipá el cliente como `SocketWithUser`.
- El usuario sale de `client.data.user`, nunca del payload del mensaje.

## Entrada y errores

- No asumas que el `ValidationPipe` global aplica: cada handler con payload declara `@UsePipes(new ValidationPipe({ transform: true }))` y recibe un DTO de clase. Nada de `@MessageBody() data: any`.
- Texto libre de usuarios (chat, comentarios) pasa además por `SanitizeMessagePipe`.
- `@UseFilters(AllWsExceptionFilter)` en el gateway (o en cada handler). Errores con `WsException({ code, message })` y mensaje en español; el filtro responde por el ack y emite `ws-error`.

## Quién emite

- Los crons y workers **no** emiten por socket: publican en Redis (`redisService.publish('match_updates' | 'league_live_updates', payload)`) y el gateway, suscripto en `onApplicationBootstrap` con `redisService.subscribe`, re-emite a la sala.
- Envolvé el callback de `subscribe` en `try/catch`, `JSON.parse` incluido: ahí no hay filtro de Nest y un throw no llega a ningún lado.
- Desde un servicio, emití con un método del gateway (`chatGateway.sendWalletUpdate`, `betsGateway.emitPoolUpdate`) en vez de usar `gateway.server.to(...)` suelto.
- Emití después de confirmar la transacción en la DB, no adentro.

## Salas y eventos (contrato con el front)

- Salas existentes: `match_<matchId>`, `league_<leagueId>`, `user:<userId>` (personal, se une en `ChatGateway.handleConnection`), y `bets_dashboard` en el namespace `/bets`. Para un evento de un solo usuario, `server.to('user:<id>')`, nunca un broadcast filtrado en el cliente.
- Eventos nuevos en `snake_case` (`market_pool_updated`, `stats_updated`). No renombres los existentes (`on-message`, `wallet:balance_updated`, etc.): el front escucha esos nombres exactos.
- Si agregás o cambiás un evento o su payload, actualizá `src/types/socket-events.ts` y `new_frontend/features/<dominio>/socket/` + `types/` en el mismo cambio (o corré el subagente `contract-checker`).
- CORS de sockets: `SocketIoAdapter` (`src/adapters/`), toma `CLIENT_URL` separado por comas. El de HTTP está en `main.ts`.
