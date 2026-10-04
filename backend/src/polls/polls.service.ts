import { Prisma } from '@prisma/client'
import { BadRequestException, Injectable } from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'
import { RedisService } from 'src/redis/redis.service'
import { CreatePollDto } from './dto/create-poll.dto'
import { ProposePollDto } from './dto/propose-poll.dto'
import { ApprovePollDto } from './dto/aprove-poll.dto'
import { ReactionType} from '@prisma/client'
import { CreateCommentDto } from './dto/create-comment.dto'
import { NotFoundException } from '@nestjs/common/exceptions/not-found.exception'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { WalletService } from 'src/wallet/wallet.service'



@Injectable()
export class PollsService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private eventEmitter: EventEmitter2,
    private walletService: WalletService,
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

    const nuevaPoll = await this.prisma.poll.create({
      data: {
        title: dto.title,
        description: dto.description,
        options: dto.options as unknown as Prisma.InputJsonValue[],
        status: 'ACTIVE',
        startsAt: startsAtDate,
        endsAt: endsAtDate,
        icon: dto.icon,
      },
    });

    this.eventEmitter.emit('poll.created', nuevaPoll);

    return nuevaPoll;
  }

  async getActivePolls(userId?: string) {
    const polls = await this.prisma.poll.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        title: true,
        options: true,
        endsAt: true,
        icon: true,
        description: true,
        user: { select: { username: true } },

        _count: {
          select: {
            comments: { where: { isDeleted: false } },
            reactions: true
          }
        },

        votes: userId ? { where: { userId }, select: { optionId: true } } : false,
        reactions: userId ? { where: { userId }, select: { type: true } } : false,
      },
    });

    const pollIds = polls.map(p => p.id);
    const pollReactionCounts = pollIds.length > 0
      ? await this.prisma.pollReaction.groupBy({
        by: ['pollId', 'type'],
        where: { pollId: { in: pollIds } },
        _count: { type: true },
      })
      : [];

    const redis = this.redisService.redis;

    const pollsWithResults = await Promise.all(
      polls.map(async (poll) => {
        const { votes, reactions, options, _count, ...pollData } = poll;
        const redisVotes = await redis.hgetall(`poll:${poll.id}:results`);

        const rawOptions = options as unknown as { id: number; label: string }[];

        let totalVotesForPoll = 0;

        const parsedOptions = rawOptions.map((opt) => {
          const optVotes = parseInt(redisVotes[opt.id.toString()] || '0', 10);
          totalVotesForPoll += optVotes;

          return {
            ...opt,
            votes: optVotes,
          };
        });

        const hasVoted = votes ? (votes as any[]).length > 0 : false;
        const userVotedOptionId = hasVoted ? (votes as any[])[0].optionId : null;
        const userReaction = reactions && (reactions as any[]).length > 0 ? (reactions as any[])[0].type : null;

        const likes = pollReactionCounts.find(r => r.pollId === poll.id && r.type === 'LIKE')?._count.type || 0;
        const dislikes = pollReactionCounts.find(r => r.pollId === poll.id && r.type === 'DISLIKE')?._count.type || 0;

        return {
          ...pollData,
          options: parsedOptions,
          hasVoted,
          userVotedOptionId,
          userReaction,
          likesCount: likes,
          dislikesCount: dislikes,
          totalVotes: totalVotesForPoll,
          stats: {
            comments: _count.comments,
            reactions: _count.reactions,
          }
        };
      })
    );

    pollsWithResults.sort((a, b) => b.totalVotes - a.totalVotes);

    return pollsWithResults;
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

  async claimAllPendingRewards(userId: string) {
    const pendingVotes = await this.prisma.vote.findMany({
      where: {
        userId,
        rewardClaimed: false,
      },
      select: { id: true },
    });

    if (pendingVotes.length === 0) {
      throw new BadRequestException('No tenés recompensas pendientes para reclamar.');
    }

    const COINS_PER_VOTE = 50;
    const totalCoins = pendingVotes.length * COINS_PER_VOTE;

    const voteIds = pendingVotes.map((v) => v.id);

    await this.prisma.$transaction(async (tx) => {
      await tx.vote.updateMany({
        where: { id: { in: voteIds } },
        data: { rewardClaimed: true },
      });

      await this.walletService.addCoins({
        userId,
        amount: totalCoins,
        type: 'POLL_VOTE',
        description: `Recompensa por participar en ${pendingVotes.length} encuestas`,
      });
    });

    return {
      status: 'success',
      claimedCount: pendingVotes.length,
      coinsAwarded: totalCoins,
      message: `¡Reclamaste ${totalCoins} monedas de ${pendingVotes.length} encuestas con éxito!`,
    };
  }

  async getPendingRewardsCount(userId: string) {
    const count = await this.prisma.vote.count({
      where: {
        userId,
        rewardClaimed: false,
      },
    });
    return { count, potentialCoins: count * 50 };
  }

  async getClosedPolls(page: number = 1, limit: number = 10, userId?: string) {
    const skip = (page - 1) * limit;
    const now = new Date();

    const polls = await this.prisma.poll.findMany({
      where: {
        OR: [
          { status: 'CLOSED' },
          { endsAt: { lt: now } },
        ],
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
        votes: {
          select: { optionId: true, userId: true },
        },
      },
    });

    const history = polls.map((poll) => {
      const rawOptions = poll.options as unknown as { id: number; label: string }[];

      const parsedOptions = rawOptions.map((opt) => {
        const voteCount = poll.votes.filter((v) => v.optionId === opt.id).length;
        return {
          ...opt,
          votes: voteCount,
        };
      });

      const hasVoted = userId ? poll.votes.some((v) => v.userId === userId) : false;

      return {
        id: poll.id,
        title: poll.title,
        description: poll.description,
        icon: poll.icon,
        endsAt: poll.endsAt,
        options: parsedOptions,
        hasVoted,
        totalVotes: poll.votes.length,
      };
    });

    const totalItems = await this.prisma.poll.count({
      where: {
        OR: [
          { status: 'CLOSED' },
          { endsAt: { lt: now } },
        ],
      },
    });

    return {
      data: history,
      meta: {
        total: totalItems,
        page,
        limit,
        totalPages: Math.ceil(totalItems / limit),
      },
    };
  }

  async addComment(pollId: string, userId: string, dto: CreateCommentDto) {

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { activeSubscriptionTier: true }
    });

    const isPremium = user?.activeSubscriptionTier === 'TIER_3';

    return this.prisma.comment.create({
      data: {
        text: dto.text,
        pollId,
        isPremium,
        userId,
      },
      include: {
        user: { select: { username: true, activeChatBubbleId: true } }
      }
    });
  }


  async reactToPoll(pollId: string, userId: string, type: ReactionType) {
    const existingReaction = await this.prisma.pollReaction.findUnique({
      where: { pollId_userId: { pollId, userId } }
    });

    if (existingReaction) {
      if (existingReaction.type === type) {
        await this.prisma.pollReaction.delete({ where: { id: existingReaction.id } });
        return { message: 'Reacción eliminada' };
      } else {
        return this.prisma.pollReaction.update({
          where: { id: existingReaction.id },
          data: { type }
        });
      }
    }

    return this.prisma.pollReaction.create({
      data: { pollId, userId, type }
    });
  }

  async getPollComments(
    pollId: string,
    page: number = 1,
    limit: number = 20,
    currentUserId?: string,
  ) {
    const skip = (page - 1) * limit;

    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId },
      select: { id: true },
    });

    if (!poll) {
      throw new NotFoundException('La encuesta no existe');
    }

    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where: {
          pollId,
          isDeleted: false
        },
        skip,
        take: limit,
        orderBy: [
          { isPremium: 'desc' },
          { createdAt: 'desc' }
        ],
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
          _count: {
            select: { reactions: true },
          },
        },
      }),
      this.prisma.comment.count({
        where: { pollId, isDeleted: false },
      }),
    ]);

    const commentIds = comments.map(c => c.id);

    const reactionCounts = await this.prisma.commentReaction.groupBy({
      by: ['commentId', 'type'],
      where: { commentId: { in: commentIds } },
      _count: { type: true },
    });

    const formattedComments = comments.map((comment) => {
      const { reactions, _count, ...commentData } = comment;

      const likes = reactionCounts.find(r => r.commentId === comment.id && r.type === 'LIKE')?._count.type || 0;
      const dislikes = reactionCounts.find(r => r.commentId === comment.id && r.type === 'DISLIKE')?._count.type || 0;

      return {
        ...commentData,
        likesCount: likes,
        dislikesCount: dislikes,
        userReaction: reactions && reactions.length > 0 ? reactions[0].type : null,
      };
    });

    return {
      data: formattedComments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async reactToComment(commentId: string, userId: string, type: ReactionType) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, isDeleted: true },
    });

    if (!comment || comment.isDeleted) {
      throw new NotFoundException('El comentario no existe o fue eliminado.');
    }

    const existingReaction = await this.prisma.commentReaction.findUnique({
      where: {
        commentId_userId: {
          commentId,
          userId,
        },
      },
    });

    if (existingReaction) {
      if (existingReaction.type === type) {
        await this.prisma.commentReaction.delete({
          where: { id: existingReaction.id },
        });
        return { message: 'Reacción eliminada', userReaction: null };
      }

      const updatedReaction = await this.prisma.commentReaction.update({
        where: { id: existingReaction.id },
        data: { type },
      });
      return { message: 'Reacción actualizada', userReaction: updatedReaction.type };
    }

    const newReaction = await this.prisma.commentReaction.create({
      data: {
        commentId,
        userId,
        type,
      },
    });

    return { message: 'Reacción registrada', userReaction: newReaction.type };
  }
}



