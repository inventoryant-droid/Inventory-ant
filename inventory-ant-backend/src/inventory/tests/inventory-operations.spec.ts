import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from '../application/services/inventory.service';
import { InventoryRepository } from '../infrastructure/repositories/inventory.repository';
import { InventoryValidator } from '../application/validators/inventory.validator';
import { StrategyResolver } from '../application/services/strategy.resolver';
import { PrismaService } from '../../prisma.service';
import { InventoryEventEmitter } from '../domain/events/inventory-event-emitter';
import { ReservationDto } from '../application/dto/reservation.dto';
import { TransferDto } from '../application/dto/transfer.dto';
import { AdjustmentDto } from '../application/dto/adjustment.dto';
import { 
  InsufficientStockException, 
  InvalidReservationException, 
  BatchNotFoundException 
} from '../application/exceptions/inventory.exceptions';

describe('InventoryService - Remaining Operations', () => {
  let service: InventoryService;
  let prismaService: any;
  let repository: any;
  let validator: any;
  let eventEmitter: any;

  const mockVariant = { id: 'v1', productId: 'p1' };
  const mockProduct = { id: 'p1', userId: 'user1' };
  const mockBatch = {
    id: 'b1',
    variantId: 'v1',
    warehouseId: 'w1',
    locationId: 'loc1',
    batchNumber: 'LOT-1',
    status: 'ACTIVE',
    availableQuantity: 100,
    reservedQuantity: 10,
    expiryDate: new Date(),
  };

  const mockTransaction = {
    id: 't1',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    prismaService = {
      $transaction: jest.fn((cb) => cb(prismaService)),
    };

    repository = {
      findVariantById: jest.fn().mockResolvedValue(mockVariant),
      findProductById: jest.fn().mockResolvedValue(mockProduct),
      findBusinessSettings: jest.fn(),
      findWarehouse: jest.fn(),
      findStorageLocation: jest.fn(),
      findVariantBatches: jest.fn(),
      reserveBatch: jest.fn(),
      releaseReservation: jest.fn(),
      decrementBatch: jest.fn(),
      incrementBatch: jest.fn(),
      syncProductQuantity: jest.fn(),
      createInventoryTransaction: jest.fn().mockResolvedValue(mockTransaction),
      updateBatch: jest.fn(),
    };

    validator = {
      validateBusinessSettings: jest.fn(),
      validateWarehouse: jest.fn(),
      validateStorageLocation: jest.fn(),
      validateBatchExists: jest.fn().mockResolvedValue(mockBatch),
      validateBatchStatus: jest.fn(),
      validateSellableQuantity: jest.fn(),
      validateReservation: jest.fn(),
      validateTransfer: jest.fn(),
      validateStockAvailability: jest.fn(),
      validateDamage: jest.fn(),
      validateExpiry: jest.fn(),
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: prismaService },
        { provide: InventoryRepository, useValue: repository },
        { provide: InventoryValidator, useValue: validator },
        { provide: StrategyResolver, useValue: {} },
        { provide: InventoryEventEmitter, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  describe('reserve', () => {
    const dto: ReservationDto = { batchId: 'b1', quantity: 10 };

    it('should successfully reserve stock, update database, and publish event', async () => {
      repository.reserveBatch.mockResolvedValue({ ...mockBatch, reservedQuantity: 20 });

      const res = await service.reserve(dto);

      expect(res.batchId).toBe('b1');
      expect(repository.reserveBatch).toHaveBeenCalledWith('b1', 10, prismaService);
      expect(eventEmitter.emit).toHaveBeenCalledWith('reservation.created', expect.any(Object));
    });

    it('should rollback transaction if validator fails', async () => {
      validator.validateSellableQuantity.mockRejectedValue(new InsufficientStockException());

      await expect(service.reserve(dto)).rejects.toThrow(InsufficientStockException);
      expect(repository.reserveBatch).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('releaseReservation', () => {
    const dto: ReservationDto = { batchId: 'b1', quantity: 5 };

    it('should successfully release reserved stock and publish event', async () => {
      repository.releaseReservation.mockResolvedValue({ ...mockBatch, reservedQuantity: 5 });

      const res = await service.releaseReservation(dto);

      expect(res.batchId).toBe('b1');
      expect(repository.releaseReservation).toHaveBeenCalledWith('b1', 5, prismaService);
      expect(eventEmitter.emit).toHaveBeenCalledWith('reservation.released', expect.any(Object));
    });
  });

  describe('transfer', () => {
    const dto: TransferDto = {
      userId: 'user1',
      variantId: 'v1',
      fromWarehouseId: 'w1',
      fromLocationId: 'loc1',
      toWarehouseId: 'w2',
      toLocationId: 'loc2',
      batchNumber: 'LOT-1',
      quantity: 15,
    };

    const destBatch = { ...mockBatch, id: 'b2', warehouseId: 'w2', locationId: 'loc2' };

    it('should successfully transfer stock and publish TransferCompletedEvent', async () => {
      repository.findVariantBatches.mockResolvedValue([mockBatch, destBatch]);

      const res = await service.transfer(dto);

      expect(res.batchId).toBe('b1');
      expect(repository.decrementBatch).toHaveBeenCalledWith('b1', 15, prismaService);
      expect(repository.incrementBatch).toHaveBeenCalledWith('b2', 15, prismaService);
      expect(eventEmitter.emit).toHaveBeenCalledWith('transfer.completed', expect.any(Object));
    });

    it('should throw BatchNotFoundException if target location batch does not exist', async () => {
      repository.findVariantBatches.mockResolvedValue([mockBatch]);

      await expect(service.transfer(dto)).rejects.toThrow(BatchNotFoundException);
      expect(repository.decrementBatch).not.toHaveBeenCalled();
    });
  });

  describe('damage', () => {
    const dto: AdjustmentDto = { batchId: 'b1', quantity: 10 };

    it('should decrement stock, log DAMAGE, and publish BatchDamagedEvent', async () => {
      repository.decrementBatch.mockResolvedValue(mockBatch);

      const res = await service.damage(dto);

      expect(res.batchId).toBe('b1');
      expect(repository.decrementBatch).toHaveBeenCalledWith('b1', 10, prismaService);
      expect(eventEmitter.emit).toHaveBeenCalledWith('batch.damaged', expect.any(Object));
    });
  });

  describe('expiry', () => {
    it('should update batch status, log EXPIRED, and publish BatchExpiredEvent', async () => {
      repository.updateBatch.mockResolvedValue({ ...mockBatch, status: 'EXPIRED' });

      const res = await service.expiry('b1');

      expect(res.batchId).toBe('b1');
      expect(repository.updateBatch).toHaveBeenCalledWith('b1', { status: 'EXPIRED' }, prismaService);
      expect(eventEmitter.emit).toHaveBeenCalledWith('batch.expired', expect.any(Object));
    });
  });

  describe('adjust', () => {
    it('should support positive adjustments (increments)', async () => {
      const dto: AdjustmentDto = { batchId: 'b1', quantity: 20 };
      repository.incrementBatch.mockResolvedValue(mockBatch);

      const res = await service.adjust(dto);

      expect(res.batchId).toBe('b1');
      expect(repository.incrementBatch).toHaveBeenCalledWith('b1', 20, prismaService);
      expect(repository.decrementBatch).not.toHaveBeenCalled();
    });

    it('should support negative adjustments (decrements)', async () => {
      const dto: AdjustmentDto = { batchId: 'b1', quantity: -20 };
      repository.decrementBatch.mockResolvedValue(mockBatch);

      const res = await service.adjust(dto);

      expect(res.batchId).toBe('b1');
      expect(repository.decrementBatch).toHaveBeenCalledWith('b1', 20, prismaService);
      expect(repository.incrementBatch).not.toHaveBeenCalled();
    });
  });

  describe('returnStock', () => {
    it('should increment stock and log RETURN', async () => {
      const dto: AdjustmentDto = { batchId: 'b1', quantity: 30 };
      repository.incrementBatch.mockResolvedValue(mockBatch);

      const res = await service.returnStock(dto);

      expect(res.batchId).toBe('b1');
      expect(repository.incrementBatch).toHaveBeenCalledWith('b1', 30, prismaService);
    });
  });
});
