export class StockOutCompletedEvent {
  constructor(
    public readonly variantId: string,
    public readonly warehouseId: string,
    public readonly quantity: number,
    public readonly timestamp: Date = new Date(),
  ) {}
}
