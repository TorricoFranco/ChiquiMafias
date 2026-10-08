import { Controller, Get } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { TeamsService } from './teams.service'

@ApiTags('Teams (Equipos)')
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @ApiOperation({
    summary:
      'Listar equipos seleccionables para el selector de equipo favorito',
  })
  @ApiResponse({ status: 200, description: 'Lista de equipos.' })
  @Get()
  async getTeams() {
    return this.teamsService.findSelectorTeams()
  }
}
