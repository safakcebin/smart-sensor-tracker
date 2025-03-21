import { Injectable, NotFoundException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IotDevice } from './entities/iot-device.entity';
import { CreateIotDeviceDto } from './dto/create-iot-device.dto';
import { User } from '../auth/entities/user.entity';
import { UserRole } from '../auth/enums/user-role.enum';

@Injectable()
export class IotDevicesService {
  constructor(
    @InjectRepository(IotDevice)
    private readonly iotDeviceRepository: Repository<IotDevice>,
  ) {}

  async create(createIotDeviceDto: CreateIotDeviceDto, currentUser: User) {
    // Check if user has permission to create device for this company
    if (currentUser.role !== UserRole.SYSTEM_ADMIN &&
        (currentUser.role !== UserRole.COMPANY_ADMIN || currentUser.companyId !== createIotDeviceDto.companyId)) {
      throw new UnauthorizedException('You can only create devices for your own company');
    }

    // Check if sensorId is unique
    const existingDevice = await this.iotDeviceRepository.findOne({
      where: { sensorId: createIotDeviceDto.sensorId }
    });

    if (existingDevice) {
      throw new ConflictException('Device with this sensor ID already exists');
    }

    const device = this.iotDeviceRepository.create(createIotDeviceDto);
    return this.iotDeviceRepository.save(device);
  }

  async findAll(currentUser: User) {
    const queryBuilder = this.iotDeviceRepository.createQueryBuilder('device');

    // System admin can see all devices
    if (currentUser.role !== UserRole.SYSTEM_ADMIN) {
      // Company admin and regular users can only see their company's devices
      queryBuilder.where('device.companyId = :companyId', { companyId: currentUser.companyId });
    }

    return queryBuilder
      .leftJoinAndSelect('device.company', 'company')
      .orderBy('device.createdAt', 'DESC')
      .getMany();
  }

  async findAllDevices() {
    return this.iotDeviceRepository.find({
      relations: ['company']
    });
  }

  async findOne(id: string, currentUser: User) {
    const device = await this.iotDeviceRepository.findOne({
      where: { id },
      relations: ['company']
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    // Check if user has permission to view this device
    if (currentUser.role !== UserRole.SYSTEM_ADMIN && 
        currentUser.companyId !== device.companyId) {
      throw new UnauthorizedException('You can only view devices from your own company');
    }

    return device;
  }

  async findById(id: string) {
    return this.iotDeviceRepository.findOne({ 
      where: { id },
      relations: ['company']
    });
  }

  async findBySensorId(sensorId: string) {
    const device = await this.iotDeviceRepository.findOne({
      where: { sensorId }
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    return device;
  }

  async updateLastConnectionTime(id: string) {
    const device = await this.iotDeviceRepository.findOne({
      where: { id }
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    device.lastConnectionTime = new Date();
    return this.iotDeviceRepository.save(device);
  }

  async findByCompany(companyId: string): Promise<IotDevice[]> {
    return this.iotDeviceRepository.find({
      where: { companyId },
      relations: ['company']
    });
  }

  async findByUser(userId: string): Promise<IotDevice[]> {
    // DevicePermissions tablosunu kullanarak kullanıcıya atanmış cihazları bul
    return this.iotDeviceRepository
      .createQueryBuilder('device')
      .innerJoin('device_permissions', 'perm', 'perm.deviceId = device.id')
      .where('perm.userId = :userId', { userId })
      .andWhere('perm.canView = true')
      .getMany();
  }
}
