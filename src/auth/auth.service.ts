import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { UserRole } from './enums/user-role.enum';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async createUser(createUserDto: CreateUserDto, currentUser?: User): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Only SYSTEM_ADMIN can create other SYSTEM_ADMIN users
    if (createUserDto.role === UserRole.SYSTEM_ADMIN && 
        (!currentUser || currentUser.role !== UserRole.SYSTEM_ADMIN)) {
      throw new UnauthorizedException('Only System Admins can create other System Admins');
    }

    // Only SYSTEM_ADMIN can create COMPANY_ADMIN users
    if (createUserDto.role === UserRole.COMPANY_ADMIN && 
        (!currentUser || currentUser.role !== UserRole.SYSTEM_ADMIN)) {
      throw new UnauthorizedException('Only System Admins can create Company Admins');
    }

    // Company Admins can only create regular users for their company
    if (currentUser?.role === UserRole.COMPANY_ADMIN) {
      if (createUserDto.role !== UserRole.USER || 
          createUserDto.companyId !== currentUser.companyId) {
        throw new UnauthorizedException('Company Admins can only create regular users for their company');
      }
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    return this.userRepository.save(user);
  }

  async login(loginDto: LoginDto) {
    console.log('Login attempt for email:', loginDto.email);
    console.log('Login attempt for password:', loginDto.password);
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
    });

    console.log('User found:', user);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    console.log('Password comparison result:', isPasswordValid);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { 
      sub: user.id, 
      email: user.email, 
      role: user.role,
      companyId: user.companyId 
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        companyId: user.companyId
      }
    };
  }

  async findUserByEmail(email: string) {
    return this.userRepository.findOne({ where: { email } });
  }

  async findUserById(id: string) {
    return this.userRepository.findOne({ where: { id } });
  }

  async validateUser(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async verifyToken(token: string): Promise<any> {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
