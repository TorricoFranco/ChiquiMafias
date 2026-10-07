---
name: auth-socket-confirmed-decisions
description: Decisiones de auth/sockets que parecen errores y no lo son (refresh de baneados, kick en handleConnection, orden de providers)
metadata:
  type: project
---

Confirmado leyendo código (2026-10-07):

- `POST /auth/refresh` responde 200 a un usuario BANNED (con `user.status: "BANNED"`) a propósito: conserva el token para apelar. El front debe marcar `isBanned`, no tratarlo como error.
- El namespace raíz expulsa con `socket.disconnect()` dentro de `handleConnection` (`backend/src/chat/chat.gateway.ts`) por token inválido/vencido, usuario inexistente, BANNED **o cualquier excepción** (catch). El cliente recibe primero `connect` y después `disconnect` con `"io server disconnect"`, y socket.io-client no reintenta. `/bets` en cambio autentica en middleware → `connect_error`.
- `SocketProvider` está dentro de `AuthProvider` (`app/layout.tsx`) y `AuthProvider` no monta hijos hasta terminar `restoreSession`: en la misma pestaña no hay carrera entre el refresh de arranque y el del socket/apiFetch, y un baneado nunca monta el socket global.
- En `next dev` hay StrictMode (default del App Router); `setSocket` del doble montaje se agrupa y no hay render con el socket descartado.

**How to apply:** no reportar estos como bugs; sí verificar que el código nuevo respete estas premisas. Ver [[recurring-bug-patterns]].
