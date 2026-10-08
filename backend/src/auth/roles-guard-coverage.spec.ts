import { readdirSync } from 'fs'
import { join } from 'path'
import { GUARDS_METADATA } from '@nestjs/common/constants'
import { IS_PUBLIC_KEY } from './decorators/auth.decorator'
import { ROLES_KEY } from './decorators/roles.decorator'
import { TIERS_KEY } from './decorators/tiers.decorator'
import { RolesGuard } from './guards/roles.guard'
import { TiersGuard } from './guards/tiers.guard'

// @Roles y @RequireTier son solo metadata: sin su guard no restringen nada.
// Y con @Public() no hay request.user, así que RolesGuard rechaza siempre.
// Este test recorre todos los controllers y gateways y falla en esos casos.

const SRC_DIR = join(__dirname, '..')

const targetFiles = (
  readdirSync(SRC_DIR, { recursive: true }) as string[]
).filter((file) => /\.(controller|gateway)\.ts$/.test(file))

const getMetadata = <T>(key: string, target: object): T | undefined =>
  Reflect.getMetadata(key, target) as T | undefined

const getGuards = (target: object): unknown[] =>
  getMetadata<unknown[]>(GUARDS_METADATA, target) ?? []

const findViolations = () => {
  const violations: string[] = []

  for (const file of targetFiles) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const exported = require(join(SRC_DIR, file)) as Record<string, unknown>

    for (const value of Object.values(exported)) {
      if (typeof value !== 'function') continue
      const cls = value as { prototype: Record<string, unknown> }

      for (const name of Object.getOwnPropertyNames(cls.prototype)) {
        const handler = cls.prototype[name]
        if (name === 'constructor' || typeof handler !== 'function') continue

        const guards = [...getGuards(handler), ...getGuards(cls)]
        const roles =
          getMetadata<string[]>(ROLES_KEY, handler) ??
          getMetadata<string[]>(ROLES_KEY, cls)
        const tier =
          getMetadata<string>(TIERS_KEY, handler) ??
          getMetadata<string>(TIERS_KEY, cls)

        const isPublic =
          getMetadata<boolean>(IS_PUBLIC_KEY, handler) ??
          getMetadata<boolean>(IS_PUBLIC_KEY, cls)

        if (roles?.length && !guards.includes(RolesGuard)) {
          violations.push(`${file} → ${name}: @Roles sin RolesGuard`)
        }
        if (roles?.length && isPublic) {
          violations.push(`${file} → ${name}: @Roles junto con @Public()`)
        }
        if (tier && !guards.includes(TiersGuard)) {
          violations.push(`${file} → ${name}: @RequireTier sin TiersGuard`)
        }
      }
    }
  }

  return violations
}

describe('Cobertura de RolesGuard y TiersGuard', () => {
  it('Debe encontrar controllers y gateways para revisar', () => {
    expect(targetFiles.length).toBeGreaterThan(0)
  })

  it('Cada @Roles y @RequireTier debe tener su guard y no ser @Public()', () => {
    expect(findViolations()).toEqual([])
  })
})
