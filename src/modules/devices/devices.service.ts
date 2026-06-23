import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsSelectByString, Repository } from 'typeorm';

import { Devices } from '@/src/common/entities/crmEntities/Devices.entity';
import { Products } from '@/src/common/entities/crmEntities/Products.entity';

@Injectable()
export class DeviceService {
  constructor(
    @InjectRepository(Products)
    private readonly products: Repository<Products>,
    @InjectRepository(Devices)
    private readonly devices: Repository<Devices>,
  ) {}

  async getCompaniesFiles(consultant_id: number, application_id: number) {
    const imageCustomization = await this.products.find({
      where: {
        application_id,
        consultant_id,
      },
      select: {
        id: true,
        device: {
          id: true,
          optic_number: true,
          serial_number: true,
          docking_number: true,
          wb: true,
          cal: true,
          refresh_date: true,
          app_version: true,
          app_update_date: true,
          division: true,
          use_yn: true,
          lat: true,
          lng: true,
          fw_version: true,
          consultant_company_id: true,
          offline_qo: true,
        },
        application: {
          id: true,
          name: true,
          apk_url: true,

          version: true,
          group_name: true,
          regist_date: true,
          description: true,
          ios_version: true,
          android_version: true,
          android_app_url: true,
          ios_app_url: true,
          is_old: true,
        },
        license: {
          id: true,
          name: true,
        },
        first_use_date: true,
        use_date: true,
        use_time: true,
        mac_address: true,
        app_use_yn: true,
        license_period: true,
        created_at: true,
        license_remaining_days: true,
      },
      relations: ['application', 'device', 'device.consultant_company', 'license'],
    });

    return imageCustomization;
  }

  async checkLicense(consultant_id: number, application_id: number, optic_number: string) {
    const deviceData = await this.products.findOne({
      where: {
        consultant_id,
        application_id,
        device: {
          optic_number: optic_number,
        },
      },
      select: {
        id: true,
        first_use_date: true,
        use_date: true,
        use_time: true,
        mac_address: true,
        app_use_yn: true,
        license_period: true,
        created_at: true,
        license_remaining_days: true,
        days_remaining_updated_at: true,
        is_paid_for_license: true,
      },
      relations: ['application', 'device', 'license'],
    });

    return deviceData;
  }

  async findDevices(conditions?: any, selections?: string[], includes?: string[]) {
    const devices: any = await this.devices.find({
      where: conditions,
      select: selections ? (selections as FindOptionsSelectByString<Devices>) : [],
      relations: includes ? includes : [],
    });

    return devices;
  }

  async findOneDevices(conditions: any, selections?: string[], includes?: string[]) {
    const device: any = await this.devices.findOne({
      where: conditions,
      select: selections ? (selections as FindOptionsSelectByString<Devices>) : [],
      relations: includes ? includes : [],
    });

    return device;
  }

  async insertDevice(device: Devices) {
    const newDevice = this.devices.create(device);
    const result = await this.devices.save(newDevice);
    return result;
  }

  async updateDevice(id: string, device: any) {
    const updatedDevice = await this.devices.update(id, device);
    return updatedDevice;
  }
}
