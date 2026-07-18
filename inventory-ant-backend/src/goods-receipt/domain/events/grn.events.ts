export class GoodsReceiptCreatedEvent {
  constructor(
    public readonly goodsReceiptId: string,
    public readonly grnNumber: string,
    public readonly purchaseOrderId: string,
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class GoodsReceiptStartedEvent {
  constructor(
    public readonly goodsReceiptId: string,
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class GoodsReceiptCompletedEvent {
  constructor(
    public readonly goodsReceiptId: string,
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class GoodsReceiptCancelledEvent {
  constructor(
    public readonly goodsReceiptId: string,
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class PurchaseOrderPartiallyReceivedEvent {
  constructor(
    public readonly purchaseOrderId: string,
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class PurchaseOrderReceivedEvent {
  constructor(
    public readonly purchaseOrderId: string,
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class InventoryStockReceivedEvent {
  constructor(
    public readonly goodsReceiptId: string,
    public readonly variantId: string,
    public readonly quantity: number,
    public readonly batchNumber: string,
    public readonly warehouseId: string,
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}
