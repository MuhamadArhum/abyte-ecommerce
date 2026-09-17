import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

const ADMIN_ROLES: RoleName[] = [RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.MANAGER, RoleName.STAFF];

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  @Post()
  checkout(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateOrderDto) {
    return this.ordersService.checkout(user.userId, dto);
  }

  @Get()
  findMine(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryOrdersDto) {
    return this.ordersService.findAllForUser(user.userId, query);
  }

  @Roles(...ADMIN_ROLES)
  @Get('admin/all')
  findAllAdmin(@Query() query: QueryOrdersDto) {
    return this.ordersService.findAllAdmin(query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    const isAdmin = ADMIN_ROLES.includes(user.role as RoleName);
    return this.ordersService.findOne(id, user.userId, isAdmin);
  }

  @Patch(':id/cancel')
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelOrderDto,
  ) {
    return this.ordersService.cancelByCustomer(id, user.userId, dto.reason);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.MANAGER)
  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const result = await this.ordersService.updateStatus(id, dto.status, dto.note);
    await this.auditLogsService.log(actor.userId, 'order.status.update', 'Order', String(id), {
      status: dto.status,
      note: dto.note,
    });
    return result;
  }
}
