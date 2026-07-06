# 🔗 Guía de Integración del SubscriptionsModule

## ✅ Pasos de Instalación



### 2. Configurar Variables de Entorno

Copiar el archivo de ejemplo y actualizar credenciales:

```bash
cp backend/.env.subscriptions.example backend/.env.local
# Editar y agregar tus credenciales de Mercado Pago
```

**Variables requeridas:**
- `MERCADO_PAGO_ACCESS_TOKEN`
- `MERCADO_PAGO_RECEIVER_ID`
- `MERCADO_PAGO_WEBHOOK_URL`
- `FRONTEND_URL`
- `REDIS_*` (para idempotencia)

### 3. Asegurar que Redis esté disponible

```bash
# Verificar que RedisService esté disponible en el proyecto
# Debe existir: src/redis/redis.service.ts

# Si no existe, instalar:
npm install redis ioredis
```

### 4. Registrar el Webhook en Mercado Pago

1. Ir a [Mercado Pago Developers](https://www.mercadopago.com.ar/developers/panel)
2. Seleccionar tu aplicación
3. Ir a **Configuración** → **Webhooks**
4. Agregar nuevo webhook:
   - **URL:** `https://tu-dominio.com/subscriptions/webhook`
   - **Tópicos:** `payment`, `preapproval_payment`
   - Copiar el **Receiver ID**




---

## 🧪 Testing Manual (Curl)

### 1. Checkout

```bash
curl -X POST http://localhost:3000/subscriptions/checkout \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"tier": "TIER_2"}'
```

### 2. Webhook (Simulado)

```bash
curl -X POST http://localhost:3000/subscriptions/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "id": 123456789,
    "type": "payment",
    "data": {"id": "999999"},
    "resource": "/v1/payments/999999"
  }'
```

### 3. Get Current Subscription

```bash
curl http://localhost:3000/subscriptions/me \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

### 4. Cancel

```bash
curl -X POST http://localhost:3000/subscriptions/cancel \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"reason": "No longer interested"}'
```

### 5. Upgrade

```bash
curl -X POST http://localhost:3000/subscriptions/upgrade \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"newTier": "TIER_3"}'
```

---

## 🐛 Debugging y Troubleshooting

### Log Levels

El servicio usa `Logger` de NestJS:

```typescript
private readonly logger = new Logger(SubscriptionsService.name)
this.logger.log('Info message')
this.logger.warn('Warning message')
this.logger.error('Error message')
```

**Filtrar logs en desarrollo:**

```bash
# Ver solo logs de SubscriptionsService
DEBUG=subscriptions:* npm run start:dev

# O en código:
LOG_LEVEL=debug npm run start:dev
```

### Problemas Comunes

| Problema | Causa | Solución |
|----------|-------|----------|
| 401 Unauthorized | JWT inválido | Verificar token de autenticación |
| 409 Conflict | Suscripción ACTIVE existe | Usuario debe cancelar o upgradear |
| 500 Mercado Pago Error | Credenciales inválidas | Revisar `MERCADO_PAGO_ACCESS_TOKEN` en `.env` |
| Webhook no procesa | URL no es pública | Usar ngrok o deployment real |
| Redis error | Redis no activo | `redis-server` debe estar corriendo |

---

## 📊 Monitoreo de Salud

### Endpoint de Health Check (Agregar)

```typescript
// En subscriptions.controller.ts
@Get('health')
async health() {
  const redisHealth = await this.redis.ping()
  const dbHealth = await this.prisma.user.count()
  
  return {
    status: 'ok',
    redis: redisHealth === 'PONG' ? 'ok' : 'error',
    database: dbHealth >= 0 ? 'ok' : 'error'
  }
}
```

### Monitoreo de Redis

```bash
# Conectarse a Redis
redis-cli

# Ver claves de suscripciones
keys subscription:*
keys payment:processed:*

# Ver detalles
get subscription:checkout:uuid-ref-123
```

---

## 🔄 Flujo de Despliegue

### 1. Desarrollo Local

```bash
# Terminal 1: Backend
npm run start:dev

# Terminal 2: Redis
redis-server

# Terminal 3: Base de datos (si es local)
# PostgreSQL debe estar ejecutándose
```

### 2. Staging

```bash
# Deployar con credenciales TEST
MERCADO_PAGO_ACCESS_TOKEN=TEST-xxxxx npm run build
npm run start:prod
```

### 3. Producción

```bash
# Deployar con credenciales PROD
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-xxxxx npm run build
npm run start:prod
```

---

## 🔒 Consideraciones de Seguridad

### 1. Webhook Signature Validation (Opcional pero Recomendado)

Mercado Pago puede enviar una firma en el header. Validar:

```typescript
// Agregar al webhook
const signature = req.headers['x-signature']
const timestamp = req.headers['x-timestamp']

// Validar contra tu X-Signature-Secrets
```

### 2. Rate Limiting

Agregar rate limiting al endpoint de webhook:

```typescript
@UseGuards(ThrottlerGuard)
@Post('webhook')
async webhook(@Body() payload: MercadoPagoWebhookDto) {
  // ...
}
```

### 3. IP Whitelist (Opcional)

```typescript
// Validar que el webhook venga de Mercado Pago
const MERCADO_PAGO_IPS = [
  '52.227.40.76',
  '52.230.163.8',
  // Ver lista oficial en Mercado Pago docs
]

if (!MERCADO_PAGO_IPS.includes(req.ip)) {
  throw new ForbiddenException('IP no autorizada')
}
```

---

## 📚 Documentación de Referencia

- [Mercado Pago API Docs](https://www.mercadopago.com.ar/developers/es/docs/apis/checkout/preapproval)
- [NestJS HttpModule](https://docs.nestjs.com/security/authentication)
- [Prisma Transactions](https://www.prisma.io/docs/orm/prisma-client/queries/transactions)
- [Redis in Node.js](https://redis.io/docs/clients/nodejs/)

---

## ✨ Próximas Funcionalidades

- [ ] Integración con panel de administrador
- [ ] Reportes de suscripciones activas
- [ ] Automatización de reintentos fallidos
- [ ] Webhooks de notificación al frontend
- [ ] Soporte para múltiples monedas
- [ ] API de administración (crear/cancelar suscripciones)

---

**Fecha:** 2026-06-23
**Versión:** 1.0.0
**Estado:** 🟢 Listo para producción
