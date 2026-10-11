---
name: polls-type-system-decisions
description: Decisiones del sistema de tipos de encuesta (resultados ocultos hasta votar, sala de votantes, costos en tickets) que parecen bugs del front y no lo son
metadata:
  type: project
---

Confirmado leyendo backend + front (revisión del PR "tipos de encuesta", 2026-10-10):

- **`GET /polls/active` manda `options[].votes` en 0 a quien todavía no votó** y el total real en `poll.totalVotes` (`polls.service.ts`, `votes: hasVoted ? optVotes : 0`). Por eso `usePollVote` usa `isVoted ? sum(results) : (liveTotal ?? poll.totalVotes)`. No es un bug del front: es anti-sesgo.
  **How to apply:** no pedir que el front sume `results` para el total; sí exigir que cualquier vista nueva (carrusel, historial) use `poll.totalVotes` cuando `!isVoted`, porque `results` son ceros.
- **El gateway tiene dos salas**: `poll_<id>` (todos) y `poll_<id>_voted` (los que votaron). `votoActualizado_<id>` (resultados por opción) va solo a la segunda; `totalActualizado_<id>` (`{ totalVotes }`) va a `poll_<id>` menos los votantes. `joinPoll` reingresa a la sala de votantes consultando `voteService.hasVoted` (set de Redis `poll:<id>:voters`, sin TTL mientras la encuesta está abierta), así que quien votó en otra sesión sigue recibiendo resultados.
  **How to apply:** un hook de encuestas tiene que escuchar los **dos** eventos. Si solo escucha `votoActualizado_`, el contador de quien no votó queda congelado.
- **MATCH/VS se crea con 2 equipos y el backend inserta "Empate"** (`buildVersusMatchOptions`), así que la encuesta guardada tiene 3 opciones. Que el form pida 2 y la tarjeta (`MatchBody`) espere `options.length === 3` es correcto, no una inconsistencia.
- **Opciones generadas por el backend**: FACTO (Facto / No facto) y RATING (1..5) no llevan opciones en el payload; INFO no se vota. Mandar `options` en esos tipos es 400.
- **Costos en tickets** (`POLL_TYPE_RULES.ticketCost`): CLASSIC/VERSUS/FACTO/NEWS/INFO 1, MATCH 2, RANKING 3, y VERSUS con escudos 2 (`resolveTicketCost`). RATING y RANKING están `enabled: false`: el front los muestra pero bloquea el submit a propósito.
- Los tickets de encuesta pueden estar **repartidos en varias filas de `UserInventory`** (el de la tienda y el regalo de suscripción son StoreItems distintos del mismo `type: CUSTOM_POLL`): cualquier contador del front tiene que sumar filas, no `find()` la primera.
- `AllWsExceptionFilter` llama al **ack** con `{ status: "error", code, message }` *y* emite `ws-error`: el toast del front por el ack sí llega, y el mock de e2e (`socket.onEmit("castVote", …)`) replica bien el camino real.

Ver [[recurring-bug-patterns]].
