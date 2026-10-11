import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ADMIN_EMAIL = "admin@alquileresanita.com.ar";
const ADMIN_PASSWORD = "admin123"; // Change after first login.

async function main() {
  const existing = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
  });

  if (existing) {
    console.log(`Seed skipped: user ${ADMIN_EMAIL} already exists.`);
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const admin = await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      name: "Administrador",
      passwordHash,
      role: Role.ADMIN,
    },
  });

  console.log(`Created admin user: ${admin.email} (${admin.role})`);
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
