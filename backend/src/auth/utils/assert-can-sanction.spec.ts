import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { SystemRole } from '@prisma/client'
import type { PrismaService } from 'src/prisma/prisma.service'
import { assertCanSanction } from './assert-can-sanction'

describe('assertCanSanction', () => {
  const buildPrisma = (roles: Record<string, SystemRole>) =>
    ({
      user: {
        findUnique: jest.fn(({ where }: { where: { id: string } }) =>
          Promise.resolve(roles[where.id] ? { role: roles[where.id] } : null),
        ),
      },
    }) as unknown as PrismaService

  it('Debe permitir que un MODERATOR sancione a un USER', async () => {
    const prisma = buildPrisma({
      mod: SystemRole.MODERATOR,
      user: SystemRole.USER,
    })

    await expect(
      assertCanSanction(prisma, 'mod', 'user'),
    ).resolves.toBeUndefined()
  })

  it('Debe rechazar que un MODERATOR sancione a un ADMIN', async () => {
    const prisma = buildPrisma({
      mod: SystemRole.MODERATOR,
      admin: SystemRole.ADMIN,
    })

    await expect(assertCanSanction(prisma, 'mod', 'admin')).rejects.toThrow(
      ForbiddenException,
    )
  })

  it('Debe rechazar que un ADMIN sancione a otro ADMIN (mismo rango)', async () => {
    const prisma = buildPrisma({
      a1: SystemRole.ADMIN,
      a2: SystemRole.ADMIN,
    })

    await expect(assertCanSanction(prisma, 'a1', 'a2')).rejects.toThrow(
      ForbiddenException,
    )
  })

  it('Debe rechazar que alguien se sancione a sí mismo', async () => {
    const prisma = buildPrisma({ pres: SystemRole.PRESIDENT })

    await expect(assertCanSanction(prisma, 'pres', 'pres')).rejects.toThrow(
      ForbiddenException,
    )
  })

  it('Debe usar el rol de la DB: un actor degradado a USER ya no puede sancionar', async () => {
    const prisma = buildPrisma({
      exMod: SystemRole.USER,
      user: SystemRole.USER,
    })

    await expect(assertCanSanction(prisma, 'exMod', 'user')).rejects.toThrow(
      ForbiddenException,
    )
  })

  it('Debe lanzar NotFoundException si el usuario objetivo no existe', async () => {
    const prisma = buildPrisma({ admin: SystemRole.ADMIN })

    await expect(assertCanSanction(prisma, 'admin', 'nadie')).rejects.toThrow(
      NotFoundException,
    )
  })
})
