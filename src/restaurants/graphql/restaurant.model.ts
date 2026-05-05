import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Country } from '@prisma/client';

@ObjectType()
export class RestaurantGql {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field(() => Country)
  country!: Country;
}
