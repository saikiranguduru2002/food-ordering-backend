import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Country, OrderStatus, Prisma, Role } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../common/prisma/prisma.service';
import { applyCountryScope } from '../common/rebac/rebac.helper';
import { AuthUser } from '../common/types/auth-user';
import { decimalToNumber } from '../common/utils/decimal.util';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private mapOrder(order: {
    id: string;
    userId: string;
    status: OrderStatus;
    totalAmount: Decimal;
    country: Country;
    lines: Array<{
      id: string;
      orderId: string;
      menuItemId: string;
      quantity: number;
      unitPrice: Decimal;
    }>;
  }) {
    return {
      id: order.id,
      userId: order.userId,
      status: order.status,
      totalAmount: decimalToNumber(order.totalAmount),
      country: order.country,
      lines: order.lines.map((l) => ({
        id: l.id,
        orderId: l.orderId,
        menuItemId: l.menuItemId,
        quantity: l.quantity,
        unitPrice: decimalToNumber(l.unitPrice),
      })),
    };
  }

  async listMyOrders(user: AuthUser) {
    const scope = applyCountryScope(user);
    const orders = await this.prisma.order.findMany({
      where: { userId: user.id, ...scope },
      orderBy: { id: 'desc' },
      include: { lines: { orderBy: { id: 'asc' } } },
    });
    return orders.map((o) => this.mapOrder(o));
  }

  async createFromCart(user: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findUnique({
        where: { userId: user.id },
        include: {
          items: {
            include: {
              menuItem: { include: { restaurant: true } },
            },
          },
        },
      });
      if (!cart || cart.items.length === 0) {
        throw new BadRequestException('Cart is empty');
      }

      const countries = new Set(
        cart.items.map((i) => i.menuItem.restaurant.country),
      );
      if (countries.size !== 1) {
        throw new BadRequestException(
          'Cart contains items from multiple countries',
        );
      }
      const orderCountry = [...countries][0] as Country;

      if (user.role !== Role.ADMIN && orderCountry !== user.country) {
        throw new ForbiddenException(
          'Cannot place orders outside your country scope',
        );
      }

      let totalAmount = new Decimal(0);
      for (const line of cart.items) {
        const unit = new Decimal(line.menuItem.price.toString());
        totalAmount = totalAmount.add(unit.mul(line.quantity));
      }

      const order = await tx.order.create({
        data: {
          userId: user.id,
          status: OrderStatus.CREATED,
          totalAmount,
          country: orderCountry,
          lines: {
            create: cart.items.map((ci) => ({
              menuItemId: ci.menuItemId,
              quantity: ci.quantity,
              unitPrice: new Decimal(ci.menuItem.price.toString()),
            })),
          },
        },
        include: { lines: { orderBy: { id: 'asc' } } },
      });

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return this.mapOrder(order);
    });
  }

  private async requireOrderAccessTx(
    tx: Prisma.TransactionClient,
    user: AuthUser,
    orderId: string,
  ) {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { lines: { orderBy: { id: 'asc' } } },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId !== user.id && user.role !== Role.ADMIN) {
      throw new ForbiddenException('Not your order');
    }

    if (user.role !== Role.ADMIN && order.country !== user.country) {
      throw new ForbiddenException(
        'Cannot access data outside your country scope',
      );
    }

    return order;
  }

  async checkout(user: AuthUser, orderId: string, paymentMethodId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await this.requireOrderAccessTx(tx, user, orderId);

      if (order.status !== OrderStatus.CREATED) {
        throw new BadRequestException(
          'Only orders in CREATED status can be checked out',
        );
      }

      if (paymentMethodId) {
        const pm = await tx.paymentMethod.findFirst({
          where: { id: paymentMethodId, userId: order.userId, country: order.country },
        });
        if (!pm) {
          throw new BadRequestException(
            'Payment method not found for this order user',
          );
        }
      }

      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.PAID },
        include: { lines: { orderBy: { id: 'asc' } } },
      });
      return this.mapOrder(updated);
    });
  }

  async cancel(user: AuthUser, orderId: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await this.requireOrderAccessTx(tx, user, orderId);
      if (order.status !== OrderStatus.CREATED) {
        throw new BadRequestException('Only CREATED orders can be cancelled');
      }
      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELLED },
        include: { lines: { orderBy: { id: 'asc' } } },
      });
      return this.mapOrder(updated);
    });
  }
}
