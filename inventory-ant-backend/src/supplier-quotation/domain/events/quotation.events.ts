export class QuotationSubmittedEvent {
  constructor(
    public readonly quotationId: string,
    public readonly rfqId: string,
    public readonly supplierId: string,
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class QuotationUpdatedEvent {
  constructor(
    public readonly quotationId: string,
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class QuotationWithdrawnEvent {
  constructor(
    public readonly quotationId: string,
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class QuotationReviewStartedEvent {
  constructor(
    public readonly quotationId: string,
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class QuotationSelectedEvent {
  constructor(
    public readonly quotationId: string,
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class QuotationRejectedEvent {
  constructor(
    public readonly quotationId: string,
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class WinningQuotationSelectedEvent {
  constructor(
    public readonly quotationId: string,
    public readonly rfqId: string,
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class RFQReadyForPurchaseOrderEvent {
  constructor(
    public readonly rfqId: string,
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}
