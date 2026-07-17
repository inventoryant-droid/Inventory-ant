export class BatchDamagedEvent {
  constructor(
    public readonly batchId: string,
    public readonly quantity: number,
    public readonly timestamp: Date = new Date(),
  ) {}
}
