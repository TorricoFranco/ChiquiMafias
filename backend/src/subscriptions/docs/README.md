# SubscriptionsModule - Documentación Completa

## 📋 Descripción General

El **SubscriptionsModule** implementa un sistema robusto de suscripciones recurrentes integrado con la API de **Mercado Pago** (Preapproval). Proporciona:

✅ Compra de suscripciones con precios dinámicos (descuentos por fin de semana)
✅ Renovación automática mensual mediante Mercado Pago
✅ Cancelación estilo Spotify (beneficios activos hasta el vencimiento)
✅ Upgrade/downgrade de planes con compensación en monedas virtuales
✅ Protección estricta contra replay attacks y duplicación de pagos
✅ Ciclado automático de beneficios mediante Cron Jobs
✅ Integración completa con Wallet y UserInventory

---

## 🏗️ Arquitectura

### Componentes Principales

```
subscriptions/
├── subscriptions.controller.ts      # Endpoints HTTP
├── subscriptions.service.ts         # Lógica de negocio
├── subscriptions.cron.ts            # Tareas programadas (Cron)
├── subscriptions.module.ts          # Configuración del módulo
├── dto/                             # Data Transfer Objects
│   ├── checkout-subscription.dto
│   ├── cancel-subscription.dto
│   ├── upgrade-subscription.dto
│   ├── mercado-pago-webhook.dto
│   └── subscription-response.dto
├── interfaces/
│   └── mercado-pago.interface       # Tipos Mercado Pago
├── constants/
│   └── subscription.constants       # Configuración y precios
└── index.ts                         # Re-exports
```

### Dependencias Externas

- `@nestjs/axios` - Cliente HTTP para Mercado Pago
- `@prisma/client` - ORM para persistencia
- `redis` - Cache y protección contra replay
- `uuid` - Generación de referencias únicas
- `class-validator` - Validación de DTOs

---

## 🔌 Endpoints Disponibles

### 1. POST `/subscriptions/checkout`

**Autenticación:** JWT Required ✅
**Descripción:** Inicia el flujo de compra de una suscripción

#### Request
```json
{
  "tier": "TIER_2"
}
```

#### Response (200 OK)
```json
{
  "init_point": "https://www.mercadopago.com.ar/checkout/...",
  "external_reference": "uuid-ref-123",
  "subscription_id": "sub-id-456",
  "tier": "TIER_2"
}
```

#### Comportamiento
1. Valida que el usuario no tenga suscripción ACTIVE
2. Calcula precio con descuentos dinámicos (fin de semana: -15%)
3. Genera `mpExternalRef` único (UUID)
4. Crea registro en DB con estado `GRACE_PERIOD` (temporal)
5. Llama Mercado Pago con payload Preapproval
6. Guarda en Redis para idempotencia
7. Retorna `init_point` para redirigir al usuario

---

### 2. POST `/subscriptions/webhook`

**Autenticación:** Public ❌
**Descripción:** Recibe notificaciones de Mercado Pago (payment/preapproval_payment)

#### Request (Mercado Pago → Backend)
```json
{
  "id": 123456789,
  "type": "payment",
  "data": {
    "id": "payment-id-789"
  },
  "resource": "/v1/payments/payment-id-789"
}
```

#### Response (200 OK)
```json
{
  "status": "success|idempotent|failed|ignored",
  "message": "Pago procesado y suscripción activada",
  "subscription": { /* UserSubscription object */ }
}
```

#### Comportamiento (RNF-01: Idempotencia Estricta)
1. **PASO 1:** Filtrar por tipo evento (`payment` o `preapproval_payment`)
2. **PASO 2:** Extraer `paymentId` del payload
3. **PASO 3:** **PROTECCIÓN REPLAY** - Verificar Redis `payment:processed:{paymentId}`
   - ✅ Si existe → Retornar 200 OK (`status: 'idempotent'`)
   - ❌ Si no existe → Continuar
