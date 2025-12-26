import {
  Injectable,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { supabase } from '../supabase';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { User } from '../entities/user.entity';
import { Post } from '../entities/post.entity';
import { Follow } from '../entities/follow.entity';
import { Like } from '../entities/like.entity';
import { Comment } from '../entities/comment.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
    @InjectRepository(Follow)
    private followRepository: Repository<Follow>,
    @InjectRepository(Like)
    private likeRepository: Repository<Like>,
    @InjectRepository(Comment)
    private commentRepository: Repository<Comment>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // 토큰 생성 헬퍼 함수
  private generateTokens(userId: string, username: string) {
    const payload = { sub: userId, username };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET') || 'your-secret-key',
      expiresIn: '15m', // Access Token: 15분
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret:
        this.configService.get<string>('JWT_REFRESH_SECRET') ||
        'your-refresh-secret-key',
      expiresIn: '7d', // Refresh Token: 7일
    });

    return { accessToken, refreshToken };
  }

  // Refresh Token을 해시해서 DB에 저장
  private async updateRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.userRepository.update(userId, {
      refreshToken: hashedRefreshToken,
    });
  }

  // 회원가입
  async signup(
    signupDto: SignupDto,
    file: Express.Multer.File,
  ): Promise<{ message: string; user: Partial<User> }> {
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
    const existingUser = await this.userRepository.findOne({
      where: { username },
    });

    if (existingUser) {
      throw new ConflictException('이미 사용 중인 아이디입니다');
    }

    // 중복 닉네임 체크
    const existingNickname = await this.userRepository.findOne({
      where: { nickname },
    });

    if (existingNickname) {
      throw new ConflictException('이미 사용 중인 닉네임입니다');
    }

    // 프로필 이미지 업로드 (Supabase Storage)
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

    // 사용자 정보 저장 (PostgreSQL)
    try {
      const newUser = this.userRepository.create({
        username,
        password: hashedPassword,
        nickname,
        profileImage: profileImageUrl,
      });

      const savedUser = await this.userRepository.save(newUser);

      // 비밀번호 제외하고 반환
      const {
        password: _,
        refreshToken: __,
        ...userWithoutSensitive
      } = savedUser;

      return {
        message: '회원가입이 완료되었습니다',
        user: userWithoutSensitive,
      };
    } catch (error) {
      // 이미지 업로드 롤백
      await supabase.storage.from('images').remove([filePath]);
      throw new BadRequestException(
        '회원가입에 실패했습니다: ' + error.message,
      );
    }
  }

  // 로그인
  async login(loginDto: LoginDto): Promise<{
    message: string;
    accessToken: string;
    refreshToken: string;
    user: Partial<User>;
  }> {
    const { username, password } = loginDto;

    // 사용자 찾기
    const user = await this.userRepository.findOne({
      where: { username },
    });

    if (!user) {
      throw new UnauthorizedException(
        '아이디 또는 비밀번호가 일치하지 않습니다',
      );
    }

    // 비밀번호 확인
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException(
        '아이디 또는 비밀번호가 일치하지 않습니다',
      );
    }

    // Access Token + Refresh Token 생성
    const { accessToken, refreshToken } = this.generateTokens(
      user.id,
      user.username,
    );

    // Refresh Token 해시해서 DB에 저장
    await this.updateRefreshToken(user.id, refreshToken);

    // 민감한 정보 제외하고 반환
    const { password: _, refreshToken: __, ...userWithoutSensitive } = user;

    return {
      message: '로그인 성공',
      accessToken,
      refreshToken,
      user: userWithoutSensitive,
    };
  }

  // Access Token 재발급 (Refresh Token 사용)
  async refreshTokens(
    userId: string,
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user || !user.refreshToken) {
      throw new ForbiddenException('접근 권한이 없습니다');
    }

    // 저장된 해시와 비교
    const refreshTokenMatches = await bcrypt.compare(
      refreshToken,
      user.refreshToken,
    );

    if (!refreshTokenMatches) {
      throw new ForbiddenException('유효하지 않은 토큰입니다');
    }

    // 새 토큰 발급 (Refresh Token Rotation)
    const tokens = this.generateTokens(user.id, user.username);

    // 새 Refresh Token 저장
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  // 로그아웃 (Refresh Token 삭제)
  async logout(userId: string): Promise<{ message: string }> {
    await this.userRepository.update(userId, { refreshToken: undefined });
    return { message: '로그아웃 성공' };
  }

  // 아이디 중복 확인
  async checkId(
    username: string,
  ): Promise<{ available: boolean; message: string }> {
    if (!username) {
      throw new BadRequestException('아이디를 입력해주세요');
    }

    const existingUser = await this.userRepository.findOne({
      where: { username },
    });

    if (existingUser) {
      return {
        available: false,
        message: '이미 존재하는 아이디입니다',
      };
    }

    return {
      available: true,
      message: '사용 가능한 아이디입니다',
    };
  }

  // 현재 로그인된 유저 정보 가져오기
  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('유저를 찾을 수 없습니다');
    }

    // 게시물 수
    const postsCount = await this.postRepository.count({
      where: { userId: userId },
    });

    // 팔로워 수 (나를 팔로우하는 사람)
    const followersCount = await this.followRepository.count({
      where: { followingId: userId },
    });

    // 팔로잉 수 (내가 팔로우하는 사람)
    const followingCount = await this.followRepository.count({
      where: { followerId: userId },
    });

    const { password: _, refreshToken: __, ...userWithoutSensitive } = user;

    return {
      ...userWithoutSensitive,
      stats: {
        posts: postsCount,
        followers: followersCount,
        following: followingCount,
      },
    };
  }

  // 유저의 게시물 목록 가져오기 (좋아요/댓글 수 포함)
  async getUserPosts(userId: string) {
    const posts = await this.postRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    // 각 게시물에 좋아요/댓글 수 추가
    const postsWithCounts = await Promise.all(
      posts.map(async (post) => {
        const likesCount = await this.likeRepository.count({
          where: { postId: post.id },
        });
        const commentsCount = await this.commentRepository.count({
          where: { postId: post.id },
        });

        return {
          id: post.id,
          imageUrl: post.imageUrl,
          caption: post.caption,
          createdAt: post.createdAt,
          likesCount,
          commentsCount,
        };
      }),
    );

    return postsWithCounts;
  }

  // 프로필 업데이트
  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('유저를 찾을 수 없습니다');
    }

    // 닉네임 변경 시 중복 체크
    if (
      updateProfileDto.nickname &&
      updateProfileDto.nickname !== user.nickname
    ) {
      const existingNickname = await this.userRepository.findOne({
        where: { nickname: updateProfileDto.nickname },
      });

      if (existingNickname) {
        throw new ConflictException('이미 사용 중인 닉네임입니다');
      }
    }

    // 업데이트
    await this.userRepository.update(userId, {
      ...(updateProfileDto.nickname && { nickname: updateProfileDto.nickname }),
      ...(updateProfileDto.bio !== undefined && { bio: updateProfileDto.bio }),
    });

    // 업데이트된 유저 정보 반환
    const updatedUser = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!updatedUser) {
      throw new UnauthorizedException('유저를 찾을 수 없습니다');
    }

    const {
      password: _,
      refreshToken: __,
      ...userWithoutSensitive
    } = updatedUser;

    return {
      message: '프로필이 업데이트되었습니다',
      user: userWithoutSensitive,
    };
  }

  // 게시물 작성
  async createPost(
    userId: string,
    createPostDto: CreatePostDto,
    file: Express.Multer.File,
  ) {
    // 파일 검증
    if (!file) {
      throw new BadRequestException('이미지를 업로드해주세요');
    }

    // 이미지 업로드 (Supabase Storage)
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${userId}_${Date.now()}.${fileExt}`;
    const filePath = `posts/${fileName}`;

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

    const imageUrl = urlData.publicUrl;

    // 게시물 저장
    const newPost = this.postRepository.create({
      imageUrl,
      caption: createPostDto.caption || '',
      userId,
    });

    const savedPost = await this.postRepository.save(newPost);

    return {
      message: '게시물이 작성되었습니다',
      post: {
        id: savedPost.id,
        imageUrl: savedPost.imageUrl,
        caption: savedPost.caption,
        createdAt: savedPost.createdAt,
        likesCount: 0,
        commentsCount: 0,
      },
    };
  }
}
