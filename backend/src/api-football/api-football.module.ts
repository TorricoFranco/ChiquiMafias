import { Module } from '@nestjs/common'
import { ApiFootballHttp } from './http/api-football.http'
import { ApiFootballFixturesService } from './fixtures/fixtures.service'
import { ApiFootballFixturesController } from './fixtures/fixtures.controller'

@Module({
  controllers: [ApiFootballFixturesController],
  providers: [ApiFootballHttp, ApiFootballFixturesService],
  exports: [ApiFootballFixturesService],
})
export class ApiFootballModule {}
