import {
  Controller,
  Patch,
  Body,
  UseGuards,
  Req,
  Get,
  Delete,
  Query,
} from '@nestjs/common'
import { UsersService } from './users.service'
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard' // Tu guard de JWT
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard'

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard) // Solo usuarios logueados
  @Patch('complete-profile')
  async completeProfile(
    @Req() req: any,
    @Body() body: { username: string; team: string },
  ) {
    // El 'sub' es el ID que guardamos en el token dentro del AuthService
    console.log('req. user', req.user)
    const userId = req.user.id

    return await this.usersService.completeProfile(userId, body)
  }

  @Get()
  async getAllUsers() {
    return this.usersService.findAll()
  }

  @Delete()
  deleteUser(@Query('user') user: string) {
    return this.usersService.deleteById(user)
  }
}
