import { Body, Controller } from '@nestjs/common'
import { Post } from '@nestjs/common'
import { AuthService } from './auth.service'

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('google')
  async google(@Body('credential') credential: string) {
    return {
      token: await this.authService.googleLogin(credential),
    }
  }
}
