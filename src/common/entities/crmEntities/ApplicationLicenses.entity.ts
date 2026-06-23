import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Index('index_application_licenses_on_application_id', ['applicationId'], {})
@Index('application_licenses_pkey', ['id'], { unique: true })
@Index('index_application_licenses_on_license_id', ['licenseId'], {})
@Entity('application_licenses', { schema: 'public' })
export class ApplicationLicenses {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: string;

  @Column('bigint', { name: 'application_id', nullable: true })
  applicationId: string | null;

  @Column('bigint', { name: 'license_id', nullable: true })
  licenseId: string | null;

  @Column('double precision', {
    name: 'license_change_one_month_price',
    nullable: true,
    precision: 53,
  })
  licenseChangeOneMonthPrice: number | null;

  @Column('double precision', {
    name: 'license_change_one_year_price',
    nullable: true,
    precision: 53,
  })
  licenseChangeOneYearPrice: number | null;

  @Column('double precision', {
    name: 'license_change_two_year_price',
    nullable: true,
    precision: 53,
  })
  licenseChangeTwoYearPrice: number | null;

  @Column('double precision', {
    name: 'license_change_three_year_price',
    nullable: true,
    precision: 53,
  })
  licenseChangeThreeYearPrice: number | null;

  @Column('double precision', {
    name: 'license_extend_one_month_price',
    nullable: true,
    precision: 53,
  })
  licenseExtendOneMonthPrice: number | null;

  @Column('double precision', {
    name: 'license_extend_one_year_price',
    nullable: true,
    precision: 53,
  })
  licenseExtendOneYearPrice: number | null;

  @Column('double precision', {
    name: 'license_extend_two_year_price',
    nullable: true,
    precision: 53,
  })
  licenseExtendTwoYearPrice: number | null;

  @Column('double precision', {
    name: 'license_extend_three_year_price',
    nullable: true,
    precision: 53,
  })
  licenseExtendThreeYearPrice: number | null;

  @Column('timestamp without time zone', { name: 'created_at' })
  createdAt: Date;

  @Column('timestamp without time zone', { name: 'updated_at' })
  updatedAt: Date;
}
