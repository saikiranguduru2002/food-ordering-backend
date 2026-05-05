import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Country } from '@prisma/client';

@ObjectType()
export class PaymentMethodGql {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  userId!: string;

  @Field()
  label!: string;

  @Field()
  last4!: string;

  @Field()
  brand!: string;

  @Field(() => Country)
  country!: Country;
}
