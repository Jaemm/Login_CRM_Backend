import {
  AfterLoad,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ChowisCustomerConsents } from './ChowisCustomerConsents.entity';
import { CustomerApplications } from './CustomerApplications.entity';
import { Countries } from './Countries.entity';
import { Ethnicities } from './Ethnicities.entity';
import { SkinColorGroups } from './SkinColorGroups.entity';
import { Products } from './Products.entity';
import { Genders } from './Genders.entity';
import { Consultants } from './Consultants.entity';
import { StringToNumberTransformer } from '../../validators/number-or-string.validator';

@Index('index_customers_on_email', ['email'], {})
@Index('index_customers_on_gender_id', ['gender_id'], {})
@Index('customers_pkey', ['id'], { unique: true })
@Index('index_customers_on_token', ['token'], {})
@Entity('customers', { schema: 'public' })
export class Customers {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: number;

  @Column('character varying', { name: 'token', nullable: true })
  token: string | null;

  @Column('character varying', { name: 'email', nullable: true })
  email: string | null;

  @Column('character varying', { name: 'password_digest', nullable: true })
  password_digest: string | null;

  @Column('character varying', {
    name: 'recovery_password_digest',
    nullable: true,
  })
  recovery_password_digest: string | null;

  @Column('character varying', { name: 'social', nullable: true })
  social: string | null;

  @Column('character varying', { name: 'social_id', nullable: true })
  social_id: string | null;

  @Column('character varying', { name: 'name', nullable: true })
  name: string | null;

  @Column('character varying', { name: 'os', nullable: true })
  os: string | null;

  @Column('character varying', { name: 'language', nullable: true })
  language: string | null;

  @Column('character varying', { name: 'phone', nullable: true })
  phone: string | null;

  @Column('character varying', { name: 'birth', nullable: true })
  birth: string | null;

  @Column('text', { name: 'address', nullable: true })
  address: string | null;

  @Column('text', { name: 'note', nullable: true })
  note: string | null;

  @Column('text', { name: 'push_token', nullable: true })
  push_token: string | null;

  @Column('integer', { name: 'app_id', nullable: true })
  app_id: number | null;

  @Column('boolean', { name: 'email_confirmed', nullable: true })
  email_confirmed: boolean | null;

  @Column('character varying', { name: 'confirm_token', nullable: true })
  confirm_token: string | null;

  @Column('integer', { name: 'company_id', nullable: true })
  company_id: number | null;

  @Column('integer', { name: 'consultant_id', nullable: true })
  consultant_id: number | null;

  @Column('character varying', { name: 'surname', nullable: true })
  surname: string | null;

  @Column('integer', { name: 'age', nullable: true, transformer: new StringToNumberTransformer() })
  age: number | null;

  @Column('character varying', { name: 'register_date', nullable: true })
  register_date: string | null;

  @Column('integer', { name: 'skin_condition', nullable: true })
  skin_condition: number | null;

  @Column('character varying', { name: 'city', nullable: true })
  city: string | null;

  @Column('character varying', { name: 'state', nullable: true })
  state: string | null;

  @Column('character varying', { name: 'zip_code', nullable: true })
  zip_code: string | null;

  @Column('text', { name: 'notes', nullable: true })
  notes: string | null;

  @Column('integer', { name: 'is_active', nullable: true })
  is_active: number | null;

  @Column('character varying', { name: 'image_url', nullable: true })
  image_url: string | null;

  @Column('text', { name: 'delete_token', nullable: true })
  delete_token: string | null;

  @Column('integer', { name: 'status', nullable: true, default: () => '0' })
  status: number | null;

  @Column('integer', {
    name: 'sign_in_count',
    nullable: true,
    default: () => '0',
  })
  sign_in_count: number | null;

  @Column('timestamp without time zone', { name: 'created_at' })
  created_at: Date;

  @Column('timestamp without time zone', { name: 'updated_at' })
  updated_at: Date;

  @Column('character varying', { name: 'phone_country_code', nullable: true })
  phone_country_code: string | null;

  @Column('character varying', { name: 'ipos_consent_url', nullable: true })
  ipos_consent_url: string | null;

  @Column('character varying', {
    name: 'without_ipos_consent_url',
    nullable: true,
  })
  without_ipos_consent_url: string | null;

  @Column('character varying', { name: 'external_id', nullable: true })
  external_id: string | null;

  @Column('character varying', { name: 'country_code', nullable: true })
  country_code: string | null;

