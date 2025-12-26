import { ExtractJwt, Strategy } from 'passport-jwt'
import { PassportStrategy } from '@nestjs/passport'
import { Injectable } from '@nestjs/common'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      // 1. Extrae el token del header: Authorization: Bearer <token>
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET, // La misma que usaste en el AuthService
    })
  }

  // 2. Lo que retorna este método es lo que aparecerá en 'req.user'
  async validate(payload: any) {
    return {
      id: payload.sub,
      email: payload.email,
      isFirstLogin: payload.isFirstLogin,
    }
  }
}
