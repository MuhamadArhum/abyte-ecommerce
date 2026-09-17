import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class AddCartItemDto {
  @Type(() => Number)
  @IsInt()
  productId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  variantId?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;
}
