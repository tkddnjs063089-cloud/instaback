import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB 제한
      },
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/^image\/(jpeg|jpg|png|gif|webp)$/)) {
          return callback(
            new BadRequestException(
              '이미지 파일만 업로드 가능합니다 (jpeg, jpg, png, gif, webp)',
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
}

