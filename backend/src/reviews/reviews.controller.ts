import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ModerateReviewDto } from './dto/moderate-review.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

const ADMIN_ROLES: RoleName[] = [RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.MANAGER];

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @Get('product/:productId')
  findForProduct(@Param('productId', ParseIntPipe) productId: number, @Query() pagination: PaginationDto) {
    return this.reviewsService.findForProduct(productId, pagination);
  }

  @ApiBearerAuth()
  @Roles(...ADMIN_ROLES)
  @Get('pending')
  findPending(@Query() pagination: PaginationDto) {
    return this.reviewsService.findPending(pagination);
  }

  @ApiBearerAuth()
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(user.userId, dto);
  }

  @ApiBearerAuth()
  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviewsService.update(user.userId, id, dto);
  }

  @ApiBearerAuth()
  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    const isAdmin = ADMIN_ROLES.includes(user.role as RoleName);
    return this.reviewsService.remove(user.userId, id, isAdmin);
  }

  @ApiBearerAuth()
  @Roles(...ADMIN_ROLES)
  @Patch(':id/moderate')
  moderate(@Param('id', ParseIntPipe) id: number, @Body() dto: ModerateReviewDto) {
    return this.reviewsService.moderate(id, dto.status);
  }
}
