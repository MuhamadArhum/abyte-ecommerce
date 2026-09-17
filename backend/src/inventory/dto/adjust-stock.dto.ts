import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class AdjustStockDto {
  // positive to add stock, negative to remove
  @Type(() => Number)
  @IsInt()
  quantity: number;

  @IsIn(['RESTOCK', 'ADJUSTMENT', 'RETURN'])
  type: 'RESTOCK' | 'ADJUSTMENT' | 'RETURN';

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
