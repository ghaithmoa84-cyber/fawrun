import { Module } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditModule } from '../audit/audit.module.js';
import { CustomersController } from './customers.controller.js';
import { CustomersService } from './customers.service.js';

@Module({
  imports: [AuditModule],
  controllers: [CustomersController],
  providers: [CustomersService, PrismaService],
})
export class CustomersModule {}
