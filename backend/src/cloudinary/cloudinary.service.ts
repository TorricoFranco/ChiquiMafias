import { Injectable, InternalServerErrorException } from '@nestjs/common'
import { v2 as cloudinary } from 'cloudinary'
import { randomUUID } from 'crypto'


@Injectable()
export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    })
  }

  generateSignature(folderName: string = 'support_tickets') {
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    if (!apiSecret) {
      throw new InternalServerErrorException(
        'Error de configuración en el servidor',
      )
    }

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
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      folder: folderName,
      publicId,
      uploadPreset,
      allowedFormats,
    }
  }
}
