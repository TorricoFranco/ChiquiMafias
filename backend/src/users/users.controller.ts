import { Controller, Get, Patch, Param, Body, Req, Put } from '@nestjs/common'
import { UserBalanceResponse, UsersService } from './users.service'
import { CompleteProfileDto } from './dto/complete-profile.dto'
import { ChatService } from 'src/chat/chat.service'
import { ChatClient } from 'src/chat/interfaces/ChatClient'
import { SystemRole } from 'src/auth/enums/roles.enum'
import { OptionalAuth, Public } from 'src/auth/decorators/auth.decorator'

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly chatService: ChatService,
  ) {}

  @Get()
  async findAll() {
    return this.usersService.findAll()
  }

  @Patch(':id/role')
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
  async banUser(@Param('id') id: string) {
    return this.usersService.banUser(id)
  }

  @Patch(':id/unban')
  async unbanUser(@Param('id') id: string) {
    return this.usersService.unbanUser(id)
  }

  @Get('online')
  @OptionalAuth()
  getOnlineClients(): ChatClient[] {
    return this.chatService.getConnectedClients()
  }

  @Get('test/all-balances')
  @Public()
  async getAllBalances(): Promise<UserBalanceResponse[]> {
    return this.usersService.getAllUsersBalances()
  }
}
