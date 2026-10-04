import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Put,
  UseGuards,
  Query,
  Req
} from '@nestjs/common'
import { UsersService } from './users.service'
import { CompleteProfileDto } from './dto/complete-profile.dto'
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

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly chatService: ChatService,
  ) { }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(SystemRole.MODERATOR)
  async findAll(@Query() query: GetUsersQueryDto) {
    return this.usersService.findAll(query)
  }

  @Get('balances')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.MODERATOR)
  async getAllBalances() {
    return this.usersService.getAllUsersBalances()
  }

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

  @Put('complete-profile')
  async completeProfile(
    @GetUser('id') userId: string,
    @Body() dto: CompleteProfileDto,
  ) {
    return this.usersService.completeProfile(userId, dto)
  }

  @Patch('update-profile')
  async updateProfile(
    @GetUser('id') userId: string,
    @Body() dto: Partial<CompleteProfileDto>,
  ) {
    return this.usersService.updateProfile(userId, dto)
  }

  @Patch(':id/ban')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.MODERATOR)
  async banUser(@Param('id') id: string) {
    return this.usersService.banUser(id)
  }

  @Patch(':id/unban')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.MODERATOR)
  async unbanUser(@Param('id') id: string) {
    return this.usersService.unbanUser(id)
  }

  @Get('online')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.MODERATOR)
  getOnlineClients(): ChatClient[] {
    return this.chatService.getConnectedClients()
  }

  @Get(':id/public-profile')
  @OptionalAuth()
  async getPublicProfile(@Param('id') id: string) {
    return this.usersService.getPublicProfile(id)
  }

}