4. **PASO 4:** Obtener detalles del pago desde Mercado Pago
5. **PASO 5:** Validar que estado sea `approved` o `authorized`
   - Si falla → Mover a `GRACE_PERIOD` (48 horas de tolerancia)
6. **PASO 6:** Buscar suscripción por `external_reference` (mpExternalRef)
7. **PASO 7:** **TRANSACCIÓN ATÓMICA** en Prisma:
   - Marcar pago como procesado en Redis (TTL: 7 días)
   - Actualizar suscripción a `ACTIVE`
   - Actualizar `User.activeSubscriptionTier`
   - Impactar beneficios en `UserInventory`
   - Registrar transacción en `CoinTransaction`

---

### 3. POST `/subscriptions/cancel`

**Autenticación:** JWT Required ✅
**Descripción:** Cancela la suscripción ACTIVE (estilo Spotify)

#### Request
```json
{
  "reason": "Razón opcional de cancelación"
}
```

#### Response (200 OK)
```json
{
  "message": "Suscripción cancelada correctamente",
  "subscription": { /* UserSubscription with status: CANCELLATION_PENDING */ },
  "benefitsActiveUntil": "2026-07-23T10:30:00Z"
}
```

#### Comportamiento (RF-02)
1. Obtener suscripción `ACTIVE` del usuario
2. Llamar Mercado Pago para cancelar `preapprovalId`
3. Cambiar estado a `CANCELLATION_PENDING`
4. Setear `autoRenew: false`
5. **Los beneficios se mantienen intactos hasta `endsAt`**
6. Cron Job (00:00) degradará a `EXPIRED` cuando llegue la fecha

---

### 4. POST `/subscriptions/upgrade`

**Autenticación:** JWT Required ✅
**Descripción:** Upgradea a un tier superior con compensación

#### Request
```json
{
  "newTier": "TIER_3"
}
```

#### Response (200 OK)
```json
{
  "init_point": "https://www.mercadopago.com.ar/checkout/...",
  "external_reference": "new-uuid-ref",
  "new_tier": "TIER_3",
  "bonus_coins": 300,
  "message": "Upgrade a TIER_3 generado. Bonus: 300 Chiqui-coins acreditadas."
}
```

#### Comportamiento (RF-03)
1. Validar que existe suscripción `ACTIVE`
2. Validar que `newTier` sea superior al actual
3. Calcular días restantes = `(endsAt - now) / (24*60*60*1000)`
4. Calcular bonus coins = `daysRemaining × COINS_PER_DAY_UPGRADE` (10 coins/día)
5. **TRANSACCIÓN ATÓMICA:**
   - Incrementar `Wallet.balance` con bonus coins
   - Registrar `CoinTransaction` como `ADMIN_GIFT`
6. Cancelar preapproval vieja en Mercado Pago
7. Marcar suscripción vieja como `CANCELLATION_PENDING`
8. Iniciar nuevo flujo de Preapproval para `newTier` × 30 días limpios

---

### 5. GET `/subscriptions/me`

**Autenticación:** JWT Required ✅
**Descripción:** Obtiene los detalles de la suscripción actual del usuario

#### Response (200 OK)
```json
{
  "id": "sub-id",
  "tier": "TIER_2",
  "status": "ACTIVE",
  "startsAt": "2026-06-23T10:30:00Z",
  "endsAt": "2026-07-23T10:30:00Z",
  "autoRenew": true,
  "mpPreapprovalId": "mp-preapproval-id",
  "mpExternalRef": "uuid-ref-123"
}
```

---

## 💰 Tabla de Precios

### Precios Base (ARS - Pesos Argentinos)

| Tier | Precio | Beneficios |
|------|--------|-----------|
| TIER_1 (POPULAR) | Gratis | Nada (tier base) |
| TIER_2 (PLATEISTA) | $299 | Chat platinum, cooldown -50%, voto x1 |
| TIER_3 (PALCO_VIP) | $599 | Chat gold, cooldown mínimo, voto x2, badge VIP |

