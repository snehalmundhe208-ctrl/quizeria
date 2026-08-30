const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const teacherUsername = 'teacher@school.edu';
  const teacherPassword = 'password123';
  const studentEmail = 'student@school.edu';
  const studentPassword = 'password123';

  console.log(`Seeding Admin account: "${adminUsername}"...`);
  const adminHash = await bcrypt.hash(adminPassword, 10);
  const admin = await prisma.user.upsert({
    where: { username: adminUsername },
    update: {
      passwordHash: adminHash,
      role: 'ADMIN',
      isActive: true
    },
    create: {
      username: adminUsername,
      passwordHash: adminHash,
      role: 'ADMIN',
      isActive: true
    }
  });

  console.log(`Seeding Teacher account: "${teacherUsername}"...`);
  const teacherHash = await bcrypt.hash(teacherPassword, 10);
  const teacher = await prisma.user.upsert({
    where: { username: teacherUsername },
    update: {
      passwordHash: teacherHash,
      role: 'TEACHER',
      isActive: true
    },
    create: {
      username: teacherUsername,
      passwordHash: teacherHash,
      role: 'TEACHER',
      isActive: true
    }
  });

  console.log(`Seeding Student account: "${studentEmail}"...`);
  const studentHash = await bcrypt.hash(studentPassword, 10);
  const student = await prisma.student.upsert({
    where: { email: studentEmail },
    update: {
      name: 'Demo Student',
      passwordHash: studentHash
    },
    create: {
      name: 'Demo Student',
      email: studentEmail,
      passwordHash: studentHash
    }
  });

  console.log('Seed completed successfully. Accounts seeded:', {
    admin: admin.username,
    teacher: teacher.username,
    student: student.email
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
