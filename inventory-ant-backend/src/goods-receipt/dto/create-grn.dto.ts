import { IsString, IsNotEmpty, IsDateString, IsOptional, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateGoodsReceiptItemDto } from './create-grn-item.dto';

export class CreateGoodsReceiptDto {
  @IsString()
  @IsNotEmpty({ message: 'Purchase Order ID is required' })
  purchaseOrderId: string;

  @IsDateString({}, { message: 'Receive date must be a valid ISO Date string' })
  @IsNotEmpty({ message: 'Receive date is required' })
  receiveDate: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray({ message: 'Items must be an array' })
  @ValidateNested({ each: true })
  @Type(() => CreateGoodsReceiptItemDto)
  items: CreateGoodsReceiptItemDto[];
}
