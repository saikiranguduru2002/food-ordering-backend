import { Field, ID, InputType } from '@nestjs/graphql';
import { Country } from '@prisma/client';
import {
  IsEnum,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

@InputType()
export class AddPaymentMethodInput {
  @Field(() => ID)
  @IsUUID('4')
  userId!: string;

  @Field()
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  label!: string;

  @Field()
  @IsString()
  @Length(4, 4)
  @Matches(/^\d{4}$/)
  last4!: string;

  @Field()
  @IsString()
  @MinLength(2)
  @MaxLength(32)
  brand!: string;

  @Field(() => Country)
  @IsEnum(Country)
  country!: Country;
}
