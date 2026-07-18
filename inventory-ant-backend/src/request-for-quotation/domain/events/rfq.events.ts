export class RFQCreatedEvent {
  constructor(
    public readonly rfqId: string,
    public readonly rfqNumber: string,
    public readonly userId: string,
    public readonly createdBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class RFQUpdatedEvent {
  constructor(
    public readonly rfqId: string,
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class RFQSentEvent {
  constructor(
    public readonly rfqId: string,
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class RFQResponsesClosedEvent {
  constructor(
    public readonly rfqId: string,
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class RFQClosedEvent {
  constructor(
    public readonly rfqId: string,
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class SupplierAddedToRFQEvent {
  constructor(
    public readonly rfqId: string,
    public readonly supplierId: string,
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class SupplierRemovedFromRFQEvent {
  constructor(
    public readonly rfqId: string,
    public readonly supplierId: string,
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}
