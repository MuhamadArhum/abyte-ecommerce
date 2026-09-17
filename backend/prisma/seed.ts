import { PrismaClient, RoleName } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const ROLE_PERMISSIONS: Record<RoleName, string[]> = {
  SUPER_ADMIN: ['*'],
  ADMIN: [
    'products.manage',
    'categories.manage',
    'brands.manage',
    'inventory.manage',
    'orders.manage',
    'coupons.manage',
    'reviews.moderate',
    'users.manage',
  ],
  MANAGER: [
    'products.manage',
    'categories.manage',
    'brands.manage',
    'inventory.manage',
    'orders.manage',
    'coupons.manage',
    'reviews.moderate',
  ],
  STAFF: ['orders.view', 'inventory.view', 'products.view'],
  CUSTOMER: ['storefront.use'],
};

async function main() {
  console.log('Seeding roles & permissions...');

  const allPermissionKeys = Array.from(new Set(Object.values(ROLE_PERMISSIONS).flat()));
  const permissionMap = new Map<string, number>();
  for (const key of allPermissionKeys) {
    const permission = await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key, label: key },
    });
    permissionMap.set(key, permission.id);
  }

  for (const roleName of Object.values(RoleName)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName, description: `${roleName} role` },
    });
    const keys = ROLE_PERMISSIONS[roleName];
    for (const key of keys) {
      const permissionId = permissionMap.get(key);
      if (!permissionId) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: {},
        create: { roleId: role.id, permissionId },
      });
    }
  }

  console.log('Seeding super admin user...');
  const superAdminRole = await prisma.role.findUniqueOrThrow({ where: { name: RoleName.SUPER_ADMIN } });
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@abyte.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      roleId: superAdminRole.id,
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      cart: { create: {} },
      wishlist: { create: {} },
    },
  });

  console.log('Seeding sample catalog data...');
  const electronics = await prisma.category.upsert({
    where: { slug: 'electronics' },
    update: {},
    create: { name: 'Electronics', slug: 'electronics', status: 'ACTIVE', displayOrder: 1 },
  });
  const apparel = await prisma.category.upsert({
    where: { slug: 'apparel' },
    update: {},
    create: { name: 'Apparel', slug: 'apparel', status: 'ACTIVE', displayOrder: 2 },
  });

  const acme = await prisma.brand.upsert({
    where: { slug: 'acme' },
    update: {},
    create: { name: 'Acme', slug: 'acme', status: 'ACTIVE' },
  });

  const sampleProducts = [
    {
      name: 'Wireless Headphones',
      sku: 'ELEC-WH-001',
      price: 79.99,
      discountPrice: 59.99,
      categoryId: electronics.id,
      brandId: acme.id,
      description: 'Over-ear wireless headphones with noise cancellation.',
      stock: 50,
    },
    {
      name: 'Smart Watch',
      sku: 'ELEC-SW-002',
      price: 149.99,
      categoryId: electronics.id,
      brandId: acme.id,
      description: 'Fitness tracking smart watch with heart rate monitor.',
      stock: 30,
    },
    {
      name: 'Classic T-Shirt',
      sku: 'APP-TS-001',
      price: 19.99,
      categoryId: apparel.id,
      brandId: acme.id,
      description: '100% cotton classic fit t-shirt.',
      stock: 100,
    },
  ];

  for (const p of sampleProducts) {
    const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existing = await prisma.product.findUnique({ where: { slug } });
    if (existing) continue;
    await prisma.product.create({
      data: {
        name: p.name,
        slug,
        sku: p.sku,
        price: p.price,
        discountPrice: p.discountPrice,
        description: p.description,
        status: 'PUBLISHED',
        categoryId: p.categoryId,
        brandId: p.brandId,
        images: {
          create: [{ url: `https://placehold.co/600x600?text=${encodeURIComponent(p.name)}`, isPrimary: true }],
        },
        inventory: { create: { quantity: p.stock, lowStockThreshold: 5 } },
      },
    });
  }

  console.log('Seed complete.');
  console.log(`Super admin login: ${adminEmail} / ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
