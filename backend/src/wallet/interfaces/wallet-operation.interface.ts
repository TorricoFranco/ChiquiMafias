import { TransactionType } from '@prisma/client'

export interface WalletOperation {
  userId: string
  amount: number
  type: TransactionType
  description: string
  referenceId?: string
}
