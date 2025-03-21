import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateIotDeviceDto {
  @ApiProperty({ example: 'Temperature Sensor 1', description: 'Name of the IoT device' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'SENSOR001', description: 'Unique sensor ID of the device' })
  @IsString()
  @IsNotEmpty()
  sensorId: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'UUID of the company this device belongs to' })
  @IsUUID()
  @IsNotEmpty()
  companyId: string;
}
