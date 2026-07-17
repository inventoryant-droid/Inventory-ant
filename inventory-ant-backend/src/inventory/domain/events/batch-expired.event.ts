export class BatchExpiredEvent {
  constructor(
    public readonly batchId: string,
    public readonly expiryDate: Date,
    public readonly timestamp: Date = new Date(),
  ) {}
}
