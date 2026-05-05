import { Field, ID, ObjectType } from '@nestjs/graphql';
import { CartItemGql } from './cart-item.model';

@ObjectType()
export class CartGql {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  userId!: string;

  @Field(() => [CartItemGql])
  items!: CartItemGql[];
}
