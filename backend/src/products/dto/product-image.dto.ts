import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class ProductImageDto {
  @IsString()
  @MaxLength(500)
  url: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  altText?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
