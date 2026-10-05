---
name: prod-env-config
description: En docker-compose.yml de prod el backend usa env_file .env, así que cualquier variable del .env raíz llega al contenedor aunque no esté en environment:
metadata:
  type: project
---

El servicio `backend` de `docker-compose.yml` (prod) tiene `env_file: - .env` además de la lista `environment:`. Toda variable del `.env` raíz entra al contenedor; `environment:` solo pisa las que lista. Prueba: `CLIENT_URL`, `FRONTEND_URL` y `MERCADO_PAGO_WEBHOOK_SECRET` son obligatorias en Joi y no están en `environment:`, pero el backend arranca.

En la review del 2026-10-05 el autor asumió que dejar `ENABLE_DEV_TOOLS` fuera de `environment:` lo mantenía apagado en prod. Eso es falso.

**Why:** los flags que solo deben existir en dev (ENABLE_DEV_TOOLS) dependen en realidad del contenido del `.env` de prod, que no se puede leer desde el repo.
**How to apply:** para garantizar un valor en prod, ponelo fijo en `environment:` (pisa env_file) o validalo en Joi con `.when('NODE_ENV', ...)`. No des por bueno "no está en el compose". Relacionado: [[dev-tools-design]].
