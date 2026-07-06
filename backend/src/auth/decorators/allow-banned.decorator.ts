import { SetMetadata } from '@nestjs/common'

export const ALLOW_BANNED_KEY = 'allowBanned'
export const AllowBannedForAppeal = () => SetMetadata(ALLOW_BANNED_KEY, true)
