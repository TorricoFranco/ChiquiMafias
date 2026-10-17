import { SetMetadata } from '@nestjs/common'

export const PRICE_FIELDS_KEY = 'price_fields'

export interface PriceFieldsConfig {
  /**
   * Campos de precio prohibidos para **cualquier** rol en este endpoint: su única
   * vía es `PATCH /pricing/*`, que audita el cambio y usa lock optimista.
   */
  blocked?: string[]
  /**
   * Campos que mueven el precio efectivo y solo puede mandar el PRESIDENT, porque
   * no tienen un endpoint propio en `/pricing`.
   */
  presidentOnly?: string[]
}

/**
 * Restringe los campos de precio de un endpoint de admin.
 * Es solo metadata: sin `@UseGuards(PriceFieldsGuard)` no restringe nada.
 */
export const PriceFields = (config: PriceFieldsConfig) =>
  SetMetadata(PRICE_FIELDS_KEY, config)
