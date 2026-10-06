import { Get, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { StreaksService } from './streaks.service'
import { GetUser } from 'src/auth/decorators/get-user.decorator'

@ApiTags('Streaks (Racha diaria)')
@ApiBearerAuth()
@Controller('subscriptions/streak')
export class StreaksController {
  constructor(private readonly streaksService: StreaksService) {}

  @ApiOperation({
    summary: 'Registrar el check-in diario automático',
    description:
      'Se llama al entrar a la app; registra el día de racha si todavía no se hizo check-in hoy. No otorga la recompensa: eso lo hace `claim`.',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado de la racha tras el check-in.',
  })
  @Post('check-in')
  @HttpCode(HttpStatus.OK)
  async checkIn(@GetUser('id') userId: string) {
    return await this.streaksService.handleAutoCheckIn(userId)
  }

  @ApiOperation({
    summary: 'Reclamar la recompensa de monedas del día de racha',
    description:
      'Acredita las monedas correspondientes al día actual de la racha. La cantidad depende del tier de suscripción del usuario (FREE u otro).',
  })
  @ApiResponse({ status: 200, description: 'Recompensa acreditada.' })
  @ApiResponse({
    status: 400,
    description:
      'La recompensa del día ya fue reclamada o no hay check-in previo.',
  })
  @Post('claim')
  @HttpCode(HttpStatus.OK)
  async claimReward(
    @GetUser('id') userId: string,
    @GetUser('tier') userTier: string,
  ) {
    const tier = userTier || 'FREE'
    return await this.streaksService.claimDailyReward(userId, tier)
  }

  @ApiOperation({
    summary: 'Línea de tiempo de la racha del usuario',
    description:
      'Devuelve el historial/calendario de días de racha y qué recompensa corresponde a cada uno según el tier del usuario.',
  })
  @ApiResponse({ status: 200, description: 'Timeline de la racha.' })
  @Get('timeline')
  async getTimeline(
    @GetUser('id') userId: string,
    @GetUser('tier') userTier: string,
  ) {
    const tier = userTier || 'FREE'
    return await this.streaksService.getStreakTimeline(userId, tier)
  }
}
