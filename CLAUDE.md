# ChiquiMafias — monorepo

Plataforma de fútbol argentino: datos en vivo, chat, encuestas, apuestas virtuales pari-mutuel, economía de monedas y suscripciones (Mercado Pago).

- Respondé en español.
- Identificadores de código en inglés; textos de UI, mensajes de error y logs en español, como el código existente.

## Mapa

| Carpeta | Qué es | Estado | Instrucciones |
|---|---|---|---|
| `backend/` | API NestJS 11 + Prisma 6 + Redis + BullMQ + Socket.IO | activo | `backend/CLAUDE.md` |
| `new_frontend/` | Next.js 16.2 + React 19.2 (App Router) | **frontend activo** | `new_frontend/CLAUDE.md` |
| `discord-bot/` | Express 5 + discord.js 14 (backoffice de soporte y moderación) | activo | `discord-bot/CLAUDE.md` |
| `frontend/` | Next.js anterior | **LEGACY: no editar**, solo consultar como referencia | — |


## Levantar el entorno

```bash
docker compose -f docker-compose.dev.yml up                   # stack dev completo (lee .env.dev)
docker compose -f docker-compose.dev.yml up -d postgres redis # solo infra; las apps con npm
```

| Servicio | Puerto |
|---|---|
| backend (Swagger en `/api`) | 3007 |
| new_frontend | 3005 |
| frontend (legacy) | 3000 |
| discord-bot | 3001 |
| ngrok (inspector, expone el backend para webhooks de MP) | 4040 |
| Postgres / Redis | 5432 / 6379 |

Producción: `docker-compose.yml`.

## Contrato entre apps

- REST **sin prefijo global** (`/bets/markets`, no `/api/bets/markets`). Excepción: el bot usa `/api/discord/webhook/*`.
- Auth: login con Google → `access_token` en el body (el front lo guarda en Zustand, `new_frontend/store/useUserStore.ts`) + `refresh_token` en cookie HttpOnly; `POST /auth/refresh` lo renueva.
- Tiempo real: Socket.IO con `auth: { token }`. Los crons del backend publican en Redis (`match_updates`, `league_live_updates`) y los gateways re-emiten; las apuestas usan el namespace `/bets`.
- **Los tipos del front son copias a mano** en `new_frontend/features/<dominio>/types/`. Si cambia un DTO, una respuesta o un evento de socket, actualizá el tipo y el `api/` o `socket/` del front en el mismo cambio. El subagente `contract-checker` detecta diferencias.
- Backend ↔ bot: webhooks con header `x-discord-bot-token` = `DISCORD_INTERNAL_SECRET`, validado en los dos lados.

## Git

- `develop` = integración, `main` = producción. CI:
  - `.github/workflows/pipeline.yml`: backend, solo en push/PR a `main`.
  - `.github/workflows/frontend.yml`: `new_frontend` (lint y typecheck de `e2e/`, build y Playwright mockeado), en push/PR a `develop` y `main` cuando cambia `new_frontend/`.
- Ramas desde `develop`: `feat/…`, `fix/…`, `refactor/…`, `perf/…`, `security/…`, `test/…`, `chore/…`.
- Commits convencionales en inglés: `tipo(scope): mensaje`, por ejemplo `fix(bets): …` o `test(webhook): …`.
- **Al terminar un fix o feature con los tests en verde, correr automáticamente la skill `/finalizar-feature`** (crea o reusa la rama, commitea, pushea y abre la PR contra `develop`), sin esperar que se pida cada vez. La skill igual pide confirmación puntual antes de commitear (muestra rama + mensaje propuestos) — esa confirmación no se saltea nunca.
- **`main` es 100% manual**: nunca hacer checkout, commit, push ni merge contra `main`, ni abrir PR contra `main`, salvo que se pida explícitamente en el prompt de esa tarea puntual. Ninguna aprobación genérica anterior habilita tocar `main`.

## Reglas que siempre aplican

- Nunca leer, mostrar ni commitear `.env`, `.env.dev`, `*/.env` ni `backup_dev.sql`. Las variables existentes están en `.env.example` y `backend/src/config/env.validation.ts`.
- **Los e2e del backend borran tablas de la DB a la que apunte `DATABASE_URL`.** `npm test` también los incluye. Para tests unitarios usá `npm run test:unit` (= `jest src/`) desde `backend/`, y no corras e2e sin confirmación.
- No modificar `frontend/`.
- Antes de decir que algo está listo, corré build + lint (+ unit tests en el backend, + e2e mockeados en `new_frontend`) de la app tocada: `/verificar`.
- Para cambios en monedas, apuestas, suscripciones o webhooks de pago, proponé un plan antes de editar y al terminar pasalo por el subagente `backend-reviewer`.

## Herramientas del proyecto (`.claude/`)

- Skills: `/nest-module <nombre>`, `/frontend-feature <dominio>`, `/verificar`. `nestjs-best-practices` se activa sola en `backend/src`.
- Subagentes: `backend-reviewer` (dinero, concurrencia, auth), `frontend-reviewer` (new_frontend: sesión, flujos con monedas, sockets, Next 16, impacto en e2e) y `contract-checker` (backend ↔ new_frontend y backend ↔ discord-bot).
- Reglas por zona en `.claude/rules/`. Backend: API y auth, servicios, tiempo real, crons y colas, tests, dinero y concurrencia, y Prisma. Frontend: UI y tests e2e (Playwright). Se cargan solas según el archivo que se toque.
- Permisos compartidos en `.claude/settings.json`; los personales van en `.claude/settings.local.json` (no se commitea).

## Documentación existente

- `README.md` — presentación pública del proyecto: funcionalidades, stack, quickstart y capturas (`docs/screenshots/`).
- `docs/ARCHITECTURE.md` — arquitectura de las tres apps, patrones, módulos centrales, crons y flujos (auth, apuestas, webhooks).
- `docs/SETUP.md` — instalación, variables de entorno, servicios externos y problemas comunes.
- `backend/README.md`, `new_frontend/README.md`, `discord-bot/README.md` — resumen de cada app.
- `new_frontend/DESIGN.md` — sistema de diseño "Estadio Digital".
