import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { DoPackages } from './DoPackages.entity';

@Index('product_code_pkey', ['id'], { unique: true })
@Entity('do_product_portfolio', { schema: 'public' })
export class DoProductPortfolio {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('character varying', { name: 'company', length: 50 })
  company: string;

  @Column('character varying', { name: 'code', length: 20 })
  code: string;

  @Column('character varying', {
    name: 'optimic_magnification',
    nullable: true,
    length: 20,
  })
  optimicMagnification: string | null;

  @Column('character varying', { name: 'dock', nullable: true, length: 10 })
  dock: string | null;

  @Column('character varying', { name: 'marker', nullable: true, length: 10 })
  marker: string | null;

  @Column('character varying', { name: 'type', nullable: true, length: 10 })
  type: string | null;

  @Column('character varying', { name: 'product_name', length: 60 })
  productName: string;

  @Column('character varying', { name: 'remark', nullable: true, length: 100 })
  remark: string | null;

  @Column('character varying', {
    name: 'reality_picture',
    nullable: true,
    length: 100,
  })
  realityPicture: string | null;

  @Column('timestamp without time zone', {
    name: 'created_at',
    nullable: true,
    default: () => 'now()',
  })
  createdAt: Date | null;

  @Column('character varying', { name: 'updated_at', nullable: true })
  updatedAt: string | null;

  @Column('character varying', {
    name: 'image_hash_id',
    nullable: true,
    length: 255,
  })
  imageHashId: string | null;

  @Column('character varying', {
    name: 'image_in_aws',
    nullable: true,
    length: 255,
  })
  imageInAws: string | null;

  @Column('character varying', {
    name: 'product_code',
    nullable: true,
    length: 50,
  })
  productCode: string | null;

  @Column('json', { name: 'args', nullable: true })
  args: object | null;

  @Column('boolean', {
    name: 'is_accessory',
    nullable: true,
    default: () => 'false',
  })
  isAccessory: boolean | null;

  @OneToMany(() => DoPackages, (doPackages) => doPackages.product)
  doPackages: DoPackages[];
}
