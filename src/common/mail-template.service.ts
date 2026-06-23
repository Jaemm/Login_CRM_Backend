import { Injectable } from '@nestjs/common';
import * as handlebars from 'handlebars';
import { BrandConfig } from '@/src/config/branding.config';
import { CommonService } from './common.service';

@Injectable()
export class MailTemplateService {
  constructor(private readonly commonService: CommonService) {}

  private resolveServiceLabel(brandConfig: BrandConfig, appName?: string | null) {
    return appName || brandConfig.displayName || 'ChoiceTech';
  }

  private resolveRecipientName(name?: string | null, email?: string | null, defaultName?: string) {
    const trimmedName = typeof name === 'string' ? name.trim() : '';
    if (trimmedName) {
      return trimmedName;
    }

    const emailLocalPart = email?.split('@')[0]?.trim();
    if (emailLocalPart) {
      return emailLocalPart;
    }

    return defaultName;
  }

  private formatSubject(
    brandName: string,
    subjectTemplate?: string,
    variables: Record<string, any> = {},
    options: { omitBrandName?: boolean } = {},
  ) {
    const rawSubject = handlebars.compile(subjectTemplate || '')({
      brand: options.omitBrandName ? '' : brandName,
      ...variables,
    });
    const normalizedSubject = options.omitBrandName
      ? this.stripLeadingSubjectSeparator(rawSubject)
      : rawSubject?.trim();

    if (!normalizedSubject) {
      return options.omitBrandName ? subjectTemplate?.trim() || '' : brandName;
    }

    if (options.omitBrandName) {
      return normalizedSubject;
    }

    if (normalizedSubject.toLowerCase().startsWith(brandName.toLowerCase())) {
      return normalizedSubject;
    }

    return `${brandName} - ${normalizedSubject}`;
  }

  private stripLeadingSubjectSeparator(subject?: string) {
    return (subject || '').trim().replace(/^[-:|/\\]+/, '').trim();
  }

  private getMailers(locale = 'en') {
    const lang = this.commonService.normalizeTranslationLocale(locale);
    const englishMailers = this.commonService.getTranslation('en')?.['en']?.mailers || {};
    const localeMailers = this.commonService.getTranslation(lang)?.[lang]?.mailers || {};

    return {
      lang,
      englishMailers,
      localeMailers,
      mergedMailers: { ...englishMailers, ...localeMailers },
    };
  }

  buildEmailConfirmationTemplate(input: {
    locale?: string;
    brandConfig: BrandConfig;
    name?: string | null;
    email?: string | null;
    appName?: string | null;
    confirmationLink: string;
    defaultName: string;
  }) {
    const { locale, brandConfig, name, email, appName, confirmationLink, defaultName } = input;
    const { lang, englishMailers, localeMailers } = this.getMailers(locale);
    const t = (key: string) => localeMailers[key] ?? englishMailers[key];

    const brandName = brandConfig.displayName || 'ChoiceTech';
    const serviceLabel = this.resolveServiceLabel(brandConfig, appName);
    const subjectTemplate =
      t('confirm_email_subject') ||
      t(`confirm_email_title_${lang}`) ||
      t('confirm_email_title') ||
      'Confirm your email';

    return {
      subject: this.formatSubject(brandName, subjectTemplate, {}, {
        omitBrandName: brandConfig.omitSubjectBrandName,
      }),
      templateContext: {
        Headers: t('confirm_email_header'),
        paragraph1: handlebars.compile(t('greeting_confirm_email_html') || '')({
          name: this.resolveRecipientName(name, email, defaultName),
          app_name: serviceLabel,
        }),
        paragraph2: t('confirm_email'),
        button: t('confirm'),
        address: t('address'),
        address_text: t('address_text'),
        support_text: t('support_text'),
        email: t('email'),
        phone: t('phone'),
        notification_text1: t('notification_text1'),
        logo: brandConfig.logos,
        contact: brandConfig.contact,
        link: confirmationLink,
      },
    };
  }

