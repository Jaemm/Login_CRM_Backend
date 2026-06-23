import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { DoRemark } from './DoRemark.entity';
import { AdminUsers } from './AdminUsers.entity';

@Index('do_comment_pkey', ['id'], { unique: true })
@Entity('do_comment', { schema: 'public' })
export class DoComment {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('character varying', { name: 'comment' })
  comment: string;

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

  @ManyToOne(() => DoRemark, (doRemark) => doRemark.doComments)
  @JoinColumn([{ name: 'remark_id', referencedColumnName: 'id' }])
  remark: DoRemark;

  @ManyToOne(() => AdminUsers, (adminUsers) => adminUsers.doComments)
  @JoinColumn([{ name: 'writer_id', referencedColumnName: 'id' }])
  writer: AdminUsers;
}
