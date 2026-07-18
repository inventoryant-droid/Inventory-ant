import { IsString, IsOptional } from 'class-validator';

export class ActionApprovalDto {
  @IsString()
  @IsOptional()
  comment?: string;
}
