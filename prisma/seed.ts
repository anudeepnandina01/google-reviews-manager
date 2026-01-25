import { prisma } from "@/lib/prisma";

async function main() {
  console.log("Database seeding...");

  // Clean up existing data
  await prisma.notification.deleteMany();
  await prisma.aiReply.deleteMany();
  await prisma.review.deleteMany();
  await prisma.location.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.business.deleteMany();
  await prisma.auditLog.deleteMany();

  console.log("Database seeded successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
