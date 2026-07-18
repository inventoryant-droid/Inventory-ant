import { IsOptional, IsDateString } from 'class-validator';

export class UpdateRFQDto {
  @IsDateString({}, { message: 'Expiry date must be a valid ISO date string' })
  @IsOptional()
  expiryDate?: string;
}
