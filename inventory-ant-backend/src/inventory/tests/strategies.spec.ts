import { Test, TestingModule } from '@nestjs/testing';
import { FifoStrategy } from '../domain/strategies/fifo-strategy';
import { LifoStrategy } from '../domain/strategies/lifo-strategy';
import { FefoStrategy } from '../domain/strategies/fefo-strategy';
import { StrategyResolver } from '../application/services/strategy.resolver';
import { InventoryRepository } from '../infrastructure/repositories/inventory.repository';
import { ProductBatch } from '@prisma/client';

describe('Inventory Release Strategies', () => {
  let fifo: FifoStrategy;
  let lifo: LifoStrategy;
  let fefo: FefoStrategy;
  let resolver: StrategyResolver;
  let repository: any;

  const baseDate = new Date('2026-01-01T00:00:00Z');

  const createMockBatch = (
    id: string, 
    ageInDays: number, 
    available: number, 
    reserved: number, 
    expiryDays?: number, 
    status: string = 'ACTIVE'
  ): ProductBatch => {
    return {
      id,
      variantId: 'v1',
      warehouseId: 'w1',
      storageLocationId: 'loc1',
      batchNumber: `B-${id}`,
      availableQuantity: available,
      reservedQuantity: reserved,
      purchasePrice: 10,
      mrp: 15,
      status,
      expiryDate: expiryDays !== undefined ? new Date(baseDate.getTime() + expiryDays * 24 * 60 * 60 * 1000) : null,
      manufacturingDate: null,
      createdAt: new Date(baseDate.getTime() + ageInDays * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    };
  };

  beforeEach(async () => {
    repository = {
      findSellableBatches: jest.fn(),
      findBusinessSettings: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FifoStrategy,
        LifoStrategy,
        FefoStrategy,
        StrategyResolver,
        { provide: InventoryRepository, useValue: repository },
      ],
    }).compile();

    fifo = module.get<FifoStrategy>(FifoStrategy);
    lifo = module.get<LifoStrategy>(LifoStrategy);
    fefo = module.get<FefoStrategy>(FefoStrategy);
    resolver = module.get<StrategyResolver>(StrategyResolver);
  });

  describe('FIFO Strategy', () => {
    it('should allocate stock in FIFO (createdAt ASC) order', async () => {
      const batches = [
        createMockBatch('oldest', 1, 50, 0),
        createMockBatch('newest', 10, 50, 0),
        createMockBatch('middle', 5, 50, 0),
      ];
      repository.findSellableBatches.mockResolvedValue(batches);

      const allocation = await fifo.selectBatches('v1', 'w1', 75);

      expect(allocation).toEqual([
        { batchId: 'oldest', quantity: 50 },
        { batchId: 'middle', quantity: 25 },
      ]);
    });
  });

  describe('LIFO Strategy', () => {
    it('should allocate stock in LIFO (createdAt DESC) order', async () => {
      const batches = [
        createMockBatch('oldest', 1, 50, 0),
        createMockBatch('newest', 10, 50, 0),
        createMockBatch('middle', 5, 50, 0),
      ];
      repository.findSellableBatches.mockResolvedValue(batches);

      const allocation = await lifo.selectBatches('v1', 'w1', 75);

      expect(allocation).toEqual([
        { batchId: 'newest', quantity: 50 },
        { batchId: 'middle', quantity: 25 },
      ]);
    });
  });

  describe('FEFO Strategy', () => {
    it('should allocate stock in FEFO (expiryDate ASC) order and place null expiry last', async () => {
      const batches = [
        createMockBatch('nullExpiry', 1, 50, 0),
        createMockBatch('farExpiry', 1, 50, 0, 30),
        createMockBatch('nearExpiry', 1, 50, 0, 5),
      ];
      repository.findSellableBatches.mockResolvedValue(batches);

      const allocation = await fefo.selectBatches('v1', 'w1', 120);

      expect(allocation).toEqual([
        { batchId: 'nearExpiry', quantity: 50 },
        { batchId: 'farExpiry', quantity: 50 },
        { batchId: 'nullExpiry', quantity: 20 },
      ]);
    });
  });

  describe('Shared Strategy Rules', () => {
    it('should support partial allocation across multiple batches', async () => {
      const batches = [
        createMockBatch('b1', 1, 30, 0),
        createMockBatch('b2', 2, 20, 0),
        createMockBatch('b3', 3, 50, 0),
      ];
      repository.findSellableBatches.mockResolvedValue(batches);

      const allocation = await fifo.selectBatches('v1', 'w1', 100);

      expect(allocation).toEqual([
        { batchId: 'b1', quantity: 30 },
        { batchId: 'b2', quantity: 20 },
        { batchId: 'b3', quantity: 50 },
      ]);
    });

    it('should handle insufficient stock by allocating all available sellable stock', async () => {
      const batches = [
        createMockBatch('b1', 1, 30, 0),
        createMockBatch('b2', 2, 20, 0),
      ];
      repository.findSellableBatches.mockResolvedValue(batches);

      const allocation = await fifo.selectBatches('v1', 'w1', 100);

      expect(allocation).toEqual([
        { batchId: 'b1', quantity: 30 },
        { batchId: 'b2', quantity: 20 },
      ]);
    });

    it('should never allocate reserved stock (available - reserved = sellable)', async () => {
      const batches = [
        createMockBatch('b1', 1, 100, 40),
      ];
      repository.findSellableBatches.mockResolvedValue(batches);

      const allocation = await fifo.selectBatches('v1', 'w1', 100);

      expect(allocation).toEqual([
        { batchId: 'b1', quantity: 60 },
      ]);
    });

    it('should never allocate zero quantity batches', async () => {
      const batches = [
        createMockBatch('zero', 1, 0, 0),
        createMockBatch('positive', 2, 50, 0),
      ];
      repository.findSellableBatches.mockResolvedValue(batches);

      const allocation = await fifo.selectBatches('v1', 'w1', 20);

      expect(allocation).toEqual([
        { batchId: 'positive', quantity: 20 },
      ]);
    });
  });

  describe('StrategyResolver', () => {
    it('should resolve correct strategy from string name', () => {
      expect(resolver.resolve('FIFO')).toBe(fifo);
      expect(resolver.resolve('LIFO')).toBe(lifo);
      expect(resolver.resolve('FEFO')).toBe(fefo);
      expect(resolver.resolve('UNKNOWN')).toBe(fifo);
    });

    it('should resolve strategy from settings using resolveForUser', async () => {
      repository.findBusinessSettings.mockResolvedValue({ inventoryStrategy: 'LIFO' });
      const strategy = await resolver.resolveForUser('user1');
      expect(strategy).toBe(lifo);
    });
  });
});
