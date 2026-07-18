import { IsString, IsNotEmpty, IsDateString } from 'class-validator';

export class CreateRFQDto {
  @IsString()
  @IsNotEmpty({ message: 'Requisition ID is required' })
  requisitionId: string;

  @IsDateString({}, { message: 'Expiry date must be a valid ISO date string' })
  @IsNotEmpty({ message: 'Expiry date is required' })
  expiryDate: string;
}
