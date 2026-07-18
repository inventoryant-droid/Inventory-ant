export class PurchaseOrderCreatedEvent {
  constructor(
    public readonly purchaseOrderId: string,
    public readonly poNumber: string,
    public readonly userId: string,
    public readonly createdBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class PurchaseOrderUpdatedEvent {
  constructor(
    public readonly purchaseOrderId: string,
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class PurchaseOrderSubmittedEvent {
  constructor(
    public readonly purchaseOrderId: string,
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class PurchaseOrderCancelledEvent {
  constructor(
    public readonly purchaseOrderId: string,
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class PurchaseOrderReadyForApprovalEvent {
  constructor(
    public readonly purchaseOrderId: string,
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}
