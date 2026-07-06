import { Controller, Get, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { CloudinaryService } from './cloudinary.service'

@ApiTags('Uploads (Archivos y Multimedia)')
@ApiBearerAuth()
@Controller('uploads')
export class CloudinaryController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Get('signature')
  @ApiOperation({
    summary: 'Obtener firma criptográfica para subida directa a Cloudinary',
  })
  getSignature(@Query('folder') folder?: string) {
    const targetFolder = folder || 'general'
    return this.cloudinaryService.generateSignature(targetFolder)
  }
}
