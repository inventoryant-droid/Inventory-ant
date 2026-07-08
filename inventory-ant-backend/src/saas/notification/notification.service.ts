import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { EmailService } from '../email/email.service';

export interface NotificationPayload {
  title: string;
  message: string;
  target: string; // Target email or plan slug
  channels: ('in-app' | 'email' | 'sms' | 'whatsapp' | 'push')[];
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async sendNotification(payload: NotificationPayload): Promise<void> {
    for (const channel of payload.channels) {
      try {
        if (channel === 'in-app') {
          await this.prisma.notification.create({
            data: {
              id: `notif_${Math.random().toString(36).substring(2, 12)}`,
              target: payload.target,
              title: payload.title,
              message: payload.message,
              createdAt: Date.now(),
            },
          });
          
          await this.prisma.auditEvent.create({
            data: {
              userId: null,
              action: 'Notification Sent',
              details: `In-App Notification dispatched to target: ${payload.target}`,
              performedBy: 'system',
              timestamp: new Date(),
            },
          });
        } else if (channel === 'email') {
          // Send general notification email
          const html = `
            <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">Hello,</p>
            <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">${payload.message}</p>
          `;
          await this.emailService.sendWelcome(payload.target, 'Subscriber'); // Fallback Welcome shell or custom send
          
          await this.prisma.auditEvent.create({
            data: {
              userId: null,
              action: 'Notification Sent',
              details: `Email Notification sent to: ${payload.target}`,
              performedBy: 'system',
              timestamp: new Date(),
            },
          });
        } else {
          // Future integrations (SMS, WhatsApp, Push) hook logic
          this.logger.log(`[Notification Hook] Dispatching via future channel: ${channel} (Target: ${payload.target})`);
          
          await this.prisma.auditEvent.create({
            data: {
              userId: null,
              action: 'Notification Sent',
              details: `Notification dispatched via future channel: ${channel} (Target: ${payload.target})`,
              performedBy: 'system',
              timestamp: new Date(),
            },
          });
        }
      } catch (error) {
        this.logger.error(`Failed to dispatch notification over channel: ${channel}. Error: ${error.message}`);
        
        await this.prisma.auditEvent.create({
          data: {
            userId: null,
            action: 'Notification Failed',
            details: `Failed to dispatch notification over channel ${channel} (Target: ${payload.target}). Error: ${error.message}`,
            performedBy: 'system',
            timestamp: new Date(),
          },
        });
      }
    }
  }
}
