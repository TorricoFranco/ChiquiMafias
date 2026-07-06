import { Module } from '@nestjs/common'
import { BetsController } from './bets.controller'
import { BetsService } from './bets.service'
import { WalletModule } from '../wallet/wallet.module'
import { BetsGateway } from './bets.gateway'
import { ChatModule } from 'src/chat/chat.module'

@Module({
  controllers: [BetsController],
  providers: [BetsService, BetsGateway],
  imports: [WalletModule, ChatModule],
})
export class BetsModule { }
