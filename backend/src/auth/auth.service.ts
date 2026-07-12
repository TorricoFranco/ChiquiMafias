import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common'
import { OAuth2Client } from 'google-auth-library'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from 'src/prisma/prisma.service'
import { ConfigService } from '@nestjs/config'
import { EnvironmentVariables } from 'src/config/interfaces/env.interface'
import * as bcrypt from 'bcrypt'
import { User } from '@prisma/client'
import {
  JwtPayload,
  RefreshTokenPayload,
} from './interfaces/active-user.interface'
import { UserEntity } from 'src/users/entities/user.entity'

@Injectable()
export class AuthService {
  private client: OAuth2Client

  private readonly logger = new Logger(AuthService.name)

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private readonly configService: ConfigService<EnvironmentVariables>,
  ) {
    const googleClientId = this.configService.get('GOOGLE_CLIENT_ID', {
      infer: true,
    })
    this.client = new OAuth2Client(googleClientId)
  }

  private async generateTokens(user: User & { team?: any }) {
    const jwtPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      isFirstLogin: user.isFirstLogin,
      role: user.role,
      tier: user.activeSubscriptionTier,
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(jwtPayload, {
        secret: this.configService.get('JWT_ACCESS_SECRET', { infer: true }),
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN', {
          infer: true,
        }),
      }),
      this.jwtService.signAsync(
        { sub: user.id },
        {
          secret: this.configService.get('JWT_REFRESH_SECRET', { infer: true }),
          expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', {
            infer: true,
          }),
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
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.get('JWT_ACCESS_SECRET', { infer: true }),
      })

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      })

      if (!user) return null
      return new UserEntity(user)
    } catch (error) {
      return null
    }
  }

  async googleLogin(credential: string) {
    const ticket = await this.client.verifyIdToken({
      idToken: credential,
      audience: this.configService.get('GOOGLE_CLIENT_ID', { infer: true }),
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
      user: new UserEntity(user),
    }
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        refreshToken,
        {
          secret: this.configService.get('JWT_REFRESH_SECRET', { infer: true }),
        },
      )

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
        user: new UserEntity(user),
      }
    } catch (error) {
      if (error instanceof ForbiddenException) throw error
      throw new UnauthorizedException('Sesión expirada, volvé a loguearte, rey')
    }
  }

  async logout(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        refreshToken,
        {
          secret: this.configService.get('JWT_REFRESH_SECRET', { infer: true }),
        },
      )

      await this.updateRefreshTokenHash(payload.sub, null)
      this.logger.log(`Usuario ${payload.sub} cerró sesión correctamente.`)
    } catch (error) {
      this.logger.warn(`Intento fallido de logout: ${error.message}`)
    }
  }

  async authenticateSocket(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.get('JWT_ACCESS_SECRET', { infer: true }),
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

  // TEMPORAL: Login de desarrollo
  async devLoginByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { team: true },
    })
    if (!user) throw new UnauthorizedException('Usuario no encontrado')

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
      user: new UserEntity(user),
    }
  }
}
