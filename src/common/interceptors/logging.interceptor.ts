import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { WinstonLoggerService } from '../logger/winston-logger';
import { UserRole } from '../../auth/enums/user-role.enum';
import { Request, Response } from 'express';

interface RequestWithUser extends Request {
  user?: {
    id: string;
    role: UserRole;
    companyId: string;
  };
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: WinstonLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, user } = request;

    // For system admin, do not log
    if (user?.role === UserRole.SYSTEM_ADMIN) {
      return next.handle();
    }

    const now = Date.now();
    const companyId = user?.companyId || 'unknown';

    return next.handle().pipe(
      tap({
        next: (data: unknown) => {
          this.logger.info(companyId, 'request_completed', {
            userId: user?.id,
            metadata: {
              method,
              url,
              duration: Date.now() - now,
              statusCode: response.statusCode,
              response: data ? 'success' : 'no content',
            },
          });
        },
        error: (error: Error) => {
          this.logger.info(companyId, 'request_failed', {
            userId: user?.id,
            metadata: {
              method,
              url,
              duration: Date.now() - now,
              error: error.message,
              stack: error.stack,
            },
          });
        },
      }),
    );
  }
}
