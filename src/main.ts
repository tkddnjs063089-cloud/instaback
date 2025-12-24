import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS 활성화 (프론트엔드에서 접근 허용)
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      process.env.FRONTEND_URL, // 배포된 프론트엔드 URL
    ].filter(Boolean) as string[],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  });

  // 유효성 검사 파이프 설정
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO에 정의되지 않은 속성 제거
      forbidNonWhitelisted: true, // 정의되지 않은 속성 요청 시 에러
      transform: true, // 타입 자동 변환
    }),
  );

  // Render는 PORT 환경 변수 자동 제공, 로컬은 3001 사용
  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 서버가 포트 ${port}에서 실행 중입니다`);
}
bootstrap();
