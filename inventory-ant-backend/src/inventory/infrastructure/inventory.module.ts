import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { InventoryService } from '../application/services/inventory.service';
import { StrategyResolver } from '../application/services/strategy.resolver';
import { InventoryValidator } from '../application/validators/inventory.validator';
import { InventoryRepository } from './repositories/inventory.repository';
import { FifoStrategy } from '../domain/strategies/fifo-strategy';
import { LifoStrategy } from '../domain/strategies/lifo-strategy';
import { FefoStrategy } from '../domain/strategies/fefo-strategy';
import { InventoryEventEmitter } from '../domain/events/inventory-event-emitter';

@Module({
  providers: [
    PrismaService,
    InventoryService,
    StrategyResolver,
    InventoryValidator,
    InventoryRepository,
    FifoStrategy,
    LifoStrategy,
    FefoStrategy,
    InventoryEventEmitter,
  ],
  exports: [InventoryService, InventoryEventEmitter],
})
export class InventoryModule {}
