import { Prisma } from '@prisma/client'
import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'
import { RedisService } from 'src/redis/redis.service'
import { CreatePollDto } from './dto/create-poll.dto'
import { ProposePollDto } from './dto/propose-poll.dto'
import { ApprovePollDto } from './dto/aprove-poll.dto'
import { PollType, ReactionType } from '@prisma/client'
import { CreateCommentDto } from './dto/create-comment.dto'
import { NotFoundException } from '@nestjs/common/exceptions/not-found.exception'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { WalletService } from 'src/wallet/wallet.service'
import {
  POLL_TYPE_LABELS,
  POLL_TYPE_RULES,
} from './constants/poll-types.constant'
import {
  buildPollShape,
  parsePollConfig,
  parsePollOptions,
  parseTicketRefund,
} from './utils/poll-shape.util'
import type { PollTicketRefund } from './utils/poll-shape.util'
import {
  buildRankingMatrix,
  buildRankingMatrixFromVotes,
} from './utils/poll-ranking.util'
import {
  pollAdminSelect,
  pollAuthorSelect,
  resolvePollAuthor,
} from './utils/poll-author.util'

@Injectable()
export class PollsService {
  private readonly logger = new Logger(PollsService.name)

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private eventEmitter: EventEmitter2,
    private walletService: WalletService,
  ) {}

  async proposePoll(userId: string, dto: ProposePollDto) {
    const type = dto.type ?? PollType.CLASSIC

    if (POLL_TYPE_RULES[type]?.adminOnly) {
      throw new BadRequestException(
        `Las encuestas de tipo ${POLL_TYPE_LABELS[type]} solo las publica la moderación`,
      )
    }

    const shape = buildPollShape({
      type,
      labels: dto.options ?? [],
      teamIds: dto.optionTeamIds,
      layout: dto.config?.layout,
    })

    return this.prisma.$transaction(async (tx) => {
      const ticketRefund = await this.consumePollTickets(
        tx,
        userId,
        shape.ticketCost,
      )

      return tx.poll.create({
        data: {
          title: dto.title,
          description: dto.description || null,
          type,
          options: shape.options as unknown as Prisma.InputJsonValue[],
          config: (shape.config ?? Prisma.DbNull) as Prisma.InputJsonValue,
          ticketCost: shape.ticketCost,
          ticketRefund: ticketRefund as unknown as Prisma.InputJsonValue,
          status: 'PENDING',
          icon: dto.icon || 'USER',
          isOfficial: false,
          userId: userId,
        },
      })
    })
  }

  /**
   * Descuenta `amount` tickets de encuesta del inventario del usuario.
   * El stock puede estar repartido en varias filas (el de la tienda y el regalo
   * de suscripción son StoreItems distintos del mismo tipo), así que se suma todo
   * y se descuenta fila por fila hasta cubrir el costo.
   *
   * @returns de qué ítem salió cada ticket, para poder devolver los mismos.
   */
  private async consumePollTickets(
    tx: Prisma.TransactionClient,
    userId: string,
    amount: number,
  ): Promise<PollTicketRefund[]> {
    const inventoryRows = await tx.userInventory.findMany({
      where: {
        userId,
        item: { type: 'CUSTOM_POLL' },
        quantity: { gte: 1 },
      },
      // El id desempata: sin un orden estable, dos propuestas simultáneas del
      // mismo usuario pueden tomar los locks cruzados y provocar un deadlock.
      orderBy: [{ quantity: 'desc' }, { id: 'asc' }],
    })

    const available = inventoryRows.reduce(
      (total, row) => total + row.quantity,
      0,
    )

    if (available < amount) {
      throw new BadRequestException(
        amount === 1
          ? 'No tenés ningún Ticket de Encuesta disponible en tu inventario ❌'
          : `Esta encuesta cuesta ${amount} Tickets de Encuesta y tenés ${available} ❌`,
      )
    }

    let remaining = amount
    const charged: PollTicketRefund[] = []

    for (const row of inventoryRows) {
      if (remaining === 0) break

      const taken = Math.min(row.quantity, remaining)

      // Decremento condicional: si otra propuesta simultánea ya consumió esta
      // fila, el updateMany no afecta nada y seguimos con la siguiente en vez
      // de dejar el inventario en negativo.
      const { count } = await tx.userInventory.updateMany({
        where: { id: row.id, quantity: { gte: taken } },
        data: { quantity: { decrement: taken } },
      })

      if (count > 0) {
        remaining -= taken
        charged.push({ itemId: row.itemId, quantity: taken })
      }
    }

    if (remaining > 0) {
      throw new BadRequestException(
        'No pudimos descontar tus Tickets de Encuesta, probá de nuevo ❌',
      )
    }

    await tx.userInventory.deleteMany({
      where: { userId, item: { type: 'CUSTOM_POLL' }, quantity: { lte: 0 } },
    })

    return charged
  }

  async getPendingPolls() {
    const polls = await this.prisma.poll.findMany({
      where: { status: 'PENDING' },
      include: {
        user: { select: pollAuthorSelect },
        createdByAdmin: { select: pollAdminSelect },
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    return polls.map((poll) => ({
      ...poll,
      user: resolvePollAuthor(poll),
    }))
  }

  async approvePoll(pollId: string, dto: ApprovePollDto) {
    const startsAtDate = new Date(dto.startsAt)
    const endsAtDate = new Date(dto.endsAt)

    if (endsAtDate <= startsAtDate) {
      throw new BadRequestException(
        'La fecha de finalización debe ser posterior a la de inicio.',
      )
    }

    // Lock optimista: si otro moderador la rechazó entre la lectura y la
    // escritura, esto no la publica igual.
    const { count } = await this.prisma.poll.updateMany({
      where: { id: pollId, status: 'PENDING' },
      data: {
        status: 'ACTIVE',
        startsAt: startsAtDate,
        endsAt: endsAtDate,
      },
    })

    if (count === 0) {
      const exists = await this.prisma.poll.findUnique({
        where: { id: pollId },
        select: { id: true },
      })

      if (!exists) throw new NotFoundException('La encuesta no existe')
      throw new BadRequestException('Esta encuesta ya no está pendiente')
    }

    const updatedPoll = await this.prisma.poll.findUniqueOrThrow({
      where: { id: pollId },
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
    const rejectedPoll = await this.prisma.$transaction(async (tx) => {
      const poll = await tx.poll.findUnique({ where: { id: pollId } })
      if (!poll) throw new NotFoundException('La encuesta no existe')

      // Lock optimista: dos rechazos simultáneos (o un doble clic) no pueden
      // reembolsar los tickets dos veces.
      const { count } = await tx.poll.updateMany({
        where: { id: pollId, status: 'PENDING' },
        data: { status: 'REJECTED' },
      })

      if (count === 0) {
        throw new BadRequestException(
          'Solo se pueden rechazar encuestas en estado PENDING',
        )
      }

      // Se devuelven exactamente los tickets que costó proponerla, y al mismo
      // ítem del que salieron: el de la tienda y el regalo de suscripción son
      // StoreItems distintos del mismo tipo.
      if (poll.userId) {
        const refunds = await this.resolveTicketRefunds(tx, poll)

        for (const refund of refunds) {
          await tx.userInventory.upsert({
            where: {
              userId_itemId: { userId: poll.userId, itemId: refund.itemId },
            },
            update: { quantity: { increment: refund.quantity } },
            create: {
              userId: poll.userId,
              itemId: refund.itemId,
              quantity: refund.quantity,
            },
          })
        }
      }

      return poll
    })

    // El evento se emite recién con la transacción confirmada.
    if (rejectedPoll.userId) {
      this.eventEmitter.emit('poll.rejected', {
        userId: rejectedPoll.userId,
        pollId: rejectedPoll.id,
        pollTitle: rejectedPoll.title,
      })
    }

    // Una encuesta oficial programada también queda PENDING, pero no gastó
    // tickets de nadie: no hay nada que devolver.
    return {
      message: rejectedPoll.userId
        ? 'Encuesta rechazada y consumible reembolsado al usuario.'
        : 'Encuesta rechazada.',
    }
  }

  /**
   * De qué ítems hay que devolver los tickets de una propuesta rechazada.
   * Las encuestas creadas antes de este cambio no tienen desglose, así que
   * caen al ítem comprable de la tienda.
   */
  private async resolveTicketRefunds(
    tx: Prisma.TransactionClient,
    poll: { ticketCost: number; ticketRefund: Prisma.JsonValue },
  ): Promise<PollTicketRefund[]> {
    const stored = parseTicketRefund(poll.ticketRefund)

    if (stored.length > 0) return stored

    if (poll.ticketCost <= 0) return []

    const storeItem = await tx.storeItem.findFirst({
      where: { type: 'CUSTOM_POLL', isPurchasable: true },
      orderBy: { createdAt: 'asc' },
    })

    if (!storeItem) {
      throw new BadRequestException(
        'No se encontró el artículo base CUSTOM_POLL en la tienda',
      )
    }

    return [{ itemId: storeItem.id, quantity: poll.ticketCost }]
  }

  /**
   * @param adminId moderador que la publica. Se guarda solo para auditoría: las
   * encuestas oficiales no exponen ningún dato de la persona que las creó.
   */
  async createPoll(dto: CreatePollDto, adminId: string) {
    const type = dto.type ?? PollType.CLASSIC
    const rawOptions = dto.options ?? []

    const shape = buildPollShape({
      type,
      labels: rawOptions.map((option) => option.label),
      teamIds: rawOptions.map((option) => option.teamId),
      layout: dto.config?.layout,
    })

    const startsAtDate = dto.startsAt ? new Date(dto.startsAt) : new Date()
    const endsAtDate = dto.endsAt ? new Date(dto.endsAt) : null

    if (shape.requiresEndsAt && !endsAtDate) {
      throw new BadRequestException(
        'Falta la fecha de cierre (endsAt) de la encuesta.',
      )
    }

    if (endsAtDate && endsAtDate <= startsAtDate) {
      throw new BadRequestException(
        'La fecha de finalización (endsAt) debe ser posterior a la de inicio (startsAt).',
      )
    }

    // Si la programan para más adelante queda PENDING y la abre el cron cuando
    // llega `startsAt`, igual que una propuesta aprobada.
    const isScheduled = startsAtDate.getTime() > Date.now()

    const nuevaPoll = await this.prisma.poll.create({
      data: {
        title: dto.title,
        description: dto.description,
        type,
        options: shape.options as unknown as Prisma.InputJsonValue[],
        config: (shape.config ?? Prisma.DbNull) as Prisma.InputJsonValue,
        // La publica la moderación: no consumió tickets, así que no hay nada que devolver.
        ticketCost: 0,
        commentsEnabled: dto.commentsEnabled ?? true,
        status: isScheduled ? 'PENDING' : 'ACTIVE',
        startsAt: startsAtDate,
        endsAt: endsAtDate,
        icon: dto.icon,
        isOfficial: true,
        createdByAdminId: adminId,
      },
    })

    // El aviso en el chat invita a votar: no tiene sentido para una placa
    // informativa ni para una encuesta que todavía no abrió.
    if (POLL_TYPE_RULES[type].votable && !isScheduled) {
      this.eventEmitter.emit('poll.created', nuevaPoll)
    }

    return nuevaPoll
  }

  /**
   * @param revealResults fuerza los resultados por opción aunque el usuario no
   * haya votado. Lo usa el panel de moderación, que necesita ver los números.
   */
  async getActivePolls(userId?: string, revealResults = false) {
    const polls = await this.prisma.poll.findMany({
      where: { status: 'ACTIVE' },
      // Desempate estable: sin esto, dos encuestas con los mismos votos salen en
      // el orden físico de las filas y las tarjetas se mueven en cada refetch.
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        options: true,
        status: true,
        createdAt: true,
        startsAt: true,
        endsAt: true,
        icon: true,
        description: true,
        type: true,
        config: true,
        commentsEnabled: true,
        isOfficial: true,
        user: { select: pollAuthorSelect },
        // Quién la publicó es solo para la moderación: si no la pide, no sale de
        // la DB. Mismo criterio que `votes` y `reactions` acá abajo.
        createdByAdmin: revealResults ? { select: pollAdminSelect } : false,

        _count: {
          select: {
            comments: { where: { isDeleted: false } },
            reactions: true,
          },
        },

        votes: userId
          ? { where: { userId }, select: { optionId: true, ranking: true } }
          : false,
        reactions: userId
          ? { where: { userId }, select: { type: true } }
          : false,
      },
    })

    const pollIds = polls.map((p) => p.id)
    const pollReactionCounts =
      pollIds.length > 0
        ? await this.prisma.pollReaction.groupBy({
            by: ['pollId', 'type'],
            where: { pollId: { in: pollIds } },
            _count: { type: true },
          })
        : []

    const redis = this.redisService.redis

    const pollsWithResults = await Promise.all(
      polls.map(async (poll) => {
        const {
          votes,
          reactions,
          options,
          _count,
          createdByAdmin,
          ...pollData
        } = poll
        const redisVotes = await redis.hgetall(`poll:${poll.id}:results`)

        // `votes` viene de un select condicional (false si no hay sesión), así
        // que se normaliza una sola vez en lugar de castear en cada uso.
        const userVotes = (votes || []) as {
          optionId: number
          ranking: number[]
        }[]
        const hasVoted = userVotes.length > 0
        const userVotedOptionId = hasVoted ? userVotes[0].optionId : null
        const userRanking = hasVoted ? userVotes[0].ranking : null

        let totalVotesForPoll = 0

        // Los resultados por opción se revelan recién después de votar, para no
        // sesgar a quien todavía no votó. El total sí es público.
        const canSeeResults = hasVoted || revealResults

        const parsedOptions = parsePollOptions(options).map((opt) => {
          const optVotes = parseInt(redisVotes[opt.id.toString()] || '0', 10)
          totalVotesForPoll += optVotes

          return {
            ...opt,
            votes: canSeeResults ? optVotes : 0,
          }
        })

        // El podio se arma aparte: `results` solo cuenta los primeros puestos.
        const rankingResults =
          poll.type === 'RANKING' && canSeeResults
            ? buildRankingMatrix(
                await redis.hgetall(`poll:${poll.id}:ranking`),
                parsedOptions.map((opt) => opt.id),
                parsePollConfig(poll.config).picks,
              )
            : null

        // Igual que `votes`: el select es condicional, así que se normaliza
        // una vez en lugar de castear a `any` en cada acceso.
        const userReactions = (reactions || []) as { type: ReactionType }[]
        const userReaction =
          userReactions.length > 0 ? userReactions[0].type : null

        const likes =
          pollReactionCounts.find(
            (r) => r.pollId === poll.id && r.type === 'LIKE',
          )?._count.type || 0
        const dislikes =
          pollReactionCounts.find(
            (r) => r.pollId === poll.id && r.type === 'DISLIKE',
          )?._count.type || 0

        return {
          ...pollData,
          user: resolvePollAuthor(poll),
          // Quién la publicó solo lo ve la moderación en su panel.
          ...(revealResults ? { createdByAdmin } : {}),
          options: parsedOptions,
          hasVoted,
          userVotedOptionId,
          userRanking,
          rankingResults,
          userReaction,
          likesCount: likes,
          dislikesCount: dislikes,
          totalVotes: totalVotesForPoll,
          stats: {
            comments: _count.comments,
            reactions: _count.reactions,
          },
        }
      }),
    )

    // Primero lo que el usuario todavía puede votar ahora mismo, y dentro de
    // cada grupo las más populares. Atrás quedan las ya votadas, las placas
    // informativas (no se votan) y las que están ACTIVE pero fuera de su
    // ventana: una aprobada con `startsAt` futuro no abrió todavía, y el cron
    // de cierre puede tardar hasta un minuto en pasarlas a CLOSED.
    const now = Date.now()
    const pendingFirst = (poll: {
      type: PollType
      hasVoted: boolean
      startsAt: Date | null
      endsAt: Date | null
    }) => {
      const isOpen =
        (!poll.startsAt || poll.startsAt.getTime() <= now) &&
        (!poll.endsAt || poll.endsAt.getTime() > now)

      return POLL_TYPE_RULES[poll.type].votable && !poll.hasVoted && isOpen
        ? 0
        : 1
    }

    pollsWithResults.sort(
      (a, b) =>
        pendingFirst(a) - pendingFirst(b) || b.totalVotes - a.totalVotes,
    )

    return pollsWithResults
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
      redis.expire(`poll:${pollId}:ranking`, expiry),
      redis.expire(`poll:${pollId}:details`, expiry),
    ])
  }

  async claimAllPendingRewards(userId: string) {
    const pendingVotes = await this.prisma.vote.findMany({
      where: {
        userId,
        rewardClaimed: false,
      },
      select: { id: true },
    })

    if (pendingVotes.length === 0) {
      throw new BadRequestException(
        'No tenés recompensas pendientes para reclamar.',
      )
    }

    const COINS_PER_VOTE = 50

    const voteIds = pendingVotes.map((v) => v.id)

    // Update condicional: con dos claims simultáneos cada voto se paga una sola vez
    const claimedCount = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.vote.updateMany({
        where: { id: { in: voteIds }, rewardClaimed: false },
        data: { rewardClaimed: true },
      })
      if (count === 0) {
        throw new BadRequestException(
          'No tenés recompensas pendientes para reclamar.',
        )
      }

      await this.walletService.addCoins(
        {
          userId,
          amount: count * COINS_PER_VOTE,
          type: 'POLL_VOTE',
          description: `Recompensa por participar en ${count} encuestas`,
        },
        tx,
      )
      return count
    })

    await this.walletService.syncBalanceCache(userId)

    const totalCoins = claimedCount * COINS_PER_VOTE

    return {
      status: 'success',
      claimedCount,
      coinsAwarded: totalCoins,
      message: `¡Reclamaste ${totalCoins} monedas de ${claimedCount} encuestas con éxito!`,
    }
  }

  async getPendingRewardsCount(userId: string) {
    const count = await this.prisma.vote.count({
      where: {
        userId,
        rewardClaimed: false,
      },
    })
    return { count, potentialCoins: count * 50 }
  }

  async getClosedPolls(page: number = 1, limit: number = 10, userId?: string) {
    const skip = (page - 1) * limit
    const now = new Date()

    const polls = await this.prisma.poll.findMany({
      where: {
        OR: [{ status: 'CLOSED' }, { endsAt: { lt: now } }],
      },
      orderBy: { endsAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        description: true,
        icon: true,
        endsAt: true,
        options: true,
        type: true,
        config: true,
        isOfficial: true,
        user: { select: pollAuthorSelect },
        votes: {
          select: { optionId: true, userId: true, ranking: true },
        },
      },
    })

    const history = polls.map((poll) => {
      const parsedOptions = parsePollOptions(poll.options).map((opt) => {
        const voteCount = poll.votes.filter((v) => v.optionId === opt.id).length
        return {
          ...opt,
          votes: voteCount,
        }
      })

      const hasVoted = userId
        ? poll.votes.some((v) => v.userId === userId)
        : false

      return {
        id: poll.id,
        title: poll.title,
        description: poll.description,
        icon: poll.icon,
        endsAt: poll.endsAt,
        type: poll.type,
        config: poll.config,
        isOfficial: poll.isOfficial,
        user: resolvePollAuthor(poll),
        options: parsedOptions,
        rankingResults:
          poll.type === 'RANKING'
            ? buildRankingMatrixFromVotes(
                poll.votes,
                parsedOptions.map((opt) => opt.id),
                parsePollConfig(poll.config).picks,
              )
            : null,
        hasVoted,
        totalVotes: poll.votes.length,
      }
    })

    const totalItems = await this.prisma.poll.count({
      where: {
        OR: [{ status: 'CLOSED' }, { endsAt: { lt: now } }],
      },
    })

    return {
      data: history,
      meta: {
        total: totalItems,
        page,
        limit,
        totalPages: Math.ceil(totalItems / limit),
      },
    }
  }

  async addComment(pollId: string, userId: string, dto: CreateCommentDto) {
    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId },
      select: { commentsEnabled: true },
    })

    if (!poll) throw new NotFoundException('La encuesta no existe')

    if (!poll.commentsEnabled) {
      throw new BadRequestException(
        'Esta encuesta tiene los comentarios cerrados',
      )
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { activeSubscriptionTier: true },
    })

    const isPremium = user?.activeSubscriptionTier === 'TIER_3'

    return this.prisma.comment.create({
      data: {
        text: dto.text,
        pollId,
        isPremium,
        userId,
      },
      include: {
        user: { select: { username: true, activeChatBubbleId: true } },
      },
    })
  }

  async reactToPoll(pollId: string, userId: string, type: ReactionType) {
    const existingReaction = await this.prisma.pollReaction.findUnique({
      where: { pollId_userId: { pollId, userId } },
    })

    if (existingReaction) {
      if (existingReaction.type === type) {
        await this.prisma.pollReaction.delete({
          where: { id: existingReaction.id },
        })
        return { message: 'Reacción eliminada' }
      } else {
        return this.prisma.pollReaction.update({
          where: { id: existingReaction.id },
          data: { type },
        })
      }
    }

    return this.prisma.pollReaction.create({
      data: { pollId, userId, type },
    })
  }

  async getPollComments(
    pollId: string,
    page: number = 1,
    limit: number = 20,
    currentUserId?: string,
  ) {
    const skip = (page - 1) * limit

    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId },
      select: { id: true },
    })

    if (!poll) {
      throw new NotFoundException('La encuesta no existe')
    }

    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where: {
          pollId,
          isDeleted: false,
        },
        skip,
        take: limit,
        orderBy: [{ isPremium: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          text: true,
          createdAt: true,
          isPremium: true,
          user: {
            select: {
              id: true,
              username: true,
              activeNameColorId: true,
              activeChatBubbleId: true,
            },
          },
          reactions: currentUserId
            ? {
                where: { userId: currentUserId },
                select: { type: true },
              }
            : false,
        },
      }),
      this.prisma.comment.count({
        where: { pollId, isDeleted: false },
      }),
    ])

    const commentIds = comments.map((c) => c.id)

    const reactionCounts = await this.prisma.commentReaction.groupBy({
      by: ['commentId', 'type'],
      where: { commentId: { in: commentIds } },
      _count: { type: true },
    })

    const formattedComments = comments.map((comment) => {
      const { reactions, ...commentData } = comment

      const likes =
        reactionCounts.find(
          (r) => r.commentId === comment.id && r.type === 'LIKE',
        )?._count.type || 0
      const dislikes =
        reactionCounts.find(
          (r) => r.commentId === comment.id && r.type === 'DISLIKE',
        )?._count.type || 0

      return {
        ...commentData,
        likesCount: likes,
        dislikesCount: dislikes,
        userReaction:
          reactions && reactions.length > 0 ? reactions[0].type : null,
      }
    })

    return {
      data: formattedComments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async reactToComment(commentId: string, userId: string, type: ReactionType) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, isDeleted: true },
    })

    if (!comment || comment.isDeleted) {
      throw new NotFoundException('El comentario no existe o fue eliminado.')
    }

    const existingReaction = await this.prisma.commentReaction.findUnique({
      where: {
        commentId_userId: {
          commentId,
          userId,
        },
      },
    })

    if (existingReaction) {
      if (existingReaction.type === type) {
        await this.prisma.commentReaction.delete({
          where: { id: existingReaction.id },
        })
        return { message: 'Reacción eliminada', userReaction: null }
      }

      const updatedReaction = await this.prisma.commentReaction.update({
        where: { id: existingReaction.id },
        data: { type },
      })
      return {
        message: 'Reacción actualizada',
        userReaction: updatedReaction.type,
      }
    }

    const newReaction = await this.prisma.commentReaction.create({
      data: {
        commentId,
        userId,
        type,
      },
    })

    return { message: 'Reacción registrada', userReaction: newReaction.type }
  }
}
