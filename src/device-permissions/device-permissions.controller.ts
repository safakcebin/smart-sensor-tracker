import { Controller, Post, Body, UseGuards, Request, ForbiddenException, Delete, Param } from '@nestjs/common';
import { DevicePermissionsService } from './device-permissions.service';
import { GrantDeviceAccessDto } from './dto/grant-device-access.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from '../auth/auth.service';
import { IotDevicesService } from '../iot-devices/iot-devices.service';

@ApiTags('Device Permissions')
@Controller('device-permissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DevicePermissionsController {
  constructor(
    private readonly devicePermissionsService: DevicePermissionsService,
    private readonly authService: AuthService,
    private readonly iotDevicesService: IotDevicesService,
  ) {}

  @Post()
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPANY_ADMIN)
  @ApiOperation({ summary: 'Grant device access', description: 'Grant a user access to an IoT device' })
  @ApiResponse({ status: 201, description: 'Access granted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions or company mismatch' })
  @ApiResponse({ status: 404, description: 'User or device not found' })
  @ApiResponse({ status: 409, description: 'Permission already exists' })
  async grantAccess(@Body() grantAccessDto: GrantDeviceAccessDto, @Request() req) {
    // Get user and device details
    const user = await this.authService.findUserById(grantAccessDto.userId);
    const device = await this.iotDevicesService.findById(grantAccessDto.deviceId);

    if (!user || !device) {
      throw new ForbiddenException('User or device not found');
    }

    // System admin can grant access to any device within the user's company
    if (req.user.role === UserRole.SYSTEM_ADMIN) {
      if (user.companyId !== device.companyId) {
        throw new ForbiddenException('Cannot grant access to device from different company');
      }
    }
    // Company admin can only grant access to devices within their company
    else if (req.user.role === UserRole.COMPANY_ADMIN) {
      if (req.user.companyId !== user.companyId || req.user.companyId !== device.companyId) {
        throw new ForbiddenException('You can only grant access to users and devices within your company');
      }
    }

    return this.devicePermissionsService.grantAccess(
      grantAccessDto.userId,
      grantAccessDto.deviceId,
      grantAccessDto.canManage || false
    );
  }

  @Delete(':userId/:deviceId')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPANY_ADMIN)
  @ApiOperation({ summary: 'Revoke device access', description: 'Revoke a user\'s access to an IoT device' })
  @ApiResponse({ status: 200, description: 'Access revoked successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions or company mismatch' })
  @ApiResponse({ status: 404, description: 'Permission not found' })
  async revokeAccess(
    @Param('userId') userId: string,
    @Param('deviceId') deviceId: string,
    @Request() req
  ) {
    // Get user and device details
    const user = await this.authService.findUserById(userId);
    const device = await this.iotDevicesService.findById(deviceId);

    if (!user || !device) {
      throw new ForbiddenException('User or device not found');
    }

    // System admin can revoke access to any device within the user's company
    if (req.user.role === UserRole.SYSTEM_ADMIN) {
      if (user.companyId !== device.companyId) {
        throw new ForbiddenException('Cannot revoke access to device from different company');
      }
    }
    // Company admin can only revoke access to devices within their company
    else if (req.user.role === UserRole.COMPANY_ADMIN) {
      if (req.user.companyId !== user.companyId || req.user.companyId !== device.companyId) {
        throw new ForbiddenException('You can only revoke access to users and devices within your company');
      }
    }

    return this.devicePermissionsService.revokeAccess(userId, deviceId);
  }
}
