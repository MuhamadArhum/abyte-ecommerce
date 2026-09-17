import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CartService } from '../cart/cart.service';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('coupons')
@ApiBearerAuth()
@Controller('coupons')
export class CouponsController {
  constructor(
    private readonly couponsService: CouponsService,
    private readonly cartService: CartService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('validate')
  async validate(@CurrentUser() user: AuthenticatedUser, @Body() dto: ValidateCouponDto) {
    const cart = await this.cartService.getCart(user.userId);
    const productIds = cart.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, categoryId: true },
    });
    const categoryIds = products.map((p) => p.categoryId).filter((id): id is number => id !== null);
    const { discount } = await this.couponsService.validateAndCompute(
      dto.code,
      user.userId,
      cart.subtotal,
      productIds,
      categoryIds,
    );
    return { valid: true, discount, code: dto.code.toUpperCase() };
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.MANAGER)
  @Get()
  findAll(@Query() pagination: PaginationDto) {
    return this.couponsService.findAll(pagination);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.MANAGER)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.couponsService.findById(id);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.MANAGER)
  @Post()
  create(@Body() dto: CreateCouponDto) {
    return this.couponsService.create(dto);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.MANAGER)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCouponDto) {
    return this.couponsService.update(id, dto);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.MANAGER)
  @Patch(':id/active')
  setActive(@Param('id', ParseIntPipe) id: number, @Body('active') active: boolean) {
    return this.couponsService.setActive(id, active);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.couponsService.remove(id);
  }
}
