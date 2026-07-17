import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from '../application/services/inventory.service';
import { InventoryRepository } from '../infrastructure/repositories/inventory.repository';
import { InventoryValidator } from '../application/validators/inventory.validator';
import { StrategyResolver } from '../application/services/strategy.resolver';
import { PrismaService } from '../../prisma.service';
import { InventoryEventEmitter } from '../domain/events/inventory-event-emitter';
import { StockOutDto } from '../application/dto/stock-out.dto';
import { InsufficientStockException } from '../application/exceptions/inventory.exceptions';

describe('InventoryService - stockOut', () => {
  let service: InventoryService;
  let prismaService: any;
  let repository: any;
  let validator: any;
  let strategyResolver: any;
  let eventEmitter: any;
  let mockStrategy: any;

  const mockDto: StockOutDto = {
    userId: 'user1',
    variantId: 'v1',
    warehouseId: 'w1',
    quantity: 100,
  };

  const mockVariant = { id: 'v1', productId: 'p1' };
  const mockProduct = { id: 'p1', userId: 'user1' };
  const mockTransaction = {
    id: 't1',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    prismaService = {
      $transaction: jest.fn((cb) => cb(prismaService)),
    };

    repository = {
      findVariantById: jest.fn(),
      findProductById: jest.fn(),
      findBusinessSettings: jest.fn(),
      findWarehouse: jest.fn(),
      decrementBatch: jest.fn(),
      syncProductQuantity: jest.fn(),
      createInventoryTransaction: jest.fn(),
    };

    validator = {
      validateBusinessSettings: jest.fn(),
      validateWarehouse: jest.fn(),
      validateVariantExists: jest.fn(),
      validateBatchExists: jest.fn(),
      validateBatchStatus: jest.fn(),
      validateSellableQuantity: jest.fn(),
    };

    mockStrategy = {
      selectBatches: jest.fn(),
    };

    strategyResolver = {
      resolveForUser: jest.fn().mockResolvedValue(mockStrategy),
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
        { provide: StrategyResolver, useValue: strategyResolver },
        { provide: InventoryEventEmitter, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  it('should successfully allocate stock (single batch), decrement, sync catalog, audit log, and emit event', async () => {
    repository.findVariantById.mockResolvedValue(mockVariant);
    repository.findProductById.mockResolvedValue(mockProduct);
    mockStrategy.selectBatches.mockResolvedValue([{ batchId: 'b1', quantity: 100 }]);
    repository.createInventoryTransaction.mockResolvedValue(mockTransaction);

    const result = await service.stockOut(mockDto);

    expect(result).toEqual({
      transactionId: 't1',
      productId: 'p1',
      variantId: 'v1',
      warehouseId: 'w1',
      quantity: 100,
      requestedQuantity: 100,
      allocatedQuantity: 100,
      allocations: [{ batchId: 'b1', quantity: 100 }],
      completedAt: mockTransaction.createdAt,
    });

    expect(repository.decrementBatch).toHaveBeenCalledWith('b1', 100, prismaService);
    expect(repository.syncProductQuantity).toHaveBeenCalledWith('p1', prismaService);
    expect(repository.createInventoryTransaction).toHaveBeenCalledWith(expect.any(Object), prismaService);
    expect(eventEmitter.emit).toHaveBeenCalledWith('stock-out.completed', expect.any(Object));
  });

  it('should support multi-batch allocation and correctly distribute decrements', async () => {
    repository.findVariantById.mockResolvedValue(mockVariant);
    repository.findProductById.mockResolvedValue(mockProduct);
    mockStrategy.selectBatches.mockResolvedValue([
      { batchId: 'b1', quantity: 60 },
      { batchId: 'b2', quantity: 40 },
    ]);
    repository.createInventoryTransaction.mockResolvedValue(mockTransaction);

    const result = await service.stockOut(mockDto);

    expect(result.allocatedQuantity).toBe(100);
    expect(repository.decrementBatch).toHaveBeenCalledWith('b1', 60, prismaService);
    expect(repository.decrementBatch).toHaveBeenCalledWith('b2', 40, prismaService);
  });

  it('should throw InsufficientStockException and rollback if strategy cannot satisfy requested quantity', async () => {
    repository.findVariantById.mockResolvedValue(mockVariant);
    repository.findProductById.mockResolvedValue(mockProduct);
    mockStrategy.selectBatches.mockResolvedValue([{ batchId: 'b1', quantity: 80 }]);

    await expect(service.stockOut(mockDto)).rejects.toThrow(InsufficientStockException);

    expect(repository.decrementBatch).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('should rollback transaction if validator throws error for any batch (e.g. expired / reserved stock)', async () => {
    repository.findVariantById.mockResolvedValue(mockVariant);
    repository.findProductById.mockResolvedValue(mockProduct);
    mockStrategy.selectBatches.mockResolvedValue([{ batchId: 'b1', quantity: 100 }]);
    validator.validateSellableQuantity.mockRejectedValue(new InsufficientStockException('Expired stock'));

    await expect(service.stockOut(mockDto)).rejects.toThrow(InsufficientStockException);

    expect(repository.decrementBatch).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('should rollback transaction if repository decrement fails', async () => {
    repository.findVariantById.mockResolvedValue(mockVariant);
    repository.findProductById.mockResolvedValue(mockProduct);
    mockStrategy.selectBatches.mockResolvedValue([{ batchId: 'b1', quantity: 100 }]);
    repository.decrementBatch.mockRejectedValue(new Error('DB Error'));

    await expect(service.stockOut(mockDto)).rejects.toThrow('DB Error');

    expect(repository.syncProductQuantity).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });
});
