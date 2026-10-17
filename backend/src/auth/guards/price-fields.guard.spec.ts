import { ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PriceFieldsGuard } from './price-fields.guard'
import { PriceFieldsConfig } from '../decorators/price-fields.decorator'
import { SystemRole } from '../enums/roles.enum'

describe('PriceFieldsGuard', () => {
  let guard: PriceFieldsGuard
  let reflector: { getAllAndOverride: jest.Mock }

  // Igual que PATCH /coin-shop/admin/packs/:id.
  const packConfig: PriceFieldsConfig = {
    blocked: ['priceARS'],
    presidentOnly: ['coinsAmount', 'bonusCoins'],
  }

  const buildContext = (request: Record<string, any>): ExecutionContext =>
    ({
      getHandler: () => () => undefined,
      getClass: () => class Dummy {},
      switchToHttp: () => ({ getRequest: () => request }),
    }) as unknown as ExecutionContext

  const requestOf = (role: SystemRole | undefined, body: unknown) => ({
    user: role ? { id: 'user-1', role } : undefined,
    body,
    method: 'PATCH',
    url: '/coin-shop/admin/packs/pack-1',
  })

  const canActivate = (role: SystemRole | undefined, body: unknown) =>
    guard.canActivate(buildContext(requestOf(role, body)))

  beforeEach(() => {
    jest.clearAllMocks()
    reflector = { getAllAndOverride: jest.fn() }
    guard = new PriceFieldsGuard(reflector as unknown as Reflector)
  })

  it('Debe dejar pasar si el handler no declara campos de precio', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined)

    expect(canActivate(SystemRole.ADMIN, { priceARS: 999 })).toBe(true)
  })

  describe('Campos bloqueados para todos los roles', () => {
    beforeEach(() => reflector.getAllAndOverride.mockReturnValue(packConfig))

    const roles = [
      SystemRole.ADMIN,
      SystemRole.MODERATOR,
      SystemRole.PRESIDENT,
    ] as const

    for (const role of roles) {
      it(`Debe lanzar ForbiddenException si un ${role} manda el precio`, () => {
        // Ni el presidente: su única vía es PATCH /pricing, que audita el cambio.
        expect(() => canActivate(role, { priceARS: 2500 })).toThrow(
          ForbiddenException,
        )
      })
    }

    it('Debe lanzar ForbiddenException con el precio en 0', () => {
      expect(() => canActivate(SystemRole.ADMIN, { priceARS: 0 })).toThrow(
        ForbiddenException,
      )
    })

    it('Debe lanzar ForbiddenException con el precio en null', () => {
      expect(() => canActivate(SystemRole.ADMIN, { priceARS: null })).toThrow(
        ForbiddenException,
      )
    })

    it('Debe apuntar al panel de Precios en el mensaje de error', () => {
      try {
        canActivate(SystemRole.PRESIDENT, { priceARS: 2500 })
        fail('Se esperaba un ForbiddenException')
      } catch (error) {
        const response = (error as ForbiddenException).getResponse() as {
          message: string
          code: string
        }
        expect(response.code).toBe('PRICE_CHANGE_FORBIDDEN')
        expect(response.message).toContain('panel de Precios')
      }
    })

    it('Debe detectar el precio en cualquier elemento de un body array (alta masiva)', () => {
      expect(() =>
        canActivate(SystemRole.ADMIN, [{ name: 'uno' }, { priceARS: 500 }]),
      ).toThrow(ForbiddenException)
    })
  })

  describe('Campos reservados al presidente', () => {
    beforeEach(() => reflector.getAllAndOverride.mockReturnValue(packConfig))

    it('Debe dejar que el PRESIDENT cambie las monedas que entrega un pack', () => {
      expect(canActivate(SystemRole.PRESIDENT, { bonusCoins: 500 })).toBe(true)
    })

    it('Debe lanzar ForbiddenException si un ADMIN cambia las monedas del pack', () => {
      expect(() =>
        canActivate(SystemRole.ADMIN, { bonusCoins: 500000 }),
      ).toThrow(ForbiddenException)
    })

    it('Debe lanzar ForbiddenException si un ADMIN cambia coinsAmount', () => {
      expect(() =>
        canActivate(SystemRole.ADMIN, { coinsAmount: 999999 }),
      ).toThrow(ForbiddenException)
    })

    it('Debe lanzar ForbiddenException si un ADMIN cambia el descuento de tienda de un plan', () => {
      reflector.getAllAndOverride.mockReturnValue({
        blocked: ['basePriceARS'],
        presidentOnly: ['storeDiscountPercentage'],
      })

      expect(() =>
        canActivate(SystemRole.ADMIN, { storeDiscountPercentage: 100 }),
      ).toThrow(ForbiddenException)
    })
  })

  describe('Lo que sí puede cambiar un ADMIN', () => {
    beforeEach(() => reflector.getAllAndOverride.mockReturnValue(packConfig))

    it('Debe dejar pasar los campos que no mueven el precio', () => {
      expect(
        canActivate(SystemRole.ADMIN, {
          name: 'Pack Hincha',
          isActive: false,
          isPopular: true,
        }),
      ).toBe(true)
    })

    it('Debe tolerar un body vacío sin lanzar', () => {
      expect(canActivate(SystemRole.ADMIN, undefined)).toBe(true)
    })

    it('Debe dejar pasar si el handler solo declara campos bloqueados y no se mandan', () => {
      reflector.getAllAndOverride.mockReturnValue({ blocked: ['price'] })

      expect(canActivate(SystemRole.ADMIN, { name: 'Banner' })).toBe(true)
    })
  })

  it('Debe lanzar ForbiddenException si no hay usuario en la request', () => {
    reflector.getAllAndOverride.mockReturnValue(packConfig)

    expect(() => canActivate(undefined, { coinsAmount: 500 })).toThrow(
      ForbiddenException,
    )
  })
})
