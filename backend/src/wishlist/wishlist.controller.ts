import { Controller, Delete, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('wishlist')
@ApiBearerAuth()
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.wishlistService.findMine(user.userId);
  }

  @Post(':productId')
  addItem(@CurrentUser() user: AuthenticatedUser, @Param('productId', ParseIntPipe) productId: number) {
    return this.wishlistService.addItem(user.userId, productId);
  }

  @Delete(':productId')
  removeItem(@CurrentUser() user: AuthenticatedUser, @Param('productId', ParseIntPipe) productId: number) {
    return this.wishlistService.removeItem(user.userId, productId);
  }

  @Post(':productId/move-to-cart')
  moveToCart(@CurrentUser() user: AuthenticatedUser, @Param('productId', ParseIntPipe) productId: number) {
    return this.wishlistService.moveToCart(user.userId, productId);
  }
}
