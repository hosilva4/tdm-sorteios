-- AlterTable
ALTER TABLE "Assinatura" ADD COLUMN "cartaoBandeira" TEXT;
ALTER TABLE "Assinatura" ADD COLUMN "cartaoUltimos4" TEXT;

-- CreateTable
CREATE TABLE "Config" (
    "chave" TEXT NOT NULL PRIMARY KEY,
    "valor" TEXT NOT NULL
);
