import { Module } from '@nestjs/common';
import { MqttService } from './mqtt.service';
import { InfluxdbService } from '../influxdb/influxdb.service';
import { IotDevicesModule } from '../iot-devices/iot-devices.module';

@Module({
  imports: [IotDevicesModule],
  providers: [MqttService, InfluxdbService],
  exports: [MqttService],
})
export class MqttModule {}
