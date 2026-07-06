# 🏛️ Decisiones Arquitectónicas y Patrones de Diseño

## 1. PRECIOS DINÁMICOS Y FLEXIBILIDAD

### Decisión: Configuración Centralizada en Constants

```typescript
// ✅ ELEGIDO: Constants tipados
export const SUBSCRIPTION_PRICING: Record<SubscriptionTier, number> = {
  TIER_1: 0,
  TIER_2: 299,
  TIER_3: 599,
}

// ❌ NO ELEGIDO: Configuración en base de datos (inicial)
// Razón: Overhead de queries para cada cálculo de precio
```

**Ventajas:**
- Type-safe (TypeScript)
- Sin latencia de DB
- Fácil de actualizar y versionarTesting simple

**Extensibilidad Futura:**
```typescript
// Si necesitas cambios dinámicos:
// 1. Crear tabla `PricingTier` en DB
// 2. Cachear en Redis con TTL
// 3. Invalidar cache cuando cambie configuración
// 4. Fallback a constants si cache falla
```

---

## 2. IDEMPOTENCIA Y PROTECCIÓN CONTRA REPLAY

### Decisión: Redis como Deduplicador

```typescript
// FLUJO:
1. Webhook llega con paymentId
2. Verificar Redis: `payment:processed:${paymentId}`
3. Si existe → Retornar 200 OK sin ejecutar
4. Si no existe → Procesar + Guardar en Redis (TTL: 7 días)
```

**Por qué Redis y no Base de Datos:**
- ⚡ Más rápido (en-memoria)
- 💾 No duplica registros en DB
- 🔄 TTL automático (no requiere mantenimiento)
- 🔒 Atómico con SET

**Tabla comparativa:**

| Enfoque | Velocidad | Complejidad | Mantenimiento |
|---------|-----------|-------------|---------------|
| Redis | ⚡⚡⚡ | Baja | Bajo |
| DB Flag | ⚡ | Media | Medio |
| Evento Sourcing | ⚡⚡ | Alta | Alto |

---

## 3. TRANSACCIONES ATÓMICAS

### Decisión: `prisma.$transaction()` para Consistencia

```typescript
// ✅ ELEGIDO: Transacción atómica
await prisma.$transaction(async (tx) => {
  await tx.userSubscription.update(...)  // Todo o nada
  await tx.user.update(...)
  await tx.userInventory.upsert(...)
  await tx.coinTransaction.create(...)
})

// ❌ NO ELEGIDO: Queries independientes
await userSubscription.update(...)
await user.update(...)
await userInventory.upsert(...)
// Riesgo: Fallo intermedio deja estado inconsistente
```

**Ventajas:**
- Garantiza ACID properties
- Si algo falla, rollback automático
- No hay estado "a medio hacer"
- Compatible con Prisma y PostgreSQL

---

## 4. CÁLCULO DE DESCUENTOS DINÁMICOS

### Decisión: Verificar al Momento de Checkout

```typescript
private async calculateCurrentPrice(tier) {
  const now = new Date()
  const dayOfWeek = now.getDay()
  
  // VERIFICAR EN VIVO:
  // - Fin de semana (0, 5, 6)
  // - Flags de promoción en DB (expansible)
  // - Otros criterios
  
  const isWeekend = [0, 5, 6].includes(dayOfWeek)
  const discountPercentage = isWeekend ? 15 : 0
  
  return finalPrice
}
```

**Alternativas Consideradas:**

| Alternativa | Pros | Contras |
|-------------|------|---------|
| **En vivo (elegido)** | Siempre correcto | Cálculo en cada checkout |
| Precalculado en DB | Rápido | Requiere actualización diaria |
| Hardcoded | Muy rápido | Poco flexible |

**Decisión: En vivo**
- La API de Mercado Pago es rápida
- Checkout es operación no-crítica
- Flexibilidad para promociones futuras

---

## 5. MANEJO DE FALLOS DE PAGO

### Decisión: Grace Period de 48 Horas

