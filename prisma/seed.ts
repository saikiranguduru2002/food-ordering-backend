import { PrismaClient, Role, Country } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const nick = await prisma.user.upsert({
    where: { email: 'nick.fury@shield.gov' },
    update: {},
    create: {
      name: 'Nick Fury',
      email: 'nick.fury@shield.gov',
      passwordHash,
      role: Role.ADMIN,
      country: Country.USA,
    },
  });

  const marvel = await prisma.user.upsert({
    where: { email: 'carol.danvers@shield.gov' },
    update: {},
    create: {
      name: 'Captain Marvel',
      email: 'carol.danvers@shield.gov',
      passwordHash,
      role: Role.MANAGER,
      country: Country.INDIA,
    },
  });

  const cap = await prisma.user.upsert({
    where: { email: 'steve.rogers@shield.gov' },
    update: {},
    create: {
      name: 'Captain America',
      email: 'steve.rogers@shield.gov',
      passwordHash,
      role: Role.MANAGER,
      country: Country.USA,
    },
  });

  const thanos = await prisma.user.upsert({
    where: { email: 'thanos@titan.mcu' },
    update: {},
    create: {
      name: 'Thanos',
      email: 'thanos@titan.mcu',
      passwordHash,
      role: Role.MEMBER,
      country: Country.INDIA,
    },
  });

  const thor = await prisma.user.upsert({
    where: { email: 'thor@asgard.mcu' },
    update: {},
    create: {
      name: 'Thor',
      email: 'thor@asgard.mcu',
      passwordHash,
      role: Role.MEMBER,
      country: Country.INDIA,
    },
  });

  const travis = await prisma.user.upsert({
    where: { email: 'travis@usa.test' },
    update: {},
    create: {
      name: 'Travis',
      email: 'travis@usa.test',
      passwordHash,
      role: Role.MEMBER,
      country: Country.USA,
    },
  });

  const indiaRest = await prisma.restaurant.upsert({
    where: { id: '00000000-0000-4000-8000-000000000001' },
    update: { name: 'Spice Route', country: Country.INDIA },
    create: {
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Spice Route',
      country: Country.INDIA,
    },
  });

  const usaRest = await prisma.restaurant.upsert({
    where: { id: '00000000-0000-4000-8000-000000000002' },
    update: { name: 'Liberty Diner', country: Country.USA },
    create: {
      id: '00000000-0000-4000-8000-000000000002',
      name: 'Liberty Diner',
      country: Country.USA,
    },
  });

  await prisma.menuItem.deleteMany({
    where: { restaurantId: { in: [indiaRest.id, usaRest.id] } },
  });

  await prisma.menuItem.createMany({
    data: [
      {
        name: 'Butter Chicken',
        price: 349.0,
        restaurantId: indiaRest.id,
      },
      {
        name: 'Masala Dosa',
        price: 120.0,
        restaurantId: indiaRest.id,
      },
      {
        name: 'Classic Burger',
        price: 12.99,
        restaurantId: usaRest.id,
      },
      {
        name: 'Apple Pie',
        price: 6.5,
        restaurantId: usaRest.id,
      },
    ],
  });

  // Ensure carts exist for sample flow (optional)
  for (const u of [marvel, cap, thanos, thor, travis]) {
    await prisma.cart.upsert({
      where: { userId: u.id },
      update: {},
      create: { userId: u.id },
    });
  }

  console.log('Seed complete.', {
    users: [nick.id, marvel.id, cap.id, thanos.id, thor.id, travis.id],
    restaurants: [indiaRest.id, usaRest.id],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
