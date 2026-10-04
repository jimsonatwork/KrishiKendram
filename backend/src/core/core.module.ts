import { Module } from '@nestjs/common';
import { LoggerModule } from './logger.module';
import { LoggerService } from './logger.service';

@Module({
  imports: [LoggerModule],
  providers: [LoggerService]
})
export class CoreModule {}
