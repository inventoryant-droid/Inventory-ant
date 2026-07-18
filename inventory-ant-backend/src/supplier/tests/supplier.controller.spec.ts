import { Test, TestingModule } from '@nestjs/testing';
import { SupplierController } from '../supplier.controller';
import { SupplierService } from '../supplier.service';
import { SubscriptionRepository } from '../../subscription/subscription.repository';
import { CreateSupplierDto } from '../dto/create-supplier.dto';
import { UpdateSupplierDto } from '../dto/update-supplier.dto';
import { JwtAuthGuard } from '../../users/jwt-auth.guard';
import { SubscriptionGuard } from '../../subscription/subscription.guard';

describe('SupplierController', () => {
  let controller: SupplierController;
  let service: jest.Mocked<SupplierService>;
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
      activate: jest.fn(),
      deactivate: jest.fn(),
      softDelete: jest.fn(),
    };

    const mockSubRepo = {
      findUserByEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SupplierController],
      providers: [
        { provide: SupplierService, useValue: mockService },
        { provide: SubscriptionRepository, useValue: mockSubRepo },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(SubscriptionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SupplierController>(SupplierController);
    service = module.get(SupplierService);
    subscriptionRepository = module.get(SubscriptionRepository);
  });

  describe('endpoints', () => {
    it('should resolve owner ID and call service.create', async () => {
      const dto: CreateSupplierDto = { name: 'Test Supplier' };
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.create.mockResolvedValue({ id: '1', ...dto } as any);

      const result = await controller.create(mockRequest, dto);

      expect(subscriptionRepository.findUserByEmail).toHaveBeenCalledWith('tenant@test.com');
      expect(service.create).toHaveBeenCalledWith(mockUser.id, dto);
      expect(result.id).toBe('1');
    });

    it('should resolve owner ID and call service.list with parameters', async () => {
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.list.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 });

      const result = await controller.findAll(mockRequest, '2', '5', 'search-term', 'true');

      expect(service.list).toHaveBeenCalledWith(mockUser.id, {
        page: 2,
        pageSize: 5,
        search: 'search-term',
        active: true,
      });
      expect(result.total).toBe(0);
    });

    it('should resolve owner ID and call service.findById', async () => {
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.findById.mockResolvedValue({ id: '1', name: 'Test' } as any);

      const result = await controller.findOne(mockRequest, '1');

      expect(service.findById).toHaveBeenCalledWith('1', mockUser.id);
      expect(result.name).toBe('Test');
    });

    it('should resolve owner ID and call service.update', async () => {
      const dto: UpdateSupplierDto = { name: 'New Name' };
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.update.mockResolvedValue({ id: '1', name: 'New Name' } as any);

      const result = await controller.update(mockRequest, '1', dto);

      expect(service.update).toHaveBeenCalledWith('1', mockUser.id, dto);
      expect(result.name).toBe('New Name');
    });

    it('should resolve owner ID and call service.activate', async () => {
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.activate.mockResolvedValue({ id: '1', isActive: true } as any);

      const result = await controller.activate(mockRequest, '1');

      expect(service.activate).toHaveBeenCalledWith('1', mockUser.id);
      expect(result.isActive).toBe(true);
    });

    it('should resolve owner ID and call service.deactivate', async () => {
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.deactivate.mockResolvedValue({ id: '1', isActive: false } as any);

      const result = await controller.deactivate(mockRequest, '1');

      expect(service.deactivate).toHaveBeenCalledWith('1', mockUser.id);
      expect(result.isActive).toBe(false);
    });

    it('should resolve owner ID and call service.softDelete', async () => {
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.softDelete.mockResolvedValue({ id: '1', isDeleted: true } as any);

      const result = await controller.remove(mockRequest, '1');

      expect(service.softDelete).toHaveBeenCalledWith('1', mockUser.id);
      expect(result.isDeleted).toBe(true);
    });
  });
});
