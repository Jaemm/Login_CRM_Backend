import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Index('chowis_service_license_mangment_p_key', ['id'], { unique: true })
@Entity('chowis_service_license_mangment', { schema: 'public' })
export class ChowisServiceLicenseManagement {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: number;

  @Column('bigint', { name: 'consultant_company_id', nullable: true })
  consultant_company_id: number | null;

  @Column('bigint', { name: 'admin_user_id', nullable: true })
  admin_user_id: number | null;

  @Column('bigint', { name: 'service_id', nullable: true })
  service_id: number | null;

  @Column('bigint', { name: 'license_id', nullable: true })
  license_id: number | null;

  @Column('bigint', { name: 'days_remaining', nullable: true })
  days_remaining: number | null;

  @Column('bigint', { name: 'license_period', nullable: true })
  license_period: number | null;

  @Column('timestamp without time zone', { name: 'first_use_date', nullable: true })
  first_use_date: string | null;

  @Column('boolean', { name: 'is_paid_subscribtion', nullable: true })
  is_paid_subscribtion: boolean | null;

  @Column('timestamp without time zone', { name: 'days_remaining_updated_at' })
  days_remaining_updated_at: string | null;

  @Column('timestamp without time zone', { name: 'created_at' })
  created_at: string | null;

  @Column('timestamp without time zone', { name: 'updated_at' })
  updated_at: string | null;
}
