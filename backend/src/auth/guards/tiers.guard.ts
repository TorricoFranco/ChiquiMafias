import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { WsException } from '@nestjs/websockets'
import { TIERS_KEY } from '../decorators/tiers.decorator'
import { SubscriptionTier, TIER_HIERARCHY } from '../enums/tiers.enum'
import { ActiveUser } from '../interfaces/active-user.interface'

@Injectable()
export class TiersGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const requiredMinTier = this.reflector.getAllAndOverride<SubscriptionTier>(
      TIERS_KEY,
      [context.getHandler(), context.getClass()],
    )

    if (!requiredMinTier) return true

    let user: ActiveUser
    const isWs = context.getType() === 'ws'

    if (isWs) {
      const client = context.switchToWs().getClient()
      user = client.data?.user
    } else {
      const request = context.switchToHttp().getRequest()
      user = request.user
    }

    const userTier = user?.tier !== undefined ? user.tier : null

    const userTierIdx = TIER_HIERARCHY.indexOf(userTier)
    const requiredTierIdx = TIER_HIERARCHY.indexOf(requiredMinTier)

    if (userTierIdx < requiredTierIdx) {
      if (isWs) {
        throw new WsException('Membresía insuficiente para esta tribuna')
      }
      throw new ForbiddenException(
        'Necesitás mejorar tu membresía para acceder a esta tribuna.',
      )
    }

    return true
  }
}
