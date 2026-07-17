import { Test, TestingModule } from '@nestjs/testing';
import { InventoryModule } from '../infrastructure/inventory.module';
import { InventoryService } from '../application/services/inventory.service';
import { PrismaService } from '../../prisma.service';
import { StockOutDto } from '../application/dto/stock-out.dto';
import { ReservationDto } from '../application/dto/reservation.dto';
import { TransferDto } from '../application/dto/transfer.dto';

describe('Inventory Engine - Concurrency Tests (PostgreSQL)', () => {
  let service: InventoryService;
  let prisma: PrismaService;

  const testSuffix = Math.random().toString(36).substring(7);
  const testEmail = `tenant-con-${testSuffix}@test.com`;
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
        name: 'Test Concurrency Tenant',
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
        abbreviation: `pcs-con-${testSuffix}`,
        category: 'QUANTITY',
      },
    });
    uomId = uom.id;

    const wh1 = await prisma.warehouse.create({
      data: {
        userId: userPrimaryKey,
        name: `Concurrency WH 1 ${testSuffix}`,
        code: `CWH1-${testSuffix}`,
        isActive: true,
      },
    });
    warehouseId1 = wh1.id;

    const wh2 = await prisma.warehouse.create({
      data: {
        userId: userPrimaryKey,
        name: `Concurrency WH 2 ${testSuffix}`,
        code: `CWH2-${testSuffix}`,
        isActive: true,
      },
    });
    warehouseId2 = wh2.id;

    const loc1 = await prisma.storageLocation.create({
      data: {
        warehouseId: warehouseId1,
        name: 'Rack 1',
        type: 'RACK',
      },
    });
    locationId1 = loc1.id;

    const loc2 = await prisma.storageLocation.create({
      data: {
        warehouseId: warehouseId2,
        name: 'Rack 2',
        type: 'RACK',
      },
    });
    locationId2 = loc2.id;

    const prod = await prisma.product.create({
      data: {
        id: `prod-con-${testSuffix}`,
        userId: testEmail,
        productId: `CSKU-${testSuffix}`,
        name: 'Concurrency Test Product',
        timestamp: timestamp / 1000,
        quantity: '0',
      },
    });
    productId = prod.id;

    const vrnt = await prisma.productVariant.create({
      data: {
        id: `var-con-${testSuffix}`,
        productId: productId,
        sku: `CSKUV-${testSuffix}`,
        name: 'Variant V1',
        uomId: uomId,
        defaultCostPrice: 100.0,
        defaultSellingPrice: 150.0,
      },
    });
    variantId = vrnt.id;
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

  beforeEach(async () => {
    await prisma.productBatch.deleteMany({ where: { variantId } });

    const b1 = await prisma.productBatch.create({
      data: {
        variantId: variantId,
        warehouseId: warehouseId1,
        locationId: locationId1,
        batchNumber: 'LOT-CON-1',
        availableQuantity: 100,
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
        batchNumber: 'LOT-CON-1',
        availableQuantity: 0,
        reservedQuantity: 0,
        purchasePrice: 100,
        mrp: 150,
        status: 'ACTIVE',
      },
    });
    batchId2 = b2.id;
  });

  it('should handle 20 parallel StockOut requests without overselling', async () => {
    const requests: Promise<any>[] = [];
    const dto: StockOutDto = {
      userId,
      variantId,
      warehouseId: warehouseId1,
      quantity: 6,
    };

    for (let i = 0; i < 20; i++) {
      requests.push(service.stockOut(dto));
    }

    const results = await Promise.allSettled(requests);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled.length).toBe(16);
    expect(rejected.length).toBe(4);

    const b = await prisma.productBatch.findUnique({ where: { id: batchId1 } });
    expect(b?.availableQuantity).toBe(4);

    const txCount = await prisma.inventoryTransaction.count({
      where: { userId: testEmail, type: 'STOCK_OUT' },
    });
    expect(txCount).toBe(16);
  });

  it('should handle 20 parallel Reservation requests without over-reserving', async () => {
    const requests: Promise<any>[] = [];
    const dto: ReservationDto = {
      batchId: batchId1,
      quantity: 7,
    };

    for (let i = 0; i < 20; i++) {
      requests.push(service.reserve(dto));
    }

    const results = await Promise.allSettled(requests);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled.length).toBe(14);
    expect(rejected.length).toBe(6);

    const b = await prisma.productBatch.findUnique({ where: { id: batchId1 } });
    expect(b?.reservedQuantity).toBe(98);
  });

  it('should handle parallel Transfers and avoid deadlocks or negative stock', async () => {
    const requests: Promise<any>[] = [];
    const dto: TransferDto = {
      userId,
      variantId,
      fromWarehouseId: warehouseId1,
      fromLocationId: locationId1,
      toWarehouseId: warehouseId2,
      toLocationId: locationId2,
      batchNumber: 'LOT-CON-1',
      quantity: 6,
    };

    for (let i = 0; i < 20; i++) {
      requests.push(service.transfer(dto));
    }

    const results = await Promise.allSettled(requests);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled.length).toBe(16);
    expect(rejected.length).toBe(4);

    const src = await prisma.productBatch.findUnique({ where: { id: batchId1 } });
    const dest = await prisma.productBatch.findUnique({ where: { id: batchId2 } });

    expect(src?.availableQuantity).toBe(4);
    expect(dest?.availableQuantity).toBe(96);
  });
});
