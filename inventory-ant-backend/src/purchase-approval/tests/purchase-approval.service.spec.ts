import { Test, TestingModule } from '@nestjs/testing';
import { PurchaseApprovalService } from '../purchase-approval.service';
import { PurchaseApprovalRepository } from '../purchase-approval.repository';
import { PurchaseOrderRepository } from '../../purchase-order/purchase-order.repository';
import { PurchaseApprovalEventEmitter } from '../domain/events/approval-event-emitter';
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PurchaseStatus } from '@prisma/client';

describe('PurchaseApprovalService', () => {
  let service: PurchaseApprovalService;
  let repository: jest.Mocked<PurchaseApprovalRepository>;
  let poRepository: jest.Mocked<PurchaseOrderRepository>;
  let eventEmitter: jest.Mocked<PurchaseApprovalEventEmitter>;

  const userId = 'tenant-123';
  const purchaseOrderId = 'po-123';
  const instanceId = 'inst-123';
  const approverId = 'user-approver-789';

  const mockPO = {
    id: purchaseOrderId,
    total: 150000, // Matching level: Manager -> Finance
    status: PurchaseStatus.PENDING_APPROVAL,
    userId,
  };

  const mockRule = {
    id: 'rule-finance',
    userId,
    minAmount: 50000.01,
    maxAmount: 500000,
    roleSequence: ['Manager', 'Finance'],
  };

  const mockInstance = {
    id: instanceId,
    purchaseOrderId,
    ruleId: 'rule-finance',
    userId,
    status: 'IN_PROGRESS',
    currentLevel: 0,
    steps: [
      { id: 'step-1', instanceId, level: 0, role: 'Manager', status: 'PENDING' },
      { id: 'step-2', instanceId, level: 1, role: 'Finance', status: 'PENDING' },
    ],
  };

  beforeEach(async () => {
    const mockRepo = {
      seedRulesIfNone: jest.fn(),
      findActiveRuleForAmount: jest.fn(),
      createInstance: jest.fn(),
      findInstanceById: jest.fn(),
      findInstanceByPOId: jest.fn(),
      updateStepStatus: jest.fn(),
      updateInstance: jest.fn(),
      createAction: jest.fn(),
      listPendingApprovals: jest.fn(),
      getApprovalHistory: jest.fn(),
      updatePOStatus: jest.fn(),
    };

    const mockPoRepo = {
      findByIdWithDetails: jest.fn(),
    };

    const mockEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchaseApprovalService,
        { provide: PurchaseApprovalRepository, useValue: mockRepo },
        { provide: PurchaseOrderRepository, useValue: mockPoRepo },
        { provide: PurchaseApprovalEventEmitter, useValue: mockEmitter },
      ],
    }).compile();

    service = module.get<PurchaseApprovalService>(PurchaseApprovalService);
    repository = module.get(PurchaseApprovalRepository);
    poRepository = module.get(PurchaseOrderRepository);
    eventEmitter = module.get(PurchaseApprovalEventEmitter);
  });

  describe('startWorkflow', () => {
    it('should successfully create instance and assign first step if PO is pending approval', async () => {
      poRepository.findByIdWithDetails.mockResolvedValue(mockPO as any);
      repository.findInstanceByPOId.mockResolvedValue(null);
      repository.findActiveRuleForAmount.mockResolvedValue(mockRule as any);
      repository.createInstance.mockResolvedValue(mockInstance as any);
      repository.findInstanceById.mockResolvedValue(mockInstance as any);

      const result = await service.startWorkflow(purchaseOrderId, userId);

      expect(result).toBeDefined();
      expect(repository.createInstance).toHaveBeenCalledWith(userId, purchaseOrderId, mockRule.id, mockRule.roleSequence);
      expect(repository.updateInstance).toHaveBeenCalledWith(mockInstance.id, 'IN_PROGRESS', 0);
      expect(repository.updatePOStatus).toHaveBeenCalledWith(purchaseOrderId, userId, PurchaseStatus.UNDER_APPROVAL);
      expect(eventEmitter.emit).toHaveBeenCalledWith('approval.started', expect.any(Object));
      expect(eventEmitter.emit).toHaveBeenCalledWith('approval.assigned', expect.any(Object));
    });

    it('should throw BadRequestException if PO is not in PENDING_APPROVAL status', async () => {
      poRepository.findByIdWithDetails.mockResolvedValue({
        ...mockPO,
        status: PurchaseStatus.DRAFT,
      } as any);

      await expect(service.startWorkflow(purchaseOrderId, userId)).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if active approval workflow already exists', async () => {
      poRepository.findByIdWithDetails.mockResolvedValue(mockPO as any);
      repository.findInstanceByPOId.mockResolvedValue(mockInstance as any);

      await expect(service.startWorkflow(purchaseOrderId, userId)).rejects.toThrow(ConflictException);
    });
  });

  describe('approve', () => {
    it('should successfully approve first step and increment level', async () => {
      repository.findInstanceById.mockResolvedValue(mockInstance as any);
      repository.updateStepStatus.mockResolvedValue(mockInstance.steps[0] as any);
      repository.findInstanceById.mockResolvedValueOnce(mockInstance as any)
                                  .mockResolvedValueOnce({ ...mockInstance, currentLevel: 1 } as any);

      const result = await service.approve(instanceId, userId, 'Manager', approverId, 'Approve Step 1');

      expect(result.currentLevel).toBe(1);
      expect(repository.updateStepStatus).toHaveBeenCalledWith('step-1', 'APPROVED', approverId, 'Approve Step 1');
      expect(repository.updateInstance).toHaveBeenCalledWith(instanceId, 'IN_PROGRESS', 1);
      expect(eventEmitter.emit).toHaveBeenCalledWith('approval.approved', expect.any(Object));
      expect(eventEmitter.emit).toHaveBeenCalledWith('approval.assigned', expect.any(Object));
    });

    it('should finalize workflow and set PO to APPROVED on final approval level', async () => {
      const secondLevelInstance = {
        ...mockInstance,
        currentLevel: 1,
        steps: [
          { id: 'step-1', instanceId, level: 0, role: 'Manager', status: 'APPROVED' },
          { id: 'step-2', instanceId, level: 1, role: 'Finance', status: 'PENDING' },
        ],
      };
      repository.findInstanceById.mockResolvedValue(secondLevelInstance as any);
      repository.updateStepStatus.mockResolvedValue(secondLevelInstance.steps[1] as any);

      await service.approve(instanceId, userId, 'Finance', approverId, 'Final Approval');

      expect(repository.updateInstance).toHaveBeenCalledWith(instanceId, 'APPROVED', 1);
      expect(repository.updatePOStatus).toHaveBeenCalledWith(purchaseOrderId, userId, PurchaseStatus.APPROVED);
      expect(eventEmitter.emit).toHaveBeenCalledWith('po.approved', expect.any(Object));
      expect(eventEmitter.emit).toHaveBeenCalledWith('po.ready-to-send', expect.any(Object));
    });

    it('should throw BadRequestException if approver role does not match current step', async () => {
      repository.findInstanceById.mockResolvedValue(mockInstance as any);

      await expect(service.approve(instanceId, userId, 'Finance', approverId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('reject', () => {
    it('should reject step and transition workflow & PO to REJECTED', async () => {
      repository.findInstanceById.mockResolvedValue(mockInstance as any);

      await service.reject(instanceId, userId, 'Manager', approverId, 'Rejecting for details');

      expect(repository.updateStepStatus).toHaveBeenCalledWith('step-1', 'REJECTED', approverId, 'Rejecting for details');
      expect(repository.updateInstance).toHaveBeenCalledWith(instanceId, 'REJECTED', 0);
      expect(repository.updatePOStatus).toHaveBeenCalledWith(purchaseOrderId, userId, PurchaseStatus.REJECTED);
      expect(eventEmitter.emit).toHaveBeenCalledWith('approval.rejected', expect.any(Object));
      expect(eventEmitter.emit).toHaveBeenCalledWith('po.rejected', expect.any(Object));
    });
  });

  describe('comments', () => {
    it('should add comment to action log history', async () => {
      repository.findInstanceById.mockResolvedValue(mockInstance as any);

      await service.addComment(instanceId, userId, approverId, 'Checking spec', 0);

      expect(repository.createAction).toHaveBeenCalledWith({
        userId,
        purchaseOrderId,
        instanceId,
        performedBy: approverId,
        action: 'COMMENT',
        level: 0,
        comment: 'Checking spec',
      });
    });
  });
});
