import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { AppModule } from './../src/app.module'
import { PrismaService } from './../src/prisma/prisma.service'
import { JwtService } from '@nestjs/jwt'
import { RedisService } from 'src/redis/redis.service'

import { execSync } from 'child_process'

describe('BetsController (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let jwtService: JwtService
  let redisService: RedisService

  jest.setTimeout(60000)

  beforeAll(async () => {
    console.log('Sincronizando DB con la instancia de Docker Compose...')

    execSync('npx prisma db push', { env: { ...process.env } })

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()

    prisma = app.get<PrismaService>(PrismaService)
    jwtService = app.get<JwtService>(JwtService)
    redisService = app.get<RedisService>(RedisService)
  })

  afterEach(async () => {
    await prisma.bet.deleteMany()
    await prisma.vote.deleteMany()
    await prisma.report.deleteMany()
    await prisma.ticketMessage.deleteMany()
    await prisma.ticket.deleteMany()
    await prisma.coinTransaction.deleteMany()
    await prisma.wallet.deleteMany()
    await prisma.notification.deleteMany()
    await prisma.userInventory.deleteMany()
    await prisma.poll.deleteMany()
    await prisma.userSubscription.deleteMany()

    await prisma.marketOption.deleteMany()
    await prisma.market.deleteMany()

    await prisma.user.deleteMany()
  })

  afterAll(async () => {
    await app.close()
  })

  it('/bets/place (POST) - Debería crear la apuesta si hay saldo y token válido', async () => {
    const user = await prisma.user.create({
      data: {
        id: 'user-e2e-1',
        email: 'test@test.com',
        name: 'Tester',
        role: 'USER',
        googleId: 'test-google-id-123',
      },
    })

    await prisma.wallet.create({
      data: { userId: user.id, balance: 1000 },
    })

    await redisService.redis.set(`wallet:${user.id}:balance`, '1000')

    const market = await prisma.market.create({
      data: {
        title: 'Boca vs River',
        closesAt: new Date(Date.now() + 100000),
        status: 'OPEN',
        options: {
          create: [{ name: 'Boca', totalStaked: 0, initialProb: 0.5 }],
        },
      },
      include: { options: true },
    })

    const redis = redisService.redis
    const marketKey = `market:${market.id}`

    // Seteamos el estado y el tiempo de cierre
    await redis.hset(
      marketKey,
      'status',
      'OPEN',
      'closesAt',
      (Date.now() + 100000).toString(),
    )

    const optionId = market.options[0].id

    // estructura que espera tu JwtStrategy
    const accessToken = await jwtService.signAsync({
      sub: user.id,
      email: user.email,
      isFirstLogin: false,
      isBanned: false,
      role: 'USER',
      tier: 'NONE',
    })

    const response = await request(app.getHttpServer())
      .post('/bets/place')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        marketId: market.id,
        optionId: optionId,
        stake: 200,
      })

    if (response.status !== 201) {
      console.log('Error 400 recibido. Detalles:', response.body)
    }

    // assert
    expect(response.status).toBe(201)

    // Verificamos que se haya cobrado correctamente en la DB
    const updatedWallet = await waitForBalance(prisma, user.id, 800)
    expect(updatedWallet?.balance).toBe(800)

    const betCreated = await prisma.bet.findFirst({
      where: { userId: user.id, optionId: optionId },
    })
    expect(betCreated).toBeDefined()
    expect(betCreated?.stake).toBe(200)
  })
})

// Helper para esperar condiciones asíncronas
async function waitForBalance(
  prisma: PrismaService,
  userId: string,
  expectedBalance: number,
  retries = 5,
) {
  for (let i = 0; i < retries; i++) {
    const wallet = await prisma.wallet.findUnique({ where: { userId } })
    if (wallet?.balance === expectedBalance) return wallet
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  return await prisma.wallet.findUnique({ where: { userId } })
}
