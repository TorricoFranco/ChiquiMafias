import { Module } from '@nestjs/common'
import { DiscordService } from './discord.service'
import { DiscordController } from './discord.controller'
import { SupportModule } from 'src/support/support.module'

@Module({
  providers: [DiscordService],
  controllers: [DiscordController],
  imports: [SupportModule],
})
export class DiscordModule {}
