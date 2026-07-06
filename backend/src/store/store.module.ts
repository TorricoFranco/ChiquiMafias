import { Module } from '@nestjs/common'
import { StoreController } from './store.controller'
import { StoreService } from './store.service'
import { WalletModule } from '../wallet/wallet.module'
import { ChatModule } from 'src/chat/chat.module'

@Module({
  controllers: [StoreController],
  providers: [StoreService],
  imports: [WalletModule, ChatModule],
})
export class StoreModule { }
