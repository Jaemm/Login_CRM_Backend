import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CommonService } from './common.service';
import { LicenseDomainService } from './license-domain.service';
import { MailDispatchService } from './mail-dispatch.service';
import { MailTemplateService } from './mail-template.service';
import { ErrorResponseService } from './middleWare/exceptions/exceptionHandling/error-response.service';
import { TemplateRenderService } from './template-render.service';
import { BrevoService } from './brevo.service';
import { MailProcessor } from './mail.processor';
import { EMAIL_QUEUE } from './mail-queue.constants';

@Global()
@Module({
  imports: [BullModule.registerQueue({ name: EMAIL_QUEUE })],
  providers: [
    CommonService,
    LicenseDomainService,
    MailDispatchService,
    MailTemplateService,
    ErrorResponseService,
    TemplateRenderService,
    BrevoService,
    MailProcessor,
  ],
  exports: [
    CommonService,
    LicenseDomainService,
    MailDispatchService,
    MailTemplateService,
    ErrorResponseService,
    TemplateRenderService,
    BrevoService,
  ],
})
export class CommonModule {}
