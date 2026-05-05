import { Args, Query, Resolver } from '@nestjs/graphql';
import { RestaurantsService } from './restaurants.service';
import { RestaurantsPage } from './graphql/restaurants-page.model';
import { PaginationArgs } from '../common/dto/pagination.args';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/types/auth-user';

@Resolver()
export class RestaurantsResolver {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Query(() => RestaurantsPage)
  async restaurants(
    @CurrentUser() user: AuthUser,
    @Args('pagination', { type: () => PaginationArgs, nullable: true })
    pagination?: PaginationArgs,
  ): Promise<RestaurantsPage> {
    const skip = pagination?.skip ?? 0;
    const take = pagination?.take ?? 20;
    return this.restaurantsService.listPaginated(user, skip, take);
  }
}
