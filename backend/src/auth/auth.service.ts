// auth.service.ts
import { Injectable } from '@nestjs/common'
import { OAuth2Client } from 'google-auth-library'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from 'src/prisma/prisma.service'

@Injectable()
export class AuthService {
  private client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService, // <--- Inyectamos Prisma
  ) {}

  async googleLogin(credential: string) {
    const ticket = await this.client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    })

    const payload = ticket.getPayload()
    if (!payload) throw new Error('Invalid Google token')

    // 1. Lógica de Upsert (Buscar o Crear)
    let user = await this.prisma.users.findUnique({
      where: { email: payload.email },
    })

    if (!user) {
      user = await this.prisma.users.create({
        data: {
          email: payload.email!,
          googleId: payload.sub,
          name: payload.name || '',
          // No le pasamos team_id ni username todavía
        },
      })
    }

    // 2. Firmar el token con el ID de TU base de datos
    const jwtPayload = {
      sub: user.id, // Usamos el ID de nuestra DB, no el de Google
      email: user.email,
      isFirstLogin: user.isFirstLogin,
    }

    return {
      access_token: this.jwtService.sign(jwtPayload, { expiresIn: '7d' }),
      user: {
        id: user.id,
        name: user.name,
        isFirstLogin: user.isFirstLogin,
      },
    }
  }
}
