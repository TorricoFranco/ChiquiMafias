---
name: verificar
description: Verifica los cambios actuales antes de dar una tarea por terminada o de commitear. Corre build, lint y tests unitarios solo de las apps que cambiaron (backend, new_frontend, discord-bot) y resume los fallos. Usar al terminar cualquier cambio de código.
argument-hint: "[rama base, por defecto develop]"
allowed-tools:
  - Bash(git status *)
  - Bash(git diff *)
  - Bash(npm run build *)
  - Bash(npm run lint *)
  - Bash(npm run test:unit *)
  - Bash(npx jest src/*)
  - Bash(npx prisma generate *)
  - Bash(npx prisma validate *)
  - Bash(npx tsc --noEmit *)
---

# Verificación de cambios

## 1. Qué cambió

Rama base: `$ARGUMENTS` (si está vacío, `develop`).

```bash
git status --short
git diff --name-only <base>...HEAD
```

Uní ambas listas (incluye archivos sin commitear) y agrupalas por app: `backend/`, `new_frontend/`, `discord-bot/`. Ignorá `frontend/` (legacy).
Si no hay cambios de código, decilo y terminá.

## 2. Backend (si cambió algo en `backend/`)

Desde `backend/`, en este orden y sin frenar al primer error:

1. Si cambió `prisma/schema.prisma`: `npx prisma validate` + `npx prisma generate`.
2. `npm run build`
3. `npm run test:unit` (= `jest src/`). **Nunca** `npm test`, porque incluye los e2e que borran la DB.
4. `npm run lint`. Aplica `--fix`: si modifica archivos, mostrá cuáles. El CI no corre lint, así que esto es lo único que lo controla.

Si el cambio toca `wallet/`, `bets/`, `subscriptions/`, `webhook/`, `coin-shop/`, `store/` o `streaks/`, recomendá además correr el subagente `backend-reviewer`.

## 3. new_frontend (si cambió algo en `new_frontend/`)

Desde `new_frontend/`:

1. `npm run lint`
2. `npm run build`

## 4. discord-bot

No tiene build ni tests. Revisá que cada ruta nueva valide `x-discord-bot-token` y que no haya `require` de archivos inexistentes.

## 5. Contrato

Si cambiaron DTOs, controllers o gateways del backend **y** no cambió nada en `new_frontend/features/*/types`, avisá que puede haber un desajuste y sugerí el subagente `contract-checker`.

## 6. Reporte

Tabla corta por app: paso → ✅ / ❌ (con el error relevante, no el log entero). Si todo pasó, decilo en una línea. No commitees.
