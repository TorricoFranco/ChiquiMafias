import { Controller, Get } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { AppService } from './app.service'
import { Public } from './auth/decorators/auth.decorator'

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiOperation({ summary: 'Chequeo de salud básico de la API' })
  @ApiResponse({ status: 200, description: 'La API está arriba.' })
  @Public()
  @Get()
  getHello() {
    return this.appService.getHello()
  }
}
