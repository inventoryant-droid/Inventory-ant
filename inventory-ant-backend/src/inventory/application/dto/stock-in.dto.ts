import { IsString, IsNotEmpty, IsOptional, IsNumber, IsPositive, IsDate, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class StockInDto {
  @IsString()
  @IsNotEmpty()
  variantId: string;

  @IsString()
  @IsNotEmpty()
  warehouseId: string;

  @IsString()
  @IsOptional()
  storageLocationId?: string;

  @IsString()
  @IsNotEmpty()
  batchNumber: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsNumber()
  @Min(0)
  purchasePrice: number;

  @IsNumber()
  @Min(0)
  mrp: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiryDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  manufacturingDate?: Date;

  @IsString()
  @IsOptional()
  operatorName?: string;

  @IsString()
  @IsOptional()
  referenceId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
