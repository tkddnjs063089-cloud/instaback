import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS 활성화 (프론트엔드에서 접근 허용)
  app.enableCors({
    origin: [
      process.env.FRONTEND_URL,
      process.env.NODE_ENV !== 'production' && 'http://localhost:3000',
    ].filter(Boolean) as string[],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  });

  // 유효성 검사 파이프 설정
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 서버가 포트 ${port}에서 실행 중입니다`);
}
bootstrap();
