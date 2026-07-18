import { IsString, IsOptional, IsEmail, Matches, IsNumber, Min } from 'class-validator';

export class UpdateSupplierDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  contactName?: string;

  @IsString()
  @IsOptional()
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[+]?[0-9]{10,15}$/, { message: 'Phone must be a valid number between 10 and 15 digits' })
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[A-Z0-9]{15}$/, { message: 'GST number must be a valid 15-character alphanumeric string' })
  gstNumber?: string;

  @IsNumber()
  @IsOptional()
  @Min(0, { message: 'Credit limit must be a positive number' })
  creditLimit?: number;
}
