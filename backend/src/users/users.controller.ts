import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Req,
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

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly chatService: ChatService,
  ) { }

  @Get()
  async findAll() {
    return this.usersService.findAll()
  }

  @Patch(':id/role')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.ADMIN)
  async updateRole(@Param('id') id: string, @Body('role') role: SystemRole) {
    return this.usersService.updateRole(id, role)
  }

  @Put('complete-profile')
  async completeProfile(@Req() req: any, @Body() dto: CompleteProfileDto) {
    const userId = req.user.id
    return this.usersService.completeProfile(userId, dto)
  }

  @Patch('update-profile')
  async updateProfile(
    @Req() req: any,
    @Body() dto: Partial<CompleteProfileDto>,
  ) {
    const userId = req.user.id
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
  @Public()
  async getAllBalances(): Promise<UserBalanceResponse[]> {
    return this.usersService.getAllUsersBalances()
  }
}
