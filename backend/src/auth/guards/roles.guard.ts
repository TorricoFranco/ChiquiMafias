import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { WsException } from '@nestjs/websockets'
import { ROLES_KEY } from '../decorators/roles.decorator'
import { SystemRole } from '../enums/roles.enum'
import { ROLE_HIERARCHY } from '../enums/roles.enum'
import { ActiveUser } from '../interfaces/active-user.interface'

function hasRole(userRole: SystemRole, requiredRoles: SystemRole[]): boolean {
  const userIdx = ROLE_HIERARCHY.indexOf(userRole)
  return requiredRoles.some((role) => userIdx >= ROLE_HIERARCHY.indexOf(role))
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<SystemRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    )
    if (!requiredRoles || requiredRoles.length === 0) return true

    let user: ActiveUser
    const isWs = context.getType() === 'ws'

    if (isWs) {
      const client = context.switchToWs().getClient()
      user = client.data?.user
    } else {
      // HTTP
      const request = context.switchToHttp().getRequest()
      user = request.user
    }

    if (!user || !user.role) {
      if (isWs) throw new WsException('No role assigned')
      throw new ForbiddenException('No role assigned')
    }

    if (!hasRole(user.role, requiredRoles)) {
      if (isWs) throw new WsException('Insufficient role')
      throw new ForbiddenException('Insufficient role')
    }

    return true
  }
}
