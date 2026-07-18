import { Test, TestingModule } from '@nestjs/testing';
import { PurchaseApprovalController } from '../purchase-approval.controller';
import { PurchaseApprovalService } from '../purchase-approval.service';
import { SubscriptionRepository } from '../../subscription/subscription.repository';
import { StartApprovalDto } from '../dto/start-approval.dto';
import { ActionApprovalDto } from '../dto/action-approval.dto';
import { CommentApprovalDto } from '../dto/comment-approval.dto';
import { JwtAuthGuard } from '../../users/jwt-auth.guard';
import { SubscriptionGuard } from '../../subscription/subscription.guard';

describe('PurchaseApprovalController', () => {
  let controller: PurchaseApprovalController;
  let service: jest.Mocked<PurchaseApprovalService>;
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
      role: 'Manager',
    },
    ip: '127.0.0.1',
    headers: {
      'user-agent': 'Jest Test',
    },
  };

  beforeEach(async () => {
    const mockService = {
      startWorkflow: jest.fn(),
      approve: jest.fn(),
      reject: jest.fn(),
      addComment: jest.fn(),
      getHistory: jest.fn(),
      listPending: jest.fn(),
    };

    const mockSubRepo = {
      findUserByEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PurchaseApprovalController],
      providers: [
        { provide: PurchaseApprovalService, useValue: mockService },
        { provide: SubscriptionRepository, useValue: mockSubRepo },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(SubscriptionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PurchaseApprovalController>(PurchaseApprovalController);
    service = module.get(PurchaseApprovalService);
    subscriptionRepository = module.get(SubscriptionRepository);
  });

  describe('endpoints', () => {
    it('should resolve owner details and call startWorkflow', async () => {
      const dto: StartApprovalDto = { purchaseOrderId: 'po-123' };
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.startWorkflow.mockResolvedValue({ id: 'inst-1' } as any);

      const result = await controller.start(mockRequest, dto);

      expect(subscriptionRepository.findUserByEmail).toHaveBeenCalledWith('tenant@test.com');
      expect(service.startWorkflow).toHaveBeenCalledWith('po-123', mockUser.id);
      expect(result.id).toBe('inst-1');
    });

    it('should resolve owner details and call listPending', async () => {
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.listPending.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 });

      const result = await controller.findPending(mockRequest, '2', '5');

      expect(service.listPending).toHaveBeenCalledWith(mockUser.id, 'Manager', {
        page: 2,
        pageSize: 5,
      });
      expect(result.total).toBe(0);
    });

    it('should resolve owner details and call getHistory', async () => {
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.getHistory.mockResolvedValue([]);

      const result = await controller.findHistory(mockRequest, 'po-123');

      expect(service.getHistory).toHaveBeenCalledWith('po-123', mockUser.id);
      expect(result).toEqual([]);
    });

    it('should resolve owner details and call approve', async () => {
      const dto: ActionApprovalDto = { comment: 'Approved!' };
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.approve.mockResolvedValue({ id: 'inst-1', status: 'APPROVED' } as any);

      const result = await controller.approve(mockRequest, 'inst-1', dto);

      expect(service.approve).toHaveBeenCalledWith(
        'inst-1',
        mockUser.id,
        'Manager',
        'employee-id-456',
        'Approved!',
        '127.0.0.1',
        'Jest Test',
      );
      expect(result.status).toBe('APPROVED');
    });

    it('should resolve owner details and call reject', async () => {
      const dto: ActionApprovalDto = { comment: 'Rejected!' };
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.reject.mockResolvedValue({ id: 'inst-1', status: 'REJECTED' } as any);

      const result = await controller.reject(mockRequest, 'inst-1', dto);

      expect(service.reject).toHaveBeenCalledWith(
        'inst-1',
        mockUser.id,
        'Manager',
        'employee-id-456',
        'Rejected!',
        '127.0.0.1',
        'Jest Test',
      );
      expect(result.status).toBe('REJECTED');
    });

    it('should resolve owner details and call addComment', async () => {
      const dto: CommentApprovalDto = { comment: 'Checking detail', level: 1 };
      subscriptionRepository.findUserByEmail.mockResolvedValue(mockUser as any);
      service.addComment.mockResolvedValue({ id: 'act-1' } as any);

      const result = await controller.comment(mockRequest, 'inst-1', dto);

      expect(service.addComment).toHaveBeenCalledWith(
        'inst-1',
        mockUser.id,
        'employee-id-456',
        'Checking detail',
        1,
      );
      expect(result.id).toBe('act-1');
    });
  });
});
