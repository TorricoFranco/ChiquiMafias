/**
 * Datos para el smoke full-stack de new_frontend (`npm run test:e2e:fullstack`).
 *
 *   docker compose -f docker-compose.dev.yml exec backend npm run seed:e2e
 *
 * Es idempotente: crea o resetea usuarios `@chiquimafias.test` (estado, ban y muteo en Redis
 * incluidos) y un ítem `[E2E]` de la tienda. No cambia saldos: crea la Wallet con su default
 * si falta y alinea el cache de Redis con la DB. Las monedas las carga el setup de Playwright
 * con POST /wallet/admin/add-coins, el mismo camino que en producción.
 */
import { ItemType, PrismaClient, SystemRole } from '@prisma/client'
import Redis from 'ioredis'

const E2E_DOMAIN = '@chiquimafias.test'
const E2E_STORE_ITEM_ASSET_ID = 'e2e-banner'

const E2E_USERS: { slug: string; name: string; role: SystemRole }[] = [
  { slug: 'e2e-user', name: 'Hincha E2E', role: SystemRole.USER },
  { slug: 'e2e-user2', name: 'Hincha E2E Dos', role: SystemRole.USER },
  { slug: 'e2e-mod', name: 'Moderador E2E', role: SystemRole.MODERATOR },
  { slug: 'e2e-admin', name: 'Admin E2E', role: SystemRole.ADMIN },
  // add-coins exige PRESIDENT.
  { slug: 'e2e-president', name: 'Presidente E2E', role: SystemRole.PRESIDENT },
]

/** Solo corre donde dev-login está habilitado (el mismo flag que necesita el smoke). */
function assertDevEnvironment() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('seed:e2e no se corre en producción.')
  }
  if (process.env.ENABLE_DEV_TOOLS !== 'true') {
    throw new Error(
      'seed:e2e necesita ENABLE_DEV_TOOLS=true (corrélo dentro del contenedor de dev).',
    )
  }
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('Falta DATABASE_URL.')
  console.log(`seed:e2e sobre la DB en ${new URL(databaseUrl).host}`)
}

async function main() {
  assertDevEnvironment()

  const prisma = new PrismaClient()
  const redis = new Redis({
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
    password: process.env.REDIS_PASSWORD,
    lazyConnect: true,
  })

  try {
    await redis.connect()

    const team = await prisma.footballTeam.findFirst({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    })

    for (const user of E2E_USERS) {
      const email = `${user.slug}${E2E_DOMAIN}`
      const profile = {
        name: user.name,
        username: user.slug.replace(/-/g, '_'),
        role: user.role,
        status: 'ACTIVE' as const,
        isFirstLogin: false,
        mutedUntil: null,
        teamId: team?.id ?? null,
      }

      const { id } = await prisma.user.upsert({
        where: { email },
        update: profile,
        create: { ...profile, email, googleId: `e2e-google-${user.slug}` },
        select: { id: true },
      })

      // Sin Wallet, /wallet/my-balance responde 400 y el setup no puede cargar monedas.
      const wallet = await prisma.wallet.upsert({
        where: { userId: id },
        create: { userId: id },
        update: {},
        select: { balance: true },
      })

      // El ban y el muteo reales viven en Redis (UserStatusGuard y WsTimeoutGuard); el saldo
      // que usan las apuestas también.
      await redis
        .multi()
        .del(`user:banned:${id}`, `timeout:${id}`)
        .set(`wallet:${id}:balance`, wallet.balance)
        .exec()
    }

    const item = await prisma.storeItem.upsert({
      where: { assetId: E2E_STORE_ITEM_ASSET_ID },
      update: { isActive: true, isPurchasable: true, price: 100 },
      create: {
        name: '[E2E] Banner',
        description: 'Ítem de prueba del smoke full-stack.',
        price: 100,
        type: ItemType.BANNER,
        assetId: E2E_STORE_ITEM_ASSET_ID,
      },
    })

    // Para que el test de compra pueda volver a comprarlo en cada corrida.
    const { count } = await prisma.userInventory.deleteMany({
      where: { itemId: item.id, user: { email: { endsWith: E2E_DOMAIN } } },
    })

    console.log(
      `seed:e2e listo: ${E2E_USERS.length} usuarios ${E2E_DOMAIN}` +
        ` (club: ${team?.name ?? 'ninguno'}), ítem "${item.name}" (${count} compras previas borradas).`,
    )
  } finally {
    redis.disconnect()
    await prisma.$disconnect()
  }
}

main().catch((error: unknown) => {
  console.error('seed:e2e falló:', error)
  process.exit(1)
})
