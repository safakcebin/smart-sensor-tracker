import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { IotDevice } from '../../iot-devices/entities/iot-device.entity';

@Entity('device_permissions')
export class DevicePermission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  deviceId: string;

  @Column({ default: true })
  canView: boolean;

  @Column({ default: false })
  canManage: boolean;

  @ManyToOne(() => User, user => user.devicePermissions)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => IotDevice)
  @JoinColumn({ name: 'deviceId' })
  device: IotDevice;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
