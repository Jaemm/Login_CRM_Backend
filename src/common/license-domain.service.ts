import { Injectable } from '@nestjs/common';

@Injectable()
export class LicenseDomainService {
  private static readonly DAYS_PER_MONTH = 30;
  private static readonly DAYS_PER_YEAR = 365;

  daysLeftFromExpired(licensePeriod: number, firstUseDate: string) {
    let periodLeft = 0;

    if (licensePeriod && firstUseDate) {
      const today = new Date();
      const daysSinceFirstUse = Math.floor(
        (today.getTime() - new Date(firstUseDate).getTime()) / (1000 * 60 * 60 * 24),
      );
      periodLeft = licensePeriod - daysSinceFirstUse;
    } else {
      periodLeft = licensePeriod;
    }

    return periodLeft;
  }

  expiredDate(firstUseDate: string, licensePeriod: number) {
    if (firstUseDate && licensePeriod !== null && licensePeriod !== undefined) {
      const initialDate = new Date(firstUseDate);
      return new Date(initialDate.getTime() + licensePeriod * 24 * 60 * 60 * 1000);
    }
  }

  formatExpiredDate(firstUseDate: string, licensePeriod: number) {
    const expiredDate = this.expiredDate(firstUseDate, licensePeriod);
    if (!expiredDate) {
      return null;
    }

    const month = (expiredDate.getMonth() + 1).toString().padStart(2, '0');
    const date = expiredDate.getDate().toString().padStart(2, '0');
    const year = expiredDate.getFullYear();
    return `${year}-${month}-${date}`;
  }

  resolveExpiryMeta(input: {
    firstUseDate: string;
    licensePeriod: number;
    licenseName?: string | null;
    isAgent?: boolean | null;
  }) {
    const { firstUseDate, licensePeriod, licenseName, isAgent } = input;
    const normalizedLicenseName = licenseName?.toLowerCase();

    if (
      !firstUseDate ||
      !licensePeriod ||
      isAgent === true ||
      normalizedLicenseName === 'standard'
    ) {
      return {
        expiredDate: null,
        isExpired: false,
      };
    }

    const expiredDate = this.formatExpiredDate(firstUseDate, licensePeriod);
    return {
      expiredDate,
      isExpired: expiredDate ? new Date() > new Date(expiredDate) : false,
    };
  }

  elapsedDaysFrom(firstUseDate: string | Date) {
    return Math.floor((Date.now() - new Date(firstUseDate).getTime()) / (1000 * 60 * 60 * 24));
  }

  remainingDaysFromPeriod(licensePeriod: number, firstUseDate: string | Date) {
    return Math.max(licensePeriod - this.elapsedDaysFrom(firstUseDate), 0);
  }

  getAdditionalDays(duration: string | number, timeType: string) {
    switch (timeType.toLowerCase()) {
      case 'days':
        return Number(duration);
      case 'months':
        return Number(duration) * LicenseDomainService.DAYS_PER_MONTH;
      case 'years':
        return Number(duration) * LicenseDomainService.DAYS_PER_YEAR;
      default:
        return null;
    }
  }

  timeTypeToMilliseconds(type: string) {
    switch (type) {
      case 'days':
        return 24 * 60 * 60 * 1000;
      case 'months':
        return LicenseDomainService.DAYS_PER_MONTH * 24 * 60 * 60 * 1000;
      case 'years':
        return LicenseDomainService.DAYS_PER_YEAR * 24 * 60 * 60 * 1000;
      default:
        return null;
    }
  }
}
