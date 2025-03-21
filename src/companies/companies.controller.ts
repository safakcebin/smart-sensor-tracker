import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { AddCompanyUserDto } from './dto/add-company-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from '../auth/auth.service';
import { DevicePermissionsService } from '../device-permissions/device-permissions.service';
import { WinstonLoggerService } from '../common/logger/winston-logger';

@ApiTags('Companies')
@Controller('companies')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CompaniesController {
  constructor(
    private readonly companiesService: CompaniesService,
    private readonly authService: AuthService,
    private readonly devicePermissionsService: DevicePermissionsService,
    private readonly logger: WinstonLoggerService,
  ) {}

  @Post()
  @Roles(UserRole.SYSTEM_ADMIN)
  @ApiOperation({ summary: 'Create company', description: 'Create a new company (System Admin only)' })
  @ApiResponse({ status: 201, description: 'Company created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires System Admin role' })
  @ApiResponse({ status: 409, description: 'Company with this name already exists' })
  async create(@Body() createCompanyDto: CreateCompanyDto, @Request() req) {
    const company = await this.companiesService.create(createCompanyDto);
    this.logger.info(
      company.id,
      'Company created',
      {
        companyName: company.name,
        action: 'create',
        userId: req.user.id,
      },
    );
    return company;
  }

  @Get()
  @Roles(UserRole.SYSTEM_ADMIN)
  @ApiOperation({ summary: 'Get all companies', description: 'List all companies (System Admin only)' })
  @ApiResponse({ status: 200, description: 'List of all companies' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires System Admin role' })
  async findAll() {
    const companies = await this.companiesService.findAll();
    return companies;
  }

  @Get(':id')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPANY_ADMIN)
  @ApiOperation({ summary: 'Get company', description: 'Get company details by ID' })
  @ApiResponse({ status: 200, description: 'Company details' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async findOne(@Param('id') id: string, @Request() req) {
    // Company admins can only view their own company
    if (req.user.role === UserRole.COMPANY_ADMIN && req.user.companyId !== id) {
      throw new ForbiddenException('You can only view your own company');
    }
    const company = await this.companiesService.findOne(id);
    this.logger.info(
      company.id,
      'Company details accessed',
      {
        companyId: company.id,
        action: 'read',
      },
    );
    return company;
  }

  @Patch(':id')
  @Roles(UserRole.SYSTEM_ADMIN)
  @ApiOperation({ summary: 'Update company', description: 'Update company details (System Admin only)' })
  @ApiResponse({ status: 200, description: 'Company updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires System Admin role' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  @ApiResponse({ status: 409, description: 'Company with this name already exists' })
  async update(@Param('id') id: string, @Body() updateCompanyDto: UpdateCompanyDto, @Request() req) {
    const company = await this.companiesService.update(id, updateCompanyDto);
    this.logger.info(
      company.id,
      'Company updated',
      {
        companyId: company.id,
        action: 'update',
        updatedBy: req.user.id,
        changes: updateCompanyDto,
      },
    );
    return company;
  }

  @Delete(':id')
  @Roles(UserRole.SYSTEM_ADMIN)
  @ApiOperation({ summary: 'Delete company', description: 'Delete a company (System Admin only)' })
  @ApiResponse({ status: 200, description: 'Company deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires System Admin role' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  @ApiResponse({ status: 409, description: 'Cannot delete company with associated users or devices' })
  async remove(@Param('id') id: string, @Request() req) {
    const company = await this.companiesService.remove(id);
    this.logger.info(
      req.user.companyId,
      'Company deleted',
      {
        companyId: req.user.companyId,
        action: 'delete',
        deletedBy: req.user.id,
      },
    );
    return company;
  }

  @Get(':id/users')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPANY_ADMIN)
  @ApiOperation({ summary: 'Get company users', description: 'Get all users in the company' })
  @ApiResponse({ status: 200, description: 'List of company users' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async getUsers(@Param('id') companyId: string, @Request() req) {
    // Company admins can only view their own company's users
    if (req.user.role === UserRole.COMPANY_ADMIN && req.user.companyId !== companyId) {
      throw new ForbiddenException('You can only view users from your own company');
    }

    const company = await this.companiesService.findOne(companyId);
    this.logger.info(
      company.id,
      'Company users list accessed',
      {
        companyId: company.id,
        action: 'read_users',
        userCount: company.users.length,
      },
    );
    return company.users;
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.SYSTEM_ADMIN)
  @ApiOperation({ summary: 'Deactivate company', description: 'Deactivate a company instead of deleting (System Admin only)' })
  @ApiResponse({ status: 200, description: 'Company deactivated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires System Admin role' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async deactivate(@Param('id') id: string, @Request() req) {
    const company = await this.companiesService.deactivate(id);
    this.logger.warn(
      company.id,
      'Company deactivated',
      {
        companyId: company.id,
        action: 'deactivate',
        deactivatedBy: req.user.id,
      },
    );
    return company;
  }
}
