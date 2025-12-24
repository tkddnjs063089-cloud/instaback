import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { supabase } from '../supabase';
import { SignupDto } from './dto/signup.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  async signup(
    signupDto: SignupDto,
    file: Express.Multer.File,
  ): Promise<{ message: string; user: any }> {
    const { username, password, confirmPassword, nickname } = signupDto;

    // 비밀번호 확인 검증
    if (password !== confirmPassword) {
      throw new BadRequestException('비밀번호가 일치하지 않습니다');
    }

    // 파일 검증
    if (!file) {
      throw new BadRequestException('프로필 이미지를 업로드해주세요');
    }

    // 중복 아이디 체크
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      throw new ConflictException('이미 사용 중인 아이디입니다');
    }

    // 중복 닉네임 체크
    const { data: existingNickname } = await supabase
      .from('users')
      .select('id')
      .eq('nickname', nickname)
      .single();

    if (existingNickname) {
      throw new ConflictException('이미 사용 중인 닉네임입니다');
    }

    // 프로필 이미지 업로드
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${username}_${Date.now()}.${fileExt}`;
    const filePath = `profiles/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      throw new BadRequestException(
        '이미지 업로드에 실패했습니다: ' + uploadError.message,
      );
    }

    // 이미지 공개 URL 가져오기
    const { data: urlData } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);

    const profileImageUrl = urlData.publicUrl;

    // 비밀번호 해싱
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 사용자 정보 저장
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        username,
        password: hashedPassword,
        nickname,
        profile_image: profileImageUrl,
      })
      .select()
      .single();

    if (insertError) {
      // 이미지 업로드 롤백
      await supabase.storage.from('images').remove([filePath]);
      throw new BadRequestException(
        '회원가입에 실패했습니다: ' + insertError.message,
      );
    }

    // 비밀번호 제외하고 반환
    const { password: _, ...userWithoutPassword } = newUser;

    return {
      message: '회원가입이 완료되었습니다',
      user: userWithoutPassword,
    };
  }
}

