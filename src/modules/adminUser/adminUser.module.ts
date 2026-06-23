import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminUsersService } from './adminUser.service';
import { AdminUsers } from '@/src/common/entities/crmEntities/AdminUsers.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AdminUsers])],
  providers: [AdminUsersService],
  exports: [AdminUsersService],
})
export class AdminUsersModule {}
