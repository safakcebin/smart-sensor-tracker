import { Injectable, OnModuleInit } from '@nestjs/common';
import * as winston from 'winston';
import * as fs from 'fs';
import * as path from 'path';

interface LogData {
  user_id?: string;
  timestamp: number;
  action: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class WinstonLoggerService implements OnModuleInit {
  private readonly loggers = new Map<string, winston.Logger>();
  private readonly logsDir = 'logs';

  async onModuleInit() {
    await this.ensureLogDirectory();
  }

  private async ensureLogDirectory(): Promise<void> {
    try {
      await fs.promises.access(this.logsDir);
    } catch {
      await fs.promises.mkdir(this.logsDir, { recursive: true });
    }
  }

  private getLogger(companyId: string): winston.Logger {
    let logger = this.loggers.get(companyId);
    if (!logger) {
      logger = this.createLogger(companyId);
      this.loggers.set(companyId, logger);
    }
    return logger;
  }

  private createLogger(companyId: string): winston.Logger {
    const logFileName = path.join(this.logsDir, `company-${companyId}.log`);

    return winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
      transports: [
        new winston.transports.File({ filename: logFileName }),
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
          ),
        }),
      ],
    });
  }

  private formatLogData(
    action: string,
    userId?: string,
    metadata?: Record<string, unknown>,
  ): LogData {
    return {
      user_id: userId,
      timestamp: Math.floor(Date.now() / 1000), // Unix timestamp in seconds
      action,
      ...(metadata && { metadata }),
    };
  }

  info(
    companyId: string,
    action: string,
    metadata?: Record<string, unknown>,
  ): void {
    try {
      const logger = this.getLogger(companyId);
      const logData = this.formatLogData(
        action,
        metadata?.userId as string,
        metadata,
      );
      logger.info(logData);
    } catch (error) {
      console.error('Error writing info log:', error);
    }
  }

  warn(
    companyId: string,
    action: string,
    metadata?: Record<string, unknown>,
  ): void {
    try {
      const logger = this.getLogger(companyId);
      const logData = this.formatLogData(
        action,
        metadata?.userId as string,
        metadata,
      );
      logger.warn(logData);
    } catch (error) {
      console.error('Error writing warn log:', error);
    }
  }

  debug(
    companyId: string,
    action: string,
    metadata?: Record<string, unknown>,
  ): void {
    try {
      const logger = this.getLogger(companyId);
      const logData = this.formatLogData(
        action,
        metadata?.userId as string,
        metadata,
      );
      logger.debug(logData);
    } catch (error) {
      console.error('Error writing debug log:', error);
    }
  }
}
