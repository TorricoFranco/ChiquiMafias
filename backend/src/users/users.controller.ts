import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Put,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { UsersService } from './users.service'
import { CompleteProfileDto } from './dto/complete-profile.dto'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { ChatService } from 'src/chat/chat.service'
import { ChatClient } from 'src/chat/interfaces/ChatClient'
import { SystemRole } from 'src/auth/enums/roles.enum'
import { OptionalAuth } from 'src/auth/decorators/auth.decorator'
import { Roles } from 'src/auth/decorators/roles.decorator'
import { RolesGuard } from 'src/auth/guards/roles.guard'
import { GetUser } from 'src/auth/decorators/get-user.decorator'
import { UpdateRoleDto } from './dto/update-role.dto'
import { GetUsersQueryDto } from './dto/get-users-query.dto'
import type { ActiveUser } from 'src/auth/interfaces/active-user.interface'

@ApiTags('Users (Usuarios)')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly chatService: ChatService,
  ) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar usuarios paginados (solo MODERATOR+)' })
  @ApiResponse({ status: 200, description: 'Lista paginada de usuarios.' })
  @Get()
  @UseGuards(RolesGuard)
  @Roles(SystemRole.MODERATOR)
  async findAll(@Query() query: GetUsersQueryDto) {
    return this.usersService.findAll(query)
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Listar el saldo de monedas de todos los usuarios (solo MODERATOR+)',
    description:
      'Endpoint sensible: expone el balance de wallet de todos los usuarios de la plataforma.',
  })
  @ApiResponse({ status: 200, description: 'Lista de usuarios con su saldo.' })
  @Get('balances')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.MODERATOR)
  async getAllBalances() {
    return this.usersService.getAllUsersBalances()
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cambiar el rol de otro usuario (solo MODERATOR+)',
    description:
      'No se puede modificar el propio rol, ni el de un usuario de igual o mayor jerarquía que el actor, ni asignar un rol superior al del actor (jerarquía USER < MODERATOR < ADMIN < PRESIDENT).',
  })
  @ApiParam({ name: 'id', description: 'ID del usuario objetivo' })
  @ApiResponse({ status: 200, description: 'Rol actualizado.' })
  @ApiResponse({
    status: 403,
    description:
      'El actor no tiene permisos suficientes sobre el objetivo o el rol solicitado.',
  })
  @ApiResponse({ status: 404, description: 'El usuario objetivo no existe.' })
  @Patch(':id/role')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.MODERATOR)
  async updateRole(
    @Param('id') targetUserId: string,
    @Body() dto: UpdateRoleDto,
    @GetUser() currentUser: ActiveUser,
  ) {
    return this.usersService.updateRole(currentUser, targetUserId, dto.role)
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Completar el perfil tras el primer login (username + equipo)',
  })
  @ApiResponse({ status: 200, description: 'Perfil completado.' })
  @ApiResponse({ status: 409, description: 'El username ya está en uso.' })
  @Put('complete-profile')
  async completeProfile(
    @GetUser('id') userId: string,
    @Body() dto: CompleteProfileDto,
  ) {
    return this.usersService.completeProfile(userId, dto)
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Actualizar parcialmente el perfil del usuario logueado',
  })
  @ApiResponse({ status: 200, description: 'Perfil actualizado.' })
  @ApiResponse({ status: 409, description: 'El username ya está en uso.' })
  @Patch('update-profile')
  async updateProfile(
    @GetUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto)
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Banear a un usuario (solo MODERATOR+)' })
  @ApiParam({ name: 'id', description: 'ID del usuario a banear' })
  @ApiResponse({ status: 200, description: 'Usuario baneado.' })
  @ApiResponse({
    status: 403,
    description: 'El actor no tiene permisos sobre el objetivo.',
  })
  @ApiResponse({ status: 404, description: 'El usuario no existe.' })
  @Patch(':id/ban')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.MODERATOR)
  async banUser(@Param('id') id: string, @GetUser() currentUser: ActiveUser) {
    return this.usersService.banUser(currentUser, id)
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Desbanear a un usuario (solo MODERATOR+)' })
  @ApiParam({ name: 'id', description: 'ID del usuario a desbanear' })
  @ApiResponse({ status: 200, description: 'Usuario desbaneado.' })
  @ApiResponse({ status: 404, description: 'El usuario no existe.' })
  @Patch(':id/unban')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.MODERATOR)
  async unbanUser(@Param('id') id: string, @GetUser() currentUser: ActiveUser) {
    return this.usersService.unbanUser(currentUser, id)
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Listar los clientes de chat conectados actualmente (solo MODERATOR+)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de clientes de chat conectados.',
  })
  @Get('online')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.MODERATOR)
  getOnlineClients(): ChatClient[] {
    return this.chatService.getConnectedClients()
  }

  @ApiOperation({ summary: 'Perfil público de un usuario' })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  @ApiResponse({ status: 200, description: 'Perfil público del usuario.' })
  @ApiResponse({ status: 404, description: 'El usuario no existe.' })
  @Get(':id/public-profile')
  @OptionalAuth()
  async getPublicProfile(@Param('id') id: string) {
    return this.usersService.getPublicProfile(id)
  }
}
