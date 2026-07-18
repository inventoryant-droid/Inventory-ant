import { IsString, IsNotEmpty } from 'class-validator';

export class StartApprovalDto {
  @IsString()
  @IsNotEmpty({ message: 'Purchase Order ID is required' })
  purchaseOrderId: string;
}