  @Column('character varying', { name: 'country_name', nullable: true })
  country_name: string | null;

  @Column('bigint', {
    name: 'gender_id',
    nullable: true,
    transformer: new StringToNumberTransformer(),
  })
  gender_id: number | null;

  @Column('boolean', {
    name: 'register_for_crm',
    nullable: true,
    default: () => 'false',
  })
  register_for_crm: boolean | null;

  @Column('integer', {
    name: 'consultant_shop_id',
    nullable: true,
    transformer: new StringToNumberTransformer(),
  })
  consultant_shop_id: number | null;

  @Column('boolean', {
    name: 'email_subscription',
    nullable: true,
    default: () => 'true',
  })
  email_subscription: boolean | null;

  @Column('integer', {
    name: 'ethnicity_id',
    nullable: true,
    transformer: new StringToNumberTransformer(),
  })
  ethnicity_id: number | null;

  @Column('integer', {
    name: 'skin_color_group_id',
    nullable: true,
    transformer: new StringToNumberTransformer(),
  })
  skin_color_group_id: number | null;

  @Column('integer', {
    name: 'country_id',
    nullable: true,
    transformer: new StringToNumberTransformer(),
  })
  country_id: number | null;

  @Column('boolean', {
    name: 'quick_analysis',
    nullable: true,
    default: () => 'false',
  })
  quick_analysis: boolean | null;

  @Column('boolean', {
    name: 'gdpr_processing_restricted',
    nullable: true,
    default: () => 'false',
  })
  gdpr_processing_restricted: boolean | null;

  @Column('timestamp without time zone', { name: 'gdpr_processing_restricted_at', nullable: true })
  gdpr_processing_restricted_at: Date | null;

  @Column('text', { name: 'gdpr_processing_restriction_reason', nullable: true })
  gdpr_processing_restriction_reason: string | null;

  @OneToMany(
    () => ChowisCustomerConsents,
    (chowisCustomerConsents) => chowisCustomerConsents.customer,
  )
  chowisCustomerConsents: ChowisCustomerConsents[];

  @OneToMany(() => CustomerApplications, (customerApplications) => customerApplications.customer)
  customerApplications: CustomerApplications[];

  @ManyToOne(() => Countries, (countries) => countries.customers, {
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn([{ name: 'country_id', referencedColumnName: 'id' }])
  country: Countries;

  @ManyToOne(() => Ethnicities, (ethnicities) => ethnicities.customers, {
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn([{ name: 'ethnicity_id', referencedColumnName: 'id' }])
  ethnicity: Ethnicities;

  @ManyToOne(() => SkinColorGroups, (skinColorGroups) => skinColorGroups.customers, {
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn([{ name: 'skin_color_group_id', referencedColumnName: 'id' }])
  skinColorGroup: SkinColorGroups;

  @OneToOne(() => Genders, (genders) => genders.customers)
  @JoinColumn([{ name: 'gender_id', referencedColumnName: 'id' }])
  gender: Genders;

  @ManyToOne(() => Consultants, (consultants) => consultants.customers)
  @JoinColumn([{ name: 'consultant_id', referencedColumnName: 'id' }])
  consultant: Consultants;

  @OneToMany(() => Products, (products) => products.customer)
  products: Products[];
  static email: string;

  get getOpticNumbers(): string[] | [] {
    if (this.products && this.products.length > 0) {
      const opticNumber = this.products.map((product) => product.device.optic_number);
      return opticNumber;
    } else {
      return [];
    }
  }

  get getConsultantName(): string | null {
    if (this.consultant) {
      return this.consultant.name;
    } else {
      return null;
    }
  }

  get getCountryName(): string | null {
    if (this.country) {
      return this.country.name;
    } else {
      return null;
    }
  }

  get getCountryPhoneConde(): string | null {
    if (this.country) {
      return this.country.phone_code;
    } else {
      return null;
    }
  }

  get getContryCode(): string | null {
    if (this.country) {
      return this.country.country_code;
    }
    return null;
  }

  get getContryId(): number | null {
    if (this.country) {
      return this.country.id;
    }
    return null;
  }

  get getGenderId(): string | null {
    if (this.gender) {
      return this.gender.id;
    }
    return null;
  }

  @AfterLoad()
  afterLoad() {
    this.id = Number(this.id);
    if (this.gender_id) this.gender_id = Number(this.gender_id);
  }
}
