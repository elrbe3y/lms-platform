const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

(async function main() {
  const courses = await prisma.course.findMany({
    select: { id: true, title: true, isPublished: true, targetGrade: true, price: true },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });

  const honorActive = await prisma.honorBoardEntry.count({ where: { isActive: true } });
  const pinnedParts = await prisma.lessonPart.count({ where: { isPinned: true } });

  console.log('COURSES_COUNT', courses.length);
  console.log('COURSE_TITLES', courses.map((course) => course.title).join(' | '));
  console.log('HONOR_ACTIVE', honorActive);
  console.log('PINNED_PARTS', pinnedParts);

  await prisma.$disconnect();
})().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
