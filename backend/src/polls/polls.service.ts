import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'
import { RedisService } from 'src/redis/redis.service'
import { CreatePollDto } from './dto/create-poll.dto'

@Injectable()
export class PollsService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  //  ADMIN: Crea la estructura en Postgres
  async createPoll(dto: CreatePollDto) {
    return this.prisma.poll.create({
      data: {
        title: dto.title,
        description: dto.description,
        options: JSON.parse(JSON.stringify(dto.options)),
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        icon: dto.icon,
      },
    })
  }

  //  CLIENTE: Lista rápida de lo que hay para votar
  async getActivePolls() {
    return this.prisma.poll.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        title: true,
        endsAt: true,
        icon: true,
        description: true,
      }, // Solo lo necesario
    })
  }

  //  DETALLE: El que combina Postgres + Redis
  async getPollWithResults(pollId: string) {
    const redis = this.redisService.redis

    const [poll, redisVotes] = await Promise.all([
      this.prisma.poll.findUnique({ where: { id: pollId } }),
      redis.hgetall(`poll:${pollId}:results`),
    ])

    if (!poll) {
      throw new Error('La poll no existe')
    }

    const options = poll.options as unknown as {
      id: number
      label: string
    }[]

    const results = options.map((opt) => ({
      ...opt,
      votes: parseInt(redisVotes[opt.id.toString()] || '0', 10),
    }))

    return { ...poll, options: results }
  }

  async getFindPolls() {
    return this.prisma.poll.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        options: true,
        status: true,
        createdAt: true,
        startsAt: true,
        endsAt: true,
        icon: true,
      },
    })
  }
}
