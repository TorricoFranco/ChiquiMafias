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

El `CLAUDE.md` de cada carpeta se carga solo cuando trabajás ahí. Lanzá `claude` desde esta raíz.

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

- `develop` = integración, `main` = producción. El CI (`.github/workflows/pipeline.yml`) corre solo en push/PR a `main` y solo para el backend.
- Ramas desde `develop`: `feat/…`, `fix/…`, `refactor/…`, `perf/…`, `security/…`, `test/…`, `chore/…`.
- Commits convencionales en inglés: `tipo(scope): mensaje`, por ejemplo `fix(bets): …` o `test(webhook): …`.
- No commitear, pushear ni crear ramas sin que te lo pidan.

## Reglas que siempre aplican

- Nunca leer, mostrar ni commitear `.env`, `.env.dev`, `*/.env` ni `backup_dev.sql`. Las variables existentes están en `.env.example` y `backend/src/config/env.validation.ts`.
- **Los e2e del backend borran tablas de la DB a la que apunte `DATABASE_URL`.** `npm test` también los incluye. Para tests unitarios usá `npm run test:unit` (= `jest src/`) desde `backend/`, y no corras e2e sin confirmación.
- No modificar `frontend/`.
- Antes de decir que algo está listo, corré build + lint (+ unit tests en el backend) de la app tocada: `/verificar`.
- Para cambios en monedas, apuestas, suscripciones o webhooks de pago, proponé un plan antes de editar y al terminar pasalo por el subagente `backend-reviewer`.

## Herramientas del proyecto (`.claude/`)

- Skills: `/nest-module <nombre>`, `/frontend-feature <dominio>`, `/verificar`. `nestjs-best-practices` se activa sola en `backend/src`.
- Subagentes: `backend-reviewer` (dinero, concurrencia, auth) y `contract-checker` (backend ↔ new_frontend).
- Reglas por zona en `.claude/rules/`: dinero y concurrencia, Prisma y UI. Se cargan solas según el archivo que se toque.
- Permisos compartidos en `.claude/settings.json`; los personales van en `.claude/settings.local.json` (no se commitea).

## Documentación existente

- `README.md` — arquitectura del backend, diagramas y flujos (auth, apuestas, webhooks).
- `new_frontend/DESIGN.md` — sistema de diseño "Estadio Digital".
- `match-details-ui-spec.md` — spec funcional de la página `/match/[id]`.
