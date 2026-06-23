import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Index('notifications_pkey', ['id'], { unique: true })
@Index('index_notifications_on_message_id', ['message_id'], {})
@Index('index_notifications_on_target_type_and_target_id', ['target_id', 'target_type'], {})
@Entity('notifications', { schema: 'public' })
export class Notifications {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: string;

  @Column('character varying', { name: 'target_type', nullable: true })
  target_type: string | null;

  @Column('bigint', { name: 'target_id', nullable: true })
  target_id: string | null;

  @Column('bigint', { name: 'message_id', nullable: true })
  message_id: string | null;

  @Column('character varying', { name: 'kind', nullable: true })
  kind: string | null;

  @Column('character varying', { name: 'title', nullable: true })
  title: string | null;

  @Column('text', { name: 'content', nullable: true })
  content: string | null;

  @Column('text', { name: 'ios_link', nullable: true })
  iosLink: string | null;

  @Column('text', { name: 'android_link', nullable: true })
  androidLink: string | null;

  @Column('timestamp without time zone', { name: 'created_at' })
  created_at: Date;

  @Column('timestamp without time zone', { name: 'updated_at' })
  updated_at: Date;

  @Column('boolean', {
    name: 'fcm_sent',
    nullable: true,
    default: () => 'false',
  })
  fcmSent: boolean | null;
}
