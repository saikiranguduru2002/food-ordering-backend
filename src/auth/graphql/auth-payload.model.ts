import { Field, ObjectType } from '@nestjs/graphql';
import { UserGql } from './user-gql.model';

@ObjectType()
export class AuthPayload {
  @Field()
  accessToken!: string;

  @Field(() => UserGql)
  user!: UserGql;
}
