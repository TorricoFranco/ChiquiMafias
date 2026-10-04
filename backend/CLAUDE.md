# Backend — ChiquiMafias (NestJS)

Backend NestJS de ChiquiMafias (API + WebSockets + workers). Corre en **`backend/`** de `chiquimafias/`.
Claude Code carga este archivo automáticamente al trabajar en `backend/` (las reglas generales están en `../CLAUDE.md`).

---

## Stack exacto

- **NestJS 11** (TypeScript, Express), **Prisma 6** + PostgreSQL 15, **Redis** (ioredis), **BullMQ** (colas), **Socket.IO** (gateways), `@nestjs/schedule` (crons)
- Auth: Google OAuth + JWT (access + refresh en cookie HttpOnly)
- Mercado Pago (suscripciones + webhooks), API-Football (datos deportivos), Cloudinary, Resend, bot de Discord como backoffice
- Test: Jest 30 + ts-jest + supertest (+ Testcontainers como dependencia)

## Comandos (correr desde `backend/`)

```bash
npm run start:dev      # watch mode (puerto 3007)
npm run build          # nest build -> dist/
npm run start:prod     # node dist/main
npm run lint           # eslint --fix (flat config, type-checked)
npm run format         # prettier --write src y test
npx jest src/          # unit puros (solo src/**/*.spec.ts) ← usar este
npm run test:unit      # ⚠ también corre los e2e (ver gotchas)
npm run test:e2e       # solo *.e2e-spec.ts (requiere Postgres + Redis)
npm run test:cov       # coverage
```

### Gotchas de tests

- **`npm test` corre TODO**: el `testRegex` de `package.json` matchea `.spec.ts` **y** `.e2e-spec.ts`.
- **`npm run test:unit` también corre los e2e**: su patrón `jest ".spec.ts$"` es una regex y el `.` matchea el `-` de `.e2e-spec.ts` (verificado con `npx jest --listTests ".spec.ts$"`). Para unit puro usá **`npx jest src/`**.
- Un test unit puntual: `npx jest src/bets/bets.service.spec.ts`
- Un e2e puntual: `npx jest test/bets.e2e-spec.ts --config ./test/jest-e2e.json`
- `test/bets.e2e-spec.ts` corre `npx prisma db push` en `beforeAll` y **borra todas las tablas en `afterEach`** contra la DB de `DATABASE_URL` → necesita Postgres + Redis corriendo y **una DB descartable**, nunca la de desarrollo ni la real. No correr e2e sin confirmación del usuario.
- e2e necesita **todas las env vars de `src/config/env.validation.ts`** seteadas (dummy values sirven, ver CI).
- `test/jest-setup.ts` polyfilla `global.File` (para specs con uploads en Node).

## Setup desde cero (orden importa)

```bash
npm install
# desde la raíz del repo:
docker compose -f docker-compose.dev.yml up -d postgres redis
npx prisma generate          # obligatorio tras install y tras cada cambio de schema
npx prisma db push           # dev; en prod se usa: npx prisma migrate deploy
npm run start:dev
```

- Prisma schema: `prisma/schema.prisma`. Cambios de schema → `npx prisma generate` antes de tipar/buildear.
- La app **no levanta sin todas las env vars** (Joi, `src/config/env.validation.ts`) — falla en boot. Para desarrollo, copiar `.env.example` (raíz) o usar `.env.dev`.

## Variables de entorno — trampas

- `REDIS_HOST` default **`redis`** → dentro de Docker Compose funciona; corriendo `npm run start:dev` desde tu máquina necesitás `REDIS_HOST=localhost` (y `DATABASE_URL` apuntando a localhost).
- Redis tiene `requirepass` → `REDIS_PASSWORD` es obligatorio incluso en local.
- En dev, docker-compose dev ya inyecta todo vía `.env.dev`; no tocar `.env` dentro del contenedor.

## API / runtime

- Puerto `PORT` (default 3007), host `0.0.0.0`. **No hay prefijo global** (`/users`, no `/api/users`).
- Swagger UI en **`/api`** (solo si compiló el plugin Nest CLI — ver `nest-cli.json`).
- CORS hardcodeado en `src/main.ts` (`localhost:3000`, `localhost:3005`, `chiquimafias.com`) → para un origen nuevo, editar `main.ts` a mano.
- `ValidationPipe` global: `whitelist: true`, **`forbidNonWhitelisted: true`** → enviar props que no están en el DTO = **400**. Siempre declarar DTOs completos.
- `ClassSerializerInterceptor` global → `@Exclude()`/`@Expose()` en entidades funcionan.
- `globalThis.crypto` polyfill en `main.ts` (necesario para Google auth lib en algunos Node).
- `main.ts` define también el `SocketIoAdapter` (`src/adapters/`) — cambiar CORS de sockets ahí.

## Guards globales (¡importante al crear rutas!)

