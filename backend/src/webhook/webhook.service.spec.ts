import { Test, TestingModule } from '@nestjs/testing'
import { WebhookService } from './webhook.service'
import { SubscriptionCheckoutService } from 'src/subscriptions/subscription-checkout.service'
import { ConfigService } from '@nestjs/config'
import { UnauthorizedException, InternalServerErrorException } from '@nestjs/common'
import * as crypto from 'crypto';

describe('WebhookService', () => {
  let service: WebhookService;
  let mockCheckoutService: any;
  let mockConfigService: any;

  const TEST_SECRET = 'super-secret-key';
  const MOCK_PAYLOAD = { data: { id: '12345' } };
  const X_REQUEST_ID = 'req-abc-999';
  const TS = '1715623000';

  beforeEach(async () => {
    mockCheckoutService = {
      processWebhook: jest.fn().mockResolvedValue({ success: true }),
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue(TEST_SECRET),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        { provide: SubscriptionCheckoutService, useValue: mockCheckoutService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
  });

  const generateSignature = (ts: string, dataId: string, requestId: string, secret: string) => {
    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const v1 = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
    return `ts=${ts},v1=${v1}`;
  };

  it('debería lanzar UnauthorizedException si faltan los headers', async () => {
    await expect(
      service.processWebhook(MOCK_PAYLOAD, '', '')
    ).rejects.toThrow(UnauthorizedException);
  });

  it('debería lanzar UnauthorizedException si la firma es inválida', async () => {
    const signature = 'ts=123,v1=firma-falsa-que-no-coincide';
    await expect(
      service.processWebhook(MOCK_PAYLOAD, signature, X_REQUEST_ID)
    ).rejects.toThrow(UnauthorizedException);
  });

  it('debería procesar el webhook correctamente si la firma es válida', async () => {
    const signature = generateSignature(TS, MOCK_PAYLOAD.data.id, X_REQUEST_ID, TEST_SECRET);

    const result = await service.processWebhook(MOCK_PAYLOAD, signature, X_REQUEST_ID);

    expect(result).toEqual({ success: true });
    expect(mockCheckoutService.processWebhook).toHaveBeenCalledWith(MOCK_PAYLOAD);
  });

  it('debería lanzar InternalServerErrorException si el secret no está configurado', async () => {
    mockConfigService.get.mockReturnValueOnce(undefined);

    await expect(
      service.processWebhook(MOCK_PAYLOAD, 'cualquier-firma', X_REQUEST_ID)
    ).rejects.toThrow(InternalServerErrorException);
  });
});