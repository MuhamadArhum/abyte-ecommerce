import { IsEnum } from 'class-validator';
import { RoleName } from '@prisma/client';

export class UpdateUserRoleDto {
  @IsEnum(RoleName)
  role: RoleName;
}
