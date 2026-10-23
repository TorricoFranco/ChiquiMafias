import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { GetUser } from 'src/auth/decorators/get-user.decorator'
import { Roles } from 'src/auth/decorators/roles.decorator'
import { SystemRole } from 'src/auth/enums/roles.enum'
import { RolesGuard } from 'src/auth/guards/roles.guard'
import { CompetitionsService } from 'src/competitions/competitions.service'
import { BracketAdminService } from './bracket-admin.service'
import {
  ClearCorrectionDto,
  CorrectSlotDto,
  LoadDrawDto,
} from './dto/bracket-admin.dto'

@ApiTags('Cuadro (administración — solo PRESIDENT)')
@ApiBearerAuth()
@Controller('admin/competitions/:slug/bracket')
// A nivel clase: toda ruta nueva nace restringida al presidente.
@UseGuards(RolesGuard)
@Roles(SystemRole.PRESIDENT)
@Throttle({ default: { limit: 20, ttl: 60000 } })
export class BracketAdminController {
  constructor(
    private readonly admin: BracketAdminService,
    private readonly competitions: CompetitionsService,
  ) {}

  @Post('draw')
  @ApiOperation({
    summary: 'Cargar el sorteo de la temporada actual (solo PRESIDENT)',
    description:
      'Los cruces de la primera ronda en el orden oficial. Si un dato no valida (cantidad, equipos, partidos), no se carga nada. Reemplaza el sorteo anterior y queda auditado.',
  })
  @ApiParam({ name: 'slug', example: 'copa-argentina' })
  @ApiResponse({
    status: 201,
    description: 'Sorteo cargado y cuadro rearmado.',
  })
  @ApiResponse({
    status: 400,
    description: 'Sorteo inválido, con la lista de errores.',
  })
  @ApiResponse({ status: 403, description: 'El usuario no es presidente.' })
  async loadDraw(
    @GetUser('id') actorId: string,
    @Param('slug') slug: string,
    @Body() dto: LoadDrawDto,
  ) {
    const competition = await this.competitions.resolveCurrent(slug)
    const data = await this.admin.loadDraw(actorId, competition, dto.firstRound)
    return { status: 'success', message: 'Sorteo cargado', data }
  }

  @Patch('slots/:round/:position')
  @ApiOperation({
    summary: 'Corregir una llave (solo PRESIDENT)',
    description:
      'Equipos y ganador de la llave. La sincronización deja de pisarla y su ganador avanza. Queda auditado con el motivo.',
  })
  @ApiParam({
    name: 'round',
    example: 6,
    description: '1 = primera ronda … final',
  })
  @ApiParam({ name: 'position', example: 1 })
  async correctSlot(
    @GetUser('id') actorId: string,
    @Param('slug') slug: string,
    @Param('round', ParseIntPipe) round: number,
    @Param('position', ParseIntPipe) position: number,
    @Body() dto: CorrectSlotDto,
  ) {
    const competition = await this.competitions.resolveCurrent(slug)
    const data = await this.admin.correctSlot(
      actorId,
      competition,
      round,
      position,
      dto,
    )
    return { status: 'success', message: 'Llave corregida', data }
  }

  @Delete('slots/:round/:position/correction')
  @ApiOperation({
    summary: 'Quitar la corrección de una llave (solo PRESIDENT)',
    description: 'La llave vuelve a salir de los partidos. Queda auditado.',
  })
  async clearCorrection(
    @GetUser('id') actorId: string,
    @Param('slug') slug: string,
    @Param('round', ParseIntPipe) round: number,
    @Param('position', ParseIntPipe) position: number,
    @Body() dto: ClearCorrectionDto,
  ) {
    const competition = await this.competitions.resolveCurrent(slug)
    const data = await this.admin.clearCorrection(
      actorId,
      competition,
      round,
      position,
      dto.reason,
    )
    return { status: 'success', message: 'Corrección quitada', data }
  }

  @Get('changes')
  @ApiOperation({
    summary: 'Historial de cambios del cuadro (solo PRESIDENT)',
    description: 'Los últimos 50: sorteos cargados y llaves corregidas.',
  })
  async changes(@GetUser('id') actorId: string, @Param('slug') slug: string) {
    const competition = await this.competitions.resolveCurrent(slug)
    const data = await this.admin.changes(actorId, competition)
    return { status: 'success', message: 'Cambios del cuadro', data }
  }
}
