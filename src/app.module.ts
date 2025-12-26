import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { User } from './entities/user.entity';
import { Post } from './entities/post.entity';
import { Follow } from './entities/follow.entity';
import { Highlight } from './entities/highlight.entity';
import { HighlightPost } from './entities/highlight-post.entity';
import { Like } from './entities/like.entity';
import { Comment } from './entities/comment.entity';
import { Reply } from './entities/reply.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [
        User,
        Post,
        Follow,
        Highlight,
        HighlightPost,
        Like,
        Comment,
        Reply,
      ],
      synchronize: false,
      ssl: false, // Railway 내부 연결에서는 SSL 불필요
    }),
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