```typescript
// Si webhook reporta pago fallido:
1. Mover a GRACE_PERIOD
2. Extender endsAt + 48 horas
3. Mantener beneficios activos
4. Cron Job (00:00) degrada si persiste el fallo
```

**Lógica de Negocio:**
- Usuario tiene 48h para actualizar medio de pago
- No pierde inmediatamente sus beneficios
- Experiencia similar a Spotify
- Cron Job actúa como safety net

**Diagrama de Estados:**

```
ACTIVE
  ↓ (pago falla)
GRACE_PERIOD (48h tolerancia)
  ├─ (pago entra OK)→ ACTIVE ✅
  └─ (48h vencen) → EXPIRED ❌
```

---

## 6. UPGRADE SIN DOWNTIME

### Decisión: Bonus Coins vs. Crédito de Período

```typescript
// ✅ ELEGIDO: Bonus coins
const bonusCoins = daysRemaining × COINS_PER_DAY_UPGRADE

// ❌ ALTERNATIVA: Extender período
// Problema: Complica billing, difícil de explicar

// ❌ ALTERNATIVA: Reembolso parcial
// Problema: Requiere integración con MP refunds API
```

**Razones de la Decisión:**
1. Simple de entender para usuario
2. No requiere refunds en Mercado Pago
3. Flexible: puede usar coins en store
4. Alineado con gamification strategy

---

## 7. ALMACENAMIENTO DE BENEFICIOS

### Decisión: UserInventory + activeSubscriptionTier Caché

```typescript
// ARQUITECTURA:
┌─────────────────────────────┐
│ UserSubscription (BD)       │
│ - tier                      │
│ - status                    │
│ - mpPreapprovalId           │
└─────────────────────────────┘
           ↓
┌─────────────────────────────┐
│ User.activeSubscriptionTier │ ← CACHÉ (optimización)
└─────────────────────────────┘
           ↓
┌─────────────────────────────┐
│ UserInventory (BD)          │
│ - Beneficios actuales       │
│ - Colores, badges, etc.     │
└─────────────────────────────┘
```

**Razones:**
- `activeSubscriptionTier` en User: Cache para WebSockets (evita joins)
- `UserInventory`: Histórico completo de beneficios
- Separación de concerns: Suscripción vs. Inventario

---

## 8. LOGGING Y OBSERVABILIDAD

### Decisión: Logs Estructurados con Contexto

```typescript
// ✅ ELEGIDO: Logs contextuales
this.logger.log(
  `[Checkout OK] User ${userId} iniciando pago tier ${tier} - MP ID: ${mpPreapprovalId}`
)

// ❌ NO ELEGIDO: Logs genéricos
this.logger.log('Checkout successful')

// ❌ NO ELEGIDO: Logging silencioso
// Sin logs para operaciones críticas
```

**Patrón de Logging:**
```
[CONTEXTO] Estado | Usuario ID | Detalles adicionales
[Checkout OK]    | user-123   | tier TIER_2, MP ID: xxx
[Webhook Error]  | n/a        | Pago 999999 no encontrado
[Cron]           | n/a        | 5 suscripciones movidas a EXPIRED
```

---

## 9. ARQUITECTURA DE ERRORES

### Decisión: Custom Exceptions + HTTP Status Codes

```typescript
// ✅ ELEGIDO
if (existingActive) {
  throw new ConflictException('Ya existe suscripción ACTIVE')
  // → 409 Conflict (semántico)
}

// ❌ NO ELEGIDO
if (existingActive) {
  throw new Error('Ya existe suscripción ACTIVE')
  // → 500 Internal Server Error (incorrecto)
}
```

**Mapeo HTTP:**

| Excepción | Status | Uso |
|-----------|--------|-----|
| BadRequestException | 400 | Datos inválidos, tier no existe |
| ConflictException | 409 | Suscripción ya existe |
| UnauthorizedException | 401 | JWT inválido |
| ForbiddenException | 403 | Usuario no autorizado |
| InternalServerErrorException | 500 | Fallo de Mercado Pago |

