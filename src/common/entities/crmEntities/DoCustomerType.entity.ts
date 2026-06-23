import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { DoWrite } from './DoWrite.entity';

@Index('do_customer_type_pkey', ['id'], { unique: true })
@Entity('do_customer_type', { schema: 'public' })
export class DoCustomerType {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('character varying', { name: 'ctype_name', length: 100 })
  ctypeName: string;

  @Column('timestamp without time zone', { name: 'created_at', nullable: true })
  createdAt: Date | null;

  @OneToMany(() => DoWrite, (doWrite) => doWrite.customertype)
  doWrites: DoWrite[];
}
