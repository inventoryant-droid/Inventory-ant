import { Test, TestingModule } from '@nestjs/testing';
import { SaasSchedulerService } from './saas-scheduler.service';
import { PaymentRecoveryService } from './payment-recovery.service';
import { WebhookRecoveryService } from './webhook-recovery.service';
import { PrismaService } from '../../prisma.service';

describe('SaasSchedulerService', () => {
  let service: SaasSchedulerService;
  let paymentRecovery: PaymentRecoveryService;
  let webhookRecovery: WebhookRecoveryService;

  const mockPaymentRecovery = {
    expirePendingOrders: jest.fn(),
    recoverInterruptedPayments: jest.fn(),
  };

  const mockWebhookRecovery = {
    retryFailedWebhooks: jest.fn(),
  };

  const mockPrisma = {
    paymentWebhookLog: {
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SaasSchedulerService,
        {
          provide: PaymentRecoveryService,
          useValue: mockPaymentRecovery,
        },
        {
          provide: WebhookRecoveryService,
          useValue: mockWebhookRecovery,
        },
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<SaasSchedulerService>(SaasSchedulerService);
    paymentRecovery = module.get<PaymentRecoveryService>(PaymentRecoveryService);
    webhookRecovery = module.get<WebhookRecoveryService>(WebhookRecoveryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should trigger webhook recovery retry', async () => {
    await service.handleWebhookRetries();
    expect(webhookRecovery.retryFailedWebhooks).toHaveBeenCalled();
  });

  it('should trigger orders expiry checks', async () => {
    await service.handlePaymentExpiries();
    expect(paymentRecovery.expirePendingOrders).toHaveBeenCalled();
  });
});
