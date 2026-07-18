import { Test, TestingModule } from '@nestjs/testing';
import { SupplierQuotationController } from '../supplier-quotation.controller';
import { SupplierQuotationService } from '../supplier-quotation.service';
import { SubscriptionRepository } from '../../subscription/subscription.repository';
import { SubmitQuotationDto } from '../dto/submit-quotation.dto';
import { UpdateQuotationDto } from '../dto/update-quotation.dto';
import { JwtAuthGuard } from '../../users/jwt-auth.guard';
import { SubscriptionGuard } from '../../subscription/subscription.guard';

describe('SupplierQuotationController', () => {
  let controller: SupplierQuotationController;
  let service: jest.Mocked<SupplierQuotationService>;
  let subscriptionRepository: jest.Mocked<SubscriptionRepository>;

  const mockUser = {
    id: 'user-id-123',
    email: 'tenant@test.com',
  };

  const mockRequest = {
    user: {
      email: 'tenant@test.com',
      tenantEmail: 'tenant@test.com',
      sub: 'employee-id-456',
      role: 'user',
    },
  };

  beforeEach(async () => {
    const mockService = {
      submit: jest.fn(),
      update: jest.fn(),
      withdraw: jest.fn(),
      review: jest.fn(),
      select: jest.fn(),
      reject: jest.fn(),
      findById: jest.fn(),
      list: jest.fn(),
    };

    const mockSubRepo = {
      findUserByEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SupplierQuotationController],
      providers: [
        { provide: SupplierQuotationService, useValue: mockService },
        { provide: SubscriptionRepository, useValue: mockSubRepo },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(SubscriptionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SupplierQuotationController>(SupplierQuotationController);
    service = module.get(SupplierQuotationService);
    subscriptionRepository = module.get(SubscriptionRepository);
  });

  describe('endpoints', () => {
    it('should resolve owner details and call service.submit', async () => {
      const dto: SubmitQuotationDto = {
        rfqId: 'rfq-123',
        supplierId: 'sup-123',
        items: [{ variantId: 'v1', quantity: 1, unitPrice: 10, taxRate: 5, discount: 0, deliveryLeadTime: 2 }],
      };
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.submit.mockResolvedValue({ id: 'q-1', ...dto } as any);

      const result = await controller.submit(mockRequest, dto);

      expect(subscriptionRepository.findUserByEmail).toHaveBeenCalledWith('tenant@test.com');
      expect(service.submit).toHaveBeenCalledWith(mockUser.id, mockUser.email, dto);
      expect(result.id).toBe('q-1');
    });

    it('should resolve owner details and call service.list with parameters', async () => {
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.list.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 });

      const result = await controller.findAll(mockRequest, '2', '5', 'search-term', 'rfq-123');

      expect(service.list).toHaveBeenCalledWith(mockUser.id, {
        page: 2,
        pageSize: 5,
        search: 'search-term',
        rfqId: 'rfq-123',
      });
      expect(result.total).toBe(0);
    });

    it('should resolve owner details and call service.findById', async () => {
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.findById.mockResolvedValue({ id: 'q-1', status: 'SUBMITTED' } as any);

      const result = await controller.findOne(mockRequest, 'q-1');

      expect(service.findById).toHaveBeenCalledWith('q-1', mockUser.id);
      expect(result.status).toBe('SUBMITTED');
    });

    it('should resolve owner details and call service.update', async () => {
      const dto: UpdateQuotationDto = {
        items: [{ variantId: 'v1', quantity: 2, unitPrice: 9.5, taxRate: 5, discount: 0, deliveryLeadTime: 2 }],
      };
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.update.mockResolvedValue({ id: 'q-1', status: 'SUBMITTED' } as any);

      const result = await controller.update(mockRequest, 'q-1', dto);

      expect(service.update).toHaveBeenCalledWith('q-1', mockUser.id, mockUser.email, dto);
    });

    it('should resolve owner details and call service.withdraw', async () => {
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.withdraw.mockResolvedValue({ id: 'q-1' } as any);

      const result = await controller.withdraw(mockRequest, 'q-1');

      expect(service.withdraw).toHaveBeenCalledWith('q-1', mockUser.id);
    });

    it('should resolve owner details and call service.review', async () => {
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.review.mockResolvedValue({ id: 'q-1', status: 'UNDER_REVIEW' } as any);

      const result = await controller.review(mockRequest, 'q-1');

      expect(service.review).toHaveBeenCalledWith('q-1', mockUser.id);
      expect(result.status).toBe('UNDER_REVIEW');
    });

    it('should resolve owner details and call service.select', async () => {
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.select.mockResolvedValue({ id: 'q-1', status: 'SELECTED' } as any);

      const result = await controller.select(mockRequest, 'q-1');

      expect(service.select).toHaveBeenCalledWith('q-1', mockUser.id);
      expect(result.status).toBe('SELECTED');
    });

    it('should resolve owner details and call service.reject', async () => {
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.reject.mockResolvedValue({ id: 'q-1', status: 'REJECTED' } as any);

      const result = await controller.reject(mockRequest, 'q-1');

      expect(service.reject).toHaveBeenCalledWith('q-1', mockUser.id);
      expect(result.status).toBe('REJECTED');
    });

    it('should resolve owner details and call service.list for RFQs', async () => {
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.list.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 });

      const result = await controller.findQuotationsForRFQ(mockRequest, 'rfq-123', '1', '10', 'search');

      expect(service.list).toHaveBeenCalledWith(mockUser.id, {
        page: 1,
        pageSize: 10,
        search: 'search',
        rfqId: 'rfq-123',
      });
      expect(result.total).toBe(0);
    });
  });
});
