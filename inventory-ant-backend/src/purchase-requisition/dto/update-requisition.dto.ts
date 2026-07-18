import { IsString, IsOptional, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { RequisitionItemDto } from './create-requisition.dto';

export class UpdateRequisitionDto {
  @IsString()
  @IsOptional()
  notes?: string;

  @ValidateNested({ each: true })
  @IsOptional()
  @ArrayMinSize(1, { message: 'Requisition must contain at least one item' })
  @Type(() => RequisitionItemDto)
  items?: RequisitionItemDto[];
}
