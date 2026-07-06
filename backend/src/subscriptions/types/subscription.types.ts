/**
 * TIPOS GENERALES DEL MÓDULO DE SUSCRIPCIONES
 */

import { SubscriptionTier, SubscriptionStatus } from '@prisma/client'

/**
 * Estado de una suscripción con metadatos adicionales
 */
export interface SubscriptionState {
    id: string
    userId: string
    tier: SubscriptionTier
    status: SubscriptionStatus
    startsAt: Date
    endsAt: Date
    autoRenew: boolean
    isExpired: boolean
    isInGracePeriod: boolean
    daysRemaining: number
}

/**
 * Resultado de una operación de suscripción
 */
export interface SubscriptionOperationResult<T = any> {
    success: boolean
    status: 'success' | 'failed' | 'idempotent' | 'ignored'
    message: string
    data?: T
    error?: {
        code: string
        details: string
    }
}

/**
 * Información de pricing con histórico
 */
export interface PricingInfo {
    tier: SubscriptionTier
    basePriceARS: number
    finalPriceARS: number
    discountPercentage: number
    discountReason: string // "weekend" | "promotion" | "none"
    appliedAt: Date
}

/**
 * Información de beneficio por tier
 */
export interface TierBenefit {
    itemId: string
    tier: SubscriptionTier
    quantity: number
    description: string
}

/**
 * Respuesta del webhook de Mercado Pago procesado
 */
export interface WebhookProcessingResult {
    status: 'success' | 'failed' | 'idempotent' | 'ignored'
    paymentId: string | number
    subscriptionId?: string
    message: string
    timestamp: Date
}

/**
 * Información de upgrade
 */
export interface UpgradeInfo {
    fromTier: SubscriptionTier
    toTier: SubscriptionTier
    daysRemaining: number
    bonusCoinsCalculated: number
    bonusCoinsApplied: number
    newSubscriptionId: string
    mpInitPoint: string
}
