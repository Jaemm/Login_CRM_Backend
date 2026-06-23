import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Customers } from './Customers.entity';

@Index('ethnicities_pkey', ['id'], { unique: true })
@Entity('ethnicities', { schema: 'public' })
export class Ethnicities {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: string;

  @Column('character varying', { name: 'code', nullable: true })
  code: string | null;

  @Column('character varying', { name: 'name', nullable: true })
  name: string | null;

  @Column('timestamp without time zone', { name: 'created_at' })
  createdAt: Date;

  @Column('timestamp without time zone', { name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Customers, (customers) => customers.ethnicity)
  customers: Customers[];
}
