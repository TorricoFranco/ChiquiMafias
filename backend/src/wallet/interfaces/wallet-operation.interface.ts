import { TransactionType } from '@prisma/client'

export interface WalletOperation {
  userId: string
  amount: number
  type: TransactionType
  description: string
  referenceId?: string
  // false para lo que se paga con plata real (packs, suscripciones): nunca se recorta al tope
  enforceCap?: boolean
}
