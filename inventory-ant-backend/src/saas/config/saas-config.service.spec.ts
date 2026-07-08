import { Test, TestingModule } from '@nestjs/testing';
import { SaasConfigService } from './saas-config.service';

describe('SaasConfigService', () => {
  let service: SaasConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SaasConfigService],
    }).compile();

    service = module.get<SaasConfigService>(SaasConfigService);
  });

  it('should load default configuration settings correctly', () => {
    expect(service).toBeDefined();
    expect(service.paymentTimeoutMs).toBe(1800000);
    expect(service.maxWebhookRetries).toBe(5);
    expect(service.emailLimitPerHour).toBe(100);
    expect(service.trialEndingReminderDays).toBe(3);
    expect(service.renewalReminderDays).toBe(7);
  });
});
