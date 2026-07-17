import { Test, TestingModule } from '@nestjs/testing';
import { InventoryModule } from '../infrastructure/inventory.module';
import { InventoryService } from '../application/services/inventory.service';
import { PrismaService } from '../../prisma.service';
import { StockInDto } from '../application/dto/stock-in.dto';
import { StockOutDto } from '../application/dto/stock-out.dto';
import { TransferDto } from '../application/dto/transfer.dto';
import { ReservationDto } from '../application/dto/reservation.dto';
import { AdjustmentDto } from '../application/dto/adjustment.dto';
import { BatchNotFoundException, InsufficientStockException } from '../application/exceptions/inventory.exceptions';

describe('Inventory Engine - Integration Tests (PostgreSQL)', () => {
  let service: InventoryService;
  let prisma: PrismaService;

  const testSuffix = Math.random().toString(36).substring(7);
  const testEmail = `tenant-${testSuffix}@test.com`;
  const userPrimaryKey = testEmail;
  const userId = testEmail;

  let warehouseId1: string;
  let warehouseId2: string;
  let locationId1: string;
  let locationId2: string;
  let productId: string;
  let variantId: string;
  let batchId1: string;
  let batchId2: string;
  let uomId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [InventoryModule],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    prisma = module.get<PrismaService>(PrismaService);

    const timestamp = Date.now();
    await prisma.user.create({
      data: {
        id: userPrimaryKey,
        email: testEmail,
        name: 'Test Integration Tenant',
        role: 'OWNER',
        active: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    });

    await prisma.businessSettings.create({
      data: {
        userId: userPrimaryKey,
        inventoryStrategy: 'FIFO',
      },
    });

    const uom = await prisma.unitOfMeasure.create({
      data: {
        userId: userPrimaryKey,
        name: 'Pieces',
        abbreviation: `pcs-${testSuffix}`,
        category: 'QUANTITY',
      },
    });
    uomId = uom.id;

    const wh1 = await prisma.warehouse.create({
      data: {
        userId: userPrimaryKey,
        name: `Integration WH 1 ${testSuffix}`,
        code: `WH1-${testSuffix}`,
        isActive: true,
      },
    });
    warehouseId1 = wh1.id;

    const wh2 = await prisma.warehouse.create({
      data: {
        userId: userPrimaryKey,
        name: `Integration WH 2 ${testSuffix}`,
        code: `WH2-${testSuffix}`,
        isActive: true,
      },
    });
    warehouseId2 = wh2.id;

    const loc1 = await prisma.storageLocation.create({
      data: {
        warehouseId: warehouseId1,
        name: 'Shelf A',
        type: 'SHELF',
      },
    });
    locationId1 = loc1.id;

    const loc2 = await prisma.storageLocation.create({
      data: {
        warehouseId: warehouseId2,
        name: 'Shelf B',
        type: 'SHELF',
      },
    });
    locationId2 = loc2.id;

    const prod = await prisma.product.create({
      data: {
        id: `prod-${testSuffix}`,
        userId: testEmail,
        productId: `SKU-${testSuffix}`,
        name: 'Integration Test Product',
        timestamp: timestamp / 1000,
        quantity: '0',
      },
    });
    productId = prod.id;

    const vrnt = await prisma.productVariant.create({
      data: {
        id: `var-${testSuffix}`,
        productId: productId,
        sku: `SKUV-${testSuffix}`,
        name: 'Variant V1',
        uomId: uomId,
        defaultCostPrice: 100.0,
        defaultSellingPrice: 150.0,
      },
    });
    variantId = vrnt.id;

    const b1 = await prisma.productBatch.create({
      data: {
        variantId: variantId,
        warehouseId: warehouseId1,
        locationId: locationId1,
        batchNumber: 'LOT-TEST-1',
        availableQuantity: 50,
        reservedQuantity: 0,
        purchasePrice: 100,
        mrp: 150,
        status: 'ACTIVE',
      },
    });
    batchId1 = b1.id;

    const b2 = await prisma.productBatch.create({
      data: {
        variantId: variantId,
        warehouseId: warehouseId2,
        locationId: locationId2,
        batchNumber: 'LOT-TEST-1',
        availableQuantity: 10,
        reservedQuantity: 0,
        purchasePrice: 100,
        mrp: 150,
        status: 'ACTIVE',
      },
    });
    batchId2 = b2.id;
  });

  afterAll(async () => {
    await prisma.inventoryTransaction.deleteMany({ where: { userId: testEmail } });
    await prisma.productBatch.deleteMany({ where: { variantId } });
    await prisma.productVariant.deleteMany({ where: { productId } });
    await prisma.product.deleteMany({ where: { userId: testEmail } });
    await prisma.unitOfMeasure.deleteMany({ where: { id: uomId } });
    await prisma.storageLocation.deleteMany({ where: { id: { in: [locationId1, locationId2] } } });
    await prisma.warehouse.deleteMany({ where: { userId: userPrimaryKey } });
    await prisma.businessSettings.deleteMany({ where: { userId: userPrimaryKey } });
    await prisma.user.delete({ where: { id: userPrimaryKey } });

    await prisma.$disconnect();
  });

  it('should successfully Stock In (increments existing batch quantity, syncs catalog quantity, logs audit)', async () => {
    const dto: StockInDto = {
      variantId,
      warehouseId: warehouseId1,
      storageLocationId: locationId1,
      batchNumber: 'LOT-TEST-1',
      quantity: 50,
      purchasePrice: 100,
      mrp: 150,
    };

    const res = await service.stockIn(dto);

    expect(res.quantity).toBe(50);
    expect(res.batchId).toBe(batchId1);

    const prod = await prisma.product.findUnique({ where: { id: productId } });
    expect(prod?.quantity).toBe('110');

    const txLog = await prisma.inventoryTransaction.findUnique({ where: { id: res.transactionId } });
    expect(txLog?.type).toBe('STOCK_IN');
    expect(txLog?.quantity).toBe(50);
  });

  it('should successfully Stock Out (decrements batch stock based on strategy)', async () => {
    const dto: StockOutDto = {
      userId,
      variantId,
      warehouseId: warehouseId1,
      quantity: 30,
    };

    const res = await service.stockOut(dto);

    expect(res.allocatedQuantity).toBe(30);

    const b = await prisma.productBatch.findUnique({ where: { id: batchId1 } });
    expect(b?.availableQuantity).toBe(70);

    const prod = await prisma.product.findUnique({ where: { id: productId } });
    expect(prod?.quantity).toBe('80');
  });

  it('should successfully Reserve stock (locks from sellable, increments reserved)', async () => {
    const dto: ReservationDto = {
      batchId: batchId1,
      quantity: 20,
    };

    await service.reserve(dto);

    const b = await prisma.productBatch.findUnique({ where: { id: batchId1 } });
    expect(b?.reservedQuantity).toBe(20);
  });

  it('should successfully Release Reservation', async () => {
    const dto: ReservationDto = {
      batchId: batchId1,
      quantity: 15,
    };

    await service.releaseReservation(dto);

    const b = await prisma.productBatch.findUnique({ where: { id: batchId1 } });
    expect(b?.reservedQuantity).toBe(5);
  });

  it('should successfully Transfer stock between warehouses (decrements source, increments destination)', async () => {
    const dto: TransferDto = {
      userId,
      variantId,
      fromWarehouseId: warehouseId1,
      fromLocationId: locationId1,
      toWarehouseId: warehouseId2,
      toLocationId: locationId2,
      batchNumber: 'LOT-TEST-1',
      quantity: 10,
    };

    await service.transfer(dto);

    const src = await prisma.productBatch.findUnique({ where: { id: batchId1 } });
    const dest = await prisma.productBatch.findUnique({ where: { id: batchId2 } });

    expect(src?.availableQuantity).toBe(60);
    expect(dest?.availableQuantity).toBe(20);
  });

  it('should successfully Damage stock (decrements available quantity, logs DAMAGE)', async () => {
    const dto: AdjustmentDto = {
      batchId: batchId1,
      quantity: 5,
    };

    const res = await service.damage(dto);

    const b = await prisma.productBatch.findUnique({ where: { id: batchId1 } });
    expect(b?.availableQuantity).toBe(55);

    const txLog = await prisma.inventoryTransaction.findUnique({ where: { id: res.transactionId } });
    expect(txLog?.type).toBe('DAMAGE');
  });

  it('should successfully mark batch as Expiry (status turns EXPIRED, blocks allocations)', async () => {
    await service.expiry(batchId2);

    const b = await prisma.productBatch.findUnique({ where: { id: batchId2 } });
    expect(b?.status).toBe('EXPIRED');

    const dto: StockOutDto = {
      userId,
      variantId,
      warehouseId: warehouseId2,
      quantity: 5,
    };
    await expect(service.stockOut(dto)).rejects.toThrow(InsufficientStockException);
  });

  it('should successfully execute Adjustments (positive and negative)', async () => {
    await service.adjust({ batchId: batchId1, quantity: 10 });
    let b = await prisma.productBatch.findUnique({ where: { id: batchId1 } });
    expect(b?.availableQuantity).toBe(65);

    await service.adjust({ batchId: batchId1, quantity: -15 });
    b = await prisma.productBatch.findUnique({ where: { id: batchId1 } });
    expect(b?.availableQuantity).toBe(50);
  });

  it('should successfully execute Returns', async () => {
    await service.returnStock({ batchId: batchId1, quantity: 20 });
    const b = await prisma.productBatch.findUnique({ where: { id: batchId1 } });
    expect(b?.availableQuantity).toBe(70);
  });

  it('should atomicaly rollback transaction on operation failures', async () => {
    const dto: StockOutDto = {
      userId,
      variantId,
      warehouseId: warehouseId1,
      quantity: 500,
    };

    await expect(service.stockOut(dto)).rejects.toThrow(InsufficientStockException);

    const b = await prisma.productBatch.findUnique({ where: { id: batchId1 } });
    expect(b?.availableQuantity).toBe(70);
  });
});
