import { IsString, IsNotEmpty, IsOptional, IsNumber, IsInt, IsPositive, Min, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class RequisitionItemDto {
  @IsString()
  @IsNotEmpty({ message: 'Variant ID is required' })
  variantId: string;

  @IsInt({ message: 'Quantity must be an integer' })
  @IsPositive({ message: 'Quantity must be greater than 0' })
  quantity: number;

  @IsNumber({}, { message: 'Estimated cost must be a number' })
  @Min(0, { message: 'Estimated cost cannot be negative' })
  estimatedCost: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateRequisitionDto {
  @IsString()
  @IsNotEmpty({ message: 'Requestor ID is required' })
  requestorId: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @ValidateNested({ each: true })
  @ArrayMinSize(1, { message: 'Requisition must contain at least one item' })
  @Type(() => RequisitionItemDto)
  items: RequisitionItemDto[];
}
