import { IsString, IsNotEmpty, IsNumber, IsInt, Min, IsDateString, IsOptional } from 'class-validator';

export class CreateGoodsReceiptItemDto {
  @IsString()
  @IsNotEmpty({ message: 'Variant ID is required' })
  variantId: string;

  @IsInt({ message: 'Received quantity must be an integer' })
  @Min(1, { message: 'Received quantity must be at least 1' })
  quantityReceived: number;

  @IsString()
  @IsNotEmpty({ message: 'Batch number is required' })
  batchNumber: string;

  @IsDateString({}, { message: 'Manufacturing date must be a valid Date string' })
  @IsOptional()
  manufacturingDate?: string;

  @IsDateString({}, { message: 'Expiry date must be a valid Date string' })
  @IsOptional()
  expiryDate?: string;

  @IsNumber({}, { message: 'Purchase price must be a valid number' })
  @Min(0, { message: 'Purchase price cannot be negative' })
  purchasePrice: number;

  @IsNumber({}, { message: 'MRP must be a valid number' })
  @Min(0, { message: 'MRP cannot be negative' })
  mrp: number;

  @IsString()
  @IsNotEmpty({ message: 'Warehouse ID is required' })
  warehouseId: string;
}
