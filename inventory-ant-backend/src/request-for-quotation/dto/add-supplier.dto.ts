import { IsString, IsNotEmpty } from 'class-validator';

export class AddSupplierDto {
  @IsString()
  @IsNotEmpty({ message: 'Supplier ID is required' })
  supplierId: string;
}
