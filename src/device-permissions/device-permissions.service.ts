import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DevicePermission } from './entities/device-permission.entity';
import { IotDevice } from '../iot-devices/entities/iot-device.entity';

@Injectable()
export class DevicePermissionsService {
  constructor(
    @InjectRepository(DevicePermission)
    private readonly devicePermissionRepository: Repository<DevicePermission>,
    @InjectRepository(IotDevice)
    private readonly iotDeviceRepository: Repository<IotDevice>,
  ) {}

  async grantAccess(userId: string, deviceId: string, canManage: boolean = false) {
    // Check if device exists and belongs to the company
    const device = await this.iotDeviceRepository.findOne({
      where: { id: deviceId },
      relations: ['company']
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    // Check if permission already exists
    const existingPermission = await this.devicePermissionRepository.findOne({
      where: { userId, deviceId }
    });

    if (existingPermission) {
      throw new ConflictException('Permission already exists for this user and device');
    }

    const permission = this.devicePermissionRepository.create({
      userId,
      deviceId,
      canManage
    });

    return this.devicePermissionRepository.save(permission);
  }

  async revokeAccess(userId: string, deviceId: string) {
    const permission = await this.devicePermissionRepository.findOne({
      where: { userId, deviceId }
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    await this.devicePermissionRepository.remove(permission);
    return { message: 'Permission revoked successfully' };
  }

  async getUserDevicePermissions(userId: string) {
    return this.devicePermissionRepository.find({
      where: { userId },
      relations: ['device']
    });
  }

  async checkUserDeviceAccess(userId: string, deviceId: string) {
    const permission = await this.devicePermissionRepository.findOne({
      where: { userId, deviceId }
    });

    return permission ? permission.canView : false;
  }

  async updatePermission(userId: string, deviceId: string, canView: boolean, canManage: boolean) {
    const permission = await this.devicePermissionRepository.findOne({
      where: { userId, deviceId }
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    permission.canView = canView;
    permission.canManage = canManage;

    return this.devicePermissionRepository.save(permission);
  }

  async getDevicesByUser(userId: string) {
    const devices = await this.devicePermissionRepository.find({
      where: { userId },
      relations: ['device']
    });
    return devices;
  }

}
