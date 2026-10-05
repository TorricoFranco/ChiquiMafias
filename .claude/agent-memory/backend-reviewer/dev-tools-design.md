---
name: dev-tools-design
description: Decisiones de diseño confirmadas: dev-login y test-events detrás de DevToolsGuard, api-football solo ADMIN en prod, reglas de Discord y de WARN en moderación
metadata:
  type: project
---

`POST /auth/dev-login` (login por email, sin password) y el controller `test-events` son herramientas de desarrollo que se mantienen a propósito. Desde 2026-10-05 los protege `DevToolsGuard`: solo pasan con `ENABLE_DEV_TOOLS=true` (Joi boolean, default false) y `NODE_ENV !== 'production'`; si no, dan 404. `test-events` además exige ADMIN.

Decisiones confirmadas el 2026-10-05:
- `/api-football/*` es solo ADMIN, sin DevToolsGuard a propósito: un admin lo usa en prod para cargar ligas y temporadas.
- Las acciones del bot de Discord se autentican por el secreto compartido. Como el backend no puede mapear el usuario de Discord a uno de la app, Discord solo puede BAN, MUTE o UNBAN a USERs; si el reportado es staff, Forbidden.
- WARN no exige jerarquía (ni desde la web ni desde Discord), para que los reportes contra staff se puedan cerrar. Nadie resuelve desde la web un reporte contra sí mismo.

**Why:** dev-login permite entrar como cualquier usuario (incluido PRESIDENT, que acredita monedas). Si se abre en prod, es un problema crítico.
**How to apply:** no marques como bug que existan dev-login, el WARN sin jerarquía o api-football en prod. Sí revisá que ninguna ruta nueva de debug quede sin `DevToolsGuard` y que prod tenga `NODE_ENV=production` sin `ENABLE_DEV_TOOLS=true`. Ver [[prod-env-config]] y [[recurring-bug-patterns]].
