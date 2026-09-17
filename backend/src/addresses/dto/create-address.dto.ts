import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { AddressType } from '@prisma/client';

export class CreateAddressDto {
  @IsOptional()
  @IsEnum(AddressType)
  type?: AddressType;

  @IsString()
  @MaxLength(150)
  fullName: string;

  @IsString()
  @MaxLength(30)
  phone: string;

  @IsString()
  @MaxLength(255)
  line1: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  line2?: string;

  @IsString()
  @MaxLength(100)
  city: string;

  @IsString()
  @MaxLength(100)
  state: string;

  @IsString()
  @MaxLength(20)
  postalCode: string;

  @IsString()
  @MaxLength(100)
  country: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
