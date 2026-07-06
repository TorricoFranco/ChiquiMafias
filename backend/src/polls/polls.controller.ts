// src/polls/polls.controller.ts
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Patch,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger'
import { Roles } from '../auth/decorators/roles.decorator'
import { SystemRole } from '../auth/enums/roles.enum'
import { RolesGuard } from '../auth/guards/roles.guard'
import { PollsService } from './polls.service'
import { CreatePollDto } from './dto/create-poll.dto'
import { ClosePollResponseDto } from './dto/close-poll.dto'
import { ProposePollDto } from './dto/propose-poll.dto'
import { ApprovePollDto } from './dto/aprove-poll.dto'
import { GetUser } from 'src/auth/decorators/get-user.decorator'
import { Public } from 'src/auth/decorators/auth.decorator'

@ApiTags('Polls (Encuestas)')
@Controller('polls')
export class PollsController {
  constructor(private readonly pollsService: PollsService) { }

  @Post('propose')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Proponer una encuesta gastando 1 consumible CUSTOM_POLL (CLIENTE)',
  })
  async propose(@Body() dto: ProposePollDto, @GetUser('id') userId: string) {
    return this.pollsService.proposePoll(userId, dto)
  }

  @Patch(':id/approve')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(SystemRole.ADMIN)
  @ApiOperation({
    summary: 'Aprobar y activar una encuesta pendiente (Solo ADMIN)',
  })
  async approve(@Param('id') id: string, @Body() dto: ApprovePollDto) {
    return this.pollsService.approvePoll(id, dto)
  }

  @Patch(':id/reject')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(SystemRole.ADMIN)
  @ApiOperation({
    summary:
      'Rechazar una encuesta pendiente y reembolsar el consumible (Solo ADMIN)',
  })
  async reject(@Param('id') id: string) {
    return this.pollsService.rejectPoll(id)
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(SystemRole.ADMIN)
  @ApiOperation({ summary: 'Crear una nueva encuesta (Solo ADMIN)' })
  @ApiResponse({
    status: 201,
    description: 'La encuesta fue creada exitosamente.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida (Fallo de validaciones DTO o lógica de fechas).',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado (Falta el token JWT o expiró).',
  })
  @ApiResponse({
    status: 403,
    description: 'Prohibido (El usuario no tiene el rol ADMIN).',
  })
  async create(@Body() createPollDto: CreatePollDto) {
    return this.pollsService.createPoll(createPollDto)
  }

  @Get('pending')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(SystemRole.ADMIN)
  @ApiOperation({
    summary: 'Obtener encuestas pendientes de aprobación (Solo ADMIN)',
  })
  async findPending() {
    return this.pollsService.getPendingPolls()
  }

  @Patch(':id/close')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(SystemRole.ADMIN)
  @ApiOperation({
    summary: 'Cerrar manualmente una encuesta activa (Solo ADMIN)',
  })
  @ApiResponse({
    status: 200,
    description:
      'La encuesta fue cerrada exitosamente y se programó la expiración en caché.',
    type: ClosePollResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'La encuesta ya está cerrada o no se puede modificar.',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado (Falta token o expiró).',
  })
  @ApiResponse({
    status: 403,
    description: 'Prohibido (Se requiere rol ADMIN).',
  })
  @ApiResponse({
    status: 404,
    description: 'La encuesta solicitada no existe.',
  })
  async closePoll(@Param('id') id: string) {
    return this.pollsService.closePollManually(id)
  }
  @Get()
  @ApiOperation({
    summary: 'Obtener todas las encuestas registradas (Público)',
  })
  @ApiResponse({ status: 200, description: 'Listado devuelto con éxito.' })
  async findPolls() {
    return this.pollsService.getFindPolls()
  }

  @Get('active')
  @Public()
  @ApiOperation({
    summary: 'Obtener encuestas que estén actualmente activas (Público)',
  })
  async findActive() {
    return this.pollsService.getActivePolls()
  }

  @Get(':id')
  @Public()
  @ApiOperation({
    summary:
      'Obtener el detalle de una encuesta específica junto a sus resultados reales (Público)',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalle de la encuesta con conteo de votos de Redis.',
  })
  @ApiResponse({ status: 404, description: 'Encuesta no encontrada.' })
  async findOne(@Param('id') id: string) {
    return this.pollsService.getPollWithResults(id)
  }
}
