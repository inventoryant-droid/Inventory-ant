export class ApprovalWorkflowStartedEvent {
  constructor(
    public readonly instanceId: string,
    public readonly purchaseOrderId: string,
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class ApprovalAssignedEvent {
  constructor(
    public readonly instanceId: string,
    public readonly stepId: string,
    public readonly assignedRole: string,
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class ApprovalApprovedEvent {
  constructor(
    public readonly instanceId: string,
    public readonly stepId: string,
    public readonly approvedBy: string,
    public readonly level: number,
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class ApprovalRejectedEvent {
  constructor(
    public readonly instanceId: string,
    public readonly stepId: string,
    public readonly rejectedBy: string,
    public readonly level: number,
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class PurchaseOrderApprovedEvent {
  constructor(
    public readonly purchaseOrderId: string,
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class PurchaseOrderRejectedEvent {
  constructor(
    public readonly purchaseOrderId: string,
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class PurchaseOrderReadyToSendEvent {
  constructor(
    public readonly purchaseOrderId: string,
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}
