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
import { ConsultantBranches } from './ConsultantBranches.entity';
import { ConsultantCompanies } from './ConsultantCompanies.entity';
import { Countries } from './Countries.entity';
import { Consultants } from './Consultants.entity';
import { StringToNumberTransformer } from '../../validators/number-or-string.validator';

@Index('index_consultant_shops_on_consultant_branch_id', ['consultantBranchId'], {})
@Index('consultant_shops_pkey', ['id'], { unique: true })
@Entity('consultant_shops', { schema: 'public' })
export class ConsultantShops {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: number;

  @Column('bigint', { name: 'consultant_branch_id', nullable: true })
  consultantBranchId: string | null;

  @Column('character varying', { name: 'name', nullable: true })
  name: string | null;

  @Column('timestamp without time zone', { name: 'created_at' })
  createdAt: Date;

  @Column('timestamp without time zone', { name: 'updated_at' })
  updatedAt: Date;

  @Column('integer', { name: 'country_id', nullable: true })
  country_id: number | null;

  @Column('character varying', { name: 'postal_code', nullable: true })
  postal_code: string | null;

  @Column('character varying', { name: 'address', nullable: true })
  address: string | null;

  @Column('character varying', { name: 'city', nullable: true })
  city: string | null;

  @Column('bigint', {
    name: 'consultant_company_id',
    nullable: true,
    transformer: new StringToNumberTransformer(),
  })
  consultant_company_id: number | null;

  @Column('character varying', {
    name: 'shop_code',
    nullable: true,
    length: 50,
  })
  shop_code: string | null;

  @ManyToOne(() => ConsultantBranches, (consultantBranches) => consultantBranches.consultantShops, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn([{ name: 'consultant_branch_id', referencedColumnName: 'id' }])
  consultantBranch: ConsultantBranches;

  @ManyToOne(
    () => ConsultantCompanies,
    (consultantCompanies) => consultantCompanies.consultantShops,
    {
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
  )
  @JoinColumn([{ name: 'consultant_company_id', referencedColumnName: 'id' }])
  consultantCompany: ConsultantCompanies;

  @ManyToOne(() => Countries, (countries) => countries.consultantShops, {
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn([{ name: 'country_id', referencedColumnName: 'id' }])
  country: Countries;

  @OneToMany(() => Consultants, (consultants) => consultants.consultant_shop)
  consultants: Consultants[];

  get getContryName(): string | null {
    if (this.country) {
      return this.country.name;
    } else {
      return null;
    }
  }

  @AfterLoad()
  afterLoad() {
    this.id = Number(this.id);
  }
}
