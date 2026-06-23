import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('web_result_management')
export class WebResultManagement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('integer', { name: 'batch_id', nullable: false })
  batch_id: number;

  @Column('integer', { name: 'app_id', nullable: false })
  app_id: number;

  @Column('integer', { name: 'customer_id', nullable: false })
  customer_id: number;

  @Column('integer', { name: 'consultant_id', nullable: true })
  consultant_id: number;

  @Column('timestamp without time zone', { name: 'created_at' })
  created_at: Date;

  @Column('timestamp without time zone', { name: 'expired_at' })
  expired_at: Date;

  @Column({ default: false, name: 'expired' })
  expired: boolean;

  @Column('timestamp without time zone', { name: 'checked_at' })
  checked_at: Date;

  @Column('text')
  web_link: string;
}
