import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common'
import { OAuth2Client } from 'google-auth-library'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from 'src/prisma/prisma.service'
import { RedisService } from 'src/redis/redis.service'
import { ConfigService } from '@nestjs/config'
import { EnvironmentVariables } from 'src/config/interfaces/env.interface'
import * as bcrypt from 'bcrypt'
import { FootballTeam, User } from '@prisma/client'
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
    private redisService: RedisService,
    private readonly configService: ConfigService<EnvironmentVariables>,
  ) {
    const googleClientId = this.configService.get('GOOGLE_CLIENT_ID', {
      infer: true,
    })
    this.client = new OAuth2Client(googleClientId)
  }
  private async enrichUserWithCosmetics(
    user: User & { team?: FootballTeam | null },
  ): Promise<UserEntity> {
    let [color, banner, bubble] = await this.redisService.redis.mget(
      `user:cosmetics:${user.id}:color`,
      `user:cosmetics:${user.id}:banner`,
      `user:cosmetics:${user.id}:chat_bubble`,
    )

    // 2. Si hay "Cache Miss" (no está en Redis) pero el usuario TIENE un cosmético activo en BD, lo buscamos y lo guardamos.
    if (!color && user.activeNameColorId) {
      const item = await this.prisma.storeItem.findUnique({
        where: { id: user.activeNameColorId },
      })
      color = item?.assetId || null
      if (color)
        await this.redisService.redis.set(
          `user:cosmetics:${user.id}:color`,
          color,
          'EX',
          86400,
        )
    }

    if (!banner && user.activeBannerId) {
      const item = await this.prisma.storeItem.findUnique({
        where: { id: user.activeBannerId },
      })
      banner = item?.assetId || null
      if (banner)
        await this.redisService.redis.set(
          `user:cosmetics:${user.id}:banner`,
          banner,
          'EX',
          86400,
        )
    }

    if (!bubble && user.activeChatBubbleId) {
      const item = await this.prisma.storeItem.findUnique({
        where: { id: user.activeChatBubbleId },
      })
      bubble = item?.assetId || null
      if (bubble)
        await this.redisService.redis.set(
          `user:cosmetics:${user.id}:chat_bubble`,
          bubble,
          'EX',
          86400,
        )
    }

    return new UserEntity({
      ...user,
      activeNameColorId: color || null,
      activeBannerId: banner || null,
      activeChatBubbleId: bubble || null,
    })
  }

  private async generateTokens(user: User & { team?: any }) {
    const jwtPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      isFirstLogin: user.isFirstLogin,
      isBanned: user.status === 'BANNED',
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

    const saltRounds = Number(
      this.configService.get('BCRYPT_SALT_ROUNDS', { infer: true }) || 12,
    )

    const hashed = await bcrypt.hash(refreshToken, saltRounds)

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
        include: { team: true },
      })

      if (!user) return null

      return await this.enrichUserWithCosmetics(user)
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

    const tokens = await this.generateTokens(user)
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken)

    const userWithCosmetics = await this.enrichUserWithCosmetics(user)

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: userWithCosmetics,
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

      const tokens = await this.generateTokens(user)
      await this.updateRefreshTokenHash(user.id, tokens.refreshToken)

      const userWithCosmetics = await this.enrichUserWithCosmetics(user)

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: userWithCosmetics,
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
    const tokens = await this.generateTokens(user)
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken)

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: new UserEntity(user),
    }
  }
}
