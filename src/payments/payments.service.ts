import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { AddPaymentMethodInput } from './dto/add-payment-method.input';
import { UpdatePaymentMethodInput } from './dto/update-payment-method.input';

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

  async updatePaymentMethod(input: UpdatePaymentMethodInput) {
    const existing = await this.prisma.paymentMethod.findUnique({
      where: { id: input.id },
    });
    if (!existing) {
      throw new NotFoundException('Payment method not found');
    }

    const data: {
      label?: string;
      brand?: string;
      last4?: string;
    } = {};

    if (typeof input.label === 'string') {
      data.label = input.label.trim();
    }
    if (typeof input.brand === 'string') {
      data.brand = input.brand.trim();
    }
    if (typeof input.last4 === 'string') {
      data.last4 = input.last4;
    }

    return this.prisma.paymentMethod.update({
      where: { id: existing.id },
      data,
    });
  }

  async deletePaymentMethod(id: string) {
    const existing = await this.prisma.paymentMethod.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Payment method not found');
    }
    await this.prisma.paymentMethod.delete({ where: { id } });
    return true;
  }
}
