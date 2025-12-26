import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Query,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreateReplyDto } from './dto/create-reply.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtRefreshGuard } from './jwt-refresh.guard';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 회원가입
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB 제한
      },
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/^image\/(jpeg|jpg|png|gif|webp|avif)$/)) {
          return callback(
            new BadRequestException(
              '이미지 파일만 업로드 가능합니다 (jpeg, jpg, png, gif, webp, avif)',
            ),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async signup(
    @UploadedFile() file: Express.Multer.File,
    @Body() signupDto: SignupDto,
  ) {
    return this.authService.signup(signupDto, file);
  }

  // 로그인
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  // 아이디 중복 확인
  @Get('checkId')
  async checkId(@Query('username') username: string) {
    return this.authService.checkId(username);
  }

  // 현재 로그인된 유저 정보 (Access Token 필요)
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    return this.authService.getProfile(req.user.id);
  }

  // 프로필 업데이트 (Access Token 필요)
  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB 제한
      },
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/^image\/(jpeg|jpg|png|gif|webp|avif)$/)) {
          return callback(
            new BadRequestException(
              '이미지 파일만 업로드 가능합니다 (jpeg, jpg, png, gif, webp, avif)',
            ),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async updateProfile(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(req.user.id, updateProfileDto, file);
  }

  // Access Token 재발급 (Refresh Token 필요)
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  async refreshTokens(@Request() req) {
    return this.authService.refreshTokens(req.user.id, req.user.refreshToken);
  }

  // 로그아웃 (Access Token 필요)
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Request() req) {
    return this.authService.logout(req.user.id);
  }

  // 유저의 게시물 목록 (Access Token 필요)
  @UseGuards(JwtAuthGuard)
  @Get('posts')
  async getUserPosts(@Request() req) {
    return this.authService.getUserPosts(req.user.id);
  }

  // 게시물 작성 (Access Token 필요)
  @UseGuards(JwtAuthGuard)
  @Post('posts')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB 제한
      },
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/^image\/(jpeg|jpg|png|gif|webp|avif)$/)) {
          return callback(
            new BadRequestException(
              '이미지 파일만 업로드 가능합니다 (jpeg, jpg, png, gif, webp, avif)',
            ),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async createPost(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Body() createPostDto: CreatePostDto,
  ) {
    return this.authService.createPost(req.user.id, createPostDto, file);
  }

  // 게시물 상세 조회 (Access Token 필요)
  @UseGuards(JwtAuthGuard)
  @Get('posts/:postId')
  async getPostById(@Request() req, @Param('postId') postId: string) {
    return this.authService.getPostById(postId, req.user.id);
  }

  // 좋아요 토글 (Access Token 필요)
  @UseGuards(JwtAuthGuard)
  @Post('posts/:postId/like')
  async toggleLike(@Request() req, @Param('postId') postId: string) {
    return this.authService.toggleLike(postId, req.user.id);
  }

  // 댓글 추가 (Access Token 필요)
  @UseGuards(JwtAuthGuard)
  @Post('posts/:postId/comments')
  async addComment(
    @Request() req,
    @Param('postId') postId: string,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    return this.authService.addComment(postId, req.user.id, createCommentDto);
  }

  // 대댓글 추가 (Access Token 필요)
  @UseGuards(JwtAuthGuard)
  @Post('comments/:commentId/replies')
  async addReply(
    @Request() req,
    @Param('commentId') commentId: string,
    @Body() createReplyDto: CreateReplyDto,
  ) {
    return this.authService.addReply(commentId, req.user.id, createReplyDto);
  }
}
