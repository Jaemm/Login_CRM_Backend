import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Consultants } from './Consultants.entity';
import { Customers } from './Customers.entity';

@Index('genders_pkey', ['id'], { unique: true })
@Entity('genders', { schema: 'public' })
export class Genders {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: string;

  @Column('character varying', { name: 'name', nullable: true })
  name: string | null;

  @Column('timestamp without time zone', { name: 'created_at' })
  createdAt: Date;

  @Column('timestamp without time zone', { name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Consultants, (consultants) => consultants.gender)
  consultants: Consultants[];

  @OneToMany(() => Customers, (customers) => customers.gender)
  customers: Customers[];
}
