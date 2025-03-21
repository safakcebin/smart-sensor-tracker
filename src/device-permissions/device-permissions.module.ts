import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevicePermissionsService } from './device-permissions.service';
import { DevicePermissionsController } from './device-permissions.controller';
import { DevicePermission } from './entities/device-permission.entity';
import { IotDevice } from '../iot-devices/entities/iot-device.entity';
import { AuthModule } from '../auth/auth.module';
import { IotDevicesModule } from '../iot-devices/iot-devices.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DevicePermission, IotDevice]),
    AuthModule,
    IotDevicesModule,
  ],
  controllers: [DevicePermissionsController],
  providers: [DevicePermissionsService],
  exports: [DevicePermissionsService],
})
export class DevicePermissionsModule {}
