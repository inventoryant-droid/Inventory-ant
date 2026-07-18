import { IsString, IsNotEmpty, IsInt, Min, IsEnum, IsOptional } from 'class-validator';
import { PurchaseReturnReason } from '@prisma/client';

export class CreatePurchaseReturnItemDto {
  @IsString()
  @IsNotEmpty({ message: 'Variant ID is required' })
  variantId: string;

  @IsString()
  @IsNotEmpty({ message: 'Batch ID is required' })
  batchId: string;

  @IsInt({ message: 'Return quantity must be an integer' })
  @Min(1, { message: 'Return quantity must be at least 1' })
  quantity: number;

  @IsEnum(PurchaseReturnReason, { message: 'Invalid return reason value' })
  reason: PurchaseReturnReason;

  @IsString()
  @IsOptional()
  remarks?: string;

  @IsString()
  @IsNotEmpty({ message: 'Warehouse ID is required' })
  warehouseId: string;
}
