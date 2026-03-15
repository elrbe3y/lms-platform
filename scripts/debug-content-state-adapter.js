require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

async function main() {
  console.log('DEBUG_SCRIPT_START');
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  console.log('HAS_DATABASE_URL', Boolean(process.env.DATABASE_URL));

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log('QUERYING_DB');
    const courses = await prisma.course.findMany({
      select: { id: true, title: true, isPublished: true, targetGrade: true, price: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const honorActive = await prisma.honorBoardEntry.count({ where: { isActive: true } });
    const pinnedParts = await prisma.lessonPart.count({ where: { isPinned: true } });

    console.log('COURSES_COUNT', courses.length);
    console.log('COURSE_TITLES', courses.map((course) => course.title).join(' | '));
    console.log('HAS_الكورس_الاول', courses.some((course) => course.title.includes('الكورس الاول')));
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
