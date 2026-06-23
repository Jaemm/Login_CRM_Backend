import {
  AfterLoad,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Applications } from './Applications.entity';
import { Customers } from './Customers.entity';
import { Devices } from './Devices.entity';
import { Licenses } from './Licenses.entity';
import { Consultants } from './Consultants.entity';

@Index('index_products_on_application_id', ['application_id'], {})
@Index('index_products_on_consultant_id', ['consultant_id'], {})
@Index('index_products_on_customer_id', ['customer_id'], {})
@Index('index_products_on_device_id', ['device_id'], {})
@Index('products_pkey', ['id'], { unique: true })
@Index('index_products_on_license_id', ['license_id'], {})
@Entity('products', { schema: 'public' })
export class Products {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: number;

  @Column('bigint', { name: 'device_id', nullable: true })
  device_id: string | null;

  @Column('bigint', { name: 'license_id', nullable: true })
  license_id: string | null;

  @Column('bigint', { name: 'application_id', nullable: true })
  application_id: number | null;

  @Column('bigint', { name: 'customer_id', nullable: true })
  customer_id: number | null;

  @Column('bigint', { name: 'consultant_id', nullable: true })
  consultant_id: number | null;

  @Column('date', { name: 'first_use_date', nullable: true })
  first_use_date: string | null;

  @Column('character varying', { name: 'use_date', nullable: true })
  use_date: string | null;

  @Column('character varying', { name: 'use_time', nullable: true })
  use_time: string | null;

  @Column('character varying', { name: 'mac_address', nullable: true })
  mac_address: string | null;

  @Column('character varying', {
    name: 'app_use_yn',
    nullable: true,
    default: () => "'Y'",
  })
  app_use_yn: string | null;

  @Column('integer', { name: 'license_period', nullable: true })
  license_period: number | null;

  @Column('timestamp without time zone', { name: 'created_at' })
  created_at: Date;

  @Column('timestamp without time zone', { name: 'updated_at' })
  updated_at: Date;

  @Column('integer', { name: 'days_remaining', nullable: true })
  license_remaining_days: number | null;

  @Column('timestamp without time zone', {
    name: 'days_remaining_updated_at',
    nullable: true,
  })
  days_remaining_updated_at: Date | null;

  @Column('boolean', {
    name: 'is_paid_for_license',
    nullable: true,
    default: () => 'false',
  })
  is_paid_for_license: boolean | null;

  @ManyToOne(() => Applications, (applications) => applications.products)
  @JoinColumn([
    { name: 'application_id', referencedColumnName: 'id' },
    { name: 'application_id', referencedColumnName: 'id' },
  ])
  application: Applications;

  @ManyToOne(() => Customers, (customers) => customers.products, {
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn([{ name: 'customer_id', referencedColumnName: 'id' }])
  customer: Customers;

  @OneToOne(() => Consultants, (consultants) => consultants.products)
  @JoinColumn([{ name: 'consultant_id', referencedColumnName: 'id' }])
  consultant: Consultants;

  @ManyToOne(() => Devices, (devices) => devices.products, {
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn([{ name: 'device_id', referencedColumnName: 'id' }])
  device: Devices;

  @ManyToOne(() => Licenses, (licenses) => licenses.products)
  @JoinColumn([
    { name: 'license_id', referencedColumnName: 'id' },
    { name: 'license_id', referencedColumnName: 'id' },
  ])
  license: Licenses;

  get getExpiredDate(): Date | null {
    if (this.first_use_date && this.license_period) {
      return new Date(
        new Date(this.first_use_date).getTime() + this.license_period * 24 * 60 * 60 * 1000,
      );
    }
    return null;
  }

  get getIsExpired(): boolean {
    return this.getExpiredDate ? this.getExpiredDate < new Date() : false;
  }

  @AfterLoad()
  afterLoad() {
    this.id = Number(this.id);
  }

  @Column('boolean', {
    name: 'products_multi_connect',
    nullable: true,
    default: () => 'false',
  })
  products_multi_connect: boolean | null;

  @Column({ type: 'boolean', default: false })
  is_app_sync: boolean;
}
