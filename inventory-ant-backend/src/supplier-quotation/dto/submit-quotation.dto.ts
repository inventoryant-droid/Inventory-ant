import { IsString, IsNotEmpty, IsNumber, IsInt, IsPositive, Min, ValidateNested, ArrayMinSize, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class QuotationItemDto {
  @IsString()
  @IsNotEmpty({ message: 'Variant ID is required' })
  variantId: string;

  @IsInt({ message: 'Quantity must be an integer' })
  @IsPositive({ message: 'Quantity must be greater than 0' })
  quantity: number;

  @IsNumber({}, { message: 'Unit price must be a number' })
  @Min(0, { message: 'Unit price cannot be negative' })
  unitPrice: number;

  @IsNumber({}, { message: 'Tax rate must be a number' })
  @Min(0, { message: 'Tax rate cannot be negative' })
  taxRate: number;

  @IsNumber({}, { message: 'Discount must be a number' })
  @Min(0, { message: 'Discount cannot be negative' })
  discount: number;

  @IsInt({ message: 'Delivery lead time must be an integer' })
  @Min(0, { message: 'Delivery lead time cannot be negative' })
  deliveryLeadTime: number;

  @IsString()
  @IsOptional()
  remarks?: string;
}

export class SubmitQuotationDto {
  @IsString()
  @IsNotEmpty({ message: 'RFQ ID is required' })
  rfqId: string;

  @IsString()
  @IsNotEmpty({ message: 'Supplier ID is required' })
  supplierId: string;

  @ValidateNested({ each: true })
  @ArrayMinSize(1, { message: 'Quotation must contain at least one item' })
  @Type(() => QuotationItemDto)
  items: QuotationItemDto[];
}