  buildLicenseExpiryWarningTemplate(input: {
    locale?: string;
    brandConfig?: BrandConfig;
    name?: string | null;
    appName?: string | null;
    opticNumber?: string | null;
    licenseName?: string | null;
    firstUseDate?: string | Date | null;
    expiredDate?: string | null;
    days: number;
  }) {
    const { mergedMailers } = this.getMailers(input.locale);
    const brandName = input.brandConfig?.displayName || 'ChoiceTech';
    const {
      greeting = 'Hello {{{name}}},',
      license_status_text = 'We would like to inform you about the current license status:',
      device_number = 'Device number',
      program_name = 'Program name',
      program_version = 'Program version',
      activation_date = 'Activation date',
      expiration_date = 'Expiration date',
      remaining_days = 'Remaining days',
      license_status = 'License status',
      notification_text = 'If you have any questions, contact us at',
      license_action_warning = 'Please take action before your license expires to avoid service interruption.',
      license_expiration = 'License Expiration Notification',
    } = mergedMailers;

    return {
      subject: this.formatSubject(brandName, license_expiration, {}, {
        omitBrandName: input.brandConfig?.omitSubjectBrandName,
      }),
      templateContext: {
        greeting: handlebars.compile(greeting)({
          name: input.name || 'User',
        }),
        intro_text: license_status_text,
        device_number_lbl: device_number,
        app_name_lbl: program_name,
        license_name_lbl: program_version,
        activation_date_lbl: activation_date,
        expiration_date_lbl: expiration_date,
        remaining_days_lbl: remaining_days,
        license_type_lbl: license_status,
        footer_text: notification_text,
        action_warning_text: license_action_warning,
        name: input.name || 'User',
        app_name: input.appName || 'App',
        product: {
          device: { optic_number: input.opticNumber || 'Unknown' },
          license: {
            name: input.licenseName || 'Unknown',
            type: input.licenseName || 'Unknown',
          },
          first_use_date: input.firstUseDate,
          expired_date: input.expiredDate,
        },
        days: input.days,
        admin_present: false,
        contact: input.brandConfig?.contact,
      },
    };
  }

  buildPasswordRecoveryTemplate(input: {
    locale?: string;
    brandConfig: BrandConfig;
    name?: string | null;
    appName?: string | null;
    password: string;
    defaultName: string;
  }) {
    const { mergedMailers } = this.getMailers(input.locale);
    const brandName = input.brandConfig.displayName || 'ChoiceTech';
    const serviceLabel = this.resolveServiceLabel(input.brandConfig, input.appName);
    const {
      password_recovery_subject = '{{brand}} Password Recovery',
      password_reset_notice,
      password_reset_greeting,
      password_reset_para1,
      password_reset_para2,
      password_reset_para3,
      notification_text1,
      support_text,
      address,
      address_text,
      email,
      email_text,
      phone,
      phone_text,
    } = mergedMailers;

    return {
      subject: this.formatSubject(brandName, password_recovery_subject, {}, {
        omitBrandName: input.brandConfig.omitSubjectBrandName,
      }),
      templateContext: {
        password_reset_notice,
        password_reset_greeting: handlebars.compile(password_reset_greeting || '')({
          name: input.name || input.defaultName,
          app_name: serviceLabel,
        }),
        password_reset_para1,
        password_reset_para2: handlebars.compile(password_reset_para2 || '')({
          password: input.password,
        }),
        password_reset_para3,
        notification_text1,
        support_text,
        address,
        address_text,
        email,
        email_text,
        phone,
        phone_text,
        logo: input.brandConfig.logos,
        contact: input.brandConfig.contact,
      },
    };
  }

