import { ExtractJwt, Strategy } from 'passport-jwt'
import { PassportStrategy } from '@nestjs/passport'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { EnvironmentVariables } from 'src/config/interfaces/env.interface'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  // Inyectamos el configService
  constructor(
    private readonly configService: ConfigService<EnvironmentVariables>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_ACCESS_SECRET', { infer: true }),
    })
  }

  async validate(payload: any) {
    return {
      id: payload.sub,
      email: payload.email,
      isFirstLogin: payload.isFirstLogin,
      role: payload.role,
      tier: payload.tier,
    }
  }
}
