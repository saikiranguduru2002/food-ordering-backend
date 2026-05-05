import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { AddPaymentMethodInput } from './dto/add-payment-method.input';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  async addPaymentMethod(input: AddPaymentMethodInput) {
    const target = await this.users.requireById(input.userId);
    if (input.country !== target.country) {
      throw new BadRequestException(
        'Payment method country must match the target user country',
      );
    }
    return this.prisma.paymentMethod.create({
      data: {
        userId: target.id,
        label: input.label.trim(),
        last4: input.last4,
        brand: input.brand.trim(),
        country: input.country,
      },
    });
  }
}
