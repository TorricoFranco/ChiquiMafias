---
name: review-workflow
description: Cómo revisar en este repo: el working tree se mueve durante la revisión y qué comandos usar para verificar
metadata:
  type: feedback
---

Releer el estado actual de los archivos justo antes de escribir el reporte, no confiar en lo que leí al principio de la revisión.

**Why:** varias sesiones de Claude comparten el mismo working tree. En la revisión del PR de tipos de encuesta (2026-10-10) el autor estaba editando `polls.gateway.ts`, `polls.controller.ts` y `vote.service.ts` mientras yo revisaba: uno de mis hallazgos (fuga de resultados por socket) ya estaba arreglado cuando iba a reportarlo, y el conteo de archivos del diff cambió a mitad de camino.
**How to apply:** antes del `SubagentHandback`, repetir `git status --short backend/` + `git diff --stat backend/` y re-leer las funciones de los hallazgos. Si algo cambió, re-verificar ese hallazgo y avisar en el reporte que el árbol se movió.

Verificación barata y segura en este repo:
- `npx jest src/<modulo>` o `npm run test:unit` desde `backend/`. **Nunca `npm test` ni `npm run test:e2e`**: los e2e corren `npx prisma db push` y borran tablas de la DB que apunte `DATABASE_URL`.
- `npx tsc --noEmit` tiene errores preexistentes en `src/auth/guards/dev-tools.guard.spec.ts`, `src/bets/bets-cron.spec.ts` y `test/subscriptions.e2e-spec.ts`. No son del PR que estés revisando.
