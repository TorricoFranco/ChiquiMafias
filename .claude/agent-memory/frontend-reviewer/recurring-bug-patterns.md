---
name: recurring-bug-patterns
description: Patrones de bug que se repiten en new_frontend (sockets, refresh de sesión, efectos) para chequear primero en cada revisión
metadata:
  type: project
---

Patrones vistos (revisión 2026-10-07, fix de reconexión del socket global):

- **Refresh fuera del lock**: `lib/apiFetch.ts` serializa el refresh (promesa compartida + `navigator.locks`). El refresh de arranque de `AuthProvider` se movió adentro del lock (`refreshSession()`, 2026-10-07). Cualquier refresh nuevo que no pase por `withRefreshLock` reabre la carrera de rotación entre pestañas.
  **Why:** el backend rota el refresh token sin gracia y `logout()` llama `/auth/logout`, que revoca la sesión en el server: un refresh perdido desloguea todas las pestañas.
  **How to apply:** ante cualquier `fetch` a `/auth/refresh`, exigir que use el lock/promesa compartida, y que nada dentro del callback del lock vuelva a pedirlo (no es reentrante; `logout()` usa `fetch` crudo, por eso hoy no anida).
- **"El test falla sin el fix" engañoso en dev**: `dev:e2e` es `next dev` con StrictMode (efectos dobles). Un test de carrera entre pestañas puede ponerse rojo sin el fix solo por el doble efecto en la misma pestaña, y en CI (`next start`, sin StrictMode) depende de que las dos pestañas se crucen por timing.
  **How to apply:** pedir que se valide desactivando solo el mecanismo entre pestañas, y que el mock fuerce el cruce (gate) en vez de un delay fijo.
- **`socket.off(evento)` sin handler**: borra los listeners de otros hooks del socket global (estaba en `useMatchLive`).
- **Join de sala solo al montar**: tras reconectar el socket ya no está en la sala; el join tiene que ir también en `on('connect')` (y no emitir si `!connected`, porque socket.io bufferea el emit y se duplica).
- **`io()` propio al namespace raíz** en vez de `useGlobalSocket()` (p. ej. `useLeagueLive` en `features/fixture/socket/useFixtureSocket.ts`).
- **Efecto que hace `socket.connect()` sobre el socket del estado**: con Fast Refresh (dev) corre después del cleanup que lo desconectó y resucita el socket viejo (fuga). En `SocketContext` se resolvió con el `WeakSet` `disposedSockets` (2026-10-07); en código nuevo, mismo guard o atar todo al efecto que crea el socket.
- **Cobertura e2e engañosa**: los tokens del mock son `e2e-access-token-N` (no JWT) y `/auth/refresh` del mock no rota; la lógica por `exp` y las carreras de rotación no quedan cubiertas por la suite mockeada.

Ver [[auth-socket-confirmed-decisions]].
