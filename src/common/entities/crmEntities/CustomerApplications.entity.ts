import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Applications } from './Applications.entity';
import { Customers } from './Customers.entity';

@Index('index_customer_applications_on_application_id', ['applicationId'], {})
@Index('index_customer_applications_on_customer_id', ['customerId'], {})
@Index('customer_applications_pkey', ['id'], { unique: true })
@Entity('customer_applications', { schema: 'public' })
export class CustomerApplications {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: number;

  @Column('bigint', { name: 'customer_id', nullable: true })
  customerId: number | null;

  @Column('bigint', { name: 'application_id', nullable: true })
  applicationId: string | null;

  @Column('timestamp without time zone', { name: 'created_at' })
  createdAt: Date;

  @Column('timestamp without time zone', { name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Applications, (applications) => applications.customerApplications)
  @JoinColumn([{ name: 'application_id', referencedColumnName: 'id' }])
  application: Applications;

  @ManyToOne(() => Customers, (customers) => customers.customerApplications)
  @JoinColumn([{ name: 'customer_id', referencedColumnName: 'id' }])
  customer: Customers;
}
