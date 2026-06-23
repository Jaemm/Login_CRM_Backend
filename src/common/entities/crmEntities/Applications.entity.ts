import {
  AfterLoad,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CustomerApplications } from './CustomerApplications.entity';
import { Products } from './Products.entity';
import { ConsultantCompanies } from './ConsultantCompanies.entity';

@Index('index_applications_on_analysis_type', ['analysis_type'], {})
@Index('index_applications_on_consultant_company_id', ['consultant_company_id'], {})
@Index('applications_pkey', ['id'], { unique: true })
@Entity('applications', { schema: 'public' })
export class Applications {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: number;

  @Column('character varying', { name: 'name', nullable: true })
  name: string | null;

  @Column('character varying', { name: 'apk_url' })
  apk_url: string;

  @Column('character varying', { name: 'version', nullable: true })
  version: string | null;

  @Column('character varying', { name: 'group_name', nullable: true })
  group_name: string | null;

  @Column('timestamp without time zone', {
    name: 'regist_date',
    default: () => 'CURRENT_TIMESTAMP',
  })
  regist_date: Date;

  @Column('text', { name: 'description', nullable: true })
  description: string | null;

  @Column('character varying', { name: 'ios_version', nullable: true })
  ios_version: string | null;

  @Column('character varying', { name: 'android_version', nullable: true })
  android_version: string | null;

  @Column('character varying', { name: 'android_app_url', nullable: true })
  android_app_url: string | null;

  @Column('character varying', { name: 'ios_app_url', nullable: true })
  ios_app_url: string | null;

  @Column('boolean', { name: 'is_old', nullable: true })
  is_old: boolean | null;

  @Column('character varying', { name: 'app_icon_file_name', nullable: true })
  app_icon_file_name: string | null;

  @Column('character varying', {
    name: 'app_icon_content_type',
    nullable: true,
  })
  app_icon_content_type: string | null;

  @Column('integer', { name: 'app_icon_file_size', nullable: true })
  app_icon_file_size: number | null;

  @Column('timestamp without time zone', {
    name: 'app_icon_updated_at',
    nullable: true,
  })
  app_icon_updated_at: Date | null;

  @Column('character varying', { name: 'apk_download_url', nullable: true })
  apk_download_url: string | null;

  @Column('timestamp without time zone', { name: 'created_at' })
  created_at: Date;

  @Column('timestamp without time zone', { name: 'updated_at' })
  updated_at: Date;

  @Column('integer', { name: 'consultant_company_id', nullable: true })
  consultant_company_id: number | null;

  @Column('varchar', { name: 'analysis_type', nullable: true, array: true })
  analysis_type: string[] | null;

  @Column('boolean', {
    name: 'is_frequently_used',
    nullable: true,
    default: () => 'false',
  })
  is_frequently_used: boolean | null;

  @Column('character varying', { name: 'old_ios_version', nullable: true })
  old_ios_version: string | null;

  @Column('character varying', { name: 'old_android_version', nullable: true })
  old_android_version: string | null;

  @Column('boolean', { name: 'cancel', nullable: false, default: () => 'true' })
  cancel: boolean;

  @OneToMany(() => CustomerApplications, (customerApplications) => customerApplications.application)
  customerApplications: CustomerApplications[];

  @OneToMany(() => Products, (products) => products.application)
  products: Products[];

  @ManyToOne(() => ConsultantCompanies, (consultantCompanies) => consultantCompanies.applications)
  @JoinColumn([{ name: 'consultant_company_id', referencedColumnName: 'id' }])
  consultantCompany: ConsultantCompanies;

  get analysisData(): string | null {
    return null;
  }

  @AfterLoad()
  afterLoad() {
    this.id = Number(this.id);
  }
}
