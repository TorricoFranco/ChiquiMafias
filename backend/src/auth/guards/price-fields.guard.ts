import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import {
  PRICE_FIELDS_KEY,
  PriceFieldsConfig,
} from '../decorators/price-fields.decorator'
import { SystemRole } from '../enums/roles.enum'
import { ActiveUser } from '../interfaces/active-user.interface'

/**
 * Restringe los campos de precio de los endpoints de admin, en dos niveles:
 *
 * - `blocked`: nadie los puede mandar acá, ni el PRESIDENT. Su única vía es
 *   `PATCH /pricing/*`, que deja fila en `PriceChangeLog` y aborta con 409 si otro
 *   cambio se aplicó primero. Así la auditoría no tiene huecos y no importa que el
 *   `RolesGuard` lea el rol de un JWT que puede estar atrasado.
 * - `presidentOnly`: mueven el precio efectivo pero no tienen endpoint en
 *   `/pricing`, así que se permiten solo al presidente.
 *
 * Corre después del body-parser y antes del ValidationPipe, o sea que ve el body crudo.
 */
@Injectable()
export class PriceFieldsGuard implements CanActivate {
  private readonly logger = new Logger(PriceFieldsGuard.name)

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const config = this.reflector.getAllAndOverride<PriceFieldsConfig>(
      PRICE_FIELDS_KEY,
      [context.getHandler(), context.getClass()],
    )
    if (!config) return true

    const request = context.switchToHttp().getRequest<{
      user?: ActiveUser
      body?: unknown
      method: string
      url: string
    }>()
    const user = request.user

    // Los endpoints masivos (POST /store/item/bulk) mandan un array en el body raíz.
    const payloads: unknown[] = Array.isArray(request.body)
      ? request.body
      : [request.body]

    const blocked = this.touchedFields(payloads, config.blocked)
    if (blocked.length > 0) {
      this.reject(
        request,
        user,
        blocked,
        `El precio (${blocked.join(', ')}) se cambia solo desde el panel de Precios, que registra el cambio. Usá PATCH /pricing.`,
      )
    }

    if (user?.role !== SystemRole.PRESIDENT) {
      const restricted = this.touchedFields(payloads, config.presidentOnly)
      if (restricted.length > 0) {
        this.reject(
          request,
          user,
          restricted,
          `Solo el presidente puede cambiar ${restricted.join(', ')}: afecta el precio que paga el hincha.`,
        )
      }
    }

    return true
  }

  /**
   * Mira la presencia de la propiedad, no su valor: `price: 0` y `price: null`
   * también son intentos de cambiar el precio.
   */
  private touchedFields(payloads: unknown[], fields?: string[]): string[] {
    if (!fields || fields.length === 0) return []

    return fields.filter((field) =>
      payloads.some(
        (payload) =>
          !!payload &&
          typeof payload === 'object' &&
          Object.prototype.hasOwnProperty.call(payload, field),
      ),
    )
  }

  private reject(
    request: { method: string; url: string },
    user: ActiveUser | undefined,
    fields: string[],
    message: string,
  ): never {
    this.logger.warn(
      `[Precios] ${user?.role ?? 'sin rol'} ${user?.id ?? 'desconocido'} intentó cambiar ${fields.join(', ')} en ${request.method} ${request.url}`,
    )

    throw new ForbiddenException({
      message,
      code: 'PRICE_CHANGE_FORBIDDEN',
    })
  }
}
