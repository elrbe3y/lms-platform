require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const updated = await prisma.course.updateMany({
      where: { title: { contains: 'الكورس الاول' } },
      data: { isPublished: true, targetGrade: 'ALL' },
    });

    const courses = await prisma.course.findMany({
      where: { title: { contains: 'الكورس الاول' } },
      select: { id: true, title: true, isPublished: true, targetGrade: true, price: true },
    });

    const honorActive = await prisma.honorBoardEntry.count({ where: { isActive: true } });
    const pinnedParts = await prisma.lessonPart.count({ where: { isPinned: true } });

    console.log('UPDATED_COUNT', updated.count);
    console.log('COURSES', courses);
    console.log('HONOR_ACTIVE', honorActive);
    console.log('PINNED_PARTS', pinnedParts);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
