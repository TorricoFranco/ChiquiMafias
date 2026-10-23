import { Module } from '@nestjs/common'
import { BracketService } from './bracket.service'

/** Cuadro de las competiciones de eliminación directa. */
@Module({
  providers: [BracketService],
  exports: [BracketService],
})
export class BracketModule {}
