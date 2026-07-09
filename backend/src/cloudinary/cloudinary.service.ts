import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { v2 as cloudinary } from 'cloudinary'
import { randomUUID } from 'crypto'
import { EnvironmentVariables } from 'src/config/interfaces/env.interface'

@Injectable()
export class CloudinaryService {
  constructor(
    private readonly configService: ConfigService<EnvironmentVariables>,
  ) {
    cloudinary.config({
      cloud_name: this.configService.get('CLOUDINARY_CLOUD_NAME', {
        infer: true,
      }),
      api_key: this.configService.get('CLOUDINARY_API_KEY', { infer: true }),
      api_secret: this.configService.get('CLOUDINARY_API_SECRET', {
        infer: true,
      }),
    })
  }

  generateSignature(folderName: string = 'support_tickets') {
    const apiSecret = this.configService.get('CLOUDINARY_API_SECRET', {
      infer: true,
    })!

    const timestamp = Math.round(new Date().getTime() / 1000)
    const publicId = `ticket_${randomUUID()}`
    const uploadPreset = 'support_tickets_preset'
    const allowedFormats = 'png,jpg,jpeg,webp'

    const paramsToSign = {
      timestamp: timestamp,
      folder: folderName,
      public_id: publicId,
      upload_preset: uploadPreset,
      allowed_formats: allowedFormats,
    }

    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret)

    return {
      timestamp,
      signature,
      cloudName: this.configService.get('CLOUDINARY_CLOUD_NAME', {
        infer: true,
      }),
      apiKey: this.configService.get('CLOUDINARY_API_KEY', { infer: true }),
      folder: folderName,
      publicId,
      uploadPreset,
      allowedFormats,
    }
  }
}
