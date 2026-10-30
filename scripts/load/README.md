# Pruebas de carga (k6)

Scripts para medir el backend antes de tocar la infraestructura de producción. Esta carpeta corre en **local**: no apunta a la VPS.

## Requisitos

- [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/). En Windows: `winget install k6.k6`.
- Postgres y Redis de `docker-compose.dev.yml` levantados.
- La DB migrada y las variables del backend en tu entorno local (las mismas que usás para `npm run start:dev`).

## Cómo correrlo

1. Levantá la infra:

```bash
docker compose -f docker-compose.dev.yml up -d postgres redis
```

2. Compilá el backend y levantalo en modo producción (sin watch, así se parece más a la VPS). `THROTTLE_LIMIT` alto evita que el límite de 150 req/min por IP corte la prueba:

```bash
cd backend && npm run build && THROTTLE_LIMIT=100000 npm run start:prod
```

En PowerShell: `$env:THROTTLE_LIMIT = "100000"` y después `npm run start:prod`.

3. Desde la raíz del repo, en otra terminal:

```bash
k6 run -e MODE=smoke -e API_URL=http://localhost:3007 scripts/load/api-lectura.js
```

Modos:

- `smoke`: 5 usuarios durante 1 minuto. Es la línea base.
- `escalonada`: sube hasta 100 usuarios en unos 9 minutos. Busca el punto de quiebre.
- `sostenida`: 40 usuarios durante unos 33 minutos. Busca fugas de memoria y conexiones que no se liberan.

Opcional: `-e WEB_URL=http://localhost:3005` suma la home del front (levantala con `npm run build && npm start` en `new_frontend`).

## Qué mirar

- En el resumen de k6: `http_req_failed`, `http_req_duration` (p95) y `throttled_429`. Si `throttled_429` no es 0, el backend estuvo limitando: revisá que `THROTTLE_LIMIT` esté seteado.
- Durante la prueba: `docker stats` para Postgres y Redis, y el Administrador de tareas para el proceso de Node.
- Si k6 satura la CPU de tu PC, los números no sirven: bajá los `target` del modo.

## Límites de esta prueba

- `THROTTLE_LIMIT` se ignora con `NODE_ENV` en `production` o `staging`, a propósito (ver `backend/src/config/throttle.ts`).
- Las rutas con `@Throttle` propio (auth, soporte, precios) conservan su límite. Esta prueba no las toca.
- Los números locales no son los de la VPS. Sirven para encontrar bloqueos y cuellos de botella en el código.
