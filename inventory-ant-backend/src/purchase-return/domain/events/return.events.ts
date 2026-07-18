export class PurchaseReturnCreatedEvent {
  constructor(
    public readonly purchaseReturnId: string,
    public readonly returnNumber: string,
    public readonly purchaseOrderId: string,
    public readonly goodsReceiptId: string,
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class PurchaseReturnApprovedEvent {
  constructor(
    public readonly purchaseReturnId: string,
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class PurchaseReturnCompletedEvent {
  constructor(
    public readonly purchaseReturnId: string,
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class PurchaseReturnCancelledEvent {
  constructor(
    public readonly purchaseReturnId: string,
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class InventoryStockReturnedEvent {
  constructor(
    public readonly purchaseReturnId: string,
    public readonly variantId: string,
    public readonly quantity: number,
    public readonly batchId: string,
    public readonly warehouseId: string,
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class SupplierCreditPendingEvent {
  constructor(
    public readonly purchaseReturnId: string,
    public readonly supplierId: string,
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}
