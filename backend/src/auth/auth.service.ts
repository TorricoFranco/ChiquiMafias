import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common'
import { OAuth2Client } from 'google-auth-library'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from 'src/prisma/prisma.service'
import * as bcrypt from 'bcrypt'

@Injectable()
export class AuthService {
  private client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) { }

  private async generateTokens(user: any) {
    const jwtPayload = {
      sub: user.id,
      email: user.email,
      isFirstLogin: user.isFirstLogin,
      role: user.role,
      tier: user.activeSubscriptionTier || 'NONE',
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(jwtPayload, {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(
        { sub: user.id },
        {
          secret: process.env.JWT_REFRESH_SECRET,
          expiresIn: '7d',
        },
      ),
    ])

    return { accessToken, refreshToken }
  }

  private async updateRefreshTokenHash(
    userId: string,
    refreshToken: string | null,
  ) {
    if (!refreshToken) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { hashedRefreshToken: null },
      })
      return
    }

    const salt = await bcrypt.genSalt(10)
    const hashed = await bcrypt.hash(refreshToken, salt)

    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken: hashed },
    })
  }

  async verifyToken(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      })

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      })

      if (!user) return null
      return user
    } catch (error) {
      return null
    }
  }

  async googleLogin(credential: string) {
    const ticket = await this.client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    })

    const payload = ticket.getPayload()
    if (!payload) throw new UnauthorizedException('Token de Google inválido')

    let user = await this.prisma.user.findUnique({
      where: { email: payload.email },
      include: { team: true },
    })

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: payload.email!,
          googleId: payload.sub,
          name: payload.name || '',
        },
        include: { team: true },
      })
    }

    if (user.status === 'BANNED') {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Tu cuenta se encuentra suspendida por irregularidades.',
        code: 'USER_BANNED',
      })
    }

    const tokens = await this.generateTokens(user)
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken)

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        isFirstLogin: user.isFirstLogin,
        tier: user.activeSubscriptionTier || 'NONE',
        role: user.role,
        team: user.team,
        status: user.status,
      },
    }
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      })

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { team: true },
      })

      if (!user || !user.hashedRefreshToken) {
        throw new UnauthorizedException('Acceso denegado, perri')
      }

      const isTokenMatched = await bcrypt.compare(
        refreshToken,
        user.hashedRefreshToken,
      )
      if (!isTokenMatched)
        throw new UnauthorizedException('Token manipulado o inválido')

      if (user.status === 'BANNED') {
        throw new ForbiddenException({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Tu cuenta se encuentra suspendida por irregularidades.',
          code: 'USER_BANNED',
        })
      }

      const tokens = await this.generateTokens(user)
      await this.updateRefreshTokenHash(user.id, tokens.refreshToken)

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          isFirstLogin: user.isFirstLogin,
          tier: user.activeSubscriptionTier || 'NONE',
          role: user.role,
          team: user.team,
          status: user.status,
        },
      }
    } catch (error) {
      if (error instanceof ForbiddenException) throw error

      throw new UnauthorizedException('Sesión expirada, volvé a loguearte, rey')
    }
  }

  async logout(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      })

      await this.updateRefreshTokenHash(payload.sub, null)
    } catch (error) { }
  }

  async authenticateSocket(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      })

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { team: true },
      })

      if (!user || user.status === 'BANNED') return null

      return {
        id: user.id,
        name: user.name,
        username: user.username || user.name,
        role: user.role,
        tier: user.activeSubscriptionTier || 'NONE',
        team: user.team
          ? { name: user.team.name, badgeUrl: user.team.badgeUrl }
          : null,
      }
    } catch (error) {
      return null
    }
  }
}
