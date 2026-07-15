import { Module } from '@nestjs/common'
import { BetsController } from './bets.controller'
import { BetsService } from './bets.service'
import { WalletModule } from '../wallet/wallet.module'
import { BetsGateway } from './bets.gateway'
import { ChatModule } from 'src/chat/chat.module'
import { AuthModule } from 'src/auth/auth.module'
import { BullModule } from '@nestjs/bullmq'
import { BetsProcessor } from './bets.processor'
@Module({
  controllers: [BetsController],
  providers: [BetsService, BetsGateway, BetsProcessor],
  imports: [
    BullModule.registerQueue({
      name: 'bets-queue',
    }),
    WalletModule,
    ChatModule,
    AuthModule,
  ],
})
export class BetsModule { }
