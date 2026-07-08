import { Controller, Post, Req, Headers, BadRequestException, HttpCode, HttpStatus } from '@nestjs/common';
import { PaymentService } from './payment.service';

@Controller('api/payment/webhook')
export class PaymentWebhookController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Req() req: any, @Headers('x-razorpay-signature') signature: string) {
    if (!signature) {
      throw new BadRequestException('Missing signature header');
    }

    // Capture raw body if middleware populated it, otherwise stringify the parsed body
    const rawPayload = req.rawBody || JSON.stringify(req.body);
    
    const isValid = await this.paymentService.verifyWebhookSignature(rawPayload, signature);
    if (!isValid) {
      throw new BadRequestException({
        error: 'WEBHOOK_VERIFICATION_FAILED',
        message: 'Invalid webhook signature',
      });
    }

    return this.paymentService.processWebhookEvent(req.body);
  }
}
