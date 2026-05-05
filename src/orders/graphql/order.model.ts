import { Field, Float, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Country, OrderStatus } from '@prisma/client';
import { OrderLineGql } from './order-line.model';

registerEnumType(OrderStatus, { name: 'OrderStatus' });

@ObjectType()
export class OrderGql {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  userId!: string;

  @Field(() => OrderStatus)
  status!: OrderStatus;

  @Field(() => Float)
  totalAmount!: number;

  @Field(() => Country)
  country!: Country;

  @Field(() => [OrderLineGql])
  lines!: OrderLineGql[];
}
