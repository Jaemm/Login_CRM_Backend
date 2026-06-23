import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DoComment } from './DoComment.entity';
import { AdminUsers } from './AdminUsers.entity';

@Index('do_remark_pkey', ['id'], { unique: true })
@Entity('do_remark', { schema: 'public' })
export class DoRemark {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('integer', { name: 'do_id' })
  doId: number;

  @Column('character varying', { name: 'remark' })
  remark: string;

  @Column('timestamp with time zone', {
    name: 'created_at',
    nullable: true,
    default: () => 'now()',
  })
  createdAt: Date | null;

  @Column('date', { name: 'updated_at', nullable: true })
  updatedAt: string | null;

  @Column('character varying', { name: 'image', nullable: true, length: 255 })
  image: string | null;

  @Column('character varying', { name: 'hash_id', nullable: true, length: 255 })
  hashId: string | null;

  @Column('character varying', {
    name: 'image_hash_id',
    nullable: true,
    length: 255,
  })
  imageHashId: string | null;

  @Column('character varying', {
    name: 'image_in_aws',
    nullable: true,
    length: 255,
  })
  imageInAws: string | null;

  @Column('json', { name: 'args', nullable: true })
  args: object | null;

  @Column('character varying', {
    name: 'file_extension',
    nullable: true,
    length: 10,
  })
  fileExtension: string | null;

  @Column('boolean', {
    name: 'is_finance',
    nullable: true,
    default: () => 'false',
  })
  isFinance: boolean | null;

  @OneToMany(() => DoComment, (doComment) => doComment.remark)
  doComments: DoComment[];

  @ManyToOne(() => AdminUsers, (adminUsers) => adminUsers.doRemarks)
  @JoinColumn([{ name: 'writer_id', referencedColumnName: 'id' }])
  writer: AdminUsers;
}
