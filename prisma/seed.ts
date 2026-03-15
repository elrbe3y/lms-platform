/**
 * 🌱 Seed Database - بيانات تجريبية
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 بدء تجهيز بيانات النظام...');

  // حذف أي بيانات وهمية قديمة
  await prisma.codeUsage.deleteMany({
    where: {
      OR: [
        { code: { code: 'TEST-CODE-0001' } },
        { code: { code: 'TEST-CODE-0002' } },
      ],
    },
  });

  await prisma.code.deleteMany({
    where: {
      code: { in: ['TEST-CODE-0001', 'TEST-CODE-0002'] },
    },
  });

  await prisma.enrollment.deleteMany({
    where: {
      user: { email: 'student@example.com' },
    },
  });

  await prisma.user.deleteMany({
    where: {
      email: {
        in: ['student@example.com', 'testuser@example.com', 'testuser2@example.com', 'testuser3@example.com'],
      },
    },
  });

  await prisma.course.deleteMany({
    where: { id: 'physics-3rd-grade' },
  });

  // 1. إنشاء حساب الأدمن
  const adminPassword = await bcrypt.hash('admin123456', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@mohamed-rabiei.com' },
    update: {},
    create: {
      fullName: 'محمد الربيعي',
      email: 'admin@mohamed-rabiei.com',
      phone: '01000000000',
      password: adminPassword,
      schoolName: 'إدارة المنصة',
      grade: 'N/A',
      address: 'القاهرة، مصر',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });
  console.log('✅ تم إنشاء حساب الأدمن:', admin.email);

  console.log('\n🎉 تم الانتهاء من تجهيز البيانات الأساسية!');
  console.log('\n📋 معلومات الدخول:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👑 الأدمن:');
  console.log('   البريد: admin@mohamed-rabiei.com');
  console.log('   كلمة المرور: admin123456');
  console.log('');
  console.log('✅ تم حذف الحسابات والبيانات الوهمية المعروفة.');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => {
    console.error('❌ خطأ:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
