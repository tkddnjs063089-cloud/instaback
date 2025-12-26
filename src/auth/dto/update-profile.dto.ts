import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: '닉네임은 2자 이상이어야 합니다' })
  @MaxLength(20, { message: '닉네임은 20자 이하여야 합니다' })
  @Matches(/^(?=.*[a-zA-Z])[a-zA-Z0-9!@#$%^&*_.\-]+$/, {
    message: '닉네임은 영문 필수, 숫자/특수문자(!@#$%^&*_-.) 선택 가능합니다',
  })
  nickname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150, { message: '자기소개는 150자 이하여야 합니다' })
  bio?: string;
}
