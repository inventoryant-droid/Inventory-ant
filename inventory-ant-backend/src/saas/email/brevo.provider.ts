import { Injectable, BadRequestException } from '@nestjs/common';
import { EmailProvider, EmailSendOptions } from './email-provider.interface';

@Injectable()
export class BrevoProvider implements EmailProvider {
  async send(options: EmailSendOptions): Promise<void> {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      throw new BadRequestException('Email configuration key is missing (BREVO_API_KEY).');
    }

    const senderEmail = process.env.SMTP_SENDER || 'inventoryant@gmail.com';

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'content-type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: 'Inventory Ant',
          email: senderEmail,
        },
        to: [{ email: options.to }],
        subject: options.subject,
        htmlContent: options.html,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(`Brevo HTTP API failed: ${response.status} - ${JSON.stringify(errData)}`);
    }
  }
}
