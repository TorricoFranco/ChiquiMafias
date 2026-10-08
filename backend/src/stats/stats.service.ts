import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { publicUserSelect } from 'src/prisma/constants/publicUserSelect';


@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) { }

  async getUserStats(userId: string) {
    if (!userId) {
      throw new BadRequestException('El ID de usuario es requerido');
    }

    const stats = await this.prisma.userStats.findUnique({
      where: { userId },
      include: {
        user: {
          select: publicUserSelect, 
        }
      }
    });

    if (stats) return stats;

    return {
      totalBetsPlaced: 0,
      totalBetsWon: 0,
      totalCoinsStaked: 0,
      totalCoinsWon: 0,
      highestMultiplier: 0,
      currentWinStreak: 0,
      longestWinStreak: 0,
    };
  }

  async getTopEarners(limit: number = 10) {
    return this.prisma.userStats.findMany({
      take: limit,
      orderBy: { totalCoinsWon: 'desc' },
      include: {
        user: { select: publicUserSelect } 
      }
    });
  }

  async getTopStreaks(limit: number = 10) {
    return this.prisma.userStats.findMany({
      take: limit,
      orderBy: { longestWinStreak: 'desc' },
      include: {
        user: { select: publicUserSelect }
      }
    });
  }

  async getHighestMultipliers(limit: number = 10) {
    return this.prisma.userStats.findMany({
      take: limit,
      orderBy: { highestMultiplier: 'desc' },
      include: {
        user: { select: publicUserSelect }
      }
    });
  }

  async getMostActive(limit: number = 10) {
    return this.prisma.userStats.findMany({
      take: limit,
      orderBy: { totalBetsPlaced: 'desc' },
      include: {
        user: { select: publicUserSelect }
      }
    });
  }

  async getTopStakers(limit: number = 10) {
    return this.prisma.userStats.findMany({
      take: limit,
      orderBy: { totalCoinsStaked: 'desc' },
      include: {
        user: { select: publicUserSelect }
      }
    });
  }

  async getGlobalPlatformStats() {
    const aggregates = await this.prisma.userStats.aggregate({
      _sum: {
        totalBetsPlaced: true,
        totalCoinsStaked: true,
        totalCoinsWon: true,
      },
      _count: {
        userId: true
      }
    });

    return {
      totalUsers: aggregates._count.userId,
      totalBets: aggregates._sum.totalBetsPlaced || 0,
      totalVolumeStaked: aggregates._sum.totalCoinsStaked || 0,
      totalVolumeWon: aggregates._sum.totalCoinsWon || 0,
    };
  }
}