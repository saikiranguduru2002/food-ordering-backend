import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CartService } from './cart.service';
import { CartGql } from './graphql/cart.model';
import { AddToCartInput } from './dto/add-to-cart.input';
import { RemoveFromCartInput } from './dto/remove-from-cart.input';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/types/auth-user';

@Resolver()
export class CartResolver {
  constructor(private readonly cart: CartService) {}

  @Query(() => CartGql)
  async myCart(@CurrentUser() user: AuthUser): Promise<CartGql> {
    return this.cart.getMyCart(user);
  }

  @Mutation(() => CartGql)
  async addToCart(
    @CurrentUser() user: AuthUser,
    @Args('input') input: AddToCartInput,
  ): Promise<CartGql> {
    return this.cart.addToCart(user, input);
  }

  @Mutation(() => CartGql)
  async removeFromCart(
    @CurrentUser() user: AuthUser,
    @Args('input') input: RemoveFromCartInput,
  ): Promise<CartGql> {
    return this.cart.removeFromCart(user, input.menuItemId);
  }
}
