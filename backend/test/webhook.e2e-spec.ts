import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { WebhookController } from '../src/webhook/webhook.controller'
import { WebhookService } from '../src/webhook/webhook.service'

describe('WebhookController (e2e)', () => {
  let app: INestApplication

  const mockWebhookService = {
    processWebhook: jest.fn().mockResolvedValue({ processed: true }),
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [WebhookController],
      providers: [{ provide: WebhookService, useValue: mockWebhookService }],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('POST /webhook/mercado-pago - debería recibir el payload y los headers correctamente', async () => {
    const mockPayload = { id: '123', topic: 'payment' }

    // llamada de Mercado Pago
    await request(app.getHttpServer())
      .post('/webhook/mercado-pago')
      .set('x-signature', 'ts=123,v1=abc')
      .set('x-request-id', 'req-999')
      .send(mockPayload)
      .expect(201)

    expect(mockWebhookService.processWebhook).toHaveBeenCalledWith(
      mockPayload,
      'ts=123,v1=abc',
      'req-999',
    )
  })
})
