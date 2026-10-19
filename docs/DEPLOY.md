# Despliegue en producción (VPS)

Guía para llevar ChiquiMafias a un VPS con Ubuntu, Docker y Caddy. El stack es el de
`docker-compose.yml`: **Caddy** (HTTPS y proxy) → `new_frontend` y `backend`, más Postgres, Redis y el
bot de Discord en redes internas. Solo Caddy publica puertos (80 y 443).

**Contenido**

- [Antes de empezar](#antes-de-empezar)
- [1. Preparar el servidor](#1-preparar-el-servidor)
- [2. DNS](#2-dns)
- [3. Código y variables](#3-código-y-variables)
- [4. Primer arranque y datos iniciales](#4-primer-arranque-y-datos-iniciales)
- [5. Servicios externos](#5-servicios-externos)
- [6. Verificación desde afuera](#6-verificación-desde-afuera)
- [Backups](#backups)
- [Actualizar](#actualizar)
- [Rollback](#rollback)
- [Problemas comunes](#problemas-comunes)

---

## Antes de empezar

- Un VPS con **Ubuntu 22.04 o 24.04 LTS**, al menos **2 vCPU y 4 GB de RAM** (con 2 GB el build de Next.js
  puede quedarse sin memoria; el script de hardening puede crear swap).
- El dominio (`chiquimafias.com`) y acceso a su panel de DNS.
- Una llave SSH propia: `ssh-keygen -t ed25519 -f ~/.ssh/chiquimafias_vps`. Solo se comparte la `.pub`.
- Las credenciales de producción: Google OAuth, Mercado Pago (**producción**, no pruebas), API-Football,
  Cloudinary, Resend y el bot de Discord.

## 1. Preparar el servidor

Desde tu PC, copiá la llave pública y el script, y corré el hardening como root:

```bash
scp -i <llave-del-proveedor> ~/.ssh/chiquimafias_vps.pub scripts/ops/harden-server.sh root@<IP>:/root/
ssh root@<IP>
sudo bash /root/harden-server.sh --user deploy --pubkey-file /root/chiquimafias_vps.pub --swap-gb 2
```

El script actualiza el sistema, crea el usuario `deploy`, deja SSH solo con llave y sin root, activa UFW
(el puerto de SSH, 80 y 443), fail2ban, actualizaciones automáticas e instala Docker. **Antes de cerrar la
sesión de root**, abrí otra terminal y comprobá que entrás: `ssh -i ~/.ssh/chiquimafias_vps deploy@<IP>`.

**Puerto de SSH.** Algunos proveedores (DonWeb, por ejemplo) no usan el 22 sino otro puerto, como el 5622, y su
firewall externo solo deja pasar ese. Pasale el que ya funciona con `--ssh-port` (en el ejemplo de arriba,
`--ssh-port 5622`) y no lo muevas al 22 o te quedás afuera. En Ubuntu 24.04 SSH arranca por socket
(`ssh.socket`); el script ya lo contempla y deja un solo puerto escuchando.

**Cuidado con fail2ban mientras probás.** Después del hardening, `root` ya no puede entrar por SSH, y cada
intento fallido cuenta: 4 en 10 minutos bloquean tu IP durante 1 hora. No dejes bucles ni scripts que sigan
intentando entrar como `root`. Si te bloqueás, entrá por la consola web del panel del proveedor y corré
`fail2ban-client unban --all`. Como red de seguridad, antes de endurecer SSH podés programar un
`systemd-run --on-active=900 <script-que-restaura-sshd>` y cancelarlo (`systemctl stop <unidad>.timer`) cuando
confirmes que entrás como `deploy`.

> Docker se salta UFW cuando un servicio publica puertos con `ports:`. Por eso el compose de producción
> solo publica Caddy. No agregues `ports:` a Postgres, Redis, el backend ni el bot.

## 2. DNS

Creá tres registros **A** hacia la IP del VPS (con TTL bajo mientras probás):

| Nombre | Tipo | Valor |
|---|---|---|
| `chiquimafias.com` (`@`) | A | IP del VPS |
| `www` | A | IP del VPS |
| `api` | A | IP del VPS |

Caddy no puede sacar los certificados hasta que el DNS apunte al servidor. Comprobalo con
`dig +short api.chiquimafias.com`.

## 3. Código y variables

```bash
ssh deploy@<IP>
sudo mkdir -p /srv/chiquimafias && sudo chown deploy:deploy /srv/chiquimafias
git clone https://github.com/TorricoFranco/ChiquiMafias.git /srv/chiquimafias
cd /srv/chiquimafias
git checkout main            # producción sale de main
cp .env.production.example .env
chmod 600 .env
nano .env                    # completá todos los CAMBIAR_...
```

Puntos que más fallan en el `.env` (el detalle está comentado en `.env.production.example`):

- `CLIENT_URL` y `FRONTEND_URL` son exactamente `https://chiquimafias.com` (sin `www`, sin barra final
  que importe). Es el único origen que acepta CORS.
- `DISCORD_BOT_URL` termina en `/api`.
- `DATABASE_URL` usa el mismo usuario, contraseña y base que `POSTGRES_*`, con host `postgres`.
- Secretos nuevos para todo (`openssl rand -base64 48` / `openssl rand -hex 24`). No reuses los de dev.
- `API_BACKEND_URL` y `NEXT_PUBLIC_*` se hornean al compilar el frontend: si los cambiás, reconstruí.

## 4. Primer arranque y datos iniciales

```bash
cd /srv/chiquimafias
docker compose up -d --build
docker compose ps                      # todo en "healthy" (el bot puede reiniciarse hasta cargar su token)
docker compose logs -f backend         # "All migrations have been successfully applied"
```

El backend corre `prisma migrate deploy` al arrancar, así que las tablas se crean solas.

### Cargar los datos de desarrollo (una sola vez, sobre la base vacía)

En tu PC (con el contenedor de dev corriendo) generás el volcado inicial. Le pasás el correo de tu cuenta
de presidente, que es el único usuario que se conserva:

```bash
KEEP_EMAIL=tu-correo@gmail.com bash backend/scripts/prod-data/export-dev-to-prod.sh   # deja backups/prod-seed.sql
scp backups/prod-seed.sql deploy@<IP>:/srv/chiquimafias/
```

El archivo tiene tu email: no lo subas a git y borralo del servidor al terminar. En el VPS:

```bash
cd /srv/chiquimafias
docker compose stop backend discord_bot
docker compose exec -T postgres sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < prod-seed.sql
docker compose up -d backend discord_bot
shred -u prod-seed.sql
```

> Qué lleva el volcado (el detalle está en `backend/scripts/prod-data/clean-for-prod.sql`): el fútbol
> (liga, equipos, partidos y jugadores), la tienda, los tiers de suscripción, los packs de monedas, los
> equipos de hinchas y tu usuario con su billetera e inventario. No lleva los demás usuarios ni nada de lo
> que generan (apuestas, encuestas, transacciones, órdenes, tickets, reportes). Tu saldo viaja tal cual
> estaba en dev; si eran monedas de prueba, ajustalo después desde el panel de administración.

Entrá con tu cuenta de Google: si tu usuario venía en el volcado, conserva el rol de presidente.

## 5. Servicios externos

Con el dominio funcionando:

1. **Google OAuth:** en Google Cloud Console → credenciales → agregá `https://chiquimafias.com` a los
   orígenes JavaScript autorizados.
2. **Mercado Pago:** cargá `https://api.chiquimafias.com/webhook/mercado-pago` como URL de notificaciones y
   copiá el secreto de firma a `MERCADO_PAGO_WEBHOOK_SECRET`. Después `docker compose up -d backend`.
3. **Resend:** verificá el dominio (registros SPF y DKIM en tu DNS) para que los mails no caigan en spam.
4. **Discord:** registrá los comandos del bot una vez: `docker compose exec discord_bot node deploy-commands.js`.
   Si usás el mismo token de bot en tu PC y en el servidor, los dos responden a la vez: apagá el de tu PC o
   creá otro bot para producción.
5. **API-Football:** el plan gratuito no da acceso a la temporada en curso (solo 2022 a 2024) ni alcanza para
   los crons (100 pedidos por día). Con ese plan el sitio sirve los datos del seed, pero los partidos, las
   posiciones y los eventos en vivo no se actualizan y el cron de posiciones falla. Para datos en vivo hace
   falta un plan de pago en `dashboard.api-football.com`. Comprobalo con
   `curl -s -H "x-apisports-key: $KEY" https://v3.football.api-sports.io/status`.

## 6. Verificación desde afuera

Desde **tu PC** (no desde el VPS):

```bash
bash scripts/ops/scan-ports.sh <IP> chiquimafias.com api.chiquimafias.com
SSH_PORT=5622 bash scripts/ops/scan-ports.sh <IP> chiquimafias.com api.chiquimafias.com   # si el SSH no está en el 22
```

Comprueba que solo estén abiertos el puerto de SSH, el 80 y el 443, que HTTP redirija a HTTPS, que la API mande HSTS,
que Swagger y `dev-login` no existan, que CORS acepte solo el sitio y que `www` redirija. Tiene que terminar
con "Todo en orden". Después probá a mano: login con Google, un pago de prueba con tu cuenta, el chat
(WebSockets) y que llegue un reporte al canal de Discord.

## Backups

`scripts/ops/backup.sh` vuelca Postgres y Redis, verifica el archivo y rota (7 diarios, 4 semanales,
6 mensuales). Instalalo en el cron del usuario `deploy`:

```bash
sudo mkdir -p /var/backups/chiquimafias && sudo chown deploy:deploy /var/backups/chiquimafias
crontab -e
# todos los días a las 03:30
30 3 * * * /srv/chiquimafias/scripts/ops/backup.sh >> /var/log/chiquimafias-backup.log 2>&1
```

Un backup en el mismo disco no sirve si se pierde el servidor. Configurá un destino externo con `rclone`
(S3, Backblaze B2, Google Drive, otro servidor) y definí `BACKUP_RCLONE_REMOTE`, por ejemplo agregando
`BACKUP_RCLONE_REMOTE=b2:mi-bucket/chiquimafias` delante del comando del cron. **Probá una restauración
al menos una vez** (en otro servidor o en una base descartable) antes de confiar en los backups.

## Actualizar

```bash
cd /srv/chiquimafias
scripts/ops/backup.sh                       # backup previo, siempre
git fetch origin && git checkout main && git pull --ff-only
docker compose up -d --build                # reconstruye lo que cambió y aplica migraciones nuevas
docker compose ps && docker compose logs --tail=50 backend
```

Las migraciones solo avanzan: nunca hay un "deshacer" automático. Por eso el backup previo es obligatorio.

## Rollback

**Solo el código** (no hubo migraciones nuevas, o son compatibles hacia atrás):

```bash
cd /srv/chiquimafias
git log --oneline -10                        # elegí el commit anterior que andaba
git checkout <commit-bueno>
docker compose up -d --build
```

**Código y base** (una migración o un dato salió mal):

```bash
cd /srv/chiquimafias
git checkout <commit-bueno>
scripts/ops/restore.sh /var/backups/chiquimafias/daily/db-<fecha>.sql.gz   # pide confirmación
docker compose up -d --build
```

La restauración deja la base como estaba al momento del backup: se pierde lo que pasó después (pagos,
apuestas, mensajes). Si hubo pagos en ese lapso, cruzalos con el panel de Mercado Pago. Para volver a `main`
después: `git checkout main && git pull --ff-only`.

## Problemas comunes

- **CORS bloquea el sitio:** `CLIENT_URL` no coincide con el origen del navegador (protocolo, dominio o
  `www`). Corregilo y `docker compose up -d backend`.
- **Caddy no saca el certificado:** el DNS todavía no apunta al VPS o el puerto 80/443 está bloqueado.
  `docker compose logs caddy`. Let's Encrypt limita los reintentos fallidos; esperá antes de insistir.
- **Los reportes o tickets no llegan a Discord:** `DISCORD_BOT_URL` sin `/api`, o `DISCORD_INTERNAL_SECRET`
  distinto entre backend y bot.
- **El login funciona pero se pierde la sesión al recargar:** la cookie `refresh_token` necesita HTTPS
  (`NODE_ENV=production` lo fija el compose) y que el sitio y la API cuelguen del mismo dominio.
- **Todos los usuarios comparten el límite de peticiones:** el backend quedó publicado o `trust proxy` no
  está activo. Verificá con `scan-ports.sh` que el 3007 esté cerrado.
- **El build del frontend muere (exit 137):** falta memoria. Creá swap (`--swap-gb 2` del script de hardening).
- **Ver logs:** `docker compose logs -f --tail=100 <servicio>` (`backend`, `new_frontend`, `discord_bot`,
  `caddy`, `postgres`, `redis`).
