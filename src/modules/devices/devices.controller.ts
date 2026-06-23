import { Body, Controller, HttpCode, HttpException, HttpStatus, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { DeviceService } from './devices.service';

import { ApiTags } from '@nestjs/swagger';
import { LicenseDto } from '@/src/modules/devices/device.dto';
import { ErrorStatus } from '@/src/common/constants/error-status';
import { ErrorExceptionFactory } from '@/src/common/middleWare/exceptions/exceptionHandling/error-exception.factory';

@ApiTags('Device')
@Controller('device')
export class DeviceController {
  constructor(private readonly devices: DeviceService) {}

  @Post('license')
  @HttpCode(HttpStatus.OK)
  async licence(@Req() req: Request, @Body() body: LicenseDto): Promise<any> {
    const user: any = req['user'];
    const { consultant_id, app_id } = user;

    const { optic_number } = body;

    try {
      const checkingDevice = await this.devices.checkLicense(consultant_id, app_id, optic_number);

      if (checkingDevice?.license_remaining_days < 1) {
        throw ErrorExceptionFactory.create('http', {
          result_code: ErrorStatus.PERMISSION_DENIED,
          error: 'Device Already Expired Please Contact Your To Renew Your Device or Contact Chowis',
        }, HttpStatus.FORBIDDEN);
      }

      if (!checkingDevice?.license_remaining_days) {
        throw ErrorExceptionFactory.create('http', {
          result_code: ErrorStatus.PERMISSION_DENIED,
          error: 'Device Is not connected to current consultant',
        }, HttpStatus.FORBIDDEN);
      }

      return {
        status: 200,
        message: 'Success',
        data: checkingDevice,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw ErrorExceptionFactory.createFromStatus('internal', ErrorStatus.SERVER_ERROR);
    }
  }
}
