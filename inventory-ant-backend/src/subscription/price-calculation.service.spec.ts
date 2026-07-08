import { Test, TestingModule } from '@nestjs/testing';
import { PriceCalculationService } from './price-calculation.service';
import { SubscriptionRepository } from './subscription.repository';
import { Coupon } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

describe('PriceCalculationService', () => {
  let service: PriceCalculationService;
  let repository: SubscriptionRepository;

  const mockRepository = {
    prisma: {
      coupon: {
        findUnique: jest.fn(),
      },
    },
    findPlanById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PriceCalculationService,
        {
          provide: SubscriptionRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<PriceCalculationService>(PriceCalculationService);
    repository = module.get<SubscriptionRepository>(SubscriptionRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateCoupon', () => {
    it('should throw error if coupon does not exist', async () => {
      mockRepository.prisma.coupon.findUnique.mockResolvedValue(null);
      await expect(service.validateCoupon('INVALID', 'plan-1', 500)).rejects.toThrow(BadRequestException);
    });

    it('should throw error if coupon is inactive', async () => {
      const mockCoupon = { active: false };
      mockRepository.prisma.coupon.findUnique.mockResolvedValue(mockCoupon);
      await expect(service.validateCoupon('CODE', 'plan-1', 500)).rejects.toThrow(BadRequestException);
    });

    it('should return coupon if valid', async () => {
      const validTill = new Date();
      validTill.setDate(validTill.getDate() + 5);

      const mockCoupon = {
        code: 'SAVE10',
        active: true,
        validFrom: new Date(2020, 1, 1),
        validTill: validTill,
        usageLimit: 100,
        usedCount: 10,
        planId: null,
        minimumAmount: 100,
      };

      mockRepository.prisma.coupon.findUnique.mockResolvedValue(mockCoupon);

      const res = await service.validateCoupon('SAVE10', 'plan-1', 500);
      expect(res).toEqual(mockCoupon);
    });
  });

  describe('calculateDiscount', () => {
    it('should calculate percentage discount correctly', () => {
      const coupon = {
        discountType: 'percentage',
        discountValue: 10,
        maximumDiscount: 50,
      } as Coupon;

      const discount = service.calculateDiscount(coupon, 300);
      expect(discount).toBe(30);
    });

    it('should cap percentage discount at maximumDiscount', () => {
      const coupon = {
        discountType: 'percentage',
        discountValue: 10,
        maximumDiscount: 20,
      } as Coupon;

      const discount = service.calculateDiscount(coupon, 300);
      expect(discount).toBe(20);
    });

    it('should calculate flat discount correctly', () => {
      const coupon = {
        discountType: 'fixed',
        discountValue: 50,
      } as Coupon;

      const discount = service.calculateDiscount(coupon, 300);
      expect(discount).toBe(50);
    });
  });

  describe('calculatePricing', () => {
    it('should calculate correct pricing details with GST and no coupon', async () => {
      const mockPlan = {
        id: 'plan-1',
        monthlyPrice: 100,
        yearlyPrice: 1000,
        currency: 'INR',
      };
      mockRepository.findPlanById.mockResolvedValue(mockPlan);

      const result = await service.calculatePricing('plan-1', 'monthly');

      expect(result.basePrice).toBe(100);
      expect(result.tax).toBe(18); // 18% of 100
      expect(result.finalAmount).toBe(118);
      expect(result.discount).toBe(0);
      expect(result.savings).toBe(0);
    });
  });
});
