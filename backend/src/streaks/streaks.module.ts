import { Module } from '@nestjs/common'
import { StreaksController } from './streaks.controller'
import { StreaksService } from './streaks.service'
import { WalletModule } from 'src/wallet/wallet.module'

@Module({
  imports: [WalletModule],
  controllers: [StreaksController],
  providers: [StreaksService],
})
export class StreaksModule {}
