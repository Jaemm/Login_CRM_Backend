import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { DoComment } from './DoComment.entity';
import { DoRemark } from './DoRemark.entity';
import { DoWrite } from './DoWrite.entity';

@Index('index_admin_users_on_email', ['email'], { unique: true })
@Index('admin_users_pkey', ['id'], { unique: true })
@Index('index_admin_users_on_reset_password_token', ['resetPasswordToken'], {
  unique: true,
})
@Entity('admin_users', { schema: 'public' })
export class AdminUsers {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: string;

  @Column('character varying', { name: 'email', default: () => "''" })
  email: string;

  @Column('character varying', {
    name: 'encrypted_password',
    default: () => "''",
  })
  encryptedPassword: string;

  @Column('character varying', { name: 'reset_password_token', nullable: true })
  resetPasswordToken: string | null;

  @Column('timestamp without time zone', {
    name: 'reset_password_sent_at',
    nullable: true,
  })
  resetPasswordSentAt: Date | null;

  @Column('timestamp without time zone', {
    name: 'remember_created_at',
    nullable: true,
  })
  rememberCreatedAt: Date | null;

  @Column('integer', { name: 'sign_in_count', default: () => '0' })
  signInCount: number;

  @Column('timestamp without time zone', {
    name: 'current_sign_in_at',
    nullable: true,
  })
  currentSignInAt: Date | null;

  @Column('timestamp without time zone', {
    name: 'last_sign_in_at',
    nullable: true,
  })
  lastSignInAt: Date | null;

  @Column('character varying', { name: 'current_sign_in_ip', nullable: true })
  currentSignInIp: string | null;

  @Column('character varying', { name: 'last_sign_in_ip', nullable: true })
  lastSignInIp: string | null;

  @Column('character varying', { name: 'name', nullable: true })
  name: string | null;

  @Column('character varying', { name: 'role', nullable: true })
  role: string | null;

  @Column('timestamp without time zone', { name: 'created_at' })
  createdAt: Date;

  @Column('timestamp without time zone', { name: 'updated_at' })
  updatedAt: Date;

  @Column('integer', { name: 'admin_group_id', nullable: true })
  adminGroupId: number | null;

  @Column('character varying', {
    name: 'admin_token',
    nullable: true,
    length: 1000,
  })
  adminToken: string | null;

  @Column('character varying', { name: 'argon_password', nullable: true })
  argonPassword: string | null;

  @Column('boolean', {
    name: 'user_confirm',
    nullable: true,
    default: () => 'false',
  })
  userConfirm: boolean | null;

  @Column('timestamp without time zone', {
    name: 'admin_token_created_at',
    nullable: true,
  })
  adminTokenCreatedAt: Date | null;

  @Column('integer', { name: 'user_agent_id', nullable: true })
  userAgentId: number | null;

  @OneToMany(() => DoComment, (doComment) => doComment.writer)
  doComments: DoComment[];

  @OneToMany(() => DoRemark, (doRemark) => doRemark.writer)
  doRemarks: DoRemark[];

  @OneToMany(() => DoWrite, (doWrite) => doWrite.agent)
  doWrites: DoWrite[];
}
