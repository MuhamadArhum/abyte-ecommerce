import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('brands')
@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Public()
  @Get()
  findAll() {
    return this.brandsService.findAll(false);
  }

  @ApiBearerAuth()
  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.MANAGER)
  @Get('admin/all')
  findAllAdmin() {
    return this.brandsService.findAll(true);
  }

  @Public()
  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.brandsService.findBySlug(slug);
  }

  @ApiBearerAuth()
  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.MANAGER)
  @Post()
  create(@Body() dto: CreateBrandDto) {
    return this.brandsService.create(dto);
  }

  @ApiBearerAuth()
  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.MANAGER)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBrandDto) {
    return this.brandsService.update(id, dto);
  }

  @ApiBearerAuth()
  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN)
  @Patch(':id/archive')
  archive(@Param('id', ParseIntPipe) id: number) {
    return this.brandsService.archive(id);
  }

  @ApiBearerAuth()
  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.brandsService.remove(id);
  }
}
