import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class CreateOrderDto {
  @Type(() => Number)
  @IsInt()
  shippingAddressId: number;

  @Type(() => Number)
  @IsInt()
  billingAddressId: number;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  couponCode?: string;
}
