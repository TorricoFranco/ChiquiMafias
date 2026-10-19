---
paths:
  - "backend/src/**/*.service.ts"
  - "backend/src/config/**"
---

# Servicios: errores, logs, config, cache y eventos (backend)

## Errores y async

- Lanzá excepciones de Nest con mensaje en español (`NotFoundException('Partido no encontrado')`), no `Error` pelado, cuando el servicio responde a una request.
- `await` en toda promesa. `no-floating-promises` está en **warn**: un warning ahí suele ser un bug real. Si algo es "fire and forget" a propósito, cerralo con `.catch((err) => this.logger.error(...))`.
- Nada de `catch` vacíos. Si atrapás para seguir, logueá; si no podés manejarlo, relanzá.
- Varias escrituras que tienen que quedar juntas van en `prisma.$transaction(async (tx) => ...)`, usando `tx` (no `this.prisma`) adentro.

## Logs

- `private readonly logger = new Logger(<Clase>.name)`. No `console.log` en código nuevo.
- Mensajes en español. Nunca loguear tokens, secrets, headers de auth ni payloads completos de pagos.
- `debug` para lo que se repite en cada tick de cron o mensaje de socket; `log` para eventos de negocio; `error` con `error.message` (y el stack si sirve).

## Configuración

- Leé variables con `ConfigService<EnvironmentVariables>` y `get('VAR', { infer: true })`. Nunca `process.env` en código de la app.
- Variable nueva, en el mismo cambio:
  1. `src/config/env.validation.ts` (Joi; `.required()` o `.default(...)`). Sin esto la app no la valida, y si es `required` y falta, no levanta.
  2. `src/config/interfaces/env.interface.ts`.
  3. `.env.example` de la raíz (con valor de ejemplo, nunca uno real).
  4. El bloque `env:` de `.github/workflows/pipeline.yml` con un valor dummy, si es requerida.
  No leas ni edites `.env` / `.env.dev`: avisale al usuario qué agregar.

## Cache en Redis

- Comandos con `this.redisService.redis`. `subscribe` solo a través de `RedisService.subscribe` (usa una conexión aparte).
- Keys con `:` y de lo general a lo particular: `match:details:v1:<id>`, `wallet:<userId>:balance`, `user:cosmetics:<userId>:color`.
- Todo cache lleva TTL (`'EX', segundos`). Las keys sin TTL son estado (saldo, colas, rankings) y tienen que tener un dueño claro.
- Si cambiás la forma de un objeto cacheado, subí la versión de la key (`v1` → `v2`) o invalidala; si no, el front recibe la forma vieja hasta que venza el TTL.
- Cuando escribís en la DB algo que está cacheado, hacé `redis.del(<key>)` en el mismo flujo.
- Nunca `KEYS *` (bloquea Redis); si hace falta recorrer, `SCAN`.

## Eventos internos (`@nestjs/event-emitter`)

- Nombres en `dominio.accion` en pasado: `match.finished`, `bet.settled`, `report.resolved`, `poll.approved`.
- Emití después de que la transacción confirmó, nunca adentro del callback de `$transaction` (si hace rollback, el evento ya salió). Patrón: juntar los eventos en un array adentro y emitirlos al salir, como `pendingEvents` en `BetsService.settleMarket`. Lo mismo vale para emitir por socket.
- El payload es el contrato entre módulos: tipalo (interface en `interfaces/` del módulo emisor) y buscá todos los `@OnEvent('<nombre>')` antes de cambiarlo.
- Los listeners atrapan y loguean sus propios errores: un fallo en una notificación no tiene que romper el flujo que la disparó. Si hacen I/O lento, `@OnEvent('x', { async: true })`.
