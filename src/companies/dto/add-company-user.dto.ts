import { IsNotEmpty, IsString, IsEmail, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddCompanyUserDto {
  @ApiProperty({ example: 'john.doe@company.com', description: 'Email address of the user' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'John', description: 'First name of the user' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Last name of the user' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiPropertyOptional({ example: ['device-id-1', 'device-id-2'], description: 'List of device IDs to grant access to' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  deviceIds?: string[];
}