### Descuentos Dinámicos

- **Fin de semana** (viernes 5, sábado 6, domingo 0): **-15% descuento**
- **Promociones activas** (futuro): Flag en tabla `StoreDiscount`

### Conversión para Upgrade

- **COINS_PER_DAY_UPGRADE:** 10 coins por cada día restante del plan anterior
- **Ejemplo:** Si quedan 20 días → 200 coins bonus

---

## 🔐 Seguridad e Idempotencia (RNF-01)

### Protección Contra Replay Attacks

```typescript
// En webhook processing:
const redisKey = `payment:processed:${paymentId}`
const isAlreadyProcessed = await redis.get(redisKey)

if (isAlreadyProcessed) {
  // Ya fue procesado → Retornar 200 OK sin ejecutar lógica
  return { status: 'idempotent' }
}

// Primera vez → Procesar y guardar en Redis (TTL: 7 días)
await redis.set(redisKey, 'true', 7 * 24 * 3600)
```

### Validaciones de Suscripción

- ✅ No permitir checkout si ya existe `ACTIVE`
- ✅ Validar tier superior en upgrade
- ✅ Verificar existencia de usuario antes de crear suscripción
- ✅ Validar estados válidos en transiciones

### Transacciones Atómicas

Todos los cambios críticos usan `prisma.$transaction()` para garantizar consistencia:

```typescript
await prisma.$transaction(async (tx) => {
  // Múltiples operaciones = todo o nada
  await tx.userSubscription.update(...)
  await tx.user.update(...)
  await tx.userInventory.upsert(...)
  await tx.coinTransaction.create(...)
})
```

---

## ⏰ Ciclo de Vida Automático (Cron Job)

### Tarea Diaria: `handleSubscriptionLifecycle()` (00:00 UTC)

```typescript
@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
async handleSubscriptionLifecycle()
```

#### Lógica (RF-04)

**CASO 1: CANCELLATION_PENDING o GRACE_PERIOD expirados**
- Encontrar suscripciones con `endsAt <= now`
- Cambiar estado a `EXPIRED`
- Setear `User.activeSubscriptionTier = null`
- Limpiar cosméticos (`activeNameColorId`, `activeBannerId`)
- Notificar por WebSocket al usuario

**CASO 2: ACTIVE vencidas sin renovación exitosa**
- Encontrar `ACTIVE` con `endsAt <= now` y `autoRenew = true`
- Mover a `GRACE_PERIOD` por 48 horas
- Actualizar `endsAt` a `now + 48h`
- Enviar WebSocket con banner rojo de alerta

---

## 🔧 Configuración y Variables de Entorno

### `.env` (Backend)

```env
# Mercado Pago
MERCADO_PAGO_API_URL=https://api.mercadopago.com
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-xxxxxxxxxxxxxxxxxxxx
MERCADO_PAGO_RECEIVER_ID=123456789
MERCADO_PAGO_WEBHOOK_URL=https://tu-dominio.com/subscriptions/webhook

# Frontend URLs
FRONTEND_URL=https://tu-frontend.com
FRONTEND_SUCCESS_URL=https://tu-frontend.com/subscriptions/success
FRONTEND_FAILURE_URL=https://tu-frontend.com/subscriptions/failed
FRONTEND_PENDING_URL=https://tu-frontend.com/subscriptions/pending

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Base de Datos
DATABASE_URL=postgresql://user:password@host:5432/chiquimafias
```

### Constants (TypeScript)

```typescript
// src/subscriptions/constants/subscription.constants.ts

export const SUBSCRIPTION_PRICING = {
  TIER_1: 0,
  TIER_2: 299,
  TIER_3: 599,
}

export const WEEKEND_DISCOUNT_PERCENTAGE = 15

export const SUBSCRIPTION_CYCLE_DAYS = 30

export const GRACE_PERIOD_HOURS = 48

export const COINS_PER_DAY_UPGRADE = 10

export const TIER_INVENTORY_BENEFITS = {
  TIER_1: [],
  TIER_2: ['PLATINUM_CHAT_COLOR', 'CHAT_COOLDOWN_REDUCTION', 'VOTE_WEIGHT_X1'],
  TIER_3: ['GOLD_CHAT_COLOR', 'VIP_CHAT_COOLDOWN', 'VOTE_WEIGHT_X2', 'VIP_BADGE', 'EXCLUSIVE_COSMETIC'],
}
```