---

## 10. SEPARACIÓN DE RESPONSABILIDADES

### Decisión: Service Layer Aislado

```
┌────────────────────────────────────────┐
│         Controller                     │
│ (Recibe HTTP, Valida DTOs)            │
└──────────────┬─────────────────────────┘
               │
┌──────────────▼─────────────────────────┐
│         Service                        │
│ (Lógica de negocio, Transacciones)    │
└──────────────┬─────────────────────────┘
               │
┌──────────────▼─────────────────────────┐
│      External Services                 │
│ (Mercado Pago, Redis, Prisma)         │
└────────────────────────────────────────┘
```

**Beneficios:**
- ✅ Fácil de testear (inyectar mocks)
- ✅ Reutilizable (mismo service en APIs diferentes)
- ✅ Cambios de API no afectan lógica
- ✅ Documentación clara

---

## 11. CONFIGURACIÓN Y SECRETOS

### Decisión: Variables de Entorno Centralizadas

```typescript
// src/subscriptions/constants/subscription.constants.ts
export const MERCADO_PAGO_CONFIG = {
  API_BASE_URL: process.env.MERCADO_PAGO_API_URL || '...',
  ACCESS_TOKEN: process.env.MERCADO_PAGO_ACCESS_TOKEN || '',
  // ...
}
```

**Por qué:**
- ✅ No mezclar código con configuración
- ✅ Fácil usar diferentes valores por ambiente
- ✅ Fallbacks seguros
- ✅ Admite DevOps tools (Docker, K8s)

---

## 12. CICLO DE VIDA CON CRON JOBS

### Decisión: Tareas Programadas Diarias

```typescript
@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
async handleSubscriptionLifecycle()
```

**Ventajas de Cron vs. Eventos:**

| Aspecto | Cron | Webhooks |
|--------|------|----------|
| Consistencia | ✅ Garantizada | ⚠️ Depende de MP |
| Latencia | ⏱️ Hasta 24h | ⚡ Inmediato |
| Caso de uso | Limpieza, degradación | Eventos en vivo |

**Combinado:**
- Webhooks: Activación inmediata
- Cron: Safety net para garantizar consistencia

---

## 🎯 Decisiones de Diseño Resumidas

| Decisión | Opción | Razón |
|----------|--------|-------|
| Precios | Constants | Type-safe, sin latencia |
| Idempotencia | Redis | Rápido, con TTL automático |
| Transacciones | Prisma $transaction | ACID guarantees |
| Descuentos | En vivo | Flexible para futuras promociones |
| Fallos | Grace Period 48h | Experiencia tipo Spotify |
| Upgrade | Bonus coins | Simple, gamified |
| Beneficios | UserInventory + caché | Separación de concerns |
| Logging | Estructurado | Observabilidad |
| Errores | Custom exceptions | HTTP status correcto |
| Responsabilidades | Service layer aislado | Testable, reutilizable |
| Configuración | Env vars centralizadas | Flexible por ambiente |
| Ciclo de vida | Cron diario | Garantía de consistencia |

---

## 🔮 Evolución Futura

### Fase 2: Enhanced Features

```typescript
// Tabla de descuentos dinámica
model SubscriptionDiscount {
  id String @id
  tier SubscriptionTier
  percentageOff Int
  validFrom DateTime
  validUntil DateTime
  reason String // "weekend" | "campaign" | "vip"
}

// Verificar en calculateCurrentPrice():
const activeDiscounts = await db.subscriptionDiscount.findMany({
  where: {
    tier,
    validFrom: { lte: now },
    validUntil: { gte: now },
  },
})
```

### Fase 3: Advanced Monetization

- Referral program con descuentos
- Paquetes duales (Suscripción + Coins)
- Seasonal pricing
- A/B testing de precios

---

**Última actualización:** 2026-06-23
**Versión:** 1.0.0
**Autor:** Senior Backend Architect
