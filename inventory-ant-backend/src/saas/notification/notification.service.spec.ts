import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { PrismaService } from '../../prisma.service';
import { EmailService } from '../email/email.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let prisma: PrismaService;
  let emailService: EmailService;

  const mockPrisma = {
    notification: {
      create: jest.fn(),
    },
    auditEvent: {
      create: jest.fn(),
    },
  };

  const mockEmailService = {
    sendWelcome: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    prisma = module.get<PrismaService>(PrismaService);
    emailService = module.get<EmailService>(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create in-app notification and write audit event', async () => {
    await service.sendNotification({
      title: 'In-app title',
      message: 'Test in-app message',
      target: 'pro',
      channels: ['in-app'],
    });

    expect(mockPrisma.notification.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        title: 'In-app title',
        message: 'Test in-app message',
        target: 'pro',
      }),
    }));
    expect(mockPrisma.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: 'Notification Sent',
      }),
    }));
  });

  it('should call EmailService on email channel delivery', async () => {
    await service.sendNotification({
      title: 'Email title',
      message: 'Email body text',
      target: 'user@test.com',
      channels: ['email'],
    });

    expect(mockEmailService.sendWelcome).toHaveBeenCalledWith('user@test.com', 'Subscriber');
    expect(mockPrisma.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: 'Notification Sent',
      }),
    }));
  });
});
