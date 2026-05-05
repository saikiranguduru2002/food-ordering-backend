import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Resolver } from '@nestjs/graphql';
import { Role } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { PaymentMethodGql } from './graphql/payment-method.model';
import { AddPaymentMethodInput } from './dto/add-payment-method.input';
import { UpdatePaymentMethodInput } from './dto/update-payment-method.input';
import { Roles } from '../common/decorators/roles.decorator';
import { GqlAuthGuard } from '../common/guards/gql-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@Resolver()
export class PaymentsResolver {
  constructor(private readonly payments: PaymentsService) {}

  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Mutation(() => PaymentMethodGql)
  async addPaymentMethod(
    @Args('input') input: AddPaymentMethodInput,
  ): Promise<PaymentMethodGql> {
    return this.payments.addPaymentMethod(input);
  }

  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Mutation(() => PaymentMethodGql)
  async updatePaymentMethod(
    @Args('input') input: UpdatePaymentMethodInput,
  ): Promise<PaymentMethodGql> {
    return this.payments.updatePaymentMethod(input);
  }

  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Mutation(() => Boolean)
  async deletePaymentMethod(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.payments.deletePaymentMethod(id);
  }
}
