import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { InventoryReleaseStrategy } from '../../domain/strategies/inventory-release-strategy.interface';
import { FifoStrategy } from '../../domain/strategies/fifo-strategy';
import { LifoStrategy } from '../../domain/strategies/lifo-strategy';
import { FefoStrategy } from '../../domain/strategies/fefo-strategy';
import { InventoryRepository } from '../../infrastructure/repositories/inventory.repository';

@Injectable()
export class StrategyResolver {
  constructor(
    private readonly repository: InventoryRepository,
    private readonly fifo: FifoStrategy,
    private readonly lifo: LifoStrategy,
    private readonly fefo: FefoStrategy,
  ) {}

  resolve(strategyName?: string): InventoryReleaseStrategy {
    switch (strategyName?.toUpperCase()) {
      case 'FEFO':
        return this.fefo;
      case 'LIFO':
        return this.lifo;
      case 'FIFO':
      default:
        return this.fifo;
    }
  }

  async resolveForUser(userId: string, tx?: Prisma.TransactionClient): Promise<InventoryReleaseStrategy> {
    const settings = await this.repository.findBusinessSettings(userId, tx);
    return this.resolve(settings?.inventoryStrategy);
  }
}
