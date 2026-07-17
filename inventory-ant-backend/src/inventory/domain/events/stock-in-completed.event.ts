export class StockInCompletedEvent {
  constructor(
    public readonly variantId: string,
    public readonly warehouseId: string,
    public readonly batchNumber: string,
    public readonly quantity: number,
    public readonly timestamp: Date = new Date(),
  ) {}
}
