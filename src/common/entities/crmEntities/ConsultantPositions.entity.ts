import { AfterLoad, Column, Entity, Index, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Consultants } from './Consultants.entity';

@Index('consultant_positions_pkey', ['id'], { unique: true })
@Entity('consultant_positions', { schema: 'public' })
export class ConsultantPositions {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: number;

  @Column('character varying', { name: 'name', nullable: true })
  name: string | null;

  @Column('timestamp without time zone', { name: 'created_at' })
  created_at: Date;

  @Column('timestamp without time zone', { name: 'updated_at' })
  updated_at: Date;

  @OneToOne(() => Consultants, (consultants) => consultants.consultant_position)
  consultant: Consultants;

  @AfterLoad()
  afterLoad() {
    this.id = Number(this.id);
  }
}
