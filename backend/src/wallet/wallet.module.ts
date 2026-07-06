import { Module } from '@nestjs/common'
import { WalletService } from './wallet.service'
import { WalletController } from './wallet.controller'
import { ChatModule } from 'src/chat/chat.module'

@Module({
  imports: [ChatModule],
  providers: [WalletService],
  controllers: [WalletController],
  exports: [WalletService],
})
export class WalletModule {}
