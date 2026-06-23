import { AfterLoad, Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Products } from './Products.entity';

@Index('licenses_pkey', ['id'], { unique: true })
@Entity('licenses', { schema: 'public' })
export class Licenses {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: number;

  @Column('character varying', { name: 'name', nullable: true })
  name: string | null;

  @Column('timestamp without time zone', { name: 'created_at' })
  createdAt: Date;

  @Column('timestamp without time zone', { name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Products, (products) => products.license)
  products: Products[];

  @AfterLoad()
  afterLoad() {
    this.id = Number(this.id);
  }
}
