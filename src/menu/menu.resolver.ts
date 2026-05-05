import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { MenuService } from './menu.service';
import { MenuItemGql } from './graphql/menu-item.model';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/types/auth-user';

@Resolver()
export class MenuResolver {
  constructor(private readonly menu: MenuService) {}

  @Query(() => [MenuItemGql])
  async menuItems(
    @CurrentUser() user: AuthUser,
    @Args('restaurantId', { type: () => ID }) restaurantId: string,
  ): Promise<MenuItemGql[]> {
    return this.menu.listForRestaurant(user, restaurantId);
  }
}
