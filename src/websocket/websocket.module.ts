import { Module } from '@nestjs/common';
import { WebsocketGateway } from './websocket.gateway';
import { InfluxdbModule } from '../influxdb/influxdb.module';
import { IotDevicesModule } from '../iot-devices/iot-devices.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    InfluxdbModule,
    IotDevicesModule,
    AuthModule,
  ],
  providers: [WebsocketGateway],
  exports: [WebsocketGateway],
})
export class WebsocketModule {}
