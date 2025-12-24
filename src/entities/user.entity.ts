import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 20 })
  username: string;

  @Column()
  password: string;

  @Column({ unique: true, length: 20 })
  nickname: string;

  @Column({ name: 'profile_image', nullable: true })
  profileImage: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
