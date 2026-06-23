import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ChowisCustomerConsents } from './ChowisCustomerConsents.entity';
import { Customers } from './Customers.entity';

@Index('chowis_customer_consent_histories_pkey', ['id'], { unique: true })
@Index('index_chowis_customer_consent_histories_on_customer_id', ['customer_id'], {})
@Index('index_chowis_customer_consent_histories_on_consent_id', ['customer_consent_id'], {})
@Entity('chowis_customer_consent_histories', { schema: 'public' })
export class ChowisCustomerConsentHistories {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: string;

  @Column('integer', { name: 'customer_id', nullable: true })
  customer_id: number | null;

  @Column('integer', { name: 'customer_consent_id', nullable: true })
  customer_consent_id: number | null;

  @Column('integer', { name: 'consultant_id', nullable: true })
  consultant_id: number | null;

  @Column('character varying', { name: 'action_type', nullable: true })
  action_type: string | null;

  @Column('integer', { name: 'consent_version', nullable: true })
  consent_version: number | null;

  @Column('character varying', { name: 'consent_type', nullable: true })
  consent_type: string | null;

  @Column('varchar', { name: 'consent_form_answers', nullable: true, array: true })
  consent_form_answers: string[] | null;

  @Column('text', { name: 'consent_text', nullable: true })
  consent_text: string | null;

  @Column('boolean', { name: 'data_transfer', nullable: true })
  data_transfer: boolean | null;

  @Column('boolean', { name: 'data_privacy', nullable: true })
  data_privacy: boolean | null;

  @Column('boolean', { name: 'receive_license_notification', nullable: true })
  receive_license_notification: boolean | null;

  @Column('boolean', { name: 'receive_newsletter', nullable: true })
  receive_newsletter: boolean | null;

  @Column('text', { name: 'additional_information', nullable: true })
  additional_information: string | null;

  @Column('text', { name: 'withdrawal_reason', nullable: true })
  withdrawal_reason: string | null;

  @Column('timestamp without time zone', { name: 'created_at' })
  created_at: Date;

  @Column('timestamp without time zone', { name: 'updated_at' })
  updated_at: Date;

  @ManyToOne(() => Customers)
  @JoinColumn([{ name: 'customer_id', referencedColumnName: 'id' }])
  customer: Customers;

  @ManyToOne(() => ChowisCustomerConsents)
  @JoinColumn([{ name: 'customer_consent_id', referencedColumnName: 'id' }])
  customerConsent: ChowisCustomerConsents;
}
