import { Test, TestingModule } from '@nestjs/testing';
import { InventoryValidator } from '../application/validators/inventory.validator';
import { InventoryRepository } from '../infrastructure/repositories/inventory.repository';
import { 
  BatchNotFoundException, 
  InsufficientStockException, 
  InvalidWarehouseException, 
  InvalidReservationException 
} from '../application/exceptions/inventory.exceptions';
import { TransferDto } from '../application/dto/transfer.dto';

describe('InventoryValidator', () => {
  let validator: InventoryValidator;
  let repository: any;

  const mockBatch = {
    id: 'b1',
    variantId: 'v1',
    warehouseId: 'w1',
    availableQuantity: 100,
    reservedQuantity: 20,
    status: 'ACTIVE',
    expiryDate: null,
  };

  beforeEach(async () => {
    repository = {
      findBatchById: jest.fn(),
      findVariantById: jest.fn(),
      findWarehouse: jest.fn(),
      findStorageLocation: jest.fn(),
      findBusinessSettings: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryValidator,
        { provide: InventoryRepository, useValue: repository },
      ],
    }).compile();

    validator = module.get<InventoryValidator>(InventoryValidator);
  });

  describe('validateBatchExists', () => {
    it('should return batch if it exists', async () => {
      repository.findBatchById.mockResolvedValue(mockBatch);
      await expect(validator.validateBatchExists('b1')).resolves.toEqual(mockBatch);
    });

    it('should throw BatchNotFoundException if batch is null', async () => {
      repository.findBatchById.mockResolvedValue(null);
      await expect(validator.validateBatchExists('b1')).rejects.toThrow(BatchNotFoundException);
    });
  });

  describe('validateWarehouse', () => {
    it('should succeed if warehouse exists and is active', async () => {
      repository.findWarehouse.mockResolvedValue({ id: 'w1', isActive: true });
      await expect(validator.validateWarehouse('w1')).resolves.toBeDefined();
    });

    it('should throw InvalidWarehouseException if warehouse is inactive', async () => {
      repository.findWarehouse.mockResolvedValue({ id: 'w1', isActive: false });
      await expect(validator.validateWarehouse('w1')).rejects.toThrow(InvalidWarehouseException);
    });

    it('should throw InvalidWarehouseException if warehouse does not exist', async () => {
      repository.findWarehouse.mockResolvedValue(null);
      await expect(validator.validateWarehouse('w1')).rejects.toThrow(InvalidWarehouseException);
    });
  });

  describe('validateStorageLocation', () => {
    it('should succeed if location belongs to target warehouse', async () => {
      repository.findStorageLocation.mockResolvedValue({ id: 'l1', warehouseId: 'w1' });
      await expect(validator.validateStorageLocation('l1', 'w1')).resolves.toBeDefined();
    });

    it('should throw InvalidWarehouseException if location belongs to different warehouse', async () => {
      repository.findStorageLocation.mockResolvedValue({ id: 'l1', warehouseId: 'w2' });
      await expect(validator.validateStorageLocation('l1', 'w1')).rejects.toThrow(InvalidWarehouseException);
    });
  });

  describe('validateStockAvailability', () => {
    it('should succeed if available >= requested', async () => {
      repository.findBatchById.mockResolvedValue(mockBatch);
      await expect(validator.validateStockAvailability('b1', 50)).resolves.not.toThrow();
    });

    it('should throw InsufficientStockException if available < requested', async () => {
      repository.findBatchById.mockResolvedValue(mockBatch);
      await expect(validator.validateStockAvailability('b1', 120)).rejects.toThrow(InsufficientStockException);
    });
  });

  describe('validateSellableQuantity', () => {
    it('should succeed if sellable (available - reserved) >= requested', async () => {
      repository.findBatchById.mockResolvedValue(mockBatch);
      await expect(validator.validateSellableQuantity('b1', 50)).resolves.not.toThrow();
    });

    it('should throw InsufficientStockException if sellable < requested', async () => {
      repository.findBatchById.mockResolvedValue(mockBatch);
      await expect(validator.validateSellableQuantity('b1', 90)).rejects.toThrow(InsufficientStockException);
    });

    it('should throw InsufficientStockException if batch is expired', async () => {
      repository.findBatchById.mockResolvedValue({
        ...mockBatch,
        expiryDate: new Date('2020-01-01'),
      });
      await expect(validator.validateSellableQuantity('b1', 10)).rejects.toThrow(InsufficientStockException);
    });

    it('should throw InsufficientStockException if batch status is REJECTED', async () => {
      repository.findBatchById.mockResolvedValue({
        ...mockBatch,
        status: 'REJECTED',
      });
      await expect(validator.validateSellableQuantity('b1', 10)).rejects.toThrow(InsufficientStockException);
    });
  });

  describe('validateReservation', () => {
    it('should succeed if reservedQuantity >= requestedRelease', async () => {
      repository.findBatchById.mockResolvedValue(mockBatch);
      await expect(validator.validateReservation('b1', 15)).resolves.not.toThrow();
    });

    it('should throw InvalidReservationException if reservedQuantity < requestedRelease', async () => {
      repository.findBatchById.mockResolvedValue(mockBatch);
      await expect(validator.validateReservation('b1', 25)).rejects.toThrow(InvalidReservationException);
    });
  });

  describe('validateTransfer', () => {
    it('should throw InvalidWarehouseException if source and destination match identical details', async () => {
      const dto: TransferDto = {
        userId: 'u1',
        variantId: 'v1',
        fromWarehouseId: 'w1',
        fromLocationId: 'l1',
        toWarehouseId: 'w1',
        toLocationId: 'l1',
        batchNumber: 'B1',
        quantity: 10,
      };
      await expect(validator.validateTransfer(dto)).rejects.toThrow(InvalidWarehouseException);
    });

    it('should succeed if transfer details are distinct and exist', async () => {
      const dto: TransferDto = {
        userId: 'u1',
        variantId: 'v1',
        fromWarehouseId: 'w1',
        fromLocationId: 'l1',
        toWarehouseId: 'w2',
        toLocationId: 'l2',
        batchNumber: 'B1',
        quantity: 10,
      };
      repository.findWarehouse.mockResolvedValue({ id: 'w', isActive: true });
      repository.findStorageLocation.mockResolvedValueOnce({ id: 'l1', warehouseId: 'w1' });
      repository.findStorageLocation.mockResolvedValueOnce({ id: 'l2', warehouseId: 'w2' });
      repository.findVariantById.mockResolvedValue({ id: 'v1' });

      await expect(validator.validateTransfer(dto)).resolves.not.toThrow();
    });
  });
});
