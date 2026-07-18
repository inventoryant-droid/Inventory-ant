import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class CommentApprovalDto {
  @IsString()
  @IsNotEmpty({ message: 'Comment is required' })
  comment: string;

  @IsNumber()
  level: number;
}
