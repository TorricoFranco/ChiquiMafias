import { Module } from '@nestjs/common'
import { CompetitionsService } from './competitions.service'

/**
 * Solo el servicio que resuelve competiciones: lo importan fixture, tabla y
 * partidos. Las rutas `/competitions` están en `CompetitionsApiModule`, que a su
 * vez usa esos módulos (así no hay dependencia circular).
 */
@Module({
  providers: [CompetitionsService],
  exports: [CompetitionsService],
})
export class CompetitionsModule {}
