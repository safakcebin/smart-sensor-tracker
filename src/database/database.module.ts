import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminSeeder } from './seeders/admin.seeder';
import { User } from '../auth/entities/user.entity';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([User])
  ],
  providers: [AdminSeeder],
  exports: [AdminSeeder, TypeOrmModule],
})
export class DatabaseModule {}
