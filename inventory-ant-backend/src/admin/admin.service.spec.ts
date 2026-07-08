import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { AdminRepository } from './admin.repository';
import { CreatePlanDto, UpdatePlanDto } from './admin.dto';

describe('AdminService', () => {
  let service: AdminService;
  let repository: AdminRepository;

  const mockRepository = {
    createPlan: jest.fn(),
    updatePlan: jest.fn(),
    getPlanById: jest.fn(),
    deletePlan: jest.fn(),
    createAuditEvent: jest.fn(),
    totalUsers: jest.fn(),
    activeUsers: jest.fn(),
    usersCountByPlanSlug: jest.fn(),
    completedPaymentsSum: jest.fn(),
    activePaidSubscriptions: jest.fn(),
    trialUsersCount: jest.fn(),
    expiringSubscriptionsCount: jest.fn(),
    getMostUsedFeatures: jest.fn(),
    getAiUsageStats: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: AdminRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    repository = module.get<AdminRepository>(AdminRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPlan', () => {
    it('should create a plan and log audit event', async () => {
      const dto: CreatePlanDto = {
        name: 'Pro Plan',
        slug: 'pro',
        description: 'Pro description',
        monthlyPrice: 499,
        yearlyPrice: 4990,
        trialDays: 14,
        isActive: true,
      };

      const mockPlan = {
        id: 'plan-id-123',
        ...dto,
        currency: 'INR',
        popularBadge: false,
        recommendedBadge: false,
        visibility: true,
        gracePeriod: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.createPlan.mockResolvedValue(mockPlan);

      const result = await service.createPlan(dto, 'admin@test.com');

      expect(result).toEqual(mockPlan);
      expect(mockRepository.createPlan).toHaveBeenCalledWith({
        name: dto.name,
        slug: 'pro',
        description: dto.description,
        monthlyPrice: dto.monthlyPrice,
        yearlyPrice: dto.yearlyPrice,
        trialDays: dto.trialDays,
        isActive: true,
        displayOrder: 0,
        currency: 'INR',
        popularBadge: false,
        recommendedBadge: false,
        visibility: true,
        gracePeriod: 3,
      });
      expect(mockRepository.createAuditEvent).toHaveBeenCalledWith({
        userId: null,
        action: 'Plan Created',
        details: 'Plan "Pro Plan" (pro) created with monthly price Rs.499',
        performedBy: 'admin@test.com',
      });
    });
  });

  describe('updatePlan', () => {
    it('should update plan settings', async () => {
      const dto: UpdatePlanDto = {
        name: 'Gold Plan',
      };
      const existingPlan = { id: 'plan-1' };
      const updatedPlan = { id: 'plan-1', name: 'Gold Plan' };

      mockRepository.getPlanById.mockResolvedValue(existingPlan);
      mockRepository.updatePlan.mockResolvedValue(updatedPlan);

      const result = await service.updatePlan('plan-1', dto, 'admin@test.com');

      expect(result).toEqual(updatedPlan);
      expect(mockRepository.updatePlan).toHaveBeenCalledWith('plan-1', dto);
    });
  });

  describe('getDashboardAnalytics', () => {
    it('should return compiled dashboard metrics', async () => {
      mockRepository.totalUsers.mockResolvedValue(10);
      mockRepository.activeUsers.mockResolvedValue(8);
      mockRepository.trialUsersCount.mockResolvedValue(2);
      mockRepository.usersCountByPlanSlug.mockResolvedValue(2);
      mockRepository.completedPaymentsSum.mockResolvedValue(5000);
      mockRepository.activePaidSubscriptions.mockResolvedValue([
        { plan: { monthlyPrice: 499 } },
      ]);
      mockRepository.expiringSubscriptionsCount.mockResolvedValue(1);
      mockRepository.getMostUsedFeatures.mockResolvedValue([]);
      mockRepository.getAiUsageStats.mockResolvedValue([]);

      const result = await service.getDashboardAnalytics();

      expect(result.metrics.totalUsers).toBe(10);
      expect(result.metrics.mrr).toBe(499);
      expect(result.metrics.arr).toBe(499 * 12);
      expect(result.metrics.totalRevenue).toBe(5000);
    });
  });
});
