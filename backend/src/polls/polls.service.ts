import { Prisma } from '@prisma/client'
import { BadRequestException, Injectable } from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'
import { RedisService } from 'src/redis/redis.service'
import { CreatePollDto } from './dto/create-poll.dto'
import { ProposePollDto } from './dto/propose-poll.dto'
import { ApprovePollDto } from './dto/aprove-poll.dto'
import { NotFoundException } from '@nestjs/common/exceptions/not-found.exception'
import { EventEmitter2 } from '@nestjs/event-emitter'

@Injectable()
export class PollsService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private eventEmitter: EventEmitter2,
  ) { }

  async proposePoll(userId: string, dto: ProposePollDto) {
    const formattedOptions = dto.options.map((optionText, index) => ({
      id: index + 1,
      label: optionText,
    }))

    return this.prisma.$transaction(async (tx) => {
      const inventoryItem = await tx.userInventory.findFirst({
        where: {
          userId,
          item: { type: 'CUSTOM_POLL' },
          quantity: { gte: 1 },
        },
      })

      if (!inventoryItem) {
        throw new BadRequestException(
          'No tenés ningún Ticket de Encuesta disponible en tu inventario ❌',
        )
      }

      if (inventoryItem.quantity === 1) {
        await tx.userInventory.delete({ where: { id: inventoryItem.id } })
      } else {
        await tx.userInventory.update({
          where: { id: inventoryItem.id },
          data: { quantity: { decrement: 1 } },
        })
      }

      return tx.poll.create({
        data: {
          title: dto.title,
          description: dto.description || null,
          options: formattedOptions as unknown as Prisma.InputJsonValue[],
          status: 'PENDING',
          icon: dto.icon || 'USER',
          userId: userId,
        },
      })
    })
  }

  async getPendingPolls() {
    return this.prisma.poll.findMany({
      where: { status: 'PENDING' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    })
  }

  async approvePoll(pollId: string, dto: ApprovePollDto) {
    const startsAtDate = new Date(dto.startsAt)
    const endsAtDate = new Date(dto.endsAt)

    if (endsAtDate <= startsAtDate) {
      throw new BadRequestException(
        'La fecha de finalización debe ser posterior a la de inicio.',
      )
    }

    const poll = await this.prisma.poll.findUnique({ where: { id: pollId } })
    if (!poll) throw new NotFoundException('La encuesta no existe')
    if (poll.status !== 'PENDING')
      throw new BadRequestException('Esta encuesta ya no está pendiente')

    const updatedPoll = await this.prisma.poll.update({
      where: { id: pollId },
      data: {
        status: 'ACTIVE',
        startsAt: startsAtDate,
        endsAt: endsAtDate,
      },
    })

    if (updatedPoll.userId) {
      this.eventEmitter.emit('poll.approved', {
        userId: updatedPoll.userId,
        pollId: updatedPoll.id,
        pollTitle: updatedPoll.title,
      })
    }

    return updatedPoll
  }

  async rejectPoll(pollId: string) {
    return this.prisma.$transaction(async (tx) => {
      const poll = await tx.poll.findUnique({ where: { id: pollId } })
      if (!poll) throw new NotFoundException('La encuesta no existe')
      if (poll.status !== 'PENDING')
        throw new BadRequestException(
          'Solo se pueden rechazar encuestas en estado PENDING',
        )

      await tx.poll.update({
        where: { id: pollId },
        data: { status: 'REJECTED' },
      })

      // reembolso de ticket
      if (poll.userId) {
        const storeItem = await tx.storeItem.findFirst({
          where: { type: 'CUSTOM_POLL' },
        })

        if (!storeItem) {
          throw new BadRequestException(
            'No se encontró el artículo base CUSTOM_POLL en la tienda',
          )
        }

        const existingInv = await tx.userInventory.findUnique({
          where: {
            userId_itemId: { userId: poll.userId, itemId: storeItem.id },
          },
        })

        if (existingInv) {
          await tx.userInventory.update({
            where: { id: existingInv.id },
            data: { quantity: { increment: 1 } },
          })
        } else {
          await tx.userInventory.create({
            data: {
              userId: poll.userId,
              itemId: storeItem.id,
              quantity: 1,
            },
          })
        }

        this.eventEmitter.emit('poll.rejected', {
          userId: poll.userId,
          pollId: poll.id,
          pollTitle: poll.title,
        })
      }

      return {
        message: 'Encuesta rechazada y consumible reembolsado al usuario.',
      }
    })
  }

  async createPoll(dto: CreatePollDto) {
    const startsAtDate = new Date(dto.startsAt)
    const endsAtDate = new Date(dto.endsAt)

    if (endsAtDate <= startsAtDate) {
      throw new BadRequestException(
        'La fecha de finalización (endsAt) debe ser posterior a la de inicio (startsAt).',
      )
    }

    return this.prisma.poll.create({
      data: {
        title: dto.title,
        description: dto.description,
        options: dto.options as unknown as Prisma.InputJsonValue[],
        status: 'ACTIVE',
        startsAt: startsAtDate,
        endsAt: endsAtDate,
        icon: dto.icon,
      },
    })
  }

  async getActivePolls() {
    return this.prisma.poll.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        title: true,
        endsAt: true,
        icon: true,
        description: true,
      },
    })
  }

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
      where: {
        status: 'ACTIVE',
      },
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

  async closePollManually(pollId: string) {
    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId },
    })

    if (!poll) {
      throw new BadRequestException('La encuesta solicitada no existe.')
    }

    if (poll.status === 'CLOSED') {
      throw new BadRequestException('La encuesta ya se encuentra cerrada.')
    }

    await this.executePollClosure(pollId)

    return {
      message: 'Encuesta cerrada correctamente por el administrador.',
      pollId: poll.id,
      status: 'CLOSED',
    }
  }

  async executePollClosure(pollId: string): Promise<void> {
    const redis = this.redisService.redis
    const expiry = 60 * 60 * 24 // 24 horas

    await this.prisma.poll.update({
      where: { id: pollId },
      data: { status: 'CLOSED' },
    })

    await Promise.all([
      redis.expire(`poll:${pollId}:results`, expiry),
      redis.expire(`poll:${pollId}:voters`, expiry),
    ])
  }
}
