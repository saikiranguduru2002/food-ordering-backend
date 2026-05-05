import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { applyCountryScope } from '../common/rebac/rebac.helper';
import { AuthUser } from '../common/types/auth-user';
import { decimalToNumber } from '../common/utils/decimal.util';

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  async listForRestaurant(user: AuthUser, restaurantId: string) {
    const scope = applyCountryScope(user);
    const allowed = await this.prisma.restaurant.findFirst({
      where: { id: restaurantId, ...scope },
    });
    if (allowed) {
      const items = await this.prisma.menuItem.findMany({
        where: { restaurantId },
        orderBy: { name: 'asc' },
      });
      return items.map((i) => ({
        ...i,
        price: decimalToNumber(i.price),
      }));
    }

    const exists = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });
    if (exists) {
      throw new ForbiddenException(
        'Cannot access data outside your country scope',
      );
    }
    throw new NotFoundException('Restaurant not found');
  }
}
