import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Country, Role } from '@prisma/client';

registerEnumType(Role, { name: 'Role' });
registerEnumType(Country, { name: 'Country' });

@ObjectType()
export class UserGql {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field()
  email!: string;

  @Field(() => Role)
  role!: Role;

  @Field(() => Country)
  country!: Country;
}
