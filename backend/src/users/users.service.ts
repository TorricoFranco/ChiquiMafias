import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CompleteProfileDto } from './complete-profile.dto'

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async completeProfile(userId: string, data: CompleteProfileDto) {
    const existingUser = await this.prisma.users.findUnique({
      where: { username: data.username },
    })

    if (existingUser && existingUser.id !== userId) {
      throw new ConflictException('El nombre de usuario ya está en uso')
    }

    try {
      return await this.prisma.users.update({
        where: { id: userId },
        data: {
          username: data.username,
          team: data.team,
          isFirstLogin: false,
        },
      })
    } catch (error) {
      console.log(error)
      throw new NotFoundException('Usuario no encontrado')
    }
  }

  async findAll() {
    return this.prisma.users.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        team: true,
        isFirstLogin: true,
      },
    })
  }

  async deleteById(username: string) {
    return this.prisma.users.delete({
      where: { username },
    })
  }
}
