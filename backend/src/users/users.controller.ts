import { Body, Controller, Get, Param, ParseIntPipe, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  @Get('me')
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findById(user.userId);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.userId, dto);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.MANAGER)
  @Get()
  findAll(
    @Query() pagination: PaginationDto,
    @Query('role') role?: RoleName,
    @Query('search') search?: string,
  ) {
    return this.usersService.findAll(pagination, { role, search });
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findById(id);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN)
  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const result = await this.usersService.updateStatus(id, dto.status);
    await this.auditLogsService.log(actor.userId, 'user.status.update', 'User', String(id), { status: dto.status });
    return result;
  }

  @Roles(RoleName.SUPER_ADMIN)
  @Patch(':id/role')
  async updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const result = await this.usersService.updateRole(id, dto.role);
    await this.auditLogsService.log(actor.userId, 'user.role.update', 'User', String(id), { role: dto.role });
    return result;
  }
}
