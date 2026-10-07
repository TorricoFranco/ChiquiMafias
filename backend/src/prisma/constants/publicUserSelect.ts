import { Prisma } from '@prisma/client'

export const publicUserSelect = {
  name: true,
  username: true,
  activeNameColorId: true,
  activeBannerId: true,
  activeChatBubbleId: true,
  activeSubscriptionTier: true,
  team: {
    select: {
      id: true,
      name: true,
      badgeUrl: true,
    },
  },
} satisfies Prisma.UserSelect
