import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Put,
  UseGuards,
} from '@nestjs/common'
import { UserBalanceResponse, UsersService } from './users.service'
import { CompleteProfileDto } from './dto/complete-profile.dto'
import { ChatService } from 'src/chat/chat.service'
import { ChatClient } from 'src/chat/interfaces/ChatClient'
import { SystemRole } from 'src/auth/enums/roles.enum'
import { OptionalAuth, Public } from 'src/auth/decorators/auth.decorator'
import { Roles } from 'src/auth/decorators/roles.decorator'
import { RolesGuard } from 'src/auth/guards/roles.guard'
import { GetUser } from 'src/auth/decorators/get-user.decorator'
import { UpdateRoleDto } from './dto/update-role.dto'

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly chatService: ChatService,
  ) { }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(SystemRole.ADMIN)
  async findAll() {
    return this.usersService.findAll()
  }

  @Patch(':id/role')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.ADMIN)
  async updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.usersService.updateRole(id, dto.role)
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
  @Roles(SystemRole.ADMIN)
  async banUser(@Param('id') id: string) {
    return this.usersService.banUser(id)
  }

  @Patch(':id/unban')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.ADMIN)
  async unbanUser(@Param('id') id: string) {
    return this.usersService.unbanUser(id)
  }

  @Get('online')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.ADMIN)
  @OptionalAuth()
  getOnlineClients(): ChatClient[] {
    return this.chatService.getConnectedClients()
  }

  @Get('test/all-balances')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.ADMIN)
  async getAllBalances(): Promise<UserBalanceResponse[]> {
    return this.usersService.getAllUsersBalances()
  }
}
