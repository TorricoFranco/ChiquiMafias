import { Module } from '@nestjs/common'
import { CompetitionsModule } from 'src/competitions/competitions.module'
import { BracketAdminController } from './bracket-admin.controller'
import { BracketAdminService } from './bracket-admin.service'
import { BracketService } from './bracket.service'

/** Cuadro de las competiciones de eliminación directa y su administración. */
@Module({
  imports: [CompetitionsModule],
  controllers: [BracketAdminController],
  providers: [BracketService, BracketAdminService],
  exports: [BracketService],
})
export class BracketModule {}
