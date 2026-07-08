import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from './payment.service';
import { PaymentRepository } from './payment.repository';
import { PriceCalculationService } from '../subscription/price-calculation.service';
import { SubscriptionLifecycleService } from '../subscription/subscription-lifecycle.service';
import { PlanService } from '../subscription/plan.service';
import { BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';

describe('PaymentService', () => {
  let service: PaymentService;
  let repository: PaymentRepository;

  const mockProvider = {
    createOrder: jest.fn(),
    verifySignature: jest.fn(),
    capturePayment: jest.fn(),
    refundPayment: jest.fn(),
    fetchPayment: jest.fn(),
  };

  const mockRepository = {
    createPayment: jest.fn(),
    findPaymentById: jest.fn(),
    updatePayment: jest.fn(),
    createInvoice: jest.fn(),
    createWebhookLog: jest.fn(),
    findWebhookLogByEventId: jest.fn(),
    createAuditEvent: jest.fn(),
    prisma: {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
    },
  };

  const mockPriceService = {
    calculatePricing: jest.fn(),
  };

  const mockPlanService = {
    getPlanById: jest.fn(),
  };

  const mockLifecycleService = {
    changePlan: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: PaymentRepository,
          useValue: mockRepository,
        },
        {
          provide: 'PaymentProvider',
          useValue: mockProvider,
        },
        {
          provide: PriceCalculationService,
          useValue: mockPriceService,
        },
        {
          provide: PlanService,
          useValue: mockPlanService,
        },
        {
          provide: SubscriptionLifecycleService,
          useValue: mockLifecycleService,
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    repository = module.get<PaymentRepository>(PaymentRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOrder', () => {
    it('should calculate pricing and create Razorpay order', async () => {
      const mockPlan = { id: 'plan-1', slug: 'silver', name: 'Silver Plan' };
      const mockOwner = { id: 'owner-1', email: 'owner@test.com', businessName: 'My Biz' };
      const mockPricing = { finalAmount: 200, currency: 'INR' };
      const mockOrderResult = { id: 'order_123', amount: 20000, currency: 'INR', receipt: 'rcpt_1', status: 'created' };

      mockPlanService.getPlanById.mockResolvedValue(mockPlan);
      mockRepository.prisma.user.findUnique.mockResolvedValue(mockOwner);
      mockPriceService.calculatePricing.mockResolvedValue(mockPricing);
      mockProvider.createOrder.mockResolvedValue(mockOrderResult);

      const res = await service.createOrder('owner-1', {
        planId: 'plan-1',
        billingCycle: 'monthly',
      });

      expect(res.orderId).toBe('order_123');
      expect(res.amount).toBe(20000);
      expect(mockRepository.createPayment).toHaveBeenCalledWith({
        id: 'order_123',
        userId: 'owner@test.com',
        businessName: 'My Biz',
        amount: 200,
        plan: 'silver',
        status: 'pending',
        invoiceId: 'PENDING_INV_order_123',
      });
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should call verifySignature on the payment provider', async () => {
      mockProvider.verifySignature.mockReturnValue(true);
      const res = await service.verifyWebhookSignature('payload', 'sig');
      expect(res).toBe(true);
      expect(mockProvider.verifySignature).toHaveBeenCalledWith('payload', 'sig', 'mock_webhook_secret');
    });
  });

  describe('processWebhookEvent', () => {
    it('should process payment.captured event and activate plan', async () => {
      const body = {
        event: 'payment.captured',
        id: 'evt_123',
        payload: {
          payment: {
            entity: {
              id: 'pay_999',
              order_id: 'order_123',
              amount: 20000,
              notes: {
                userId: 'owner-1',
                planId: 'plan-1',
                billingCycle: 'monthly',
              },
            },
          },
        },
      };

      const paymentRecord = {
        id: 'order_123',
        userId: 'owner@test.com',
        amount: 200,
        status: 'pending',
      };

      const mockOwner = { id: 'owner-1', email: 'owner@test.com' };
      const mockPlan = { id: 'plan-1', slug: 'silver', name: 'Silver Plan' };
      const mockSub = { id: 'sub-999' };

      mockRepository.findWebhookLogByEventId.mockResolvedValue(null);
      mockRepository.findPaymentById.mockResolvedValue(paymentRecord);
      mockRepository.prisma.user.findFirst.mockResolvedValue(mockOwner);
      mockPlanService.getPlanById.mockResolvedValue(mockPlan);
      mockRepository.updatePayment.mockImplementation((id, data) => ({ id, ...data }));
      mockLifecycleService.changePlan.mockResolvedValue(mockSub);
      mockRepository.createInvoice.mockResolvedValue({ id: 'inv_777' });

      const res = await service.processWebhookEvent(body);

      expect(res.success).toBe(true);
      expect(mockLifecycleService.changePlan).toHaveBeenCalledWith('owner-1', 'silver', 'monthly');
      expect(mockRepository.createInvoice).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'owner-1',
        total: 200,
        status: 'paid',
        subscriptionId: 'sub-999',
        paymentId: paymentRecord.id,
      }));
    });
  });
});
