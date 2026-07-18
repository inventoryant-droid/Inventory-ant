import { ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { QuotationItemDto } from './submit-quotation.dto';

export class UpdateQuotationDto {
  @ValidateNested({ each: true })
  @ArrayMinSize(1, { message: 'Quotation must contain at least one item' })
  @Type(() => QuotationItemDto)
  items: QuotationItemDto[];
}
