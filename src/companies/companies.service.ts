import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  async create(createCompanyDto: CreateCompanyDto) {
    const existingCompany = await this.companyRepository.findOne({
      where: { name: createCompanyDto.name }
    });

    if (existingCompany) {
      throw new ConflictException('Company with this name already exists');
    }

    const company = this.companyRepository.create(createCompanyDto);
    return this.companyRepository.save(company);
  }

  async findAll() {
    return this.companyRepository.find({
      order: { createdAt: 'DESC' }
    });
  }

  async findOne(id: string) {
    const company = await this.companyRepository.findOne({
      where: { id },
      relations: ['users', 'iotDevices']
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return company;
  }

  async update(id: string, updateCompanyDto: UpdateCompanyDto) {
    const company = await this.findOne(id);

    // If name is being updated, check for uniqueness
    if (updateCompanyDto.name) {
      const existingCompany = await this.companyRepository.findOne({
        where: { name: updateCompanyDto.name }
      });

      if (existingCompany && existingCompany.id !== id) {
        throw new ConflictException('Company with this name already exists');
      }
    }

    Object.assign(company, updateCompanyDto);
    return this.companyRepository.save(company);
  }

  async remove(id: string) {
    const company = await this.findOne(id);

    if (company.users?.length > 0 || company.iotDevices?.length > 0) {
      throw new ConflictException('Cannot delete company with associated users or devices');
    }

    await this.companyRepository.remove(company);
    return { message: 'Company deleted successfully' };
  }

  async deactivate(id: string) {
    const company = await this.findOne(id);
    company.isActive = false;
    return this.companyRepository.save(company);
  }
}
