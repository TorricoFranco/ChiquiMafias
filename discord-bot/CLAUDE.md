# discord-bot — ChiquiMafias

Microservicio de backoffice: soporte (tickets) y moderación (reportes) operados desde Discord. Corre en su propio contenedor.
**La única fuente de verdad es PostgreSQL (vía backend)**: el bot no guarda estado propio.

## Stack y comandos

- Node + CommonJS (`require`), Express 5, discord.js 14 y dotenv. JS plano, sin TypeScript ni tests.
- `npm start` / `npm run dev` → `node index.js` (puerto `PORT`, default 3001).
- `npm run deploy:commands` → registra los slash commands (`deploy-commands.js`). Hay que correrlo al agregar o cambiar un comando.

## Estructura

- `index.js` — arranca Express y el cliente de Discord. Enruta `interactionCreate` (botones, modales, select `change_status_*`, `/soporte`) y reenvía al backend los mensajes de los hilos de tickets.
- `src/routes/webhook.js` — montado en `/api`: `POST /api/alerts/report`, `/api/tickets/new`, `/api/tickets/forward-message` (los llama el backend).
- `src/controllers/webhookController.js` — handlers de esas rutas.
- `src/interactions/` (`button.js`, `modal.js`), `src/commands/support.js` (`/soporte`), `src/config/discord-client.js`.

## Contrato con el backend

- Toda request, en ambos sentidos, lleva `x-discord-bot-token: <DISCORD_INTERNAL_SECRET>`. Las rutas entrantes lo validan: **toda ruta nueva tiene que validarlo también**.
- Bot → backend: `${BACKEND_URL}/api/discord/webhook/*` (`action`, `ticket/message`, `ticket/status`, `tickets`, `reports`). Ver `backend/src/discord/discord.controller.ts`.
- Backend → bot: `DISCORD_BOT_URL` + las rutas de arriba. Ver `backend/src/discord/discord.service.ts`.
- Si cambia un payload, se cambian los dos lados en el mismo cambio. Después, corré el subagente `contract-checker` con el dominio `discord`: con `forbidNonWhitelisted`, un campo de más da 400 y el bot no mira la respuesta, así que el error es silencioso.

## Variables de entorno

`DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `DISCORD_TICKETS_CHANNEL_ID`, `DISCORD_MODERATION_CHANNEL_ID`, `DISCORD_INTERNAL_SECRET`, `BACKEND_URL`, `PORT`.
