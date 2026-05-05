import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class OrderLineGql {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  orderId!: string;

  @Field(() => ID)
  menuItemId!: string;

  @Field(() => Int)
  quantity!: number;

  @Field(() => Float)
  unitPrice!: number;
}
