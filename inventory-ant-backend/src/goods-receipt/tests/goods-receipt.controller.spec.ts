import { Test, TestingModule } from '@nestjs/testing';
import { GoodsReceiptController } from '../goods-receipt.controller';
import { GoodsReceiptService } from '../goods-receipt.service';
import { SubscriptionRepository } from '../../subscription/subscription.repository';
import { CreateGoodsReceiptDto } from '../dto/create-grn.dto';
import { JwtAuthGuard } from '../../users/jwt-auth.guard';
import { SubscriptionGuard } from '../../subscription/subscription.guard';

describe('GoodsReceiptController', () => {
  let controller: GoodsReceiptController;
  let service: jest.Mocked<GoodsReceiptService>;
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
      receive: jest.fn(),
      cancel: jest.fn(),
      findById: jest.fn(),
      list: jest.fn(),
    };

    const mockSubRepo = {
      findUserByEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GoodsReceiptController],
      providers: [
        { provide: GoodsReceiptService, useValue: mockService },
        { provide: SubscriptionRepository, useValue: mockSubRepo },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(SubscriptionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<GoodsReceiptController>(GoodsReceiptController);
    service = module.get(GoodsReceiptService);
    subscriptionRepository = module.get(SubscriptionRepository);
  });

  describe('endpoints', () => {
    it('should resolve owner details and call service.create', async () => {
      const dto: CreateGoodsReceiptDto = {
        purchaseOrderId: 'po-123',
        receiveDate: new Date().toISOString(),
        items: [{ variantId: 'v-1', quantityReceived: 40, batchNumber: 'BATCH-001', warehouseId: 'wh-123', purchasePrice: 10, mrp: 15 }],
      };
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.create.mockResolvedValue({ id: 'grn-1', ...dto } as any);

      const result = await controller.create(mockRequest, dto);

      expect(subscriptionRepository.findUserByEmail).toHaveBeenCalledWith('tenant@test.com');
      expect(service.create).toHaveBeenCalledWith(mockUser.id, 'John Doe', dto);
      expect(result.id).toBe('grn-1');
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
      service.findById.mockResolvedValue({ id: 'grn-1', grnNumber: 'GRN-1' } as any);

      const result = await controller.findOne(mockRequest, 'grn-1');

      expect(service.findById).toHaveBeenCalledWith('grn-1', mockUser.id);
      expect(result.grnNumber).toBe('GRN-1');
    });

    it('should resolve owner details and call service.receive', async () => {
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.receive.mockResolvedValue({ id: 'grn-1', status: 'COMPLETED' } as any);

      const result = await controller.receive(mockRequest, 'grn-1');

      expect(service.receive).toHaveBeenCalledWith('grn-1', mockUser.id);
      expect(result.status).toBe('COMPLETED');
    });

    it('should resolve owner details and call service.cancel', async () => {
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.cancel.mockResolvedValue({ id: 'grn-1', status: 'CANCELLED' } as any);

      const result = await controller.cancel(mockRequest, 'grn-1');

      expect(service.cancel).toHaveBeenCalledWith('grn-1', mockUser.id);
      expect(result.status).toBe('CANCELLED');
    });
  });
});
