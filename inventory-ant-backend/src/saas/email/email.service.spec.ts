import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import { EmailTemplateEngine } from './email-template.engine';
import { PrismaService } from '../../prisma.service';

describe('EmailService', () => {
  let service: EmailService;
  let provider: any;
  let prisma: PrismaService;

  const mockProvider = {
    send: jest.fn(),
  };

  const mockPrisma = {
    auditEvent: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        EmailTemplateEngine,
        {
          provide: 'EmailProvider',
          useValue: mockProvider,
        },
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    provider = module.get('EmailProvider');
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should format welcome template and send welcome email', async () => {
    mockProvider.send.mockResolvedValue(undefined);

    await service.sendWelcome('recipient@test.com', 'Recipient Name');

    expect(mockProvider.send).toHaveBeenCalledWith(expect.objectContaining({
      to: 'recipient@test.com',
      subject: '🐜 Welcome to Inventory Ant!',
      html: expect.stringContaining('Recipient Name'),
    }));
    expect(mockPrisma.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: 'Email Sent',
      }),
    }));
  });

  it('should log audit failure event if email provider fails', async () => {
    mockProvider.send.mockRejectedValue(new Error('SMTP Error'));

    await expect(service.sendWelcome('recipient@test.com', 'Name')).rejects.toThrow('SMTP Error');

    expect(mockPrisma.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: 'Email Failed',
      }),
    }));
  });
});
