import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { DoWrite } from './DoWrite.entity';

@Index('do_sale_channel_pkey', ['id'], { unique: true })
@Entity('do_sale_channel', { schema: 'public' })
export class DoSaleChannel {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('character varying', { name: 'sc_name', length: 100 })
  scName: string;

  @Column('timestamp without time zone', { name: 'created_at', nullable: true })
  createdAt: Date | null;

  @OneToMany(() => DoWrite, (doWrite) => doWrite.salechannel)
  doWrites: DoWrite[];
}
