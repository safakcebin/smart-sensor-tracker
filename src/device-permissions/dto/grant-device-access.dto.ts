import { IsNotEmpty, IsUUID, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GrantDeviceAccessDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'UUID of the user to grant access' })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'UUID of the IoT device' })
  @IsUUID()
  @IsNotEmpty()
  deviceId: string;

  @ApiPropertyOptional({ example: true, description: 'Whether the user can manage the device (default: false)' })
  @IsBoolean()
  @IsOptional()
  canManage?: boolean;
}
