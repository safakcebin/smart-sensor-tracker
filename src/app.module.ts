import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MqttService } from './mqtt/mqtt.service';
import { InfluxdbService } from './influxdb/influxdb.service';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { IotDevicesModule } from './iot-devices/iot-devices.module';
import { CompaniesModule } from './companies/companies.module';
import { DevicePermissionsModule } from './device-permissions/device-permissions.module';
import { WebsocketModule } from './websocket/websocket.module';
import { LoggerModule } from './common/logger/logger.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { User } from './auth/entities/user.entity';
import { Company } from './companies/entities/company.entity';
import { IotDevice } from './iot-devices/entities/iot-device.entity';
import { DevicePermission } from './device-permissions/entities/device-permission.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 10000,
          limit: 3,
        },
      ],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.getOrThrow('POSTGRES_HOST'),
        port: configService.getOrThrow('POSTGRES_PORT'),
        username: configService.getOrThrow('POSTGRES_USER'),
        password: configService.getOrThrow('POSTGRES_PASSWORD'),
        database: configService.getOrThrow('POSTGRES_DB'),
        entities: [User, Company, IotDevice, DevicePermission],
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    DatabaseModule,
    IotDevicesModule,
    CompaniesModule,
    DevicePermissionsModule,
    WebsocketModule,
    LoggerModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    MqttService,
    InfluxdbService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