  buildPasswordRecoveryNewTemplate(input: {
    locale?: string;
    brandConfig: BrandConfig;
    name?: string | null;
    appName?: string | null;
    link?: string | null;
    defaultName: string;
  }) {
    const { mergedMailers } = this.getMailers(input.locale);
    const brandName = input.brandConfig.displayName || 'ChoiceTech';
    const serviceLabel = this.resolveServiceLabel(input.brandConfig, input.appName);
    let subjectTemplate = mergedMailers.password_recovery;

    if (!subjectTemplate) {
      subjectTemplate = 'Password Recovery';
    }

    return {
      subject: this.formatSubject(brandName, subjectTemplate, {}, {
        omitBrandName: input.brandConfig.omitSubjectBrandName,
      }),
      templateContext: {
        password_recovery: mergedMailers.password_recovery,
        password_recovery_verification: mergedMailers.password_recovery_verification,
        pass_recovery_greeting: handlebars.compile(mergedMailers.pass_recovery_greeting || '')({
          name: input.name || input.defaultName,
          app_name: serviceLabel,
        }),
        password_recovery_para1: mergedMailers.password_recovery_para1,
        link: input.link || 'https://www.google.com',
        confirm: mergedMailers.confirm,
        password_recovery_para2: mergedMailers.password_recovery_para2,
        notification_text1: mergedMailers.notification_text1,
        supoprt_page: input.brandConfig.contact?.email
          ? `mailto:${input.brandConfig.contact.email}`
          : undefined,
        supoprt_page_text: mergedMailers.supoprt_page,
        logo: input.brandConfig.logos,
        contact: input.brandConfig.contact,
        address: mergedMailers.address,
        email: mergedMailers.email,
        phone: mergedMailers.phone,
      },
    };
  }

  buildPasswordResetSuccessTemplate(input: {
    locale?: string;
    brandConfig: BrandConfig;
    name?: string | null;
    appName?: string | null;
    defaultName: string;
    greetingKey?: 'password_reset_greeting' | 'pass_reset_success_greeting';
  }) {
    const { mergedMailers } = this.getMailers(input.locale);
    const brandName = input.brandConfig.displayName || 'ChoiceTech';
    const serviceLabel = this.resolveServiceLabel(input.brandConfig, input.appName);
    let subjectTemplate = mergedMailers.password_reset_subject || mergedMailers.pass_reset_success;

    if (!subjectTemplate) {
      subjectTemplate = 'Password Reset Success';
    }

    const greetingTemplate =
      mergedMailers[input.greetingKey || 'password_reset_greeting'] ||
      mergedMailers.password_reset_greeting ||
      '';

    return {
      subject: this.formatSubject(brandName, subjectTemplate, {}, {
        omitBrandName: input.brandConfig.omitSubjectBrandName,
      }),
      templateContext: {
        pass_reset_success: mergedMailers.pass_reset_success,
        password_reset_greeting: handlebars.compile(greetingTemplate)({
          name: input.name || input.defaultName,
          app_name: serviceLabel,
        }),
        pass_reset_success_greeting: handlebars.compile(greetingTemplate)({
          name: input.name || input.defaultName,
          app_name: serviceLabel,
        }),
        pass_reset_success_para1: mergedMailers.pass_reset_success_para1,
        notification_text1: mergedMailers.notification_text1,
        support_text: mergedMailers.support_text,
        address: mergedMailers.address,
        address_text: mergedMailers.address_text,
        email: mergedMailers.email,
        email_text: mergedMailers.email_text,
        phone: mergedMailers.phone,
        phone_text: mergedMailers.phone_text,
        logo: input.brandConfig.logos,
        contact: input.brandConfig.contact,
      },
    };
  }

