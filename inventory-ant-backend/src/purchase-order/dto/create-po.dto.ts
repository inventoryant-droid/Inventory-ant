import { IsString, IsNotEmpty, IsDateString, IsOptional } from 'class-validator';

export class CreatePurchaseOrderDto {
  @IsString()
  @IsNotEmpty({ message: 'Quotation ID is required' })
  quotationId: string;

  @IsString()
  @IsNotEmpty({ message: 'Warehouse ID is required' })
  warehouseId: string;

  @IsDateString({}, { message: 'Order date must be a valid ISO date string' })
  @IsNotEmpty({ message: 'Order date is required' })
  orderDate: string;

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
