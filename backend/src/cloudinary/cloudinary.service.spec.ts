import { v2 as cloudinary } from 'cloudinary'
import { CloudinaryService } from './cloudinary.service'

jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: { upload: jest.fn() },
    utils: { api_sign_request: jest.fn() },
  },
}))

describe('CloudinaryService', () => {
  const env: Record<string, string> = {
    CLOUDINARY_CLOUD_NAME: 'chiqui',
    CLOUDINARY_API_KEY: 'key',
    CLOUDINARY_API_SECRET: 'secret',
  }
  const config = { get: jest.fn((key: string) => env[key]) }
  const upload = cloudinary.uploader.upload as jest.Mock
  let service: CloudinaryService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new CloudinaryService(config as never)
  })

  describe('uploadRemoteImage', () => {
    it('Debe subir la imagen con un id fijo y devolver la URL segura', async () => {
      upload.mockResolvedValue({
        secure_url: 'https://res.cloudinary.com/chiqui/image/upload/team_1.png',
      })

      const url = await service.uploadRemoteImage(
        'https://highlightly.net/soccer/images/teams/1.png',
        'team-badges',
        'team_1',
      )

      expect(url).toBe(
        'https://res.cloudinary.com/chiqui/image/upload/team_1.png',
      )
      expect(upload).toHaveBeenCalledWith(
        'https://highlightly.net/soccer/images/teams/1.png',
        expect.objectContaining({
          folder: 'team-badges',
          public_id: 'team_1',
          overwrite: true,
          resource_type: 'image',
        }),
      )
    })

    it('Debe rechazar una imagen que no es https', async () => {
      await expect(
        service.uploadRemoteImage('http://ejemplo/1.png', 'team-badges', 'x'),
      ).rejects.toThrow('https')
      expect(upload).not.toHaveBeenCalled()
    })
  })

  describe('isHostedUrl', () => {
    it('Debe reconocer solo las imágenes de nuestra cuenta', () => {
      expect(
        service.isHostedUrl('https://res.cloudinary.com/chiqui/image/upload/a'),
      ).toBe(true)
      expect(
        service.isHostedUrl('https://res.cloudinary.com/otra/image/upload/a'),
      ).toBe(false)
      expect(
        service.isHostedUrl('https://media.api-sports.io/football/teams/1.png'),
      ).toBe(false)
      expect(service.isHostedUrl(null)).toBe(false)
    })
  })
})
