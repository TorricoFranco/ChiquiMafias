import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Patch,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
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
import { OptionalAuth } from 'src/auth/decorators/auth.decorator'
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard'
import { CreateCommentDto } from './dto/create-comment.dto'
import { ReactDto } from './dto/reaction.dto'

@ApiTags('Polls (Encuestas)')
@Controller('polls')
export class PollsController {
  constructor(private readonly pollsService: PollsService) {}

  @ApiOperation({ summary: 'Historial paginado de encuestas cerradas' })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Número de página (default 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Resultados por página (default 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de encuestas cerradas.',
  })
  @Get('history')
  async getHistory(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @GetUser('id') userId: string,
  ) {
    const pageNum = parseInt(page, 10) || 1
    const limitNum = parseInt(limit, 10) || 10

    return this.pollsService.getClosedPolls(pageNum, limitNum, userId)
  }

  @Post('propose')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Proponer una encuesta gastando 1 consumible CUSTOM_POLL (CLIENTE)',
  })
  @ApiResponse({
    status: 201,
    description: 'Encuesta propuesta, queda pendiente de aprobación.',
  })
  @ApiResponse({
    status: 400,
    description: 'El usuario no tiene el consumible CUSTOM_POLL disponible.',
  })
  async propose(@Body() dto: ProposePollDto, @GetUser('id') userId: string) {
    return this.pollsService.proposePoll(userId, dto)
  }

  @Patch(':id/approve')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(SystemRole.MODERATOR)
  @ApiOperation({
    summary: 'Aprobar y activar una encuesta pendiente (Solo MODERATOR+)',
  })
  @ApiParam({ name: 'id', description: 'ID de la encuesta pendiente' })
  @ApiResponse({ status: 200, description: 'Encuesta aprobada y activada.' })
  @ApiResponse({
    status: 404,
    description: 'La encuesta no existe o no está pendiente.',
  })
  async approve(@Param('id') id: string, @Body() dto: ApprovePollDto) {
    return this.pollsService.approvePoll(id, dto)
  }

  @Patch(':id/reject')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(SystemRole.MODERATOR)
  @ApiOperation({
    summary:
      'Rechazar una encuesta pendiente y reembolsar el consumible (Solo MODERATOR+)',
  })
  @ApiParam({ name: 'id', description: 'ID de la encuesta pendiente' })
  @ApiResponse({
    status: 200,
    description: 'Encuesta rechazada y consumible reembolsado.',
  })
  @ApiResponse({
    status: 404,
    description: 'La encuesta no existe o no está pendiente.',
  })
  async reject(@Param('id') id: string) {
    return this.pollsService.rejectPoll(id)
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(SystemRole.MODERATOR)
  @ApiOperation({ summary: 'Crear una nueva encuesta (Solo MODERATOR+)' })
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
    description: 'Prohibido (el usuario no tiene rol MODERATOR o superior).',
  })
  async create(@Body() createPollDto: CreatePollDto) {
    return this.pollsService.createPoll(createPollDto)
  }

  @Get('pending')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(SystemRole.MODERATOR)
  @ApiOperation({
    summary: 'Obtener encuestas pendientes de aprobación (Solo MODERATOR+)',
  })
  @ApiResponse({ status: 200, description: 'Lista de encuestas pendientes.' })
  async findPending() {
    return this.pollsService.getPendingPolls()
  }

  @Patch(':id/close')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(SystemRole.MODERATOR)
  @ApiOperation({
    summary: 'Cerrar manualmente una encuesta activa (Solo MODERATOR+)',
  })
  @ApiParam({ name: 'id', description: 'ID de la encuesta a cerrar' })
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
    description: 'Prohibido (se requiere rol MODERATOR o superior).',
  })
  @ApiResponse({
    status: 404,
    description: 'La encuesta solicitada no existe.',
  })
  async closePoll(@Param('id') id: string) {
    return this.pollsService.closePollManually(id)
  }

  @Get('active')
  @OptionalAuth()
  @ApiOperation({
    summary:
      'Obtener encuestas que estén actualmente activas (Público / Autenticado)',
  })
  async findActive(@GetUser('id') userId?: string) {
    return this.pollsService.getActivePolls(userId)
  }

  @Get(':id/comments')
  @OptionalAuth()
  @ApiOperation({ summary: 'Obtener comentarios de una encuesta (Paginados)' })
  @ApiParam({ name: 'id', description: 'ID de la encuesta' })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Número de página (default 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Resultados por página (default 20)',
  })
  @ApiResponse({ status: 200, description: 'Lista paginada de comentarios.' })
  async getComments(
    @Param('id') pollId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.pollsService.getPollComments(
      pollId,
      Number(page),
      Number(limit),
    )
  }

  @Get('rewards/pending')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Obtiene la cantidad de encuestas votadas sin reclamar',
  })
  @ApiResponse({
    status: 200,
    description: 'Cantidad de recompensas pendientes de reclamo.',
  })
  async getPendingRewards(@GetUser('id') userId: string) {
    return await this.pollsService.getPendingRewardsCount(userId)
  }

  @Post(':id/comments')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Comentar en una encuesta' })
  @ApiParam({ name: 'id', description: 'ID de la encuesta' })
  @ApiResponse({ status: 201, description: 'Comentario creado.' })
  @ApiResponse({ status: 404, description: 'La encuesta no existe.' })
  async addComment(
    @Param('id') pollId: string,
    @GetUser('id') userId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.pollsService.addComment(pollId, userId, dto)
  }

  @Post(':id/react')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Dar Like o Dislike a una encuesta' })
  @ApiParam({ name: 'id', description: 'ID de la encuesta' })
  @ApiResponse({
    status: 201,
    description: 'Reacción registrada o actualizada.',
  })
  async reactToPoll(
    @Param('id') pollId: string,
    @GetUser('id') userId: string,
    @Body() dto: ReactDto,
  ) {
    return this.pollsService.reactToPoll(pollId, userId, dto.type)
  }

  @Post('comments/:commentId/react')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Dar Like o Dislike a un comentario' })
  @ApiParam({ name: 'commentId', description: 'ID del comentario' })
  @ApiResponse({
    status: 201,
    description: 'Reacción registrada o actualizada.',
  })
  async reactToComment(
    @Param('commentId') commentId: string,
    @GetUser('id') userId: string,
    @Body() dto: ReactDto,
  ) {
    return this.pollsService.reactToComment(commentId, userId, dto.type)
  }

  @Post('rewards/claim-all')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Reclama las monedas de todas las encuestas votadas pendientes de reclamo',
  })
  @ApiResponse({
    status: 200,
    description: 'Monedas acreditadas por las recompensas reclamadas.',
  })
  async claimAllRewards(@GetUser('id') userId: string) {
    return await this.pollsService.claimAllPendingRewards(userId)
  }
}
