import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Index('license_histories_pkey', ['id'], { unique: true })
@Index(
  'index_license_histories_on_licensable_type_and_licensable_id',
  ['licensableId', 'licensableType'],
  {},
)
@Entity('license_histories', { schema: 'public' })
export class LicenseHistories {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: string;

  @Column('character varying', { name: 'licensable_type' })
  licensableType: string;

  @Column('bigint', { name: 'licensable_id' })
  licensableId: string;

  @Column('timestamp without time zone', {
    name: 'expected_expiry_date',
    nullable: true,
  })
  expectedExpiryDate: Date | null;

  @Column('integer', { name: 'extended', nullable: true })
  extended: number | null;

  @Column('character varying', { name: 'extend_type', nullable: true })
  extendType: string | null;

  @Column('integer', { name: 'price', nullable: true })
  price: number | null;

  @Column('timestamp without time zone', { name: 'created_at' })
  createdAt: Date;

  @Column('timestamp without time zone', { name: 'updated_at' })
  updatedAt: Date;
}
