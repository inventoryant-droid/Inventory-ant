import { Controller, Post, Body, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentOrderDto } from './payment.dto';
import { JwtAuthGuard } from '../users/jwt-auth.guard';

@Controller('api/payment')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create-order')
  @HttpCode(HttpStatus.OK)
  async createOrder(@Req() req: any, @Body() dto: CreatePaymentOrderDto) {
    const userId = req.user.sub;
    return this.paymentService.createOrder(userId, dto);
  }
}
