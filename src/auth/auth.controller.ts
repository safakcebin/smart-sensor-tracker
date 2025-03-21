import { Controller, Post, Body, UseGuards, Request, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { UserRole } from './enums/user-role.enum';
import { Public } from './decorators/public.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Authentication')
@Controller('auth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'User login', description: 'Login with email and password to get access token' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPANY_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register new user', description: 'Create a new user (requires SYSTEM_ADMIN or COMPANY_ADMIN role)' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async register(@Body() createUserDto: CreateUserDto, @Request() req) {
    return this.authService.createUser(createUserDto, req.user);
  }

  @Public()
  @Get('test-rate-limit')
  @Throttle({ default: { limit: 3, ttl: 10000 } })
  @ApiOperation({ summary: 'Test rate limiting', description: 'Test rate limiting for auth controller' })
  @ApiResponse({ status: 200, description: 'Rate limit test successful' })
  @ApiResponse({ status: 429, description: 'Too Many Requests' })
  async testRateLimit() {
    return { message: 'This endpoint is rate limited', timestamp: new Date().toISOString() };
  }
}
