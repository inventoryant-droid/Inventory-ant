import { Test, TestingModule } from '@nestjs/testing';
import { PaymentRecoveryService } from './payment-recovery.service';
import { PaymentRepository } from '../../payment/payment.repository';
import { SaasConfigService } from '../config/saas-config.service';
import { SubscriptionLifecycleService } from '../../subscription/subscription-lifecycle.service';
import { PlanService } from '../../subscription/plan.service';

describe('PaymentRecoveryService', () => {
  let service: PaymentRecoveryService;
  let repository: PaymentRepository;

  const mockRepository = {
    updatePayment: jest.fn(),
    createInvoice: jest.fn(),
    createAuditEvent: jest.fn(),
    prisma: {
      payment: {
        findMany: jest.fn(),
      },
      user: {
        findFirst: jest.fn(),
      },
    },
  };

  const mockProvider = {
    razorpay: {
      orders: {
        fetchPayments: jest.fn(),
      },
    },
  };

  const mockLifecycleService = {
    changePlan: jest.fn(),
  };

  const mockPlanService = {
    getPlanBySlug: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentRecoveryService,
        SaasConfigService,
        {
          provide: PaymentRepository,
          useValue: mockRepository,
        },
        {
          provide: 'PaymentProvider',
          useValue: mockProvider,
        },
        {
          provide: SubscriptionLifecycleService,
          useValue: mockLifecycleService,
        },
        {
          provide: PlanService,
          useValue: mockPlanService,
        },
      ],
    }).compile();

    service = module.get<PaymentRecoveryService>(PaymentRecoveryService);
    repository = module.get<PaymentRepository>(PaymentRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should expire legacy pending payments older than the timeout threshold', async () => {
    const mockPayments = [{ id: 'order_1', status: 'pending', timestamp: Date.now() - 2000000 }];
    mockRepository.prisma.payment.findMany.mockResolvedValue(mockPayments);

    await service.expirePendingOrders();

    expect(mockRepository.updatePayment).toHaveBeenCalledWith('order_1', { status: 'failed' });
    expect(mockRepository.createAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      action: 'Payment Expired',
    }));
  });
});
