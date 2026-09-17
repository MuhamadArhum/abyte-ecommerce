import { Body, Controller, Get, Param, ParseIntPipe, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { InventoryService } from './inventory.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { UpdateThresholdDto } from './dto/update-threshold.dto';
import { QueryInventoryDto } from './dto/query-inventory.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('inventory')
@ApiBearerAuth()
@Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.MANAGER, RoleName.STAFF)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  findAll(@Query() query: QueryInventoryDto) {
    return this.inventoryService.findAll(query, query.isLowStockOnly);
  }

  @Get(':productId')
  findByProduct(@Param('productId', ParseIntPipe) productId: number) {
    return this.inventoryService.findByProduct(productId);
  }

  @Get(':productId/transactions')
  getTransactions(@Param('productId', ParseIntPipe) productId: number, @Query() pagination: PaginationDto) {
    return this.inventoryService.getTransactions(productId, pagination);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.MANAGER)
  @Patch(':productId/adjust')
  adjustStock(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: AdjustStockDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventoryService.adjustStock(productId, dto.quantity, dto.type, dto.reason, user.userId);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.MANAGER)
  @Patch(':productId/threshold')
  updateThreshold(@Param('productId', ParseIntPipe) productId: number, @Body() dto: UpdateThresholdDto) {
    return this.inventoryService.updateThreshold(productId, dto.lowStockThreshold);
  }
}
