import { Test, TestingModule } from '@nestjs/testing';
import { WebhookRecoveryService } from './webhook-recovery.service';
import { PaymentRepository } from '../../payment/payment.repository';
import { PaymentService } from '../../payment/payment.service';
import { SaasConfigService } from '../config/saas-config.service';

describe('WebhookRecoveryService', () => {
  let service: WebhookRecoveryService;
  let paymentService: PaymentService;

  const mockRepository = {
    createAuditEvent: jest.fn(),
    prisma: {
      paymentWebhookLog: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
    },
  };

  const mockPaymentService = {
    processWebhookEvent: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookRecoveryService,
        SaasConfigService,
        {
          provide: PaymentRepository,
          useValue: mockRepository,
        },
        {
          provide: PaymentService,
          useValue: mockPaymentService,
        },
      ],
    }).compile();

    service = module.get<WebhookRecoveryService>(WebhookRecoveryService);
    paymentService = module.get<PaymentService>(PaymentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should process eligible webhook logs and mark processed on success', async () => {
    const mockLogs = [
      {
        id: 'log_1',
        gatewayEventId: 'evt_1',
        retryCount: 0,
        createdAt: new Date(Date.now() - 70000), // > 60000ms (1m) delay
        payload: { event: 'payment.captured' },
      },
    ];

    mockRepository.prisma.paymentWebhookLog.findMany.mockResolvedValue(mockLogs);
    mockPaymentService.processWebhookEvent.mockResolvedValue({ success: true });

    await service.retryFailedWebhooks();

    expect(mockRepository.prisma.paymentWebhookLog.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'log_1' },
      data: expect.objectContaining({ retryCount: 1 }),
    }));
    expect(mockPaymentService.processWebhookEvent).toHaveBeenCalledWith({ event: 'payment.captured' });
    expect(mockRepository.prisma.paymentWebhookLog.update).toHaveBeenLastCalledWith(expect.objectContaining({
      where: { id: 'log_1' },
      data: { status: 'processed', error: null },
    }));
  });
});
