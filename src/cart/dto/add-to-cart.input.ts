import { Field, ID, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsUUID, Max, Min } from 'class-validator';

@InputType()
export class AddToCartInput {
  @Field(() => ID)
  @IsUUID('4')
  menuItemId!: string;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(999)
  quantity!: number;
}
