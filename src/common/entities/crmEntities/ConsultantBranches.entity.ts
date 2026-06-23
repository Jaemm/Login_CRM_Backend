import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ConsultantCompanies } from './ConsultantCompanies.entity';
import { Countries } from './Countries.entity';
import { ConsultantShops } from './ConsultantShops.entity';

@Index('index_consultant_branches_on_consultant_company_id', ['consultantCompanyId'], {})
@Index('consultant_branches_pkey', ['id'], { unique: true })
@Entity('consultant_branches', { schema: 'public' })
export class ConsultantBranches {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: string;

  @Column('bigint', { name: 'consultant_company_id', nullable: true })
  consultantCompanyId: string | null;

  @Column('character varying', { name: 'name', nullable: true })
  name: string | null;

  @Column('timestamp without time zone', { name: 'created_at' })
  createdAt: Date;

  @Column('timestamp without time zone', { name: 'updated_at' })
  updatedAt: Date;

  @Column('character varying', { name: 'code', nullable: true })
  code: string | null;

  @Column('character varying', { name: 'email', nullable: true })
  email: string | null;

  @Column('character varying', { name: 'password', nullable: true })
  password: string | null;

  @Column('character varying', { name: 'country_name', nullable: true })
  countryName: string | null;

  @Column('integer', { name: 'country_id', nullable: true })
  countryId: number | null;

  @ManyToOne(
    () => ConsultantCompanies,
    (consultantCompanies) => consultantCompanies.consultantBranches,
    {
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
  )
  @JoinColumn([{ name: 'consultant_company_id', referencedColumnName: 'id' }])
  consultantCompany: ConsultantCompanies;

  @ManyToOne(() => Countries, (countries) => countries.consultantBranches, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn([{ name: 'consultant_country_id', referencedColumnName: 'id' }])
  consultantCountry: Countries;

  @OneToMany(() => ConsultantShops, (consultantShops) => consultantShops.consultantBranch)
  consultantShops: ConsultantShops[];
}
