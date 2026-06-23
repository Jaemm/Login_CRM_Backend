import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AdminUsers } from '@/src/common/entities/crmEntities/AdminUsers.entity';

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectRepository(AdminUsers)
    private readonly adminUsersRepository: Repository<AdminUsers>,
  ) {}

  async doesAgentExistByEmail(email: string): Promise<boolean> {
    return (
      (await this.adminUsersRepository.count({
        where: { email, role: 'Agent' },
      })) > 0
    );
  }
}
