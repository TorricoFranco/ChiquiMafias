import {
  User,
  SystemRole,
  UserStatus,
  SubscriptionTier,
  FootballTeam,
} from '@prisma/client'
import { Exclude } from 'class-transformer'
import { ApiProperty } from '@nestjs/swagger'

export class UserEntity implements User {
  id: string
  name: string
  email: string
  username: string | null
  isFirstLogin: boolean
  status: UserStatus
  mutedUntil: Date | null
  role: SystemRole
  activeSubscriptionTier: SubscriptionTier | null
  currentStreak: number
  lastCheckIn: Date | null
  streakRewardClaimed: boolean
  activeNameColorId: string | null
  activeBannerId: string | null
  createdAt: Date
  teamId: string | null

  @ApiProperty({ type: () => Object, nullable: true })
  team?: FootballTeam | null

  @Exclude()
  hashedRefreshToken: string | null

  @Exclude()
  googleId: string

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial)
  }
}
