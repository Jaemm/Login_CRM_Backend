import { Products } from '@/src/common/entities/crmEntities/Products.entity';
import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsSelectByString, Repository, In } from 'typeorm';
import { ProductsEnterDto, ProductsFetchDto } from './products.dto';
import { DeviceService } from '../devices/devices.service';
import { ApplicationsService } from '../applications/applications.service';
import { CustomersService } from '../customers/customers.service';
import { CommonService } from '@/src/common/common.service';
import { ErrorExceptionFactory } from '@/src/common/middleWare/exceptions/exceptionHandling/error-exception.factory';
import { MailDispatchService } from '@/src/common/mail-dispatch.service';
import { MailTemplateService } from '@/src/common/mail-template.service';
import { LicenseDomainService } from '@/src/common/license-domain.service';
import { ConsultantsService } from '../consultants/consultants.service';
import { Versions } from '@/src/common/entities/crmEntities/Versions.entity';
import { VersionItemType } from '@/src/common/enums/version-item-type.enum';
import { VersionEvent } from '@/src/common/enums/version-event.enum';
import { ErrorStatus } from '@/src/common/constants/error-status';
import { ProductsMultiConnect } from '@/src/common/entities/crmEntities/ProductsMultiConnect.entity';
import { ConsultantCompanyService } from '../consultantCompany/consultantCompany.service';
import { resolveEmailBrandConfig } from '@/src/config';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectRepository(Products)
    private readonly productsRepository: Repository<Products>,
    @InjectRepository(Versions)
    private readonly versionsRepository: Repository<Versions>,

    @InjectRepository(ProductsMultiConnect)
    private readonly productsMultiConnectRepository: Repository<ProductsMultiConnect>,

    private readonly devices: DeviceService,
    private readonly applicationsService: ApplicationsService,
    private readonly applications: ApplicationsService,
    private readonly companies: ConsultantCompanyService,
    private readonly commonService: CommonService,
    private readonly mailDispatchService: MailDispatchService,
    private readonly mailTemplateService: MailTemplateService,
    private readonly licenseDomainService: LicenseDomainService,
    private readonly customersService: CustomersService,
    @Inject(forwardRef(() => ConsultantsService))
    private readonly consultantsService: ConsultantsService,
  ) {}

  private async normalizeProductResponse(
    product: any,
    consultantCompanyId?: string | number | null,
    isAgent = false,
  ) {
    const normalizedProduct = product;
    const resolvedConsultantCompanyId =
      consultantCompanyId ??
      normalizedProduct.device?.consultant_company_id ??
      normalizedProduct.device?.consultant_company?.id;

    if (resolvedConsultantCompanyId && normalizedProduct.device) {
      normalizedProduct.device.consultant_company =
        await this.consultantsService.getCompanyDetails({
          consultant_company_id: resolvedConsultantCompanyId,
        });
    }

    const expiryMeta = this.licenseDomainService.resolveExpiryMeta({
      firstUseDate: normalizedProduct.first_use_date,
      licensePeriod: normalizedProduct.license_period,
      licenseName: normalizedProduct.license?.name,
      isAgent,
    });
    normalizedProduct.expired_date = expiryMeta.expiredDate;
    normalizedProduct.is_expired = expiryMeta.isExpired;

    if (normalizedProduct.application?.id) {
      const files = await this.companies.getCompaniesFiles(String(normalizedProduct.application.id));
      const attachmentObject: any = {};
      files.forEach((attachment) => {
        const { name, blob } = attachment;
        const { key } = blob;
        attachmentObject[name] = `${process.env.URL}/v1/api/image/${key}`;
      });
      normalizedProduct.application.apk_url = attachmentObject.apk;
      normalizedProduct.application.old_apk_url = attachmentObject.old_apk;
      normalizedProduct.application.app_icon = attachmentObject.icon;
    }

    return normalizedProduct;
  }

  private async normalizeProductListResponse(
    products: any[],
    consultantCompanyId?: string | number | null,
    isAgent = false,
  ) {
    const normalizedProducts = await Promise.all(
      products.map((product) =>
        this.normalizeProductResponse(product, consultantCompanyId, isAgent),
      ),
    );

    return this.consultantsService.changeExpiredlicense(normalizedProducts, isAgent);
  }

  async findOneProductById(id: number) {
    const products = await this.productsRepository.findOne({
      where: {
        id: id,
      },
    });
    if (!products) {
      this.commonService.throwNotFoundError();
    }
    return products;
  }

  async findOneProduct(conditions?: any, selections?: string[], includes?: string[]) {
    const product = await this.productsRepository.findOne({
      where: conditions,
      select: selections ? (selections as FindOptionsSelectByString<Products>) : [],
      relations: includes,
    });

    return product;
  }

  async findProduct(conditions?: any, selections?: string[], includes?: string[]) {
    const products = await this.productsRepository.find({
      where: conditions,
      select: selections ? (selections as FindOptionsSelectByString<Products>) : [],
      relations: includes,
    });

    return products;
  }

  async insertProduct(product: Products) {
    const newProduct = this.productsRepository.create(product);
    const result = await this.productsRepository.save(newProduct);
    return result;
  }

  async getProctConnectMulti(
    customer_id: number,
    product_id: number,
    consultant_company_id: string,
  ) {
    const countProduct = await this.productsMultiConnectRepository.count({
      where: { customer_id: customer_id },
    });
    if (countProduct === 0) return [];

    const product = await this.productsMultiConnectRepository.findOne({
      where: { customer_id, product_id },
    });

    const updatedProduct: any = await this.findOneProduct(
      { id: product.product_id },
      [],
      ['device', 'license', 'application'],
    );

    return this.normalizeProductResponse(updatedProduct, consultant_company_id);
  }
  async proctConnectMulti(product: Products, customer: any) {
    const countProduct = await this.productsMultiConnectRepository.count({
      where: { product_id: product.id },
    });

    if (countProduct === 4) {
      throw ErrorExceptionFactory.createFromStatus('conflict', ErrorStatus.DEVICE_ALREADY_REGISTERED);
    }

    try {
      const insertProduct = this.productsMultiConnectRepository.create({
        consultant_id: null,
        customer_id: customer.id,
        product_id: product.id,
        created_at: new Date(),
        updated_at: new Date(),
      });

      await this.productsMultiConnectRepository.save(insertProduct).catch(() => {});
    } catch (error) {
      if (error.code === '23505' && error.detail.includes('Key (customer_id, product_id)')) {
      } else {
        throw ErrorExceptionFactory.createFromStatus('internal', ErrorStatus.SERVER_ERROR);
      }
    }

    const updatedProduct = await this.updateProduct(product.id, {
      app_use_yn: 'Y',
      products_multi_connect: true,
    });

    return updatedProduct;
  }

  public async sendDeviceActivationEmail(data: any, locale = 'en') {
    const { email, deviceNumber, name, appName, consultant_company_id } = data;

    const mailerInfo = resolveEmailBrandConfig({
      consultantCompanyId: consultant_company_id,
      appName,
      fallbackKey: 'choicetech',
    });

    const { subject, templateContext } = this.mailTemplateService.buildDeviceActivationTemplate({
      locale,
      brandConfig: mailerInfo,
      name,
      appName,
      deviceNumber,
      email,
      defaultName: 'Customer',
    });

    const result = await this.mailDispatchService.sendBrandedEmail({
      to: email,
      subject,
      templateName: 'device-activation',
      templateContext,
      emailProvider: mailerInfo.emailProvider,
      appName,
    });

    return result;
  }

  async enterProduct(customerId: string, query: ProductsEnterDto, locale = 'en') {
    const { password, application_id, mac_address, lat, lng } = query;
    const optic_number = query.optic_number.toUpperCase();

    const useDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const useTime = new Date().toISOString().slice(11, 16).replace(/:/g, '');

    const customer = await this.customersService.getCustomerById(customerId);

    if (!customer) {
      throw ErrorExceptionFactory.createFromStatus('notFound', ErrorStatus.NOT_FOUND);
    }

    const device = await this.devices.findOneDevices({ optic_number, pwd: password });

    if (!device) {
      throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.PRODUCT_NOT_FOUND);
    }

    const latt = lat ?? device.lat;
    const long = lng ?? device.long;
    const macAddress = mac_address ?? device.mac_address;

    const product = await this.findOneProduct(
      { application_id: application_id, device_id: device.id },
      [],
      ['license', 'application', 'customer'],
    );

    if (!product || (product && !product.license)) {
      throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.LICENSE_NOT_FOUND);
    }

    const beforeUseDate = product.use_date;

    let updateProductResponse: any;
    if (product.customer && product.customer_id != customer.id) {
      updateProductResponse = await this.proctConnectMulti(product, customer);
    } else {
      updateProductResponse = await this.updateProduct(product.id, {
        customer_id: customer.id,
        use_date: useDate,
        use_time: useTime,
        mac_address: macAddress,
        app_use_yn: 'Y',
      });
    }

    if (!updateProductResponse.affected) {
      throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.LICENSE_NOT_UPDATED);
    }

    let updatedProduct: any = await this.findOneProduct(
      { id: product.id },
      [],
      ['device', 'license', 'application'],
    );

    if (
      (!beforeUseDate || beforeUseDate === null || beforeUseDate == '') &&
      product.use_date === null
    ) {
      if (!product.first_use_date) {
        await this.updateProduct(product.id, {
          customer_id: customer.id,
          first_use_date: new Date(),
        });

        updatedProduct = await this.findOneProduct(
          { id: product.id },
          [],
          ['device', 'license', 'application'],
        );

        await this.versionsRepository.save({
          itemId: product.id,
          itemType: VersionItemType.Product,
          event: VersionEvent.Update,
          object: JSON.stringify(product),
          objectChanges: JSON.stringify(updatedProduct),
          comments: 'done by api, triggered by customer',
          whodunnit: customer.id,
          createdAt: new Date(),
        });

        if (customer.email) {
          const application = await this.applicationsService.findOneApplication(
            Number(application_id),
          );

          try {
            await this.sendDeviceActivationEmail(
              {
                email: customer.email,
                deviceNumber: device.optic_number,
                name: customer.name,
                appName: application.name || 'Chowis',
                consultant_company_id: device.consultant_company_id,
              },
              locale,
            );
          } catch (error) {
            this.logger.warn(
              `[products/enter] device activation mail failed: ${
                error instanceof Error ? error.message : error
              }`,
            );
          }
        }
      } else {
        await this.updateProduct(product.id, { customer_id: customer.id });
        const updatedProduct = await this.findOneProductById(product.id);

        await this.versionsRepository.save({
          itemId: product.id,
          itemType: VersionItemType.Product,
          event: VersionEvent.Update,
          object: JSON.stringify(product),
          objectChanges: JSON.stringify(updatedProduct),
          comments: 'done by api, triggered by customer',
          whodunnit: customer.id,
          createdAt: new Date(),
        });
      }
    }

    await this.devices.updateDevice(device.id, { lat: latt, lng: long });

    updatedProduct = await this.normalizeProductResponse(updatedProduct, device.consultant_company_id);

    return {
      result_code: '0',
      product: updatedProduct,
    };
  }
  expiredDate(firstUseDate: string, licensePeriod: number) {
    return this.licenseDomainService.expiredDate(firstUseDate, licensePeriod);
  }

  private formatExpiredDate(firstUseDate: string, licensePeriod: number) {
    return this.licenseDomainService.formatExpiredDate(firstUseDate, licensePeriod);
  }

  async fetchProduct(query: ProductsFetchDto) {
    const { optic_number, password } = query;

    const device = await this.devices.findOneDevices({ optic_number, pwd: password });

    if (!device) {
      throw ErrorExceptionFactory.createFromStatus('notFound', ErrorStatus.LOGIN_FAILED);
    }

    let products = await this.findProduct(
      { device_id: device.id },
      [],
      ['device', 'device.consultant_company', 'application', 'license'],
    );

    if (!products) {
      throw ErrorExceptionFactory.createFromStatus('notFound', ErrorStatus.LOGIN_FAILED);
    }

    products = await this.normalizeProductListResponse(products, device.consultant_company_id, false);

    return products;
  }

  async updateProduct(id: number, productInput: any) {
    const result = await this.productsRepository.update(id, productInput);
    return result;
  }

  async updateProducts(condition: any, productInput: any) {
    const result = await this.productsRepository.update(condition, productInput);
    return result;
  }

  async getCustomerMultiProduct(customer_id: number) {
    const productsList = await this.productsMultiConnectRepository.find({
      where: {
        customer_id,
      },
      select: {
        product_id: true,
      },
    });

    return productsList;
  }

  async getProducts(customer_id: any) {
    const countProduct = await this.productsMultiConnectRepository.count({
      where: { customer_id: customer_id },
    });
    if (countProduct === 0) return [];

    const productIds: any = await this.getCustomerMultiProduct(Number(customer_id));

    const numericProductIds = productIds.map((product_id: any) => product_id['product_id']);

    const products = await this.findProduct(
      {
        id: In(numericProductIds),
      },
      [],
      [
        'device',
        'license',
        'device.consultant_company',
        'device.consultant_company.applications',
        'application',
      ],
    );

    return products;
  }
}
