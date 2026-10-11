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
- **`startsAt` es decorativo para las encuestas que crea la moderación**: `createPoll` guarda `status: 'ACTIVE'` siempre; el cron solo activa las `PENDING` con `startsAt <= now`, y las propuestas por usuarios quedan con `startsAt = null` (por eso el cron no las aprueba solo). Los tipos `NEWS`/`INFO` quedan sin `endsAt` a propósito: no cierran nunca.
- **El costo en tickets de una encuesta lo decide el tipo, no el cliente**: `POLL_TYPE_RULES` + `resolveTicketCost` (1 texto, 2 si lleva escudos o es `MATCH`, 3 `RANKING`); `RATING` y `RANKING` están con `enabled: false` porque `castVote` solo soporta un `optionId` por usuario.
- **Lint del módulo `polls` ya estaba en rojo antes** (`no-unsafe-*` en `getActivePolls`, `Public` sin usar en el controller, `_count` sin usar en `getPollComments`) y el pipeline no corre lint. No contarlo como regresión del PR.
