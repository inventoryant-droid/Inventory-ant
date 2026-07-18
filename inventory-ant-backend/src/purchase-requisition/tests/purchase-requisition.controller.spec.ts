import { Test, TestingModule } from '@nestjs/testing';
import { PurchaseRequisitionController } from '../purchase-requisition.controller';
import { PurchaseRequisitionService } from '../purchase-requisition.service';
import { SubscriptionRepository } from '../../subscription/subscription.repository';
import { CreateRequisitionDto } from '../dto/create-requisition.dto';
import { UpdateRequisitionDto } from '../dto/update-requisition.dto';
import { JwtAuthGuard } from '../../users/jwt-auth.guard';
import { SubscriptionGuard } from '../../subscription/subscription.guard';

describe('PurchaseRequisitionController', () => {
  let controller: PurchaseRequisitionController;
  let service: jest.Mocked<PurchaseRequisitionService>;
  let subscriptionRepository: jest.Mocked<SubscriptionRepository>;

  const mockUser = {
    id: 'user-id-123',
    email: 'tenant@test.com',
  };

  const mockRequest = {
    user: {
      email: 'tenant@test.com',
      tenantEmail: 'tenant@test.com',
      sub: 'user-id-123',
      role: 'user',
    },
  };

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      list: jest.fn(),
      submit: jest.fn(),
      approve: jest.fn(),
      reject: jest.fn(),
    };

    const mockSubRepo = {
      findUserByEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PurchaseRequisitionController],
      providers: [
        { provide: PurchaseRequisitionService, useValue: mockService },
        { provide: SubscriptionRepository, useValue: mockSubRepo },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(SubscriptionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PurchaseRequisitionController>(PurchaseRequisitionController);
    service = module.get(PurchaseRequisitionService);
    subscriptionRepository = module.get(SubscriptionRepository);
  });

  describe('endpoints', () => {
    it('should resolve owner details and call service.create', async () => {
      const dto: CreateRequisitionDto = {
        requestorId: 'employee-1',
        items: [{ variantId: 'v1', quantity: 1, estimatedCost: 10 }],
      };
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.create.mockResolvedValue({ id: 'req-1', ...dto } as any);

      const result = await controller.create(mockRequest, dto);

      expect(subscriptionRepository.findUserByEmail).toHaveBeenCalledWith('tenant@test.com');
      expect(service.create).toHaveBeenCalledWith(mockUser.id, mockUser.email, dto);
      expect(result.id).toBe('req-1');
    });

    it('should resolve owner details and call service.list with parameters', async () => {
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.list.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 });

      const result = await controller.findAll(mockRequest, '2', '5', 'search-term', 'DRAFT');

      expect(service.list).toHaveBeenCalledWith(mockUser.id, {
        page: 2,
        pageSize: 5,
        search: 'search-term',
        status: 'DRAFT',
      });
      expect(result.total).toBe(0);
    });

    it('should resolve owner details and call service.findById', async () => {
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.findById.mockResolvedValue({ id: 'req-1', notes: 'Test' } as any);

      const result = await controller.findOne(mockRequest, 'req-1');

      expect(service.findById).toHaveBeenCalledWith('req-1', mockUser.id);
      expect(result.notes).toBe('Test');
    });

    it('should resolve owner details and call service.update', async () => {
      const dto: UpdateRequisitionDto = { notes: 'New Notes' };
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.update.mockResolvedValue({ id: 'req-1', notes: 'New Notes' } as any);

      const result = await controller.update(mockRequest, 'req-1', dto);

      expect(service.update).toHaveBeenCalledWith('req-1', mockUser.id, mockUser.email, dto);
      expect(result.notes).toBe('New Notes');
    });

    it('should resolve owner details and call service.submit', async () => {
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.submit.mockResolvedValue({ id: 'req-1', status: 'PENDING_APPROVAL' } as any);

      const result = await controller.submit(mockRequest, 'req-1');

      expect(service.submit).toHaveBeenCalledWith('req-1', mockUser.id);
      expect(result.status).toBe('PENDING_APPROVAL');
    });

    it('should resolve owner details and call service.approve', async () => {
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.approve.mockResolvedValue({ id: 'req-1', status: 'APPROVED' } as any);

      const result = await controller.approve(mockRequest, 'req-1');

      expect(service.approve).toHaveBeenCalledWith('req-1', mockUser.id);
      expect(result.status).toBe('APPROVED');
    });

    it('should resolve owner details and call service.reject with optional reason', async () => {
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.reject.mockResolvedValue({ id: 'req-1', status: 'REJECTED' } as any);

      const result = await controller.reject(mockRequest, 'req-1', 'Over budget');

      expect(service.reject).toHaveBeenCalledWith('req-1', mockUser.id, 'Over budget');
      expect(result.status).toBe('REJECTED');
    });
  });
});
