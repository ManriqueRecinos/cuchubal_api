-- CreateTable
CREATE TABLE "Admin" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cuchubal" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "monto_cuota" DECIMAL(10,2) NOT NULL DEFAULT 20.00,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "admin_id" INTEGER NOT NULL,

    CONSTRAINT "Cuchubal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participante" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "cuchubal_id" INTEGER NOT NULL,

    CONSTRAINT "Participante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pago" (
    "id" SERIAL NOT NULL,
    "participante_id" INTEGER NOT NULL,
    "cuchubal_id" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "quincena" TEXT NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "fecha_pago" TIMESTAMP(3) NOT NULL,
    "registrado_por" INTEGER NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pago_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- AddForeignKey
ALTER TABLE "Cuchubal" ADD CONSTRAINT "Cuchubal_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participante" ADD CONSTRAINT "Participante_cuchubal_id_fkey" FOREIGN KEY ("cuchubal_id") REFERENCES "Cuchubal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_participante_id_fkey" FOREIGN KEY ("participante_id") REFERENCES "Participante"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_cuchubal_id_fkey" FOREIGN KEY ("cuchubal_id") REFERENCES "Cuchubal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_registrado_por_fkey" FOREIGN KEY ("registrado_por") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
