import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { DoWrite } from './DoWrite.entity';

@Index('shipping_term_pkey', ['id'], { unique: true })
@Entity('do_shipping_term', { schema: 'public' })
export class DoShippingTerm {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('character varying', { name: 'st_name' })
  stName: string;

  @OneToMany(() => DoWrite, (doWrite) => doWrite.shippingTerm)
  doWrites: DoWrite[];
}
