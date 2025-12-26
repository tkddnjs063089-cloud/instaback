import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreatePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(2200, { message: '게시글은 2200자 이하여야 합니다' })
  caption?: string;
}
