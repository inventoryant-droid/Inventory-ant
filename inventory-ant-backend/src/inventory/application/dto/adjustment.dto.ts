import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class AdjustmentDto {
  @IsString()
  @IsNotEmpty()
  batchId: string;

  @IsNumber()
  quantity: number; // Positive for Stock In adjustment, Negative for Stock Out adjustment

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
