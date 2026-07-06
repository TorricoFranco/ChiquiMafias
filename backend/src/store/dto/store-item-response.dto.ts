import { ItemType } from '@prisma/client'

export class StoreItemResponseDto {
  id: string
  name: string
  description: string
  price: number
  type: ItemType
  assetId: string | null
  isOwned: boolean
  ownedQuantity: number

  currentPrice: number
  isDiscounted: boolean
  discountPercentage?: number
  discountName?: string
}
