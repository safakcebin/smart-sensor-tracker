import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { IotDevicesService } from './iot-devices.service';
import { CreateIotDeviceDto } from './dto/create-iot-device.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('IoT Devices')
@Controller('iot-devices')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class IotDevicesController {
  constructor(private readonly iotDevicesService: IotDevicesService) {}

  @Post()
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPANY_ADMIN)
  @ApiOperation({ summary: 'Create new IoT device', description: 'Create a new IoT device for a company' })
  @ApiResponse({ status: 201, description: 'Device created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 409, description: 'Device with this sensor ID already exists' })
  create(@Body() createIotDeviceDto: CreateIotDeviceDto, @Request() req) {
    return this.iotDevicesService.create(createIotDeviceDto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all IoT devices', description: 'Get all IoT devices the user has access to' })
  @ApiResponse({ status: 200, description: 'List of IoT devices' })
  findAll(@Request() req) {
    return this.iotDevicesService.findAll(req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get IoT device by ID', description: 'Get a specific IoT device by its ID' })
  @ApiResponse({ status: 200, description: 'IoT device details' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.iotDevicesService.findOne(id, req.user);
  }

  @Get('sensor/:sensorId')
  @ApiOperation({ summary: 'Get IoT device by sensor ID', description: 'Get a specific IoT device by its sensor ID' })
  @ApiResponse({ status: 200, description: 'IoT device details' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  findBySensorId(@Param('sensorId') sensorId: string) {
    return this.iotDevicesService.findBySensorId(sensorId);
  }
}
