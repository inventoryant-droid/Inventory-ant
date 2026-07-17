export class TransferCompletedEvent {
  constructor(
    public readonly variantId: string,
    public readonly fromWarehouseId: string,
    public readonly toWarehouseId: string,
    public readonly batchNumber: string,
    public readonly quantity: number,
    public readonly timestamp: Date = new Date(),
  ) {}
}
