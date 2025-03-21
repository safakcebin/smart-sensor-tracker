import {
  Controller,
  Get,
  Param,
  UseGuards,
  ForbiddenException,
  Query,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../auth/enums/user-role.enum';

interface LogEntry {
  user_id?: string;
  timestamp: number;
  action: string;
  metadata?: Record<string, unknown>;
}

interface RequestWithUser extends Request {
  user: {
    id: string;
    role: UserRole;
    companyId: string;
  };
}

@ApiTags('Logs')
@Controller('logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class LogsController {
  private readonly logsDir = 'logs';

  @Get('company/:companyId')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPANY_ADMIN)
  @ApiOperation({
    summary: 'Get company logs',
    description: 'Get logs for a specific company',
  })
  @ApiResponse({ status: 200, description: 'Logs retrieved successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Log file not found' })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: Number,
    description: 'Start timestamp for filtering logs (Unix timestamp)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: Number,
    description: 'End timestamp for filtering logs (Unix timestamp)',
  })
  async getCompanyLogs(
    @Request() req: RequestWithUser,
    @Param('companyId') companyId: string,
    @Query('startDate') startDate?: number,
    @Query('endDate') endDate?: number,
  ): Promise<{ logs: LogEntry[] }> {
    // Only company admin can view logs from their own company
    if (
      req.user.role === UserRole.COMPANY_ADMIN &&
      req.user.companyId !== companyId
    ) {
      throw new ForbiddenException(
        'You can only view logs from your own company',
      );
    }

    const logFileName = path.join(this.logsDir, `company-${companyId}.log`);

    if (!fs.existsSync(logFileName)) {
      return { logs: [] };
    }

    const logContent = await fs.promises.readFile(logFileName, 'utf-8');
    const logs = logContent
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line) as LogEntry;
        } catch (error) {
          console.error('Failed to parse log line:', error);
          return null;
        }
      })
      .filter((log): log is LogEntry => log !== null);

    // Apply filters
    let filteredLogs = logs;

    if (startDate) {
      filteredLogs = filteredLogs.filter((log) => log.timestamp >= startDate);
    }

    if (endDate) {
      filteredLogs = filteredLogs.filter((log) => log.timestamp <= endDate);
    }

    return { logs: filteredLogs };
  }
}
