import { Test, TestingModule } from '@nestjs/testing';
import { PurchaseReturnController } from '../purchase-return.controller';
import { PurchaseReturnService } from '../purchase-return.service';
import { SubscriptionRepository } from '../../subscription/subscription.repository';
import { CreatePurchaseReturnDto } from '../dto/create-return.dto';
import { PurchaseReturnReason } from '@prisma/client';
import { JwtAuthGuard } from '../../users/jwt-auth.guard';
import { SubscriptionGuard } from '../../subscription/subscription.guard';

describe('PurchaseReturnController', () => {
  let controller: PurchaseReturnController;
  let service: jest.Mocked<PurchaseReturnService>;
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
      name: 'John Doe',
    },
  };

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      approve: jest.fn(),
      complete: jest.fn(),
      cancel: jest.fn(),
      findById: jest.fn(),
      list: jest.fn(),
    };

    const mockSubRepo = {
      findUserByEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PurchaseReturnController],
      providers: [
        { provide: PurchaseReturnService, useValue: mockService },
        { provide: SubscriptionRepository, useValue: mockSubRepo },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(SubscriptionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PurchaseReturnController>(PurchaseReturnController);
    service = module.get(PurchaseReturnService);
    subscriptionRepository = module.get(SubscriptionRepository);
  });

  describe('endpoints', () => {
    it('should resolve owner details and call service.create', async () => {
      const dto: CreatePurchaseReturnDto = {
        purchaseOrderId: 'po-123',
        goodsReceiptId: 'grn-123',
        items: [{ variantId: 'v-1', batchId: 'b-1', quantity: 20, reason: PurchaseReturnReason.DAMAGED, warehouseId: 'wh-123' }],
      };
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.create.mockResolvedValue({ id: 'ret-1', ...dto } as any);

      const result = await controller.create(mockRequest, dto);

      expect(subscriptionRepository.findUserByEmail).toHaveBeenCalledWith('tenant@test.com');
      expect(service.create).toHaveBeenCalledWith(mockUser.id, 'John Doe', dto);
      expect(result.id).toBe('ret-1');
    });

    it('should resolve owner details and call service.list with parameters', async () => {
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.list.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 });

      const result = await controller.findAll(mockRequest, '2', '5', 'search-term');

      expect(service.list).toHaveBeenCalledWith(mockUser.id, {
        page: 2,
        pageSize: 5,
        search: 'search-term',
      });
      expect(result.total).toBe(0);
    });

    it('should resolve owner details and call service.findById', async () => {
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.findById.mockResolvedValue({ id: 'ret-1', returnNumber: 'PRTN-1' } as any);

      const result = await controller.findOne(mockRequest, 'ret-1');

      expect(service.findById).toHaveBeenCalledWith('ret-1', mockUser.id);
      expect(result.returnNumber).toBe('PRTN-1');
    });

    it('should resolve owner details and call service.approve', async () => {
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.approve.mockResolvedValue({ id: 'ret-1', status: 'APPROVED' } as any);

      const result = await controller.approve(mockRequest, 'ret-1');

      expect(service.approve).toHaveBeenCalledWith('ret-1', mockUser.id);
      expect(result.status).toBe('APPROVED');
    });

    it('should resolve owner details and call service.complete', async () => {
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.complete.mockResolvedValue({ id: 'ret-1', status: 'COMPLETED' } as any);

      const result = await controller.complete(mockRequest, 'ret-1');

      expect(service.complete).toHaveBeenCalledWith('ret-1', mockUser.id);
      expect(result.status).toBe('COMPLETED');
    });

    it('should resolve owner details and call service.cancel', async () => {
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.cancel.mockResolvedValue({ id: 'ret-1', status: 'CANCELLED' } as any);

      const result = await controller.cancel(mockRequest, 'ret-1');

      expect(service.cancel).toHaveBeenCalledWith('ret-1', mockUser.id);
      expect(result.status).toBe('CANCELLED');
    });
  });
});
