import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as handlebars from 'handlebars';
import * as path from 'path';
import { CommonService } from './common.service';

@Injectable()
export class TemplateRenderService {
  constructor(private readonly commonService: CommonService) {}

  private resolveTemplatePath(folder: 'templates' | 'email-templates', templateName: string) {
    const basePath = process.env.PUBLIC_FILE || path.join(process.cwd(), 'public');
    return path.join(basePath, folder, `${templateName}.hbs`);
  }

  async renderTemplate(
    folder: 'templates' | 'email-templates',
    templateName: string,
    context: Record<string, any>,
  ) {
    const templatePath = this.resolveTemplatePath(folder, templateName);
    const template = await fs.readFile(templatePath, 'utf8');
    const compiledTemplate = handlebars.compile(template);
    return compiledTemplate(context);
  }

  private getMailers(locale = 'en') {
    const lang = this.commonService.normalizeTranslationLocale(locale);
    const englishMailers = this.commonService.getTranslation('en')?.['en']?.mailers || {};
    const localeMailers = this.commonService.getTranslation(lang)?.[lang]?.mailers || {};

    return {
      englishMailers,
      localeMailers,
    };
  }

  buildConfirmPageContext(locale = 'en', success = true) {
    const { englishMailers, localeMailers } = this.getMailers(locale);

    return {
      success,
      email_verified: localeMailers.email_verified || englishMailers.email_verified,
      email_verified_para1:
        localeMailers.email_verified_para1 || englishMailers.email_verified_para1,
      email_verified_para2:
        localeMailers.email_verified_para2 || englishMailers.email_verified_para2,
      email_verified_not: localeMailers.email_verified_not || englishMailers.email_verified_not,
      email_verified_not_para1:
        localeMailers.email_verified_not_para1 || englishMailers.email_verified_not_para1,
    };
  }

  buildPasswordRecoveryFormContext(
    locale = 'en',
    input: {
      email: string;
      recoverPasswordToken: string;
      link: string;
      appId: string | number;
      successLink?: string;
    },
  ) {
    const { englishMailers, localeMailers } = this.getMailers(locale);

    return {
      recover_password_title:
        localeMailers.recover_password_title || englishMailers.recover_password_title,
      new_password: localeMailers.new_password || englishMailers.new_password,
      confirm_password: localeMailers.confirm_password || englishMailers.confirm_password,
      confirm: localeMailers.confirm || englishMailers.confirm,
      enter_new_password: localeMailers.enter_new_password || englishMailers.enter_new_password,
      confirm_new_password:
        localeMailers.confirm_new_password || englishMailers.confirm_new_password,
      email: input.email,
      recoverPasswordToken: input.recoverPasswordToken,
      link: input.link,
      success_link: input.successLink,
      app_id: input.appId,
    };
  }
}
