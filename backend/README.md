# ChiquiMafias — Backend

API REST + WebSockets de [ChiquiMafias](../README.md): datos de fútbol en vivo, chat,
encuestas, apuestas pari-mutuel, economía de monedas y suscripciones con Mercado Pago.

**NestJS 11 · Prisma 6 + PostgreSQL 15 · Redis 7 · BullMQ · Socket.IO**

- Arquitectura, patrones y flujos: [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md#backend)
- Instalación y variables de entorno: [docs/SETUP.md](../docs/SETUP.md)
- Referencia de endpoints: Swagger en <http://localhost:3007/api> con el server corriendo

## Scripts

```bash
npm run start:dev    # desarrollo con watch (puerto 3007)
npm run build        # compila a dist/
npm run start:prod   # node dist/main
npm run lint         # eslint --fix
npm run format       # prettier

npm run test:unit    # unit tests (jest src/), seguros de correr siempre
npm run test:e2e     # e2e: ⚠️ borran las tablas de la base de DATABASE_URL
npm run test:cov     # coverage
npm run seed:e2e     # usuarios de prueba e2e-*@chiquimafias.test
```

> `npm test` corre unit **y** e2e. Para los e2e usá siempre una base descartable,
> nunca la de desarrollo.

## Prisma

```bash
npx prisma generate         # después de cada install o cambio del schema
npx prisma migrate deploy   # aplica las migraciones (base nueva, CI y producción)
npx prisma studio           # explorar y editar datos
```

El schema está en [`prisma/schema.prisma`](prisma/schema.prisma) y las migraciones en
`prisma/migrations/`.

## Estructura

Cada dominio vive en `src/<dominio>/` con su module, controller y service, y según el
caso un gateway (Socket.IO), un processor (BullMQ), crons y specs.

| Grupo | Módulos |
|---|---|
| Auth y usuarios | `auth`, `users` |
| Dinero | `wallet`, `bets`, `coin-shop`, `store`, `inventory`, `subscriptions`, `webhook` |
| Comunidad | `chat`, `polls`, `notifications`, `support`, `streaks`, `stats` |
| Datos deportivos | `api-football` (crons), `matches`, `fixture`, `standings`, `teams` |
| Integraciones | `mercado-pago`, `discord`, `cloudinary`, `email` |
| Infraestructura | `prisma`, `redis`, `config`, `adapters`, `filters`, `pipes` |

Puntos a tener en cuenta:

- **Sin prefijo global**: las rutas son `/bets/markets`, no `/api/bets/markets`.
- **Toda ruta requiere JWT** salvo las marcadas con `@Public()`. Hay tres guards
  globales: throttling, JWT y estado del usuario (ban).
- **`ValidationPipe` estricto**: un campo que no está en el DTO devuelve 400.
- **Variables validadas con Joi** al arrancar (`src/config/env.validation.ts`).

## CI

[`.github/workflows/pipeline.yml`](../.github/workflows/pipeline.yml), en cada push o PR a
`main`: Node 24 con Postgres 15 y Redis 7 como servicios, `prisma migrate deploy`,
build, `test:unit` y `test:e2e`.
