import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { DoPackingSpec } from './DoPackingSpec.entity';
import { DoProductPortfolio } from './DoProductPortfolio.entity';
import { DoProductSort } from './DoProductSort.entity';

@Index('do_packages_pkey', ['id'], { unique: true })
@Entity('do_packages', { schema: 'public' })
export class DoPackages {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('character varying', { name: 'preset_name', length: 100 })
  presetName: string;

  @Column('timestamp with time zone', {
    name: 'created_at',
    nullable: true,
    default: () => 'now()',
  })
  createdAt: Date | null;

  @Column('character varying', {
    name: 'updated_at',
    nullable: true,
    length: 100,
  })
  updatedAt: string | null;

  @Column('character varying', { name: 'creator', nullable: true, length: 100 })
  creator: string | null;

  @ManyToOne(() => DoPackingSpec, (doPackingSpec) => doPackingSpec.doPackages)
  @JoinColumn([{ name: 'packing_spec', referencedColumnName: 'id' }])
  packingSpec: DoPackingSpec;

  @ManyToOne(() => DoProductPortfolio, (doProductPortfolio) => doProductPortfolio.doPackages)
  @JoinColumn([{ name: 'product_id', referencedColumnName: 'id' }])
  product: DoProductPortfolio;

  @ManyToOne(() => DoProductSort, (doProductSort) => doProductSort.doPackages)
  @JoinColumn([{ name: 'product_sort', referencedColumnName: 'id' }])
  productSort: DoProductSort;
}
