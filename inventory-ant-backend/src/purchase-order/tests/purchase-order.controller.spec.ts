import { Test, TestingModule } from '@nestjs/testing';
import { PurchaseOrderController } from '../purchase-order.controller';
import { PurchaseOrderService } from '../purchase-order.service';
import { SubscriptionRepository } from '../../subscription/subscription.repository';
import { CreatePurchaseOrderDto } from '../dto/create-po.dto';
import { UpdatePurchaseOrderDto } from '../dto/update-po.dto';
import { JwtAuthGuard } from '../../users/jwt-auth.guard';
import { SubscriptionGuard } from '../../subscription/subscription.guard';
import { PurchaseStatus } from '@prisma/client';

describe('PurchaseOrderController', () => {
  let controller: PurchaseOrderController;
  let service: jest.Mocked<PurchaseOrderService>;
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
      create: jest.fn(),
      update: jest.fn(),
      submit: jest.fn(),
      cancel: jest.fn(),
      findById: jest.fn(),
      list: jest.fn(),
    };

    const mockSubRepo = {
      findUserByEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PurchaseOrderController],
      providers: [
        { provide: PurchaseOrderService, useValue: mockService },
        { provide: SubscriptionRepository, useValue: mockSubRepo },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(SubscriptionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PurchaseOrderController>(PurchaseOrderController);
    service = module.get(PurchaseOrderService);
    subscriptionRepository = module.get(SubscriptionRepository);
  });

  describe('endpoints', () => {
    it('should resolve owner details and call service.create', async () => {
      const dto: CreatePurchaseOrderDto = {
        quotationId: 'quote-123',
        warehouseId: 'wh-123',
        orderDate: new Date().toISOString(),
      };
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.create.mockResolvedValue({ id: 'po-1', ...dto } as any);

      const result = await controller.create(mockRequest, dto);

      expect(subscriptionRepository.findUserByEmail).toHaveBeenCalledWith('tenant@test.com');
      expect(service.create).toHaveBeenCalledWith(mockUser.id, mockRequest.user.sub, dto);
      expect(result.id).toBe('po-1');
    });

    it('should resolve owner details and call service.list with parameters', async () => {
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.list.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 });

      const result = await controller.findAll(mockRequest, '2', '5', 'search-term', 'DRAFT');

      expect(service.list).toHaveBeenCalledWith(mockUser.id, {
        page: 2,
        pageSize: 5,
        search: 'search-term',
        status: PurchaseStatus.DRAFT,
      });
      expect(result.total).toBe(0);
    });

    it('should resolve owner details and call service.findById', async () => {
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.findById.mockResolvedValue({ id: 'po-1', poNumber: 'PO-1' } as any);

      const result = await controller.findOne(mockRequest, 'po-1');

      expect(service.findById).toHaveBeenCalledWith('po-1', mockUser.id);
      expect(result.poNumber).toBe('PO-1');
    });

    it('should resolve owner details and call service.update', async () => {
      const dto: UpdatePurchaseOrderDto = { notes: 'New Notes' };
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.update.mockResolvedValue({ id: 'po-1', notes: 'New Notes' } as any);

      const result = await controller.update(mockRequest, 'po-1', dto);

      expect(service.update).toHaveBeenCalledWith('po-1', mockUser.id, dto);
    });

    it('should resolve owner details and call service.submit', async () => {
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.submit.mockResolvedValue({ id: 'po-1', status: PurchaseStatus.PENDING_APPROVAL } as any);

      const result = await controller.submit(mockRequest, 'po-1');

      expect(service.submit).toHaveBeenCalledWith('po-1', mockUser.id);
      expect(result.status).toBe(PurchaseStatus.PENDING_APPROVAL);
    });

    it('should resolve owner details and call service.cancel', async () => {
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.cancel.mockResolvedValue({ id: 'po-1', status: PurchaseStatus.CANCELLED } as any);

      const result = await controller.cancel(mockRequest, 'po-1');

      expect(service.cancel).toHaveBeenCalledWith('po-1', mockUser.id);
      expect(result.status).toBe(PurchaseStatus.CANCELLED);
    });
  });
});
