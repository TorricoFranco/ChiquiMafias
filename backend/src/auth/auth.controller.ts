import {
  Body,
  Post,
  Controller,
  Res,
  Req,
  UnauthorizedException,
} from '@nestjs/common'
import { AuthService } from './auth.service'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { GoogleLoginDto } from './dto/input/google-login.dto'
import * as express from 'express'
import { Public } from './decorators/auth.decorator'
import { ConfigService } from '@nestjs/config'
import { EnvironmentVariables } from 'src/config/interfaces/env.interface'
import { Throttle } from '@nestjs/throttler';

@ApiTags('Auth (Autenticación)')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService<EnvironmentVariables>,
  ) { }

  private get cookieOptions() {
    // const isProduction = this.configService.get('NODE_ENV', { infer: true }) === 'production';
    const isProduction = false;

    const options = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? ('none' as const) : ('lax' as const),
      domain: isProduction ? '.chiquimafias.com' : undefined,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    }
    return options
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Public()
  @Post('google')
  @ApiOperation({ summary: 'Iniciar sesión o Registrarse con Google' })
  async google(
    @Body() googleLoginDto: GoogleLoginDto,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const { accessToken, refreshToken, user } =
      await this.authService.googleLogin(googleLoginDto.credential)

    res.cookie('refresh_token', refreshToken, this.cookieOptions)

    return { access_token: accessToken, user }
  }

  @Post('refresh')
  @Public()
  @ApiOperation({ summary: 'Refrescar Access Token usando Cookie HttpOnly' })
  async refresh(
    @Req() req: express.Request,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const incomingRefreshToken = req.cookies['refresh_token']

    if (!incomingRefreshToken) {
      throw new UnauthorizedException('No hay token de refresco')
    }

    const { accessToken, refreshToken, user } =
      await this.authService.refreshTokens(incomingRefreshToken)

    res.cookie('refresh_token', refreshToken, this.cookieOptions)

    return { access_token: accessToken, user }
  }

  @Post('logout')
  @Public()
  @ApiOperation({ summary: 'Cerrar sesión limpiando cookies y base de datos' })
  async logout(
    @Req() req: express.Request,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const incomingRefreshToken = req.cookies['refresh_token']

    if (incomingRefreshToken) {
      await this.authService.logout(incomingRefreshToken)
    }

    res.clearCookie('refresh_token', { ...this.cookieOptions, maxAge: 0 })

    return { status: 'ok', message: 'Sesión cerrada limpiamente, sese' }
  }

  // AAAAAAAAAAAAAAAAA
  @Post('dev-login')
  @Public()
  @ApiOperation({ summary: '[DEV] Login solo con email' })
  async devLogin(
    @Body('email') email: string,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const { accessToken, refreshToken, user } =
      await this.authService.devLoginByEmail(email)
    res.cookie('refresh_token', refreshToken, this.cookieOptions)

    return { access_token: accessToken, user }
  }
}
