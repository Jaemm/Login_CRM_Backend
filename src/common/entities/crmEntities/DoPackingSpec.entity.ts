import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { DoPackages } from './DoPackages.entity';

@Index('do_packing_spec_pkey', ['id'], { unique: true })
@Entity('do_packing_spec', { schema: 'public' })
export class DoPackingSpec {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('character varying', { name: 'ps_name' })
  psName: string;

  @OneToMany(() => DoPackages, (doPackages) => doPackages.packingSpec)
  doPackages: DoPackages[];
}
