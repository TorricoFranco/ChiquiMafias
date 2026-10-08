# Instalación y entorno de desarrollo

Guía completa para levantar ChiquiMafias en local. Si solo querés verlo andando, con la
[opción A](#opción-a-todo-con-docker) alcanza.

**Contenido**

- [Requisitos](#requisitos)
- [Opción A: todo con Docker](#opción-a-todo-con-docker)
- [Opción B: infraestructura en Docker y apps con npm](#opción-b-infraestructura-en-docker-y-apps-con-npm)
- [Puertos](#puertos)
- [Variables de entorno](#variables-de-entorno)
- [Servicios externos](#servicios-externos)
- [Datos iniciales y usuarios](#datos-iniciales-y-usuarios)
- [Tests](#tests)
- [Problemas comunes](#problemas-comunes)

---

## Requisitos

- **Docker** y Docker Compose v2.
- **Node.js 20+**, solo para la opción B o para correr tests fuera de los contenedores.
- Credenciales de los servicios externos (ver [Servicios externos](#servicios-externos)).
  Para explorar la app alcanza con Google OAuth y API-Football. El resto (Mercado Pago,
  Cloudinary, Resend y Discord) se puede completar con valores de relleno, aunque
  esas funciones no van a andar.

## Opción A: todo con Docker

```bash
git clone https://github.com/TorricoFranco/ChiquiMafias.git
cd ChiquiMafias

# 1. Variables de entorno: completá las credenciales
cp .env.example .env.dev

# 2. Base de datos y Redis, y las tablas (solo la primera vez)
docker compose --env-file .env.dev -f docker-compose.dev.yml up -d postgres redis
docker compose --env-file .env.dev -f docker-compose.dev.yml run --rm backend npx prisma migrate deploy

# 3. Todo el stack
docker compose --env-file .env.dev -f docker-compose.dev.yml up
```

- Web: <http://localhost:3005>
- API: <http://localhost:3007> · Swagger: <http://localhost:3007/api>

El stack de desarrollo levanta Postgres 15, Redis 7, el backend en modo watch,
`new_frontend`, el bot de Discord y ngrok. Los volúmenes montan el código, así que
los cambios se recargan solos.

> **Por qué `--env-file .env.dev`:** los contenedores leen `.env.dev` con `env_file`,
> pero las expresiones `${VAR}` de `docker-compose.dev.yml` se resuelven con el `.env`
> de la raíz o con las variables de la shell. Con `--env-file` las dos cosas salen del
> mismo archivo. Sin él, variables como `NODE_ENV` o `POSTGRES_PASSWORD` llegan
> vacías (o con valores de otro entorno).

## Opción B: infraestructura en Docker y apps con npm

Más cómodo para debuggear. Cada app lee su propio archivo de entorno:

| App | Archivo | Diferencias con `.env.dev` |
|---|---|---|
| `backend/` | `backend/.env` | `DATABASE_URL` y `REDIS_HOST` apuntan a `localhost`; `DISCORD_BOT_URL=http://localhost:3001/api` |
| `new_frontend/` | `new_frontend/.env.local` | Solo `NEXT_PUBLIC_API_URL` y `NEXT_PUBLIC_GOOGLE_CLIENT_ID` |
| `discord-bot/` | `discord-bot/.env` | `BACKEND_URL=http://localhost:3007` y las variables `DISCORD_*` |

```bash
# Infraestructura
docker compose --env-file .env.dev -f docker-compose.dev.yml up -d postgres redis

# Backend
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run start:dev

# Frontend (en otra terminal)
cd new_frontend
npm install
npm run dev -- -p 3005

# Bot de Discord (opcional, en otra terminal)
cd discord-bot
npm install
npm run deploy:commands   # registra /soporte en el servidor (una vez)
npm run dev
```

## Puertos

| Servicio | Puerto |
|---|---|
| backend (Swagger en `/api`) | 3007 |
| new_frontend | 3005 |
| discord-bot | 3001 |
| ngrok (inspector) | 4040 |
| PostgreSQL | 5432 |
| Redis | 6379 |
| frontend legacy (deshabilitado en el compose) | 3000 |

## Variables de entorno

Todas están en [`.env.example`](../.env.example). Las del backend se validan con Joi al
arrancar ([`backend/src/config/env.validation.ts`](../backend/src/config/env.validation.ts)):
si falta una obligatoria, la API no levanta y el error dice cuál.

### Backend

| Variable | Descripción | Default |
|----------|-------------|---------|
| `NODE_ENV` | `development`, `production`, `test` o `staging` | `development` |
| `PORT` | Puerto HTTP | `3007` |
| `HOST` | Host de bind | `0.0.0.0` |
| `CLIENT_URL` | Origen permitido por CORS en los sockets. Un solo valor (el CORS de REST está fijo en `src/main.ts`) | — |
| `ENABLE_DEV_TOOLS` | Habilita `/auth/dev-login` y `/test-events`. Prohibido en producción | `false` |
| `ID_LEAGUE_ARG` | ID de la liga argentina en API-Football | — (`128`) |
| `DATABASE_URL` | Conexión a PostgreSQL | — |
| `API_FOOTBALL_KEY` | API key de API-Football | — |
| `GOOGLE_CLIENT_ID` | Client ID de Google OAuth | — |
| `JWT_ACCESS_SECRET` | Secreto del access token | — |
| `JWT_ACCESS_EXPIRES_IN` | Duración del access token | `15m` |
| `JWT_REFRESH_SECRET` | Secreto del refresh token | — |
| `JWT_REFRESH_EXPIRES_IN` | Duración del refresh token | `7d` |
| `BCRYPT_SALT_ROUNDS` | Rondas de bcrypt | `12` |
| `FRONTEND_URL` | URL pública del frontend | — |
| `FRONTEND_SUCCESS_URL` | Redirect de pago exitoso | — |
| `FRONTEND_FAILURE_URL` | Redirect de pago fallido | — |
| `FRONTEND_PENDING_URL` | Redirect de pago pendiente | — |
| `MERCADO_PAGO_API_URL` | Base URL de Mercado Pago | — |
| `MERCADO_PAGO_ACCESS_TOKEN` | Access token de Mercado Pago | — |
| `MERCADO_PAGO_RECEIVER_ID` | Receiver ID | opcional |
| `MERCADO_PAGO_WEBHOOK_URL` | URL pública del webhook (ngrok en dev) | — |
| `MERCADO_PAGO_WEBHOOK_SECRET` | Secreto para validar la firma del webhook | — |
| `CLOUDINARY_CLOUD_NAME` | Cloud name de Cloudinary | — |
| `CLOUDINARY_API_KEY` | API key de Cloudinary | — |
| `CLOUDINARY_API_SECRET` | API secret de Cloudinary | — |
| `RESEND_API_KEY` | API key de Resend | — |
| `DISCORD_INTERNAL_SECRET` | Secreto compartido backend ↔ bot | — |
| `DISCORD_BOT_URL` | URL base del bot (con `/api`) | — |
| `REDIS_HOST` | Host de Redis | `redis` |
| `REDIS_PORT` | Puerto de Redis | `6379` |
| `REDIS_PASSWORD` | Password de Redis | — |

### Frontend, bot e infraestructura

| Variable | Usada por | Descripción |
|----------|-----------|-------------|
| `NEXT_PUBLIC_API_URL` | new_frontend | URL de la API vista desde el navegador |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | new_frontend | El mismo Client ID de Google que el backend |
| `NEW_FRONTEND_PORT` | compose | Puerto de `next dev` dentro del contenedor (`3005`) |
| `DISCORD_BOT_TOKEN` | discord-bot | Token del bot |
| `DISCORD_GUILD_ID` | discord-bot | Servidor donde se registran los comandos |
| `DISCORD_TICKETS_CHANNEL_ID` | discord-bot | Canal donde se abren los hilos de tickets |
| `DISCORD_MODERATION_CHANNEL_ID` | discord-bot | Canal de alertas de reportes |
| `BACKEND_URL` | discord-bot | URL del backend (el compose la fija en `http://backend:3007`) |
| `NGROK_AUTHTOKEN` | ngrok | Token de tu cuenta de ngrok |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | postgres | Credenciales de la base (tienen que coincidir con `DATABASE_URL`) |
| `CHOKIDAR_USEPOLLING` | compose | Hot reload con volúmenes en Windows y macOS |

## Servicios externos

| Servicio | Para qué | Cómo conseguirlo |
|---|---|---|
| **Google OAuth** | Login | Google Cloud Console → Credenciales → ID de cliente OAuth (aplicación web) con `http://localhost:3005` como origen autorizado |
| **API-Football** | Partidos, tablas y estadísticas | Cuenta en api-football.com. El plan gratuito tiene cuota diaria, y los crons la consumen rápido |
| **Mercado Pago** | Suscripciones y packs de monedas | Credenciales de prueba en el panel de developers. El webhook necesita una URL pública: ngrok |
| **ngrok** | Exponer el backend para los webhooks | Copiá la URL pública del inspector (<http://localhost:4040>) en `MERCADO_PAGO_WEBHOOK_URL`, terminada en `/webhook/mercado-pago` |
| **Cloudinary** | Subida de imágenes | Cuenta gratuita |
| **Resend** | Emails transaccionales | Cuenta gratuita |
| **Discord** | Soporte y moderación | Aplicación con bot en el Developer Portal, invitada al servidor, con los IDs de servidor y canales |

## Datos iniciales y usuarios

- **No hay seed del catálogo.** Una base nueva arranca sin planes de suscripción
  (`SubscriptionPlan`, uno por tier), ítems de tienda ni packs de monedas. Los ítems y
  los packs se cargan desde Swagger con un usuario admin (`POST /store/item/bulk` y
  `POST /coin-shop/admin/packs`).
- **Primer usuario:** entrá con Google desde la web. Para darle permisos, cambiá su
  `role` (`USER`, `MODERATOR`, `ADMIN` o `PRESIDENT`) desde `npx prisma studio`, en
  `backend/`.
- **Usuarios de prueba:** `npm run seed:e2e` (en `backend/`, o con
  `docker compose ... exec backend npm run seed:e2e`) crea usuarios
  `e2e-*@chiquimafias.test` con cada rol. Con `ENABLE_DEV_TOOLS=true` se puede entrar
  con ellos sin Google: `POST /auth/dev-login` con `{ "email": "…" }`.

## Tests

| App | Comando | Notas |
|---|---|---|
| backend | `npm run test:unit` | Unit tests puros (`jest src/`). Seguros de correr siempre |
| backend | `npm run test:e2e` | ⚠️ **Borran todas las tablas** de la base de `DATABASE_URL`. Usá una base descartable |
| new_frontend | `npm run test:e2e` | Playwright con la API mockeada (desktop y mobile). No necesita backend |
| new_frontend | `npm run test:e2e:fullstack` | Smoke contra el stack real en :3005. Requiere `ENABLE_DEV_TOOLS=true` y `seed:e2e` |

> `npm test` en el backend corre unit **y** e2e. Para unit tests usá siempre
> `npm run test:unit`.

## Problemas comunes

| Síntoma | Causa y solución |
|---|---|
| El backend no arranca con `"NODE_ENV" must be one of…` o `"PORT" must be a number` | Las `${VAR}` del compose llegan vacías. Levantá con `--env-file .env.dev` |
| `/auth/dev-login` responde 404 | Falta `ENABLE_DEV_TOOLS=true`, o el backend corre con `NODE_ENV=production`. Revisá que no haya un `.env` en la raíz con valores de producción |
| El socket no conecta (error de CORS) | `CLIENT_URL` tiene que ser exactamente el origen del front (`http://localhost:3005`), un solo valor |
| El front en Docker no responde en :3005 | Falta `NEW_FRONTEND_PORT=3005` |
| No llegan los webhooks de Mercado Pago | La URL de ngrok cambia en cada reinicio: actualizá `MERCADO_PAGO_WEBHOOK_URL` |
| No hay partidos ni tabla | Revisá `API_FOOTBALL_KEY` y la cuota diaria de API-Football; los crons loguean el error |
| `/soporte` no aparece en Discord | Corré `npm run deploy:commands` en `discord-bot/` |
