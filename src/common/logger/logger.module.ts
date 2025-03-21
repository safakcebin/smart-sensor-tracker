import { Module } from '@nestjs/common';
import { WinstonLoggerService } from './winston-logger';
import { LogsController } from './logs.controller';

@Module({
  controllers: [LogsController],
  providers: [WinstonLoggerService],
  exports: [WinstonLoggerService],
})
export class LoggerModule {}
