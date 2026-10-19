# ChiquiMafias — Bot de Discord

Microservicio de backoffice de [ChiquiMafias](../README.md): el soporte (tickets) y la
moderación (reportes) se operan desde un servidor de Discord, sin panel web.

**Node · Express 5 · discord.js 14**

El bot **no guarda estado**: todo lo que hace pasa por webhooks del backend, y
PostgreSQL sigue siendo la única fuente de verdad. Contexto general en
[docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md#backoffice-en-discord).

## Qué hace

- **Tickets:** cuando un usuario abre un ticket en la web, el bot crea un hilo en el
  canal de tickets. Lo que los admins escriben en el hilo (adjuntos incluidos) se
  reenvía al backend y le llega al usuario en la web. Un select menu cambia el estado:
  abierto, en revisión, resuelto o cerrado. Al cerrarlo, el hilo se renombra como
  cerrado.
- **Reportes:** cada reporte de un usuario llega como alerta al canal de moderación,
  con tres botones: **Aviso** (directo), **Mutear** (un modal pide motivo y horas) y
  **Banear** (un modal pide el motivo).
- **`/soporte`:** slash command para los admins.
  - `/soporte tickets [estado]` lista los últimos tickets (abiertos o en revisión) con
    link a su hilo.
  - `/soporte reportes` lista los últimos reportes.

## Contrato con el backend

Toda request, en los dos sentidos, lleva el header
`x-discord-bot-token: <DISCORD_INTERNAL_SECRET>`, que se valida en ambos lados.

| Dirección | Endpoint |
|---|---|
| Backend → bot | `POST /api/alerts/report` · `POST /api/tickets/new` · `POST /api/tickets/forward-message` |
| Bot → backend | `${BACKEND_URL}/api/discord/webhook/*` (`action`, `ticket/message`, `ticket/status`, `tickets`, `reports`) |

## Configuración

| Variable | Descripción |
|---|---|
| `DISCORD_BOT_TOKEN` | Token del bot (Developer Portal) |
| `DISCORD_GUILD_ID` | Servidor de los admins |
| `DISCORD_TICKETS_CHANNEL_ID` | Canal donde se abren los hilos de tickets |
| `DISCORD_MODERATION_CHANNEL_ID` | Canal de alertas de reportes |
| `DISCORD_INTERNAL_SECRET` | Secreto compartido con el backend |
| `BACKEND_URL` | URL del backend (`http://backend:3007` en Docker) |
| `PORT` | Puerto HTTP (default `3001`) |

```bash
npm install
npm run deploy:commands   # registra /soporte en el servidor (al crear o cambiar comandos)
npm run dev               # node index.js
```

En Docker lo levanta `docker-compose.dev.yml` junto con el resto del stack (ver
[docs/SETUP.md](../docs/SETUP.md)).

## Estructura

```
index.js                      # Express + cliente de Discord; enruta las interacciones
deploy-commands.js            # registro de slash commands
src/routes/webhook.js         # rutas que llama el backend (montadas en /api)
src/controllers/              # handlers de esas rutas
src/commands/support.js       # /soporte
src/interactions/             # botones (button.js) y modales (modal.js)
src/config/discord-client.js  # cliente de discord.js
```
