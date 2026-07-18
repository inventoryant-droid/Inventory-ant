import { IsString, IsNotEmpty, IsOptional, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { CreatePurchaseReturnItemDto } from './create-return-item.dto';

export class CreatePurchaseReturnDto {
  @IsString()
  @IsNotEmpty({ message: 'Purchase Order ID is required' })
  purchaseOrderId: string;

  @IsString()
  @IsNotEmpty({ message: 'Goods Receipt ID is required' })
  goodsReceiptId: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray({ message: 'Items must be an array' })
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseReturnItemDto)
  items: CreatePurchaseReturnItemDto[];
}
