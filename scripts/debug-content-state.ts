import { prisma } from '../lib/db';

async function main() {
  const courses = await prisma.course.findMany({
    select: {
      id: true,
      title: true,
      isPublished: true,
      targetGrade: true,
      price: true,
    },
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
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
