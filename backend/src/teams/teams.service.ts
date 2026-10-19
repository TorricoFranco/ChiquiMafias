import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class TeamsService {
  constructor(private prisma: PrismaService) {}

  async findSelectorTeams(search?: string) {
    return this.prisma.footballTeam.findMany({
      where: {
        name: search ? { contains: search, mode: 'insensitive' } : undefined,
      },
      orderBy: [{ tier: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        badgeUrl: true,
        tier: true,
      },
    })
  }
}
