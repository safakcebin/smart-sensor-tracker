import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IotDevicesService } from './iot-devices.service';
import { IotDevicesController } from './iot-devices.controller';
import { IotDevice } from './entities/iot-device.entity';

@Module({
  imports: [TypeOrmModule.forFeature([IotDevice])],
  controllers: [IotDevicesController],
  providers: [IotDevicesService],
  exports: [IotDevicesService],
})
export class IotDevicesModule {}
