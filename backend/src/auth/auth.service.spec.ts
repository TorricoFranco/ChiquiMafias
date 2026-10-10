import { Test, TestingModule } from '@nestjs/testing'
import { Logger, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { createHash } from 'crypto'
import { AuthService } from './auth.service'
import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from '../redis/redis.service'

describe('AuthService (sesión y refresh token)', () => {
  let service: AuthService

  // JwtService y bcrypt reales: lo que se prueba es la firma y el hash
  const jwt = new JwtService({})

  const config: Record<string, unknown> = {
    JWT_ACCESS_SECRET: 'access-secret-test',
    JWT_REFRESH_SECRET: 'refresh-secret-test',
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
    BCRYPT_SALT_ROUNDS: 4,
    GOOGLE_CLIENT_ID: 'google-client-test',
  }

  const mockConfigService = {
    get: jest.fn((key: string) => config[key]),
  }

  const mockPrisma = {
    user: { findUnique: jest.fn(), update: jest.fn() },
    storeItem: { findUnique: jest.fn() },
  }

  const mockRedisService = {
    redis: {
      mget: jest.fn(),
      set: jest.fn(),
    },
  }

  // Id real (UUID): con un sub así de largo, los primeros 72 bytes de todos
  // los refresh tokens del usuario son iguales
  const user = {
    id: '3f1c2a9e-8b7d-4c6e-9a1f-2b3c4d5e6f70',
    email: 'hincha@test.com',
    name: 'Hincha',
    username: 'hincha',
    isFirstLogin: false,
    status: 'ACTIVE',
    role: 'USER',
    activeSubscriptionTier: null,
    hashedRefreshToken: null as string | null,
    activeNameColorId: null,
    activeBannerId: null,
    activeChatBubbleId: null,
    team: null,
  }

  const signRefresh = (
    options: { secret?: string; expiresIn?: number; iat?: number } = {},
  ) =>
    jwt.signAsync(
      options.iat ? { sub: user.id, iat: options.iat } : { sub: user.id },
      {
        secret: options.secret ?? 'refresh-secret-test',
        expiresIn: options.expiresIn ?? 7 * 24 * 60 * 60,
      },
    )

  const digest = (token: string) =>
    createHash('sha256').update(token).digest('hex')

  // Formato actual del hash guardado: bcrypt del SHA-256 del token
  const hashRefresh = (token: string) => bcrypt.hash(digest(token), 4)

  const nowInSeconds = () => Math.floor(Date.now() / 1000)

  const savedHash = () =>
    (
      mockPrisma.user.update.mock.calls[0] as [
        { data: { hashedRefreshToken: string | null } },
      ]
    )[0].data.hashedRefreshToken

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: jwt },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedisService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile()

    service = module.get<AuthService>(AuthService)

    jest.clearAllMocks()
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined)
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
    mockRedisService.redis.mget.mockResolvedValue([null, null, null])
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('refreshTokens', () => {
    it('Debe rotar: devolver tokens nuevos y guardar un hash que solo acepta el refresh nuevo', async () => {
      const oldToken = await signRefresh()
      mockPrisma.user.findUnique.mockResolvedValue({
        ...user,
        hashedRefreshToken: await hashRefresh(oldToken),
      })
      // El iat va en segundos: se adelanta el reloj para que el token nuevo cambie
      const later = Date.now() + 5000
      jest.spyOn(Date, 'now').mockReturnValue(later)

      const result = await service.refreshTokens(oldToken)

      expect(result.refreshToken).not.toBe(oldToken)
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: user.id } }),
      )
      expect(typeof savedHash()).toBe('string')

      // Con el hash nuevo guardado, el token viejo ya no sirve y el nuevo sí
      const rotated = { ...user, hashedRefreshToken: savedHash() }
      mockPrisma.user.findUnique.mockResolvedValue(rotated)
      await expect(service.refreshTokens(oldToken)).rejects.toThrow(
        UnauthorizedException,
      )
      const again = await service.refreshTokens(result.refreshToken)
      expect(typeof again.accessToken).toBe('string')

      const payload = await jwt.verifyAsync<Record<string, unknown>>(
        result.accessToken,
        { secret: 'access-secret-test' },
      )
      expect(payload).toMatchObject({
        sub: user.id,
        role: 'USER',
        isBanned: false,
      })
    })

    it('Debe rechazar un refresh viejo del mismo usuario aunque comparta los primeros 72 bytes', async () => {
      const oldToken = await signRefresh({ iat: nowInSeconds() - 3600 })
      const currentToken = await signRefresh()
      expect(oldToken.slice(0, 72)).toBe(currentToken.slice(0, 72))
      mockPrisma.user.findUnique.mockResolvedValue({
        ...user,
        hashedRefreshToken: await hashRefresh(currentToken),
      })

      await expect(service.refreshTokens(oldToken)).rejects.toThrow(
        UnauthorizedException,
      )
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
    })

    it('Debe aceptar una vez un hash del formato viejo y reemplazarlo por el nuevo', async () => {
      const legacyToken = await signRefresh()
      mockPrisma.user.findUnique.mockResolvedValue({
        ...user,
        hashedRefreshToken: await bcrypt.hash(legacyToken, 4),
      })
      const later = Date.now() + 5000
      jest.spyOn(Date, 'now').mockReturnValue(later)

      const result = await service.refreshTokens(legacyToken)

      const hash = savedHash() as string
      expect(await bcrypt.compare(digest(result.refreshToken), hash)).toBe(true)

      // Contra el hash migrado, el token viejo ya no pasa
      mockPrisma.user.findUnique.mockResolvedValue({
        ...user,
        hashedRefreshToken: hash,
      })
      await expect(service.refreshTokens(legacyToken)).rejects.toThrow(
        UnauthorizedException,
      )
    })

    it('Debe rechazar el refresh de un usuario que cerró sesión', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...user,
        hashedRefreshToken: null,
      })

      await expect(service.refreshTokens(await signRefresh())).rejects.toThrow(
        UnauthorizedException,
      )
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
    })

    it('Debe rechazar un token firmado con otro secret sin consultar la DB', async () => {
      const accessSigned = await signRefresh({ secret: 'access-secret-test' })

      await expect(service.refreshTokens(accessSigned)).rejects.toThrow(
        UnauthorizedException,
      )
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled()
    })

    it('Debe rechazar un refresh vencido sin consultar la DB', async () => {
      const expired = await signRefresh({ expiresIn: -10 })

      await expect(service.refreshTokens(expired)).rejects.toThrow(
        UnauthorizedException,
      )
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled()
    })

    it('Debe rechazar el refresh de un usuario que ya no existe', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      await expect(service.refreshTokens(await signRefresh())).rejects.toThrow(
        UnauthorizedException,
      )
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
    })
  })

  describe('logout', () => {
    it('Debe borrar el hash del refresh token del usuario', async () => {
      await service.logout(await signRefresh())

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: user.id },
        data: { hashedRefreshToken: null },
      })
    })

    it('Con un token inválido no debe tocar la DB ni lanzar', async () => {
      await expect(service.logout('token-trucho')).resolves.toBeUndefined()
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
    })
  })

  describe('authenticateSocket', () => {
    const signAccess = () =>
      jwt.signAsync(
        { sub: user.id },
        { secret: 'access-secret-test', expiresIn: 900 },
      )

    it('Debe devolver null para un usuario baneado aunque el token sea válido', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...user,
        status: 'BANNED',
      })

      await expect(
        service.authenticateSocket(await signAccess()),
      ).resolves.toBeNull()
    })

    it('Debe devolver los datos del usuario activo', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(user)

      await expect(
        service.authenticateSocket(await signAccess()),
      ).resolves.toMatchObject({ id: user.id, role: 'USER', tier: 'NONE' })
    })

    it('Debe devolver null con un token firmado con el secret de refresh', async () => {
      await expect(
        service.authenticateSocket(await signRefresh()),
      ).resolves.toBeNull()
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled()
    })
  })
})
