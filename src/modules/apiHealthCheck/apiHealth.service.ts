import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

type DatabaseHealth = {
  name: string;
  status: 'up' | 'down';
};

@Injectable()
export class HealthService {
  constructor(
    @InjectDataSource()
    private readonly globalDB: DataSource,
    @InjectDataSource('cndpSkinDB')
    private readonly cndpSkinDB: DataSource,
    @InjectDataSource('cndpHairDB')
    private readonly cndpHairDB: DataSource,
    @InjectDataSource('cmaSkinDB')
    private readonly cmaSkinDB: DataSource,
    @InjectDataSource('cmaHairDB')
    private readonly cmaHairDB: DataSource,
  ) {}

  async getHealth() {
    const databases = await Promise.all([
      this.checkDatabase('globalDB', this.globalDB),
      this.checkDatabase('cndpSkinDB', this.cndpSkinDB),
      this.checkDatabase('cndpHairDB', this.cndpHairDB),
      this.checkDatabase('cmaSkinDB', this.cmaSkinDB),
      this.checkDatabase('cmaHairDB', this.cmaHairDB),
    ]);

    const failedDatabases = databases.filter((database) => database.status === 'down');

    const payload = {
      status: failedDatabases.length ? 'degraded' : 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      databases,
    };

    if (failedDatabases.length) {
      throw new ServiceUnavailableException(payload);
    }

    return payload;
  }

  private async checkDatabase(name: string, dataSource: DataSource): Promise<DatabaseHealth> {
    try {
      await dataSource.query('SELECT 1');

      return {
        name,
        status: 'up',
      };
    } catch {
      return {
        name,
        status: 'down',
      };
    }
  }
}
