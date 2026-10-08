import { CanActivate, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { EnvironmentVariables } from 'src/config/interfaces/env.interface'

// Herramientas de desarrollo (dev-login, test-events). Solo existen con
// ENABLE_DEV_TOOLS=true y fuera de producción; si no, la ruta responde 404.
@Injectable()
export class DevToolsGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService<EnvironmentVariables>,
  ) {}

  canActivate(): boolean {
    const devToolsEnabled =
      String(this.configService.get('ENABLE_DEV_TOOLS', { infer: true })) ===
      'true'
    const isProduction =
      this.configService.get('NODE_ENV', { infer: true }) === 'production'

    if (!devToolsEnabled || isProduction) {
      throw new NotFoundException()
    }

    return true
  }
}
