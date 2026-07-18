export class RequisitionCreatedEvent {
  constructor(
    public readonly requisitionId: string,
    public readonly userId: string,
    public readonly requestorId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class RequisitionSubmittedEvent {
  constructor(
    public readonly requisitionId: string,
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class RequisitionApprovedEvent {
  constructor(
    public readonly requisitionId: string,
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class RequisitionRejectedEvent {
  constructor(
    public readonly requisitionId: string,
    public readonly userId: string,
    public readonly reason: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}