---

## 📊 Modelo de Datos (Prisma)

### UserSubscription

```prisma
model UserSubscription {
  id              String             @id @default(uuid())
  userId          String
  user            User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  tier            SubscriptionTier   
  status          SubscriptionStatus @default(ACTIVE)
  
  startsAt        DateTime           @default(now())
  endsAt          DateTime
  autoRenew       Boolean            @default(true)
  
  mpPreapprovalId String?            @unique
  mpExternalRef   String             @unique

  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt

  @@index([userId])
  @@map("user_subscriptions")
}

enum SubscriptionStatus {
  ACTIVE                // Activa y renovándose
  GRACE_PERIOD          // Fallo de pago, tolerancia 48h
  CANCELLATION_PENDING  // Cancelada, beneficios hasta endsAt
  EXPIRED               // Vencida sin beneficios
}
```

### User (Cambios)

```prisma
model User {
  // ... campos existentes ...
  
  // Caché de Tier comercial
  activeSubscriptionTier SubscriptionTier? 
  
  // Historial completo de suscripciones
  subscriptions UserSubscription[]
}
```

---

## 🧪 Ejemplos de Uso

### Flujo Completo de Compra

```bash
# 1. Usuario autenticado inicia checkout
POST /subscriptions/checkout
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "tier": "TIER_2"
}

# Respuesta
{
  "init_point": "https://www.mercadopago.com.ar/checkout/...",
  "external_reference": "1a2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
  "subscription_id": "sub-123",
  "tier": "TIER_2"
}

# 2. Usuario redirigiéndose a Mercado Pago (init_point URL)
# Se autoriza y paga

# 3. Mercado Pago llama al webhook
POST /subscriptions/webhook
Content-Type: application/json

{
  "id": 987654321,
  "type": "payment",
  "data": {
    "id": "payment-id-12345"
  }
}

# Backend:
# - Valida idempotencia (Redis)
# - Obtiene detalles del pago
# - Verifica external_reference
# - Activa suscripción
# - Impacta beneficios
# - Retorna 200 OK

# 4. Usuario cancela suscripción
POST /subscriptions/cancel
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "reason": "Ya no quiero"
}

# Respuesta
{
  "message": "Suscripción cancelada correctamente",
  "subscription": { /* status: CANCELLATION_PENDING */ },
  "benefitsActiveUntil": "2026-07-23T10:30:00Z"
}

# 5. Usuario upgradea durante período activo
POST /subscriptions/upgrade
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "newTier": "TIER_3"
}

# Respuesta
{
  "init_point": "https://www.mercadopago.com.ar/checkout/...",
  "bonus_coins": 300,
  "message": "Upgrade a TIER_3 generado. Bonus: 300 Chiqui-coins acreditadas."
}
```

---

## ⚡ Probar con Thunder Client

### 1. Configuración general
- Base URL: `http://localhost:3000/subscriptions`
- Headers comunes:
  - `Authorization: Bearer <JWT_TOKEN>` (solo para endpoints protegidos)
  - `Content-Type: application/json`

### 2. Probar checkout de suscripción
1. Crea una nueva request `POST /subscriptions/checkout`.
2. Agrega header:
   - `Authorization: Bearer <JWT_TOKEN>`
3. Body JSON:
```json
{
  "tier": "TIER_2"
}
```
4. Envía la request.
5. Debes recibir una respuesta con `init_point` y `external_reference`.
6. Copia el valor de `init_point` y ábrelo en el navegador para completar la compra en Mercado Pago.

