const { PrismaClient, ProductAvailability, ProductStatus, UserRole } = require('@prisma/client');
const { randomBytes, scryptSync } = require('node:crypto');
const { existsSync } = require('node:fs');

if (existsSync('.env')) process.loadEnvFile();

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = randomBytes(16).toString('base64url');
  const derivedKey = scryptSync(password, salt, 64);

  return `scrypt$${salt}$${derivedKey.toString('base64url')}`;
}

async function upsertCategory(name, slug) {
  return prisma.category.upsert({
    where: { slug },
    update: { name },
    create: { name, slug }
  });
}

async function upsertProduct(product) {
  return prisma.product.upsert({
    where: { slug: product.slug },
    update: {
      categoryId: product.categoryId,
      name: product.name,
      description: product.description,
      studio: product.studio,
      status: ProductStatus.ACTIVE,
      availability: product.availability,
      basePrice: product.basePrice,
      compareAtPrice: product.compareAtPrice ?? null
    },
    create: {
      categoryId: product.categoryId,
      name: product.name,
      slug: product.slug,
      description: product.description,
      studio: product.studio,
      status: ProductStatus.ACTIVE,
      availability: product.availability,
      basePrice: product.basePrice,
      compareAtPrice: product.compareAtPrice ?? null,
      variants: {
        create: [
          {
            name: 'Mặc định',
            price: product.basePrice,
            isActive: true
          }
        ]
      }
    }
  });
}

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@hanbotorder.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const customerEmail = process.env.SEED_CUSTOMER_EMAIL || 'customer@hanbotorder.local';
  const customerPassword = process.env.SEED_CUSTOMER_PASSWORD;

  if (!adminPassword || !customerPassword) {
    throw new Error('SEED_ADMIN_PASSWORD and SEED_CUSTOMER_PASSWORD are required');
  }

  const adminPasswordHash = hashPassword(adminPassword);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: UserRole.ADMIN,
      passwordHash: adminPasswordHash,
      status: 'ACTIVE'
    },
    create: {
      email: adminEmail,
      passwordHash: adminPasswordHash,
      name: 'Quản trị Hanbotorder',
      role: UserRole.ADMIN
    }
  });

  const customerPasswordHash = hashPassword(customerPassword);
  await prisma.user.upsert({
    where: { email: customerEmail },
    update: {
      passwordHash: customerPasswordHash,
      name: 'Khách hàng E2E',
      role: UserRole.CUSTOMER,
      status: 'ACTIVE'
    },
    create: {
      email: customerEmail,
      passwordHash: customerPasswordHash,
      name: 'Khách hàng E2E',
      role: UserRole.CUSTOMER
    }
  });

  const statue = await upsertCategory('Tượng', 'statue');
  const figure = await upsertCategory('Figure', 'figure');
  const sale = await upsertCategory('Giảm giá', 'sale');
  const bust = await upsertCategory('Bust', 'bust');

  await upsertProduct({
    categoryId: statue.id,
    name: 'Mẫu tượng đặt trước',
    slug: 'resin-statue-pre-order-sample',
    studio: 'Hanbot Studio',
    description: 'Tượng sưu tầm đặt trước, có thời gian sản xuất dự kiến và hỗ trợ đặt cọc khi thanh toán.',
    availability: ProductAvailability.PRE_ORDER,
    basePrice: '2450000'
  });

  await upsertProduct({
    categoryId: figure.id,
    name: 'Figure giới hạn có sẵn',
    slug: 'limited-figure-in-stock',
    studio: 'Collector Line',
    description: 'Figure sưu tầm có sẵn, số lượng cố định và xác nhận đơn nhanh.',
    availability: ProductAvailability.IN_STOCK,
    basePrice: '1250000'
  });

  await upsertProduct({
    categoryId: sale.id,
    name: 'Figure scale đang giảm giá',
    slug: 'scale-figure-sale-item',
    studio: 'Figure Select',
    description: 'Sản phẩm giảm giá cho collector muốn nhận hàng sớm.',
    availability: ProductAvailability.SALE,
    basePrice: '890000',
    compareAtPrice: '1120000'
  });

  await upsertProduct({
    categoryId: bust.id,
    name: 'Bust cao cấp đặt theo đơn',
    slug: 'premium-pre-order-bust',
    studio: 'Sculpt Reserve',
    description: 'Bust sản xuất theo đơn với slot giới hạn và shop xác nhận trước khi làm.',
    availability: ProductAvailability.ORDER,
    basePrice: '1780000'
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
