---
name: feedback-shared-worktree
description: Cómo verificar sin pisar el trabajo de otras sesiones en el working tree compartido del backend (lint con --fix, e2e que borran la DB)
metadata:
  type: feedback
---

No correr `npm run lint` en `backend/`: el script es `eslint ... --fix` sobre todo el árbol y reescribe archivos de otras sesiones. Usar `npx eslint <archivo>` (sin `--fix`). Tests: `npx jest src/<modulo>`; nunca `npm test`, `jest test/` ni e2e.

**Why:** el working tree se comparte con otras sesiones de Claude que commitean en paralelo (2026-10-06: una sesión documentando Swagger en `chore/swagger-api-docs`), y el reviewer no debe editar archivos. Los e2e borran tablas de la DB de dev.
**How to apply:** en cada review, lint y typecheck solo de lectura (`npx eslint <archivos>`, `npx tsc --noEmit -p tsconfig.json`). Los errores de tipos en `*.spec.ts` de subscriptions/webhook ya existían al 2026-10-06 (ts-jest no los reporta). Ver [[recurring-bug-patterns]].
