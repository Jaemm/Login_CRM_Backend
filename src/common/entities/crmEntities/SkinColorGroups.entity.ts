import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Customers } from './Customers.entity';

@Index('skin_color_groups_pkey', ['id'], { unique: true })
@Entity('skin_color_groups', { schema: 'public' })
export class SkinColorGroups {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: string;

  @Column('character varying', { name: 'code', nullable: true })
  code: string | null;

  @Column('character varying', { name: 'name', nullable: true })
  name: string | null;

  @Column('timestamp without time zone', { name: 'created_at' })
  createdAt: Date;

  @Column('timestamp without time zone', { name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Customers, (customers) => customers.skinColorGroup)
  customers: Customers[];
}
