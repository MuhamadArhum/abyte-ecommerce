import { Type } from 'class-transformer';
import { IsIn, IsOptional, IsString, Min } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class QueryProductsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category?: string; // category slug

  @IsOptional()
  @IsString()
  brand?: string; // brand slug

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  maxPrice?: number;

  // Kept as a string (not boolean) deliberately — see query-inventory.dto.ts
  // for why: `enableImplicitConversion` coerces a `boolean`-typed field from
  // the raw query string before any custom @Transform can see the original
  // value, turning "false" into `true`.
  @IsOptional()
  @IsIn(['true', 'false'])
  inStockOnly?: string;

  get isInStockOnly(): boolean {
    return this.inStockOnly === 'true';
  }

  @IsOptional()
  @IsIn(['price', 'createdAt', 'name'])
  sortBy?: string = 'createdAt';
}
