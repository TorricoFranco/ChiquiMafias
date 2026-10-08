import { ForbiddenException, NotFoundException } from '@nestjs/common'
import type { PrismaService } from 'src/prisma/prisma.service'
import { outranks } from '../enums/roles.enum'

// Un staff solo puede sancionar (ban, unban, mute, warn) a usuarios de rol
// estrictamente inferior. El rol del actor se lee de la DB y no del JWT: un
// moderador degradado no conserva el poder hasta que venza su token.
export async function assertCanSanction(
  prisma: PrismaService,
  actorId: string,
  targetUserId: string,
): Promise<void> {
  if (actorId === targetUserId) {
    throw new ForbiddenException('No podés sancionarte a vos mismo.')
  }

  const [actor, target] = await Promise.all([
    prisma.user.findUnique({ where: { id: actorId }, select: { role: true } }),
    prisma.user.findUnique({
      where: { id: targetUserId },
      select: { role: true },
    }),
  ])

  if (!target) {
    throw new NotFoundException('El usuario objetivo no existe.')
  }

  if (!actor || !outranks(actor.role, target.role)) {
    throw new ForbiddenException(
      'No tenés permisos para sancionar a un usuario de igual o mayor jerarquía.',
    )
  }
}
