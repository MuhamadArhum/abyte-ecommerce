import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class UpdateThresholdDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  lowStockThreshold: number;
}
