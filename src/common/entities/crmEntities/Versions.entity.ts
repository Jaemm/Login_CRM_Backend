import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Index('versions_pkey', ['id'], { unique: true })
@Index('index_versions_on_item_type_and_item_id', ['itemId', 'itemType'], {})
@Entity('versions', { schema: 'public' })
export class Versions {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: string;

  @Column('character varying', { name: 'item_type', length: 191 })
  itemType: string;

  @Column('bigint', { name: 'item_id' })
  itemId: number;

  @Column('character varying', { name: 'event' })
  event: string;

  @Column('character varying', { name: 'whodunnit', nullable: true })
  whodunnit: number | null;

  @Column('text', { name: 'object', nullable: true })
  object: string | null;

  @Column('timestamp without time zone', { name: 'created_at', nullable: true })
  createdAt: Date | null;

  @Column('text', { name: 'object_changes', nullable: true })
  objectChanges: string | null;

  @Column('text', { name: 'comments', nullable: true })
  comments: string | null;

  @Column('boolean', {
    name: 'notified',
    nullable: true,
    default: () => 'false',
  })
  notified: boolean | null;
}
