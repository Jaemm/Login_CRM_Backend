import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { DoPackages } from './DoPackages.entity';

@Index('do_product_sort_pkey', ['id'], { unique: true })
@Entity('do_product_sort', { schema: 'public' })
export class DoProductSort {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('character varying', { name: 'p_sort_name', length: 100 })
  pSortName: string;

  @Column('timestamp without time zone', {
    name: 'created_at',
    default: () => 'now()',
  })
  createdAt: Date;

  @OneToMany(() => DoPackages, (doPackages) => doPackages.productSort)
  doPackages: DoPackages[];
}
