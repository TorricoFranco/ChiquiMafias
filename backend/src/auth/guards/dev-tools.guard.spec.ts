import { NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { DevToolsGuard } from './dev-tools.guard'

describe('DevToolsGuard', () => {
  const buildGuard = (env: Record<string, unknown>) => {
    const configService = {
      get: jest.fn((key: string) => env[key]),
    } as unknown as ConfigService
    return new DevToolsGuard(configService)
  }

  it('Debe responder 404 si ENABLE_DEV_TOOLS no está habilitado', () => {
    const guard = buildGuard({
      ENABLE_DEV_TOOLS: false,
      NODE_ENV: 'development',
    })

    expect(() => guard.canActivate()).toThrow(NotFoundException)
  })

  it('Debe responder 404 si ENABLE_DEV_TOOLS no está definido', () => {
    const guard = buildGuard({ NODE_ENV: 'development' })

    expect(() => guard.canActivate()).toThrow(NotFoundException)
  })

  it('Debe responder 404 en producción aunque ENABLE_DEV_TOOLS sea true', () => {
    const guard = buildGuard({
      ENABLE_DEV_TOOLS: true,
      NODE_ENV: 'production',
    })

    expect(() => guard.canActivate()).toThrow(NotFoundException)
  })

  it('Debe dejar pasar con ENABLE_DEV_TOOLS=true fuera de producción', () => {
    const guard = buildGuard({
      ENABLE_DEV_TOOLS: true,
      NODE_ENV: 'development',
    })

    expect(guard.canActivate()).toBe(true)
  })

  it('Debe aceptar ENABLE_DEV_TOOLS como string "true"', () => {
    const guard = buildGuard({
      ENABLE_DEV_TOOLS: 'true',
      NODE_ENV: 'development',
    })

    expect(guard.canActivate()).toBe(true)
  })
})
