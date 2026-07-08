import { IsNotEmpty, IsString, IsEnum, IsOptional } from 'class-validator';

export class CreatePaymentOrderDto {
  @IsNotEmpty()
  @IsString()
  planId: string;

  @IsNotEmpty()
  @IsEnum(['monthly', 'yearly'])
  billingCycle: 'monthly' | 'yearly';

  @IsOptional()
  @IsString()
  couponCode?: string;
}
