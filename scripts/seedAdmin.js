const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  const nombre = process.argv[4] || 'Admin';

  if (!email || !password) {
    console.error('Uso: node seedAdmin.js <email> <password> [nombre]');
    process.exit(1);
  }

  const existingAdmin = await prisma.admin.findUnique({ where: { email } });
  if (existingAdmin) {
    console.error('Error: Ya existe un administrador con este email.');
    process.exit(1);
  }

  const password_hash = await bcrypt.hash(password, 10);

  const admin = await prisma.admin.create({
    data: {
      email,
      password_hash,
      nombre,
    },
  });

  console.log(`Admin creado exitosamente con ID: ${admin.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
