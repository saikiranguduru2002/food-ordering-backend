import { Field, Int, ObjectType } from '@nestjs/graphql';
import { RestaurantGql } from './restaurant.model';

@ObjectType()
export class RestaurantsPage {
  @Field(() => [RestaurantGql])
  items!: RestaurantGql[];

  @Field(() => Int)
  totalCount!: number;
}
