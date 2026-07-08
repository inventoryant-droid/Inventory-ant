import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class BackgroundJobService {
  private readonly logger = new Logger(BackgroundJobService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Dispatches a task to execute asynchronously in the background.
   * Prevents blocking request threads (e.g. webhooks).
   */
  async runJob(name: string, task: () => Promise<void>): Promise<void> {
    this.logger.log(`Queueing background job: ${name}`);
    
    // Defer execution to the event loop macro-task queue
    setTimeout(async () => {
      try {
        this.logger.log(`Executing background job: ${name}`);
        await task();
        this.logger.log(`Completed background job: ${name}`);
      } catch (error) {
        this.logger.error(`Background job "${name}" failed: ${error.message}`);
        
        try {
          await this.prisma.auditEvent.create({
            data: {
              userId: null,
              action: 'Background Job Failed',
              details: `Background job "${name}" execution failed. Error: ${error.message}`,
              performedBy: 'system',
              timestamp: new Date(),
            },
          });
        } catch (auditError) {
          console.error('Failed to write background job failure audit log:', auditError);
        }
      }
    }, 0);
  }
}
