export interface IEmailParams {
  to: string;
  subject: string;
  templateName: string;
  templateContext: any;
  from?: string;
  replyTo?: string;
}
