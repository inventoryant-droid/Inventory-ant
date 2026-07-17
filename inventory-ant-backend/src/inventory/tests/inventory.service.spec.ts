import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from '../application/services/inventory.service';
import { InventoryRepository } from '../infrastructure/repositories/inventory.repository';
import { InventoryValidator } from '../application/validators/inventory.validator';
import { StrategyResolver } from '../application/services/strategy.resolver';
import { PrismaService } from '../../prisma.service';
import { InventoryEventEmitter } from '../domain/events/inventory-event-emitter';
import { StockInDto } from '../application/dto/stock-in.dto';
import { BatchNotFoundException, InvalidWarehouseException } from '../application/exceptions/inventory.exceptions';

describe('InventoryService - stockIn', () => {
  let service: InventoryService;
  let prismaService: any;
  let repository: any;
  let validator: any;
  let eventEmitter: any;

  const mockDto: StockInDto = {
    variantId: 'v1',
    warehouseId: 'w1',
    storageLocationId: 'loc1',
    batchNumber: 'LOT-1',
    quantity: 50,
    purchasePrice: 10,
    mrp: 15,
  };

  const mockVariant = { id: 'v1', productId: 'p1' };
  const mockProduct = { id: 'p1', userId: 'user1' };
  const mockBatch = {
    id: 'b1',
    variantId: 'v1',
    warehouseId: 'w1',
    locationId: 'loc1',
    batchNumber: 'LOT-1',
    status: 'ACTIVE',
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
      findVariantById: jest.fn(),
      findProductById: jest.fn(),
      findBusinessSettings: jest.fn(),
      findWarehouse: jest.fn(),
      findStorageLocation: jest.fn(),
      findVariantBatches: jest.fn(),
      findBatchById: jest.fn(),
      incrementBatch: jest.fn(),
      syncProductQuantity: jest.fn(),
      createInventoryTransaction: jest.fn(),
    };

    validator = {
      validateBusinessSettings: jest.fn(),
      validateWarehouse: jest.fn(),
      validateStorageLocation: jest.fn(),
      validateBatchExists: jest.fn(),
      validateBatchStatus: jest.fn(),
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

  it('should successfully allocate stock in a transaction, sync catalog, audit log, and emit event', async () => {
    repository.findVariantById.mockResolvedValue(mockVariant);
    repository.findProductById.mockResolvedValue(mockProduct);
    repository.findVariantBatches.mockResolvedValue([mockBatch]);
    repository.incrementBatch.mockResolvedValue({ ...mockBatch, availableQuantity: 50 });
    repository.createInventoryTransaction.mockResolvedValue(mockTransaction);

    const result = await service.stockIn(mockDto);

    expect(result).toEqual({
      transactionId: 't1',
      batchId: 'b1',
      productId: 'p1',
      variantId: 'v1',
      quantity: 50,
      warehouseId: 'w1',
      completedAt: mockTransaction.createdAt,
    });

    expect(repository.findVariantById).toHaveBeenCalledWith('v1', prismaService);
    expect(repository.incrementBatch).toHaveBeenCalledWith('b1', 50, prismaService);
    expect(repository.syncProductQuantity).toHaveBeenCalledWith('p1', prismaService);
    expect(repository.createInventoryTransaction).toHaveBeenCalledWith(expect.any(Object), prismaService);
    expect(validator.validateWarehouse).toHaveBeenCalledWith('w1', prismaService);
    expect(validator.validateBatchStatus).toHaveBeenCalledWith('b1', 'ACTIVE', prismaService);

    expect(eventEmitter.emit).toHaveBeenCalledWith('stock-in.completed', expect.any(Object));
  });

  it('should throw BatchNotFoundException and rollback if batch is missing', async () => {
    repository.findVariantById.mockResolvedValue(mockVariant);
    repository.findProductById.mockResolvedValue(mockProduct);
    repository.findVariantBatches.mockResolvedValue([]);

    await expect(service.stockIn(mockDto)).rejects.toThrow(BatchNotFoundException);

    expect(repository.incrementBatch).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('should throw InvalidWarehouseException and rollback if warehouse validation fails', async () => {
    repository.findVariantById.mockResolvedValue(mockVariant);
    repository.findProductById.mockResolvedValue(mockProduct);
    repository.findVariantBatches.mockResolvedValue([mockBatch]);
    validator.validateWarehouse.mockRejectedValue(new InvalidWarehouseException('Warehouse inactive'));

    await expect(service.stockIn(mockDto)).rejects.toThrow(InvalidWarehouseException);

    expect(repository.incrementBatch).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('should rollback transaction if repository update fails', async () => {
    repository.findVariantById.mockResolvedValue(mockVariant);
    repository.findProductById.mockResolvedValue(mockProduct);
    repository.findVariantBatches.mockResolvedValue([mockBatch]);
    repository.incrementBatch.mockRejectedValue(new Error('DB Error'));

    await expect(service.stockIn(mockDto)).rejects.toThrow('DB Error');

    expect(repository.createInventoryTransaction).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });
});
