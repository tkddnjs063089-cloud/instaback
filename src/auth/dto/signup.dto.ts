import {
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsNotEmpty,
} from 'class-validator';

export class SignupDto {
  @IsString()
  @IsNotEmpty({ message: '아이디를 입력해주세요' })
  @MinLength(4, { message: '아이디는 4자 이상이어야 합니다' })
  @MaxLength(20, { message: '아이디는 20자 이하여야 합니다' })
  @Matches(/^[a-zA-Z0-9!@#$%^&*_-]+$/, {
    message: '아이디는 영문, 숫자, 특수문자(!@#$%^&*_-)만 사용 가능합니다',
  })
  username: string;

  @IsString()
  @IsNotEmpty({ message: '비밀번호를 입력해주세요' })
  @MinLength(8, { message: '비밀번호는 8자 이상이어야 합니다' })
  @MaxLength(20, { message: '비밀번호는 20자 이하여야 합니다' })
  @Matches(/[a-zA-Z]/, { message: '비밀번호에 영문을 포함해주세요' })
  @Matches(/\d/, { message: '비밀번호에 숫자를 포함해주세요' })
  @Matches(/[!@#$%^&*]/, {
    message: '비밀번호에 특수문자(!@#$%^&*)를 포함해주세요',
  })
  password: string;

  @IsString()
  @IsNotEmpty({ message: '비밀번호 확인을 입력해주세요' })
  confirmPassword: string;

  @IsString()
  @IsNotEmpty({ message: '닉네임을 입력해주세요' })
  @MinLength(2, { message: '닉네임은 2자 이상이어야 합니다' })
  @MaxLength(20, { message: '닉네임은 20자 이하여야 합니다' })
  @Matches(/^(?=.*[a-zA-Z])[a-zA-Z0-9!@#$%^&*_.\-]+$/, {
    message: '닉네임은 영문 필수, 숫자/특수문자(!@#$%^&*_-.는 선택입니다',
  })
  nickname: string;
}
