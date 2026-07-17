import { IsString, IsNotEmpty, IsOptional, IsNumber, IsPositive } from 'class-validator';

export class TransferDto {
  @IsString()
  @IsNotEmpty()
  userId: string; // Tenant email

  @IsString()
  @IsNotEmpty()
  variantId: string;

  @IsString()
  @IsNotEmpty()
  fromWarehouseId: string;

  @IsString()
  @IsOptional()
  fromLocationId?: string;

  @IsString()
  @IsNotEmpty()
  toWarehouseId: string;

  @IsString()
  @IsOptional()
  toLocationId?: string;

  @IsString()
  @IsNotEmpty()
  batchNumber: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

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
