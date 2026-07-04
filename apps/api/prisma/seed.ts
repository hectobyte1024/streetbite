import { PrismaClient, UserRole, VendorStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { hashPassword } from '../src/shared/crypto.js';

const prisma = new PrismaClient();

const demoPasswordHash = hashPassword('Pass1234!');

const now = new Date();
const specialStart = new Date(now.getTime() - 60 * 60 * 1000);
const specialEnd = new Date(now.getTime() + 8 * 60 * 60 * 1000);

type DemoVendor = {
  ownerEmail: string;
  name: string;
  slug: string;
  category: string;
  priceLevel: number;
  description: string;
  lat: number;
  lng: number;
  menu: Array<{
    name: string;
    category: string;
    description?: string;
    priceCents: number;
    sortOrder: number;
  }>;
  special: {
    title: string;
    description: string;
    priceCents: number;
  };
};

const demoUsers = [
  {
    email: 'ana.customer@streetbite.demo',
    displayName: 'Ana Foodie',
    role: UserRole.CUSTOMER,
  },
  {
    email: 'diego.customer@streetbite.demo',
    displayName: 'Diego Explorer',
    role: UserRole.CUSTOMER,
  },
  {
    email: 'owner.tacos@streetbite.demo',
    displayName: 'Tacos Don Raul',
    role: UserRole.VENDOR_OWNER,
  },
  {
    email: 'owner.tamales@streetbite.demo',
    displayName: 'Tamales Lupita',
    role: UserRole.VENDOR_OWNER,
  },
  {
    email: 'owner.tortas@streetbite.demo',
    displayName: 'Tortas La Roma',
    role: UserRole.VENDOR_OWNER,
  },
];

const demoVendors: DemoVendor[] = [
  {
    ownerEmail: 'owner.tacos@streetbite.demo',
    name: 'Tacos Don Raul',
    slug: 'tacos-don-raul',
    category: 'tacos',
    priceLevel: 2,
    description: 'Pastor, suadero, campechanos, and fresh salsas near Parque Mexico.',
    lat: 19.4114,
    lng: -99.1697,
    menu: [
      { name: 'Taco al pastor', category: 'Tacos', description: 'Pineapple, onion, cilantro', priceCents: 2200, sortOrder: 1 },
      { name: 'Taco de suadero', category: 'Tacos', description: 'Slow cooked beef, salsa verde', priceCents: 2600, sortOrder: 2 },
      { name: 'Agua de jamaica', category: 'Drinks', priceCents: 2500, sortOrder: 3 },
    ],
    special: {
      title: 'Orden de pastor 3x2',
      description: 'Three pastor tacos for the price of two until tonight.',
      priceCents: 4400,
    },
  },
  {
    ownerEmail: 'owner.tamales@streetbite.demo',
    name: 'Tamales Lupita',
    slug: 'tamales-lupita',
    category: 'tamales',
    priceLevel: 1,
    description: 'Steaming tamales and atole beside Alameda Central.',
    lat: 19.4352,
    lng: -99.1434,
    menu: [
      { name: 'Tamal verde', category: 'Tamales', description: 'Chicken with salsa verde', priceCents: 2800, sortOrder: 1 },
      { name: 'Tamal dulce', category: 'Tamales', description: 'Sweet pink tamal with raisins', priceCents: 2600, sortOrder: 2 },
      { name: 'Atole de vainilla', category: 'Drinks', priceCents: 2400, sortOrder: 3 },
    ],
    special: {
      title: 'Tamal + atole combo',
      description: 'Pick any tamal and a small atole.',
      priceCents: 4500,
    },
  },
  {
    ownerEmail: 'owner.tortas@streetbite.demo',
    name: 'Tortas La Roma',
    slug: 'tortas-la-roma',
    category: 'tortas',
    priceLevel: 2,
    description: 'Crispy milanesa tortas and house chipotle mayo in Roma Norte.',
    lat: 19.4187,
    lng: -99.1606,
    menu: [
      { name: 'Torta de milanesa', category: 'Tortas', description: 'Beef milanesa, avocado, quesillo', priceCents: 7500, sortOrder: 1 },
      { name: 'Torta cubana', category: 'Tortas', description: 'Loaded classic with ham, egg, and sausage', priceCents: 9500, sortOrder: 2 },
      { name: 'Refresco', category: 'Drinks', priceCents: 2800, sortOrder: 3 },
    ],
    special: {
      title: 'Milanesa lunch deal',
      description: 'Milanesa torta with a drink.',
      priceCents: 8900,
    },
  },
];

function clock(hour: number, minute: number): Date {
  return new Date(Date.UTC(1970, 0, 1, hour, minute, 0, 0));
}

async function seedUsers() {
  const users = new Map<string, { id: string; email: string }>();

  for (const user of demoUsers) {
    const saved = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        displayName: user.displayName,
        role: user.role,
      },
      create: {
        email: user.email,
        passwordHash: demoPasswordHash,
        displayName: user.displayName,
        role: user.role,
      },
    });
    users.set(saved.email, saved);
  }

  return users;
}

