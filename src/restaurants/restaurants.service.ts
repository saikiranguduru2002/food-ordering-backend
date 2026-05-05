import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { applyCountryScope } from '../common/rebac/rebac.helper';
import { AuthUser } from '../common/types/auth-user';

@Injectable()
export class RestaurantsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPaginated(user: AuthUser, skip: number, take: number) {
    const scope = applyCountryScope(user);
    const where = { ...scope };
    const [items, totalCount] = await Promise.all([
      this.prisma.restaurant.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take,
      }),
      this.prisma.restaurant.count({ where }),
    ]);
    return { items, totalCount };
  }
}
