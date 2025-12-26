import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateReplyDto {
  @IsString()
  @IsNotEmpty({ message: '대댓글 내용을 입력해주세요' })
  @MaxLength(1000, { message: '대댓글은 1000자 이하여야 합니다' })
  seccomment: string;
}
