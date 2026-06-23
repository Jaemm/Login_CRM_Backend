import {
  AfterLoad,
  Column,
  Entity,
  Index,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ConsultantBranches } from './ConsultantBranches.entity';
import { ConsultantCustomzations } from './ConsultantCustomzations.entity';
import { ConsultantShops } from './ConsultantShops.entity';
import { DoWrite } from './DoWrite.entity';
import { Devices } from './Devices.entity';
import { Applications } from './Applications.entity';
import { Consultants } from './Consultants.entity';

@Index('consultant_companies_pkey', ['id'], { unique: true })
@Entity('consultant_companies', { schema: 'public' })
export class ConsultantCompanies {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: number;

  @Column('character varying', { name: 'name', nullable: true })
  name: string | null;

  @Column('timestamp without time zone', { name: 'created_at' })
  created_at: Date;

  @Column('timestamp without time zone', { name: 'updated_at' })
  updated_at: Date;

  @Column('character varying', { name: 'address', nullable: true })
  address: string | null;

  @Column('character varying', { name: 'email', nullable: true })
  email: string | null;

  @Column('character varying', { name: 'phone', nullable: true })
  phone: string | null;

  @Column('date', { name: 'registeration_date', nullable: true })
  registeration_date: string | null;

  @Column('character varying', { name: 'font_color_1', nullable: true })
  font_color_1: string | null;

  @Column('character varying', { name: 'font_color_2', nullable: true })
  font_color_2: string | null;

  @Column('boolean', { name: 'pmx', nullable: true, default: () => 'false' })
  pmx: boolean | null;

  @Column('boolean', { name: 'active', nullable: true, default: () => 'true' })
  active: boolean | null;

  @Column('character varying', { name: 'pmx_callback_url', nullable: true })
  pmx_callback_url: string | null;

  @Column('boolean', { name: 'is_crm_sync', nullable: true, default: () => 'false' })
  is_crm_sync: boolean | null;

  @Column('boolean', { name: 'is_simple_question', nullable: true, default: () => 'false' })
  is_simple_question: boolean | null;

  @Column('boolean', { name: 'is_down_scoring', nullable: true })
  is_down_scoring: boolean | null;

  @Column('boolean', { name: 'is_reverse_scoring', nullable: true })
  is_reverse_scoring: boolean | null;

  @Column('boolean', {
    name: 'qr_custom_enabled',
    nullable: true,
    default: () => 'false',
  })
  qr_custom_enabled: boolean | null;

  @Column('text', {
    name: 'qr_custom_url',
    nullable: true,
  })
  qr_custom_url: string | null;

  @OneToMany(() => ConsultantBranches, (consultantBranches) => consultantBranches.consultantCompany)
  consultantBranches: ConsultantBranches[];

  @OneToMany(
    () => ConsultantCustomzations,
    (consultantCustomzations) => consultantCustomzations.consultantCompany,
  )
  consultantCustomzations: ConsultantCustomzations[];

  @OneToMany(() => ConsultantShops, (consultantShops) => consultantShops.consultantCompany)
  consultantShops: ConsultantShops[];

  @OneToMany(() => DoWrite, (doWrite) => doWrite.customer)
  doWrites: DoWrite[];

  @OneToMany(() => Devices, (devices) => devices.consultant_company)
  devices: Devices[];

  @OneToOne(() => Consultants, (consultants) => consultants.consultant_company)
  consultant: Consultants;

  @OneToMany(() => Applications, (applications) => applications.consultantCompany)
  applications: Applications[];

  @AfterLoad()
  afterLoad() {
    this.id = Number(this.id);
  }
}