Tres `APP_GUARD` en `src/app.module.ts`, en este orden:

1. `ThrottlerGuard` — 150 req/min por IP default
2. `JwtAuthGuard` — **toda ruta requiere JWT** salvo `@Public()` (`src/auth/decorators/auth.decorator.ts`)
3. `UserStatusGuard` — bloquea usuarios baneados/suspendidos

→ Ruta nueva sin `@Public()` = 401 por defecto. No es un bug.

## Arquitectura (mapa mental)

- `src/<feature>/` × ~30: patrón `<name>.module.ts`, `.controller.ts`, `.service.ts`, a veces `.gateway.ts` (Socket.IO), `.processor.ts` (BullMQ worker), `-cron.ts`, `dto/`, `utils/`, `*.spec.ts`.
- Infra compartida: `src/prisma/`, `src/redis/`, `src/config/`, `src/adapters/`, `src/filters/`, `src/pipes/`, `src/types/`.
- **Bets** (`src/bets/`): apuestas pari-mutuel. Ingesta atómica vía **Lua en Redis** (`bets.scripts.ts`), persistencia diferida por worker BullMQ (`bets.processor.ts`), cierre/liquidación por cron (`bets-cron.ts`) + estado en máquina `OPEN → LOCKED → SETTLED | REFUNDED`.
- **Pub/Sub Redis** desacopla ingesta deportiva (crons `src/api-football/`) de los WebSocket gateways → no emitir desde crons directamente.
- Eventos intra-proceso con `@nestjs/event-emitter` (ej. `report.resolved` → mute automático).
- Discord bot: **microservicio separado** (`discord-bot/`), se comunica por webhooks validados con header `x-discord-bot-token` (`DISCORD_INTERNAL_SECRET`).

## Convenciones de código

- Prettier: `singleQuote: true`, `semi: false`, `trailingComma: 'all'`.
- tsconfig: `module/moduleResolution: nodenext`, `strictNullChecks: true` pero **`noImplicitAny: false`** y strict incompleto → no confiar en el checker; compilar con `npm run build` antes de commitear.
- ESLint: `no-explicit-any` **off**, `no-floating-promises` **warn**, `no-unsafe-argument` **warn** → vigilá los warns, no son errores.
- Imports con alias `src/...` (funciona en app y jest via `moduleNameMapper`).
- Nest CLI swagger plugin activo (`nest-cli.json`): DTOs (`*.dto.ts`/`*.entity.ts`) auto-documentados en `/api`.

## Docker / CI

- Dev: `docker compose -f docker-compose.dev.yml up` → Postgres 15, Redis 7 (appendonly + pass), backend (watch), frontend, new_frontend, discord-bot, **ngrok** exponiendo `backend:3007`. Backend monta `docker.sock` y setea `TESTCONTAINERS_RYUK_DISABLED` (para testcontainers dentro de Docker).
- Prod: `docker-compose.yml` — backend corre `prisma generate && prisma migrate deploy && start:prod`.
- CI (`.github/workflows/pipeline.yml`): push/PR a `main` → Node 24, Postgres 15 + Redis 7, `npm ci`, `prisma generate`, `prisma migrate deploy`, `build`, `test:unit`, `test:e2e`. **Lint está comentado en CI** — corré `npm run lint` vos.
- E2E en CI usa env dummy (ver el yaml) — réplica ese patrón localmente si tus `.env` no tienen valores de test.

## Referencias existentes (no duplicar)

- `README.md` de la **raíz** — visión de producto, diagramas, flujos (auth, bets, webhooks), setup. (`backend/README.md` es el boilerplate de Nest.)
- `.claude/skills/nestjs-best-practices/` — skill de NestJS (40 reglas en `rules/*.md`); se activa sola al tocar `backend/src`.
- `.claude/rules/backend-money.md` y `backend-prisma.md` — se cargan solas al tocar dinero/apuestas/suscripciones o el schema.
- `new_frontend/CLAUDE.md` + `DESIGN.md` — solo aplican a ese subproyecto.

## Flujo de trabajo con Claude

- Módulo nuevo: `/nest-module <nombre>`. Verificación antes de cerrar: `/verificar`.
- Cambios en `wallet/`, `bets/`, `subscriptions/`, `webhook/`, `coin-shop/`, `store/` o `streaks/`: proponer plan antes de editar y, al terminar, pedir revisión al subagente `backend-reviewer`.
- Si cambia un DTO, una respuesta o un evento de gateway, actualizar `new_frontend/features/<dominio>/types` en el mismo cambio (o correr el subagente `contract-checker`).
- Ruta nueva → decidir explícitamente `@Public()` / `@OptionalAuth()` / protegida (default); si es de admin: `@UseGuards(RolesGuard)` + `@Roles(SystemRole.ADMIN)` (ver `src/bets/bets.controller.ts`).
