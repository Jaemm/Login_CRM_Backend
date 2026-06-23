import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Index('customer_log_pkey', ['id'], { unique: true })
@Index('index_customer_log_on_consultant_id', ['consultant_id'], {})
@Index('index_customer_log_on_customer_id', ['customer_id'], {})
@Index('index_customer_log_on_action_type', ['action_type'], {})
@Index('index_customer_log_on_phone', ['phone'], {})
@Entity('customer_log', { schema: 'public' })
export class CustomerLog {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: number;

  @Column('character varying', {
    name: 'action_type',
    nullable: true,
    default: () => "'delete'",
  })
  action_type: string | null;

  @Column('bigint', { name: 'consultant_id', nullable: true })
  consultant_id: number | null;

  @Column('bigint', { name: 'customer_id', nullable: true })
  customer_id: number | null;

  @Column('character varying', { name: 'email', nullable: true })
  email: string | null;

  @Column('character varying', { name: 'phone', nullable: true })
  phone: string | null;

  @Column('bigint', { name: 'app_id', nullable: true })
  app_id: number | null;

  @Column('character varying', { name: 'reason' })
  reason: string;

  @Column('timestamp without time zone', { name: 'created_at' })
  created_at: Date;

  @Column('timestamp without time zone', { name: 'updated_at' })
  updated_at: Date;
}
