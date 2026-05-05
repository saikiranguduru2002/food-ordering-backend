import { Field, ID, InputType } from '@nestjs/graphql';
import { IsUUID } from 'class-validator';

@InputType()
export class RemoveFromCartInput {
  @Field(() => ID)
  @IsUUID('4')
  menuItemId!: string;
}
