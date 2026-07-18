import { Test, TestingModule } from '@nestjs/testing';
import { RequestForQuotationController } from '../request-for-quotation.controller';
import { RequestForQuotationService } from '../request-for-quotation.service';
import { SubscriptionRepository } from '../../subscription/subscription.repository';
import { CreateRFQDto } from '../dto/create-rfq.dto';
import { UpdateRFQDto } from '../dto/update-rfq.dto';
import { AddSupplierDto } from '../dto/add-supplier.dto';
import { JwtAuthGuard } from '../../users/jwt-auth.guard';
import { SubscriptionGuard } from '../../subscription/subscription.guard';

describe('RequestForQuotationController', () => {
  let controller: RequestForQuotationController;
  let service: jest.Mocked<RequestForQuotationService>;
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
      addSupplier: jest.fn(),
      removeSupplier: jest.fn(),
      getSuppliers: jest.fn(),
      findById: jest.fn(),
      list: jest.fn(),
      send: jest.fn(),
      closeResponses: jest.fn(),
      close: jest.fn(),
    };

    const mockSubRepo = {
      findUserByEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RequestForQuotationController],
      providers: [
        { provide: RequestForQuotationService, useValue: mockService },
        { provide: SubscriptionRepository, useValue: mockSubRepo },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(SubscriptionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<RequestForQuotationController>(RequestForQuotationController);
    service = module.get(RequestForQuotationService);
    subscriptionRepository = module.get(SubscriptionRepository);
  });

  describe('endpoints', () => {
    it('should resolve owner details and call service.create', async () => {
      const dto: CreateRFQDto = {
        requisitionId: 'req-123',
        expiryDate: new Date().toISOString(),
      };
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.create.mockResolvedValue({ id: 'rfq-1', ...dto } as any);

      const result = await controller.create(mockRequest, dto);

      expect(subscriptionRepository.findUserByEmail).toHaveBeenCalledWith('tenant@test.com');
      expect(service.create).toHaveBeenCalledWith(mockUser.id, mockRequest.user.sub, dto);
      expect(result.id).toBe('rfq-1');
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
      service.findById.mockResolvedValue({ id: 'rfq-1', rfqNumber: 'RFQ-1' } as any);

      const result = await controller.findOne(mockRequest, 'rfq-1');

      expect(service.findById).toHaveBeenCalledWith('rfq-1', mockUser.id);
      expect(result.rfqNumber).toBe('RFQ-1');
    });

    it('should resolve owner details and call service.update', async () => {
      const dto: UpdateRFQDto = { expiryDate: new Date().toISOString() };
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.update.mockResolvedValue({ id: 'rfq-1', expiryDate: new Date(dto.expiryDate!) } as any);

      const result = await controller.update(mockRequest, 'rfq-1', dto);

      expect(service.update).toHaveBeenCalledWith('rfq-1', mockUser.id, dto);
    });

    it('should resolve owner details and call service.send', async () => {
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.send.mockResolvedValue({ id: 'rfq-1', status: 'SENT' } as any);

      const result = await controller.send(mockRequest, 'rfq-1');

      expect(service.send).toHaveBeenCalledWith('rfq-1', mockUser.id);
      expect(result.status).toBe('SENT');
    });

    it('should resolve owner details and call service.closeResponses', async () => {
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.closeResponses.mockResolvedValue({ id: 'rfq-1', status: 'RESPONSES_CLOSED' } as any);

      const result = await controller.closeResponses(mockRequest, 'rfq-1');

      expect(service.closeResponses).toHaveBeenCalledWith('rfq-1', mockUser.id);
      expect(result.status).toBe('RESPONSES_CLOSED');
    });

    it('should resolve owner details and call service.close', async () => {
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.close.mockResolvedValue({ id: 'rfq-1', status: 'CLOSED' } as any);

      const result = await controller.close(mockRequest, 'rfq-1');

      expect(service.close).toHaveBeenCalledWith('rfq-1', mockUser.id);
      expect(result.status).toBe('CLOSED');
    });

    it('should resolve owner details and call service.addSupplier', async () => {
      const dto: AddSupplierDto = { supplierId: 'sup-123' };
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.addSupplier.mockResolvedValue({ id: 'conn-1', rfqId: 'rfq-1', supplierId: 'sup-123' } as any);

      const result = await controller.addSupplier(mockRequest, 'rfq-1', dto);

      expect(service.addSupplier).toHaveBeenCalledWith('rfq-1', mockUser.id, 'sup-123');
      expect(result.supplierId).toBe('sup-123');
    });

    it('should resolve owner details and call service.removeSupplier', async () => {
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.removeSupplier.mockResolvedValue({ id: 'conn-1', rfqId: 'rfq-1', supplierId: 'sup-123' } as any);

      const result = await controller.removeSupplier(mockRequest, 'rfq-1', 'sup-123');

      expect(service.removeSupplier).toHaveBeenCalledWith('rfq-1', mockUser.id, 'sup-123');
      expect(result.supplierId).toBe('sup-123');
    });

    it('should resolve owner details and call service.getSuppliers', async () => {
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.getSuppliers.mockResolvedValue([]);

      const result = await controller.getSuppliers(mockRequest, 'rfq-1');

      expect(service.getSuppliers).toHaveBeenCalledWith('rfq-1', mockUser.id);
      expect(result).toEqual([]);
    });
  });
});
