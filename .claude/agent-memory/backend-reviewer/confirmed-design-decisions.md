---
name: confirmed-design-decisions
description: Decisiones de diseño del backend que parecen riesgosas pero son intencionales: no reportarlas como bug
metadata:
  type: project
---

Cosas que al leerlas parecen un hallazgo y no lo son. No volver a reportarlas salvo que el contexto cambie.

**Why:** evitar ruido en los reportes y no pedirle al autor que "arregle" algo deliberado.
**How to apply:** chequear esta lista antes de escribir un hallazgo de severidad media o alta.

- **Las migraciones de Prisma no viajan por git**: `backend/prisma/migrations/` está en el `.gitignore` raíz (línea 28). CI aplica el schema con `npx prisma db push` desde `test/bets.e2e-spec.ts`, y `docker-compose.yml` (prod) corre `prisma migrate deploy`. Consecuencia real: un PR que cambia el schema puede dar CI verde y romper prod, porque `migrate deploy` no encuentra la migración. En PRs de schema, preguntar siempre cómo se aplica a prod (está en `.claude/rules/backend-prisma.md`).
- **Redis es la fuente de verdad de los votos mientras la encuesta está activa**: `poll:<id>:voters` (set), `poll:<id>:results` (hash) y `poll:<id>:details`. `TasksService.syncVotesToDatabase` los baja a la tabla `Vote` cada 5 minutos y `executePollClosure` les pone TTL de 24 h. El unique `(pollId, userId)` de `Vote` es la red de contención del doble voto.
- **`startsAt` en las encuestas de la moderación** (corregido el 2026-10-12, antes decía que era decorativo): `createPoll` ya calcula `isScheduled` y guarda `PENDING` si `startsAt` es futuro; el cron (`TasksService.handlePollStatus`, cada minuto) activa las `PENDING` con `startsAt <= now`. Las propuestas de usuarios quedan con `startsAt = null`, así que el cron no las aprueba solo. Los tipos `NEWS`/`INFO` quedan sin `endsAt` a propósito: no cierran nunca.
- **El costo en tickets de una encuesta lo decide el tipo, no el cliente**: `POLL_TYPE_RULES` + `resolveTicketCost` (1 texto, 2 si lleva escudos o es `MATCH`, 3 `RANKING`); `RATING` y `RANKING` están con `enabled: false` porque `castVote` solo soporta un `optionId` por usuario.
- **La identidad del autor de una encuesta se resuelve en el service, no en la DB** (2026-10-12): `resolvePollAuthor` (`src/polls/utils/poll-author.util.ts`) devuelve `null` si `Poll.isOfficial`, incluso si la fila tiene `userId`. `createdByAdminId` existe solo para auditoría y se expone únicamente cuando el controller pasa `revealResults = true` (staff, calculado con `ROLE_HIERARCHY` sobre el rol del JWT). `GET /polls/active` es `@OptionalAuth()`, o sea público de hecho.
- **`publicUserSelect` (nombre real, cosméticos, `activeSubscriptionTier`, equipo con escudo) ya es público**: todos los `/stats/*` del leaderboard son `@Public()` y lo devuelven tal cual. Reusarlo en otro endpoint público no es una fuga nueva; lo único discutible es ampliar el universo de usuarios alcanzados.
- **`PollsService.createPoll` deja la encuesta en `PENDING` si `startsAt` es futuro**, así que el panel de "pendientes de aprobación" (`getPendingPolls`) mezcla oficiales programadas con propuestas de la comunidad. Es el comportamiento actual, no un bug introducido.
- **El pipeline no corre lint** (está comentado en `pipeline.yml`): correlo vos con `npx eslint <archivos>`. El módulo `polls` estuvo en rojo (`no-unsafe-*` en `getActivePolls`) hasta el saneamiento de lint de octubre; al 2026-10-12 los archivos de `src/polls` salen limpios, así que un error nuevo ahí sí es del cambio que estés revisando.
