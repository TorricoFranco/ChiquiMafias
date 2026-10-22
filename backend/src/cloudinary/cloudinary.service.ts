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

  /**
   * Copia a Cloudinary una imagen pública (por ejemplo, el escudo que da el
   * proveedor de datos) y devuelve su URL. El `publicId` fijo hace que volver a
   * subirla la reemplace en vez de duplicarla.
   */
  async uploadRemoteImage(
    url: string,
    folder: string,
    publicId: string,
  ): Promise<string> {
    if (!url.startsWith('https://')) {
      throw new Error(`Solo se copian imágenes por https: ${url}`)
    }
    const result = await cloudinary.uploader.upload(url, {
      folder,
      public_id: publicId,
      overwrite: true,
      resource_type: 'image',
      allowed_formats: ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'],
    })
    return result.secure_url
  }

  /** true si la URL ya es una imagen de nuestra cuenta de Cloudinary. */
  isHostedUrl(url: string | null | undefined): boolean {
    const cloudName = this.configService.get('CLOUDINARY_CLOUD_NAME', {
      infer: true,
    })
    return !!url?.startsWith(`https://res.cloudinary.com/${cloudName}/`)
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
