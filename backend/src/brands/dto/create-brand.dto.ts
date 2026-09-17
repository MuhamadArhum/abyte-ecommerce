import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { EntityStatus } from '@prisma/client';

export class CreateBrandDto {
  @IsString()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;

  @IsOptional()
  @IsEnum(EntityStatus)
  status?: EntityStatus;
}
