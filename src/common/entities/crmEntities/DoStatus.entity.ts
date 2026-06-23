import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { DoWrite } from './DoWrite.entity';

@Index('do_status_pkey', ['id'], { unique: true })
@Entity('do_status', { schema: 'public' })
export class DoStatus {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('character varying', { name: 'name', length: 100 })
  name: string;

  @OneToMany(() => DoWrite, (doWrite) => doWrite.status)
  doWrites: DoWrite[];
}
