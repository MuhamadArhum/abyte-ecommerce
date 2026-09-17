import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { ProductImageDto } from './dto/product-image.dto';
import { ProductVariantDto } from './dto/product-variant.dto';
import { AdjustVariantStockDto } from './dto/adjust-variant-stock.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Public()
  @Get()
  findAll(@Query() query: QueryProductsDto) {
    return this.productsService.findAllPublic(query);
  }

  @ApiBearerAuth()
  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.MANAGER, RoleName.STAFF)
  @Get('admin/all')
  findAllAdmin(@Query() query: QueryProductsDto) {
    return this.productsService.findAllAdmin(query);
  }

  @ApiBearerAuth()
  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.MANAGER, RoleName.STAFF)
  @Get('admin/:id')
  findByIdAdmin(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findByIdAdmin(id);
  }

  @Public()
  @Get(':slug/related')
  findRelatedBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlugPublic(slug).then((p) => this.productsService.findRelated(p.id));
  }

  @Public()
  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlugPublic(slug);
  }

  @ApiBearerAuth()
  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.MANAGER)
  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @ApiBearerAuth()
  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.MANAGER)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @ApiBearerAuth()
  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.MANAGER)
  @Patch(':id/images')
  replaceImages(@Param('id', ParseIntPipe) id: number, @Body() images: ProductImageDto[]) {
    return this.productsService.replaceImages(id, images);
  }

  @ApiBearerAuth()
  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.MANAGER)
  @Post(':id/variants')
  addVariant(@Param('id', ParseIntPipe) id: number, @Body() dto: ProductVariantDto) {
    return this.productsService.addVariant(id, dto);
  }

  @ApiBearerAuth()
  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.MANAGER)
  @Patch(':id/variants/:variantId')
  updateVariant(
    @Param('id', ParseIntPipe) id: number,
    @Param('variantId', ParseIntPipe) variantId: number,
    @Body() dto: Partial<ProductVariantDto>,
  ) {
    return this.productsService.updateVariant(id, variantId, dto);
  }

  @ApiBearerAuth()
  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.MANAGER)
  @Patch(':id/variants/:variantId/stock')
  adjustVariantStock(
    @Param('id', ParseIntPipe) id: number,
    @Param('variantId', ParseIntPipe) variantId: number,
    @Body() dto: AdjustVariantStockDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.adjustVariantStock(id, variantId, dto.quantity, dto.reason, user.userId);
  }

  @ApiBearerAuth()
  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.MANAGER)
  @Delete(':id/variants/:variantId')
  removeVariant(@Param('id', ParseIntPipe) id: number, @Param('variantId', ParseIntPipe) variantId: number) {
    return this.productsService.removeVariant(id, variantId);
  }

  @ApiBearerAuth()
  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN)
  @Patch(':id/archive')
  archive(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.archive(id);
  }

  @ApiBearerAuth()
  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.remove(id);
  }
}
