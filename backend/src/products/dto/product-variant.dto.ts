import { Type } from 'class-transformer';
import { IsNumber, IsObject, IsOptional, IsString, Min, MaxLength } from 'class-validator';

export class ProductVariantDto {
  @IsString()
  @MaxLength(100)
  sku: string;

  @IsString()
  @MaxLength(150)
  name: string;

  @IsObject()
  attributes: Record<string, string>;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceOverride?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stock: number;
}
