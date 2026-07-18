import { IsString, IsDateString, IsOptional } from 'class-validator';

export class UpdatePurchaseOrderDto {
  @IsString()
  @IsOptional()
  warehouseId?: string;

  @IsDateString({}, { message: 'Order date must be a valid ISO date string' })
  @IsOptional()
  orderDate?: string;

  @IsDateString({}, { message: 'Expected delivery date must be a valid ISO date string' })
  @IsOptional()
  expectedDeliveryDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  billingAddress?: string;

  @IsString()
  @IsOptional()
  shippingAddress?: string;

  @IsString()
  @IsOptional()
  paymentTerms?: string;

  @IsString()
  @IsOptional()
  deliveryTerms?: string;
}
