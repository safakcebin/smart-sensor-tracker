import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../../auth/entities/user.entity';
import { UserRole } from '../../auth/enums/user-role.enum';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminSeeder implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.seed();
  }

  async seed() {
    try {
      const adminEmail = this.configService.getOrThrow('ADMIN_EMAIL');
      const adminPassword = this.configService.getOrThrow('ADMIN_PASSWORD');

      const existingAdmin = await this.userRepository.findOne({
        where: { email: adminEmail },
      });

      if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        
        const admin = this.userRepository.create({
          email: adminEmail,
          password: hashedPassword,
          firstName: 'System',
          lastName: 'Admin',
          role: UserRole.SYSTEM_ADMIN,
        });

        await this.userRepository.save(admin);
        console.log('Default admin user created successfully');
      } else {
        console.log('Admin user already exists');
      }
    } catch (error) {
      console.error('Error creating admin user:', error.message);
      throw error;
    }
  }
}
