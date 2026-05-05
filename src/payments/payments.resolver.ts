import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { Role } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { PaymentMethodGql } from './graphql/payment-method.model';
import { AddPaymentMethodInput } from './dto/add-payment-method.input';
import { Roles } from '../common/decorators/roles.decorator';

@Resolver()
export class PaymentsResolver {
  constructor(private readonly payments: PaymentsService) {}

  @Roles(Role.ADMIN)
  @Mutation(() => PaymentMethodGql)
  async addPaymentMethod(
    @Args('input') input: AddPaymentMethodInput,
  ): Promise<PaymentMethodGql> {
    return this.payments.addPaymentMethod(input);
  }
}
