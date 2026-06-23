import { AfterLoad, Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ConsultantBranches } from './ConsultantBranches.entity';
import { ConsultantShops } from './ConsultantShops.entity';
import { Consultants } from './Consultants.entity';
import { Customers } from './Customers.entity';
import { DoWrite } from './DoWrite.entity';

@Index('countries_pkey', ['id'], { unique: true })
@Entity('countries', { schema: 'public' })
export class Countries {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: number;

  @Column('character varying', { name: 'name' })
  name: string;

  @Column('timestamp without time zone', { name: 'created_at' })
  createdAt: Date;

  @Column('timestamp without time zone', { name: 'updated_at' })
  updatedAt: Date;

  @Column('character varying', { name: 'phone_code', length: 9 })
  phone_code: string;

  @Column('character varying', { name: 'country_code', length: 5 })
  country_code: string;

  @OneToMany(() => ConsultantBranches, (consultantBranches) => consultantBranches.consultantCountry)
  consultantBranches: ConsultantBranches[];

  @OneToMany(() => ConsultantShops, (consultantShops) => consultantShops.country)
  consultantShops: ConsultantShops[];

  @OneToMany(() => Consultants, (consultants) => consultants.country_details)
  consultants: Consultants[];

  @OneToMany(() => Customers, (customers) => customers.country)
  customers: Customers[];

  @OneToMany(() => DoWrite, (doWrite) => doWrite.deliveryCountry)
  doWrites: DoWrite[];

  @AfterLoad()
  afterLoad() {
    this.id = Number(this.id);
  }
}
