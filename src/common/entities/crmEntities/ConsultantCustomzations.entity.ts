import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ConsultantCompanies } from './ConsultantCompanies.entity';

@Index('consultant_customzations_pkey', ['id'], { unique: true })
@Entity('consultant_customzations', { schema: 'public' })
export class ConsultantCustomzations {
  @Column('timestamp without time zone', { name: 'created_at' })
  created_at: Date;

  @Column('timestamp without time zone', { name: 'updated_at' })
  updated_at: Date;

  @Column('character varying', { name: 'primary_color_code', nullable: true })
  primary_color_code: string | null;

  @Column('character varying', { name: 'secondary_color_code', nullable: true })
  secondary_color_code: string | null;

  @Column('character varying', { name: 'font', nullable: true })
  font: string | null;

  @Column('character varying', { name: 'program_color_code', nullable: true })
  program_color_code: string | null;

  @Column('character varying', { name: 'top_color_code', nullable: true })
  top_color_code: string | null;

  @Column('character varying', { name: 'text_icon_color_code', nullable: true })
  text_icon_color_code: string | null;

  @Column('character varying', { name: 'pie_chart_color_1', nullable: true })
  pie_chart_color_1: string | null;

  @Column('character varying', { name: 'pie_chart_color_2', nullable: true })
  pie_chart_color_2: string | null;

  @Column('character varying', { name: 'pie_chart_color_3', nullable: true })
  pie_chart_color_3: string | null;

  @Column('character varying', { name: 'pie_chart_color_4', nullable: true })
  pie_chart_color_4: string | null;

  @Column('character varying', { name: 'pie_chart_color_5', nullable: true })
  pie_chart_color_5: string | null;

  @Column('character varying', {
    name: 'pie_chart_points_color',
    nullable: true,
  })
  pie_chart_points_color: string | null;

  @Column('character varying', { name: 'data_exchange_url', nullable: true })
  data_exchange_url: string | null;

  @Column('character varying', { name: 'font_color_1', nullable: true })
  font_color_1: string | null;

  @Column('character varying', { name: 'font_color_2', nullable: true })
  font_color_2: string | null;

  @Column('boolean', { name: 'pmx', nullable: true })
  pmx: boolean | null;

  @Column('boolean', { name: 'active', nullable: true })
  active: boolean | null;

  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('boolean', {
    name: 'chowis_logo',
    nullable: true,
    default: () => 'true',
  })
  chowis_logo: boolean | null;

  @Column('boolean', {
    name: 'channel_io',
    nullable: true,
    default: () => 'false',
  })
  channel_io: boolean | null;

  @Column('boolean', {
    name: 'medical_version',
    nullable: true,
    default: () => 'true',
  })
  medical_version: boolean | null;

  @Column('character varying', { name: 'result_expiration_time', nullable: true })
  result_expiration_time: string | null;

  @Column('boolean', {
    name: 'image_upload',
    nullable: true,
    default: () => 'true',
  })
  image_upload: boolean | null;

  @Column('boolean', {
    name: 'representative_score_type',
    nullable: true,
    default: () => 'false',
    select: false,
  })
  representative_score_type: boolean | null;

  @Column('integer', {
    name: 'representative_score_skin_type_measurement_id',
    nullable: true,
    select: false,
  })
  representative_score_skin_type_measurement_id: number | null;

  @Column('integer', {
    name: 'representative_score_hair_type_measurement_id',
    nullable: true,
    select: false,
  })
  representative_score_hair_type_measurement_id: number | null;

  @Column('boolean', {
    name: 'qr_code_enabled',
    nullable: true,
    default: () => 'true',
    select: false,
  })
  qr_code_enabled: boolean | null;

  @Column('boolean', {
    name: 'screen_saver_enabled',
    nullable: true,
    default: () => 'true',
    select: false,
  })
  screen_saver_enabled: boolean | null;

  @Column('boolean', {
    name: 'use_result_share',
    nullable: true,
    default: () => 'true',
    select: false,
  })
  use_result_share: boolean | null;

  @ManyToOne(
    () => ConsultantCompanies,
    (consultantCompanies) => consultantCompanies.consultantCustomzations,
  )
  @JoinColumn([{ name: 'consultant_company_id', referencedColumnName: 'id' }])
  consultantCompany: ConsultantCompanies;
}
