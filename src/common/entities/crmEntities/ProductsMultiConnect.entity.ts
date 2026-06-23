import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Index('products_multi_connect_pkey', ['id'], { unique: true })
@Entity('products_multi_connect', { schema: 'public' })
export class ProductsMultiConnect {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: number;

  @Column('bigint', { name: 'product_id', nullable: true })
  product_id: number | null;

  @Column('bigint', { name: 'customer_id', nullable: true })
  customer_id: number | null;

  @Column('bigint', { name: 'consultant_id', nullable: true })
  consultant_id: number | null;

  @Column('timestamp without time zone', { name: 'created_at' })
  created_at: Date;

  @Column('timestamp without time zone', { name: 'updated_at' })
  updated_at: Date;
}
