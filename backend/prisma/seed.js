const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';

  console.log(`Seeding Admin account: "${username}"...`);

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Upsert the Admin account so it creates it or keeps it updated
  const admin = await prisma.user.upsert({
    where: { username },
    update: {
      passwordHash,
      role: 'ADMIN',
      isActive: true
    },
    create: {
      username,
      passwordHash,
      role: 'ADMIN',
      isActive: true
    }
  });

  console.log('Seed completed successfully. Admin account seeded:', {
    id: admin.id,
    username: admin.username,
    role: admin.role
  });
}

main()
  .catch((e) => {
    console.error('Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
