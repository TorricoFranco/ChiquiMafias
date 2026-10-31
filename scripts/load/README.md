# Pruebas de carga (k6)

Scripts para medir el backend en **local** antes de cambiar nada de infraestructura. Esta carpeta no apunta a la VPS. Lo que salió de las corridas, con sus conclusiones, está en [RESULTADOS.md](RESULTADOS.md).

## Cuándo correrlo y cuándo no

Correlo para:

- tener una línea base antes de cambiar límites de memoria, pools de conexiones o configuración de Redis;
- comparar un cambio en endpoints de lectura contra la línea base de [RESULTADOS.md](RESULTADOS.md).

No lo corras:

- **Contra producción ni la VPS.** Esta carpeta es para local y, después, staging.
- **Contra endpoints que mueven plata o crean datos:** apuestas, billetera, tienda, suscripciones y webhooks de Mercado Pago. Tampoco contra los que mandan mails (Resend) o mensajes a Discord.
- **Con los e2e del backend** (`npm test`, `test:e2e`): borran todas las tablas de la base a la que apunte `DATABASE_URL`.
- **Con `NODE_ENV=production` en tu `.env` local:** el override de `THROTTLE_LIMIT` se ignora a propósito.
- **Con la PC ocupada en otra cosa pesada:** si k6 satura la CPU, los números no sirven.

Ojo: el backend local corre sus crons igual que en desarrollo. Alguno puede consumir cuota de API-Football mientras dura la prueba.

## Requisitos

- Docker Desktop abierto.
- k6 instalado: `winget install --id GrafanaLabs.k6 -e`.
- Postgres y Redis de `docker-compose.dev.yml` arriba. Si Docker se reinició, Redis puede quedar detenido: `docker compose -f docker-compose.dev.yml up -d postgres redis`.
- Tu `backend/.env` local, con la base migrada.

## Cómo correrlo

Trabajá en un worktree de la rama, así no mezclás tus cambios:

```bash
git worktree add ../chiquimafias-load-k6 test/load-k6-local
cp backend/.env ../chiquimafias-load-k6/backend/.env
cd ../chiquimafias-load-k6/backend && npm ci && npx prisma generate && npm run build
```

Arrancá el backend en el puerto **3100**. El 3007 suele estar ocupado por el contenedor de desarrollo, así que no lo uses:

```bash
cd ../chiquimafias-load-k6/backend && PORT=3100 THROTTLE_LIMIT=100000 npm run start:prod
```

En PowerShell: `$env:PORT = "3100"; $env:THROTTLE_LIMIT = "100000"; npm run start:prod`.

En otra terminal, desde la raíz del worktree:

```bash
k6 run -e MODE=smoke -e API_URL=http://localhost:3100 scripts/load/api-lectura.js
```

Modos:

- `smoke`: 5 usuarios durante 1 minuto. Es la línea base y una prueba rápida de que todo responde.
- `escalonada`: sube hasta 100 usuarios en 9 minutos. Busca el punto de quiebre.
- `sostenida`: 40 usuarios durante unos 33 minutos. Busca fugas de memoria y conexiones que no se liberan.

Opcional: `-e WEB_URL=http://localhost:3005` suma la home del front, si la levantás con `npm run build && npm start` en `new_frontend`.

Para medir la memoria del backend y de Redis durante la prueba, corré en otra terminal de PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\load\muestreo-recursos.ps1 -OutFile recursos.csv -Minutes 36
```

Las conexiones de Postgres se miden aparte, en Git Bash. Repetí este comando durante la prueba para ver cómo sube el pool:

```bash
docker exec football_postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "select count(*) from pg_stat_activity"'
```

Al terminar, desde la carpeta principal del repo:

```bash
git worktree remove --force ../chiquimafias-load-k6
```

## Cómo leer el resultado

- En el resumen de k6: `http_req_failed` y `http_req_duration` (p95).
- `throttled_429` tiene que dar 0. Si no, el backend estuvo limitando: revisá que lo hayas arrancado desde el worktree y que `NODE_ENV` no sea `production`.
- En `recursos.csv`: la memoria del backend puede subir al principio. Hay una fuga si sigue subiendo después de que termina la carga. Si baja al terminar, no la hay.
- Antes de comparar dos corridas, hacé un smoke de control en el mismo momento. La latencia depende del estado de la PC: después de reiniciarla, la mediana de la misma prueba pasó de unos 6 ms a 16 ms.

## Límites de estas pruebas

- `THROTTLE_LIMIT` se ignora con `NODE_ENV` en `production` o `staging` (ver `backend/src/config/throttle.ts`).
- Las rutas con `@Throttle` propio (auth, soporte, precios) conservan su límite. Estas pruebas no las tocan.
- Los números locales no son los de la VPS. Sirven para encontrar bloqueos y cuellos de botella en el código.
- Si el contenedor de desarrollo `football_backend` está corriendo, usa la misma base de Postgres y sus crons pueden competir con la prueba.