  buildDeviceActivationTemplate(input: {
    locale?: string;
    brandConfig: BrandConfig;
    name?: string | null;
    appName?: string | null;
    deviceNumber: string;
    email: string;
    defaultName: string;
  }) {
    const { mergedMailers, localeMailers, englishMailers } = this.getMailers(input.locale);
    const brandName = input.brandConfig.displayName || 'ChoiceTech';
    const serviceLabel = this.resolveServiceLabel(input.brandConfig, input.appName);
    const subjectTemplate =
      localeMailers.device_activation_subject ||
      localeMailers.device_activation_title ||
      englishMailers.device_activation_title ||
      'Device Activated';

    return {
      subject: this.formatSubject(brandName, subjectTemplate, {}, {
        omitBrandName: input.brandConfig.omitSubjectBrandName,
      }),
      templateContext: {
        deviceNumber: input.deviceNumber,
        email_id: input.email,
        device_activation_title: mergedMailers.device_activation_title,
        paragraph1: handlebars.compile(mergedMailers.greeting_confirm_email_html || '')({
          name: input.name || input.defaultName,
          app_name: serviceLabel,
        }),
        paragraph2: mergedMailers.device_activation,
        warning_paragraph: mergedMailers.device_activation_warning_paragraph,
        email: mergedMailers.email,
        device_number: mergedMailers.device_number,
        notification_text1: mergedMailers.notification_text1,
        support_text: mergedMailers.support_text,
        address: mergedMailers.address,
        address_text: mergedMailers.address_text,
        email_text: mergedMailers.email_text,
        phone: mergedMailers.phone,
        phone_text: mergedMailers.phone_text,
        logo: input.brandConfig.logos,
        contact: input.brandConfig.contact,
      },
    };
  }

  buildWebResultTemplate(input: {
    locale?: string;
    brandConfig: BrandConfig;
    customerName: string;
    appName: string;
    resultLink?: string;
    description?: string;
    type?: string;
    logoUrl?: string;
    footerLogo?: string | Record<number | string, string>;
    contact?: BrandConfig['contact'];
    isAlfaparf?: boolean;
  }) {
    const { localeMailers, englishMailers } = this.getMailers(input.locale);
    const brandName = input.brandConfig.displayName || 'ChoiceTech';
    const normalizedCustomerName = this.getSafeDisplayName(input.customerName);
    const webResultTitleTemplate =
      localeMailers.web_result_title || englishMailers.web_result_title || 'Web Result';
    const webResultDescTemplate =
      localeMailers.web_result_desc || englishMailers.web_result_desc || '';
    const appName = input.isAlfaparf ? '' : input.appName;
    const webResultTitle = this.renderMailerText(webResultTitleTemplate, {
      app_name: appName,
    });

    return {
      subject: this.formatSubject(
        brandName,
        webResultTitleTemplate,
        {
          app_name: appName,
        },
        { omitBrandName: input.brandConfig.omitSubjectBrandName },
      ),
      templateContext: {
        subject: this.formatSubject(
          brandName,
          webResultTitleTemplate,
          {
            app_name: appName,
          },
          { omitBrandName: input.brandConfig.omitSubjectBrandName },
        ),
        url: input.resultLink,
        webResultUrl: input.resultLink,
        web_result_title: webResultTitle,
        web_result_desc: this.renderMailerText(webResultDescTemplate, {
          app_name: appName,
        }),
        web_result_button: localeMailers.web_result_button || englishMailers.web_result_button,
        address: localeMailers.address || englishMailers.address,
        email: localeMailers.email || englishMailers.email,
        phone: localeMailers.phone || englishMailers.phone,
        customer_name: normalizedCustomerName,
        appName,
        app_name: appName,
        description: input.description,
        type: input.type,
        logoUrl: input.logoUrl,
        footerLogo: input.footerLogo,
        contact: input.contact || input.brandConfig.contact,
        isAlfaparf: !!input.isAlfaparf,
      },
    };
  }

  private getSafeDisplayName(name?: string) {
    const normalizedName = (name || '').trim();

    if (!normalizedName) {
      return 'Customer';
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(normalizedName) ? 'Customer' : normalizedName;
  }

  private renderMailerText(template: string | undefined, variables: Record<string, string>) {
    const source = template || '';
    const compiled = handlebars.compile(source)(variables);

    return compiled.replace(/\{\{\{?\s*app_name\s*\}?\}\}/g, variables.app_name || '');
  }
}
