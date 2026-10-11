import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";

const ADMIN_EMAIL = "admin@alquileresanita.com.ar";
const ADMIN_PASSWORD = "admin123"; // Change after first login.

export async function seed(prisma: PrismaClient) {
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

async function main() {
  const prisma = new PrismaClient();
  try {
    await seed(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

const isMainModule =
  process.argv.length > 1 &&
  path.resolve(fileURLToPath(import.meta.url)) ===
    path.resolve(process.argv[1]);

if (isMainModule) {
  main().catch(async (error) => {
    console.error(error);
    process.exit(1);
  });
}
