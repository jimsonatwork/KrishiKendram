import { Module } from '@nestjs/common';
import { LoggerModule } from './logger.module';
import { LoggerService } from './logger.service';
import { AuditModule } from './audit.module';

@Module({
  imports: [LoggerModule, AuditModule],
  providers: [LoggerService]
})
export class CoreModule {}
