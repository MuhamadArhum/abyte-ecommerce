import { IsIn, IsOptional } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class QueryInventoryDto extends PaginationDto {
  // Kept as a string (not boolean) deliberately: with the global
  // ValidationPipe's `enableImplicitConversion: true`, class-transformer
  // auto-coerces query values to a property's reflected TS type *before* any
  // custom @Transform runs — for a `boolean`-typed field that means
  // `Boolean("false")` (`true`) has already overwritten the raw string by
  // the time a transform would see it. Validating/reading it as a string
  // and converting explicitly via the getter below avoids that pitfall.
  @IsOptional()
  @IsIn(['true', 'false'])
  lowStockOnly?: string;

  get isLowStockOnly(): boolean {
    return this.lowStockOnly === 'true';
  }
}
