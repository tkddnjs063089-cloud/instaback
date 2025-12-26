import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Highlight } from './highlight.entity';
import { Post } from './post.entity';

@Entity('highlight_posts')
export class HighlightPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'highlight_id' })
  highlightId: string;

  @Column({ name: 'post_id' })
  postId: string;

  @ManyToOne(() => Highlight, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'highlight_id' })
  highlight: Highlight;

  @ManyToOne(() => Post, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post: Post;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
