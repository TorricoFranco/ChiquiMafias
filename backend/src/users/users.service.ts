import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async completeProfile(
    userId: string,
    data: { username: string; team: string },
  ) {
    // 1. Verificar si el username ya existe (y no es el del propio usuario)
    const existingUser = await this.prisma.users.findUnique({
      where: { username: data.username },
    })

    if (existingUser && existingUser.id !== userId) {
      throw new ConflictException('El nombre de usuario ya está en uso')
    }

    // 2. Actualizar el usuario
    try {
      return await this.prisma.users.update({
        where: { id: userId },
        data: {
          username: data.username,
          team: data.team,
          isFirstLogin: false, // ¡Aquí cerramos el ciclo de onboarding!
        },
      })
    } catch (error) {
      console.log(error)
      throw new NotFoundException('Usuario no encontrado')
    }
  }
}
