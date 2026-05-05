import { Field, ID, InputType } from '@nestjs/graphql';
import { IsOptional, IsString, IsUUID, Length, Matches, MaxLength, MinLength } from 'class-validator';

@InputType()
export class UpdatePaymentMethodInput {
  @Field(() => ID)
  @IsUUID('4')
  id!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  label?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(32)
  brand?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @Length(4, 4)
  @Matches(/^\d{4}$/)
  last4?: string;
}