### 3. Tarjeta de prueba Mercado Pago
Usa los datos de prueba de Mercado Pago en la pasarela:
- Número de tarjeta: `4509 9535 6623 3704`
- Fecha de vencimiento: `12/29`
- Código de seguridad: `123`
- Tipo de documento: `DNI`
- Número de documento: `12345678`

> Nota: estos datos son válidos en modo sandbox y solo sirven para el checkout de prueba.

> Importante: Mercado Pago exige que `back_url` sea una URL válida y pública. Para pruebas locales, usa un túnel HTTPS como `ngrok` y configura `FRONTEND_URL=https://<tu-subdominio>.ngrok.io`.

### 4. Probar endpoint `/subscriptions/me`
1. Crea una request `GET /subscriptions/me`.
2. Header:
   - `Authorization: Bearer <JWT_TOKEN>`
3. Envía la request.
4. Deberías recibir los datos de la suscripción actual del usuario.

### 5. Probar cancelación de suscripción
1. Crea una request `POST /subscriptions/cancel`.
2. Header:
   - `Authorization: Bearer <JWT_TOKEN>`
3. Body JSON:
```json
{
  "reason": "Ya no quiero continuar"
}
```
4. Envía la request.

### 6. Probar upgrade de suscripción
1. Crea una request `POST /subscriptions/upgrade`.
2. Header:
   - `Authorization: Bearer <JWT_TOKEN>`
3. Body JSON:
```json
{
  "newTier": "TIER_3"
}
```
4. Envía la request.

### 7. Probar webhook manualmente
1. Crea una request `POST /subscriptions/webhook`.
2. No necesita `Authorization`.
3. Body JSON de ejemplo:
```json
{
  "id": 123456789,
  "type": "payment",
  "data": {
    "id": "TEST_PAYMENT_ID_123"
  },
  "resource": "/v1/payments/TEST_PAYMENT_ID_123"
}
```
4. Envía la request.

> Importante: este webhook simula la llamada de Mercado Pago. Para pruebas reales, Mercado Pago enviará el payload con el `payment id` real.

---

## 🚨 Manejo de Errores

### Códigos de Error Comunes

| Status | Error | Causa |
|--------|-------|-------|
| 400 | BadRequestException | Usuario no existe, tier inválido, datos faltantes |
| 409 | ConflictException | Usuario ya tiene suscripción ACTIVE |
| 500 | InternalServerErrorException | Fallo en API de Mercado Pago |
| 401 | Unauthorized | JWT token inválido o expirado |

### Recuperación de Fallos

- **Fallo de pago:** Mover a `GRACE_PERIOD` (48h) → Cron Job degrada a `EXPIRED`
- **Webhook duplicado:** Redis `payment:processed:{id}` previene duplicación
- **Mercado Pago down:** Reintentos automáticos + logging

---

## 📝 Notas de Implementación

1. **Precios Dinámicos:** El cálculo ocurre en `calculateCurrentPrice()` verificando:
   - Día actual (fin de semana: 0, 5, 6)
   - Flags de promoción (expansible)

2. **Idempotencia:** Redis almacena `payment:processed:{paymentId}` por 7 días

3. **Transacciones:** Todas las operaciones críticas usan `prisma.$transaction()`

4. **WebSockets:** Se notifica al usuario cambios de estado (expiraciones, grace period)

5. **Logging:** Todo evento importante es registrado con niveles (log, warn, error)

---

## 🔄 Próximas Mejoras

- [ ] Integración con tabla `StoreDiscount` para promociones
- [ ] Webhook signature validation de Mercado Pago
- [ ] Reintento automático de pagos fallidos
- [ ] Dashboard de estadísticas de suscripciones
- [ ] Soporte para downgrades (con menor costo)
- [ ] Invitaciones/referral program con descuentos

---

**Última actualización:** 2026-06-23
**Versión:** 1.0.0
**Autor:** Senior Backend Engineer - NestJS/Prisma/Mercado Pago
