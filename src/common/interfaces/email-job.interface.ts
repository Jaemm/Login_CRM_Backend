import { IEmailParams } from './email-params.interface';

export type EmailProvider =
  | 'classtech'
  | 'oauth'
  | 'outlook'
  | 'alfaparf'
  | 'choicetech'
  | 'sukoshi';

export interface IEmailJob extends IEmailParams {
  emailProvider?: EmailProvider;
}
