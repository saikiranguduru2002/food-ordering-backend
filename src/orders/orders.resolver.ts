import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Role } from '@prisma/client';
import { OrdersService } from './orders.service';
import { OrderGql } from './graphql/order.model';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthUser } from '../common/types/auth-user';

@Resolver()
export class OrdersResolver {
  constructor(private readonly orders: OrdersService) {}

  @Query(() => [OrderGql])
  async myOrders(@CurrentUser() user: AuthUser): Promise<OrderGql[]> {
    return this.orders.listMyOrders(user);
  }

  @Mutation(() => OrderGql)
  async createOrder(@CurrentUser() user: AuthUser): Promise<OrderGql> {
    return this.orders.createFromCart(user);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Mutation(() => OrderGql)
  async checkout(
    @CurrentUser() user: AuthUser,
    @Args('orderId', { type: () => ID }) orderId: string,
    @Args('paymentMethodId', { type: () => ID, nullable: true })
    paymentMethodId?: string,
  ): Promise<OrderGql> {
    return this.orders.checkout(user, orderId, paymentMethodId);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Mutation(() => OrderGql)
  async cancelOrder(
    @CurrentUser() user: AuthUser,
    @Args('orderId', { type: () => ID }) orderId: string,
  ): Promise<OrderGql> {
    return this.orders.cancel(user, orderId);
  }
}
