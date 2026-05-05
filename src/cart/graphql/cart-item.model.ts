import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';
import { MenuItemGql } from '../../menu/graphql/menu-item.model';

@ObjectType()
export class CartItemGql {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  cartId!: string;

  @Field(() => ID)
  menuItemId!: string;

  @Field(() => Int)
  quantity!: number;

  @Field(() => MenuItemGql)
  menuItem!: MenuItemGql;
}
