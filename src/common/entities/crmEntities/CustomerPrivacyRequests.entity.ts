import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Customers } from './Customers.entity';

@Index('privacy_requests_pkey', ['id'], { unique: true })
@Index('index_privacy_requests_on_customer_id', ['customer_id'], {})
@Index('index_privacy_requests_on_request_type', ['request_type'], {})
@Index('index_privacy_requests_on_status', ['status'], {})
@Entity('privacy_requests', { schema: 'public' })
export class CustomerPrivacyRequests {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: string;

  @Column('bigint', { name: 'customer_id', nullable: true })
  customer_id: number | null;

  @Column('character varying', { name: 'request_type' })
  request_type: string;

  @Column('character varying', { name: 'status', nullable: true, default: () => "'pending'" })
  status: string | null;

  @Column('text', { name: 'reason', nullable: true })
  reason: string | null;

  @Column('jsonb', { name: 'payload', nullable: true })
  payload: object | null;

  @Column('character varying', { name: 'handled_by', nullable: true })
  handled_by: string | null;

  @Column('character varying', { name: 'response_message', nullable: true })
  response_message: string | null;

  @Column('timestamp without time zone', { name: 'handled_at', nullable: true })
  handled_at: Date | null;

  @Column('timestamp without time zone', { name: 'created_at' })
  created_at: Date;

  @Column('timestamp without time zone', { name: 'updated_at' })
  updated_at: Date;

  @ManyToOne(() => Customers)
  @JoinColumn([{ name: 'customer_id', referencedColumnName: 'id' }])
  customer: Customers;
}
