import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { AdminUsers } from './AdminUsers.entity';
import { ConsultantCompanies } from './ConsultantCompanies.entity';
import { DoCustomerType } from './DoCustomerType.entity';
import { Countries } from './Countries.entity';
import { DoSaleChannel } from './DoSaleChannel.entity';
import { DoShippingTerm } from './DoShippingTerm.entity';
import { DoStatus } from './DoStatus.entity';
import { DoUsage } from './DoUsage.entity';

@Index('do_constraint', ['doCode'], { unique: true })
@Index('do_write_pkey', ['id'], { unique: true })
@Entity('do_write', { schema: 'public' })
export class DoWrite {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('character varying', { name: 'writer_email' })
  writerEmail: string;

  @Column('date', { name: 'req_delivery_date' })
  reqDeliveryDate: string;

  @Column('character varying', { name: 'delivery_address' })
  deliveryAddress: string;

  @Column('character varying', { name: 'delivery_post_code' })
  deliveryPostCode: string;

  @Column('character varying', { name: 'delivery_city' })
  deliveryCity: string;

  @Column('character varying', { name: 'delivery_attn' })
  deliveryAttn: string;

  @Column('character varying', { name: 'delivery_contact_number' })
  deliveryContactNumber: string;

  @Column('character varying', { name: 'delivery_forwarder', nullable: true })
  deliveryForwarder: string | null;

  @Column('character varying', {
    name: 'delivery_shipping_mark',
    nullable: true,
  })
  deliveryShippingMark: string | null;

  @Column('character varying', { name: 'export_application', nullable: true })
  exportApplication: string | null;

  @Column('character varying', { name: 'other_comment', nullable: true })
  otherComment: string | null;

  @Column('character varying', {
    name: 'do_code',
    nullable: true,
    unique: true,
  })
  doCode: string | null;

  @Column('date', { name: 'productteamtargetdate', nullable: true })
  productteamtargetdate: string | null;

  @Column('date', { name: 'writingdate', nullable: true })
  writingdate: string | null;

  @Column('date', { name: 'deliverydate', nullable: true })
  deliverydate: string | null;

  @Column('timestamp with time zone', {
    name: 'created_at',
    nullable: true,
    default: () => 'now()',
  })
  createdAt: Date | null;

  @Column('character varying', { name: 'image_hash_id', nullable: true })
  imageHashId: string | null;

  @Column('character varying', { name: 'image_in_aws', nullable: true })
  imageInAws: string | null;

  @Column('jsonb', { name: 'product_info', nullable: true })
  productInfo: object | null;

  @Column('json', { name: 'product_code', nullable: true, array: true })
  productCode: object[] | null;

  @Column('boolean', {
    name: 'approved',
    nullable: true,
    default: () => 'false',
  })
  approved: boolean | null;

  @Column('integer', { name: 'through', nullable: true })
  through: number | null;

  @Column('integer', { name: 'counselor', nullable: true })
  counselor: number | null;

  @Column('character varying', {
    name: 'sales_manager',
    nullable: true,
    length: 50,
  })
  salesManager: string | null;

  @Column('character varying', { name: 'customer_remark', nullable: true })
  customerRemark: string | null;

  @Column('character varying', {
    name: 'pickup_case',
    nullable: true,
    length: 30,
  })
  pickupCase: string | null;

  @Column('jsonb', { name: 'finance', nullable: true })
  finance: object | null;

  @Column('character varying', {
    name: 'quotation_hash',
    nullable: true,
    length: 255,
  })
  quotationHash: string | null;

  @Column('character varying', {
    name: 'quotation_in_aws',
    nullable: true,
    length: 255,
  })
  quotationInAws: string | null;

  @Column('character varying', {
    name: 'quotation_file',
    nullable: true,
    length: 255,
  })
  quotationFile: string | null;

  @Column('timestamp with time zone', { name: 'updated_at', nullable: true })
  updatedAt: Date | null;

  @Column('character varying', {
    name: 'delivery_brand',
    nullable: true,
    length: 100,
  })
  deliveryBrand: string | null;

  @ManyToOne(() => AdminUsers, (adminUsers) => adminUsers.doWrites)
  @JoinColumn([{ name: 'agent_id', referencedColumnName: 'id' }])
  agent: AdminUsers;

  @ManyToOne(() => ConsultantCompanies, (consultantCompanies) => consultantCompanies.doWrites)
  @JoinColumn([{ name: 'customer_id', referencedColumnName: 'id' }])
  customer: ConsultantCompanies;

  @ManyToOne(() => DoCustomerType, (doCustomerType) => doCustomerType.doWrites)
  @JoinColumn([{ name: 'customertypeid', referencedColumnName: 'id' }])
  customertype: DoCustomerType;

  @ManyToOne(() => Countries, (countries) => countries.doWrites)
  @JoinColumn([{ name: 'delivery_country', referencedColumnName: 'id' }])
  deliveryCountry: Countries;

  @ManyToOne(() => DoSaleChannel, (doSaleChannel) => doSaleChannel.doWrites)
  @JoinColumn([{ name: 'salechannelid', referencedColumnName: 'id' }])
  salechannel: DoSaleChannel;

  @ManyToOne(() => DoShippingTerm, (doShippingTerm) => doShippingTerm.doWrites)
  @JoinColumn([{ name: 'shipping_term', referencedColumnName: 'id' }])
  shippingTerm: DoShippingTerm;

  @ManyToOne(() => DoStatus, (doStatus) => doStatus.doWrites)
  @JoinColumn([{ name: 'status', referencedColumnName: 'id' }])
  status: DoStatus;

  @ManyToOne(() => DoUsage, (doUsage) => doUsage.doWrites)
  @JoinColumn([{ name: 'usageid', referencedColumnName: 'id' }])
  usage: DoUsage;
}
