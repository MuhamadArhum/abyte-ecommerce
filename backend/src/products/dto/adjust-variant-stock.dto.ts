import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class AdjustVariantStockDto {
  // positive to add stock, negative to remove
  @Type(() => Number)
  @IsInt()
  quantity: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
