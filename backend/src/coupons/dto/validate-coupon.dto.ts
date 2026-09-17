import { IsString, MaxLength } from 'class-validator';

export class ValidateCouponDto {
  @IsString()
  @MaxLength(50)
  code: string;
}