async function seedVendor(vendor: DemoVendor, ownerId: string) {
  const savedVendor = await prisma.vendor.upsert({
    where: { slug: vendor.slug },
    update: {
      ownerId,
      name: vendor.name,
      status: VendorStatus.ACTIVE,
      category: vendor.category,
      priceLevel: vendor.priceLevel,
      description: vendor.description,
    },
    create: {
      ownerId,
      name: vendor.name,
      slug: vendor.slug,
      status: VendorStatus.ACTIVE,
      category: vendor.category,
      priceLevel: vendor.priceLevel,
      description: vendor.description,
    },
  });

  await prisma.vendorHours.deleteMany({ where: { vendorId: savedVendor.id } });
  await prisma.vendorHours.createMany({
    data: [1, 2, 3, 4, 5, 6].map((weekday) => ({
      vendorId: savedVendor.id,
      weekday,
      opensAt: clock(8, 0),
      closesAt: clock(23, 30),
    })),
  });

  await prisma.menuItem.deleteMany({ where: { vendorId: savedVendor.id } });
  await prisma.menuItem.createMany({
    data: vendor.menu.map((item) => ({
      vendorId: savedVendor.id,
      name: item.name,
      category: item.category,
      description: item.description ?? null,
      priceCents: item.priceCents,
      currency: 'MXN',
      sortOrder: item.sortOrder,
    })),
  });

  await prisma.dailySpecial.deleteMany({ where: { vendorId: savedVendor.id } });
  await prisma.dailySpecial.create({
    data: {
      vendorId: savedVendor.id,
      title: vendor.special.title,
      description: vendor.special.description,
      priceCents: vendor.special.priceCents,
      currency: 'MXN',
      startsAt: specialStart,
      endsAt: specialEnd,
      isActive: true,
    },
  });

  await prisma.vendorLocation.updateMany({
    where: { vendorId: savedVendor.id, isCurrent: true },
    data: { isCurrent: false },
  });

  await prisma.$executeRaw`
    INSERT INTO vendor_locations (id, vendor_id, location, accuracy_meters, captured_at, is_current)
    VALUES (
      ${randomUUID()},
      ${savedVendor.id},
      ST_SetSRID(ST_MakePoint(${vendor.lng}, ${vendor.lat}), 4326)::geography,
      15,
      CURRENT_TIMESTAMP,
      true
    )
  `;

  return savedVendor;
}

async function seedSocialData(users: Map<string, { id: string; email: string }>, vendorIds: string[]) {
  const ana = users.get('ana.customer@streetbite.demo');
  const diego = users.get('diego.customer@streetbite.demo');

  if (!ana || !diego) {
    throw new Error('Missing demo customers');
  }

  for (const vendorId of vendorIds) {
    await prisma.vendorFollow.upsert({
      where: { vendorId_userId: { vendorId, userId: ana.id } },
      update: {},
      create: { vendorId, userId: ana.id },
    });

    await prisma.review.upsert({
      where: { vendorId_userId: { vendorId, userId: ana.id } },
      update: {
        rating: 5,
        body: 'Demo review: delicious, fast, and easy to find.',
      },
      create: {
        vendorId,
        userId: ana.id,
        rating: 5,
        body: 'Demo review: delicious, fast, and easy to find.',
      },
    });
  }

  for (const vendorId of vendorIds.slice(0, 2)) {
    await prisma.vendorFollow.upsert({
      where: { vendorId_userId: { vendorId, userId: diego.id } },
      update: {},
      create: { vendorId, userId: diego.id },
    });
  }
}

async function main() {
  const users = await seedUsers();
  const vendorIds: string[] = [];

  for (const vendor of demoVendors) {
    const owner = users.get(vendor.ownerEmail);
    if (!owner) {
      throw new Error(`Missing owner ${vendor.ownerEmail}`);
    }
    const savedVendor = await seedVendor(vendor, owner.id);
    vendorIds.push(savedVendor.id);
  }

  await seedSocialData(users, vendorIds);

  console.log('Seed complete.');
  console.log('Demo password for all users: Pass1234!');
  console.log('Customer login: ana.customer@streetbite.demo');
  console.log('Vendor login: owner.tacos@streetbite.demo');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
