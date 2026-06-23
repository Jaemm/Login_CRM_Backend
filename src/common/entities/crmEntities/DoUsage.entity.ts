import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { DoWrite } from './DoWrite.entity';

@Index('do_usage_pkey', ['id'], { unique: true })
@Entity('do_usage', { schema: 'public' })
export class DoUsage {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('character varying', { name: 'title', length: 100 })
  title: string;

  @Column('character varying', { name: 'usage_name', length: 100 })
  usageName: string;

  @OneToMany(() => DoWrite, (doWrite) => doWrite.usage)
  doWrites: DoWrite[];
}
