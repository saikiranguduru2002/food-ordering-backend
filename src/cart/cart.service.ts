import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { applyCountryScope } from '../common/rebac/rebac.helper';
import { AuthUser } from '../common/types/auth-user';
import { decimalToNumber } from '../common/utils/decimal.util';
import { AddToCartInput } from './dto/add-to-cart.input';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOrCreateCartId(userId: string) {
    const cart = await this.prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
    return cart.id;
  }

  private assertMenuItemInScope(user: AuthUser, restaurantCountry: string) {
    if (user.role === Role.ADMIN) {
      return;
    }
    if (restaurantCountry !== user.country) {
      throw new ForbiddenException(
        'Menu item is not available in your country scope',
      );
    }
  }

  async getMyCart(user: AuthUser) {
    const cartId = await this.getOrCreateCartId(user.id);
    const scope = applyCountryScope(user);
    const cart = await this.prisma.cart.findUniqueOrThrow({
      where: { id: cartId },
      include: {
        items: {
          where: { menuItem: { restaurant: scope } },
          include: { menuItem: { include: { restaurant: true } } },
          orderBy: { id: 'asc' },
        },
      },
    });

    const items = cart.items.map((ci) => ({
      id: ci.id,
      cartId: ci.cartId,
      menuItemId: ci.menuItemId,
      quantity: ci.quantity,
      menuItem: {
        id: ci.menuItem.id,
        name: ci.menuItem.name,
        price: decimalToNumber(ci.menuItem.price),
        restaurantId: ci.menuItem.restaurantId,
      },
    }));

    return {
      id: cart.id,
      userId: cart.userId,
      items,
    };
  }

  async addToCart(user: AuthUser, input: AddToCartInput) {
    const menuItem = await this.prisma.menuItem.findUnique({
      where: { id: input.menuItemId },
      include: { restaurant: true },
    });
    if (!menuItem) {
      throw new NotFoundException('Menu item not found');
    }

    const scope = applyCountryScope(user);
    const allowed = await this.prisma.restaurant.findFirst({
      where: { id: menuItem.restaurantId, ...scope },
    });
    if (!allowed) {
      throw new ForbiddenException('Cannot access data outside your country scope');
    }

    this.assertMenuItemInScope(user, menuItem.restaurant.country);

    const cartId = await this.getOrCreateCartId(user.id);

    // Prevent multi-country carts (enforced at add-time).
    const existingCountries = await this.prisma.cartItem.findMany({
      where: { cartId },
      select: { menuItem: { select: { restaurant: { select: { country: true } } } } },
    });
    const cartCountries = new Set(
      existingCountries.map((ci) => ci.menuItem.restaurant.country),
    );
    if (cartCountries.size > 0 && !cartCountries.has(menuItem.restaurant.country)) {
      throw new BadRequestException('Cart contains items from multiple countries');
    }

    await this.prisma.cartItem.upsert({
      where: {
        cartId_menuItemId: { cartId, menuItemId: input.menuItemId },
      },
      create: {
        cartId,
        menuItemId: input.menuItemId,
        quantity: input.quantity,
      },
      update: {
        quantity: { increment: input.quantity },
      },
    });

    return this.getMyCart(user);
  }

  async removeFromCart(user: AuthUser, menuItemId: string) {
    const cartId = await this.getOrCreateCartId(user.id);
    const existing = await this.prisma.cartItem.findFirst({
      where: { cartId, menuItemId },
      include: { menuItem: { include: { restaurant: true } } },
    });
    if (!existing) {
      throw new NotFoundException('Cart line not found');
    }

    // If the row exists but is outside the caller's country scope, return Forbidden (not NotFound).
    this.assertMenuItemInScope(user, existing.menuItem.restaurant.country);

    await this.prisma.cartItem.delete({ where: { id: existing.id } });
    return this.getMyCart(user);
  }
}
