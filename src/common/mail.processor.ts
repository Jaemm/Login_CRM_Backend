import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { CommonService } from './common.service';
import { EMAIL_QUEUE, SEND_EMAIL_JOB } from './mail-queue.constants';
import { IEmailJob } from './interfaces/email-job.interface';

@Processor(EMAIL_QUEUE, {
  concurrency: 1,
  limiter: {
    max: 1,
    duration: 1000,
  },
})
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(private readonly commonService: CommonService) {
    super();
  }

  async process(job: Job<IEmailJob>) {
    if (job.name !== SEND_EMAIL_JOB) {
      this.logger.warn(`Skipping unknown email job: ${job.name}`);
      return;
    }

    await this.commonService.sendEmail(job.data);
  }
}
