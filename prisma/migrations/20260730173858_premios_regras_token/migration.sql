/*
  Warnings:

  - The required column `tokenPublico` was added to the `Sorteio` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- CreateTable
CREATE TABLE "Premio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sorteioId" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL DEFAULT '',
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "Premio_sorteioId_fkey" FOREIGN KEY ("sorteioId") REFERENCES "Sorteio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Participante" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sorteioId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "grupo" TEXT NOT NULL DEFAULT '',
    "telefone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "aceitouLgpd" BOOLEAN NOT NULL DEFAULT false,
    "declarouMaiorIdade" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Participante_sorteioId_fkey" FOREIGN KEY ("sorteioId") REFERENCES "Sorteio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Participante" ("criadoEm", "email", "grupo", "id", "nome", "sorteioId", "telefone") SELECT "criadoEm", "email", "grupo", "id", "nome", "sorteioId", "telefone" FROM "Participante";
DROP TABLE "Participante";
ALTER TABLE "new_Participante" RENAME TO "Participante";
CREATE TABLE "new_Sorteio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuarioId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipoPredio" TEXT NOT NULL DEFAULT 'residencial',
    "pago" BOOLEAN NOT NULL DEFAULT false,
    "umaChancePorGrupo" BOOLEAN NOT NULL DEFAULT false,
    "regraLgpd" BOOLEAN NOT NULL DEFAULT false,
    "regraMaiorIdade" BOOLEAN NOT NULL DEFAULT false,
    "tokenPublico" TEXT NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Sorteio_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- Sorteios existentes ganham um token aleatório gerado pelo próprio SQLite.
INSERT INTO "new_Sorteio" ("criadoEm", "id", "nome", "pago", "tipoPredio", "umaChancePorGrupo", "usuarioId", "tokenPublico") SELECT "criadoEm", "id", "nome", "pago", "tipoPredio", "umaChancePorGrupo", "usuarioId", lower(hex(randomblob(16))) FROM "Sorteio";
DROP TABLE "Sorteio";
ALTER TABLE "new_Sorteio" RENAME TO "Sorteio";
CREATE UNIQUE INDEX "Sorteio_tokenPublico_key" ON "Sorteio"("tokenPublico");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Premio_sorteioId_ordem_key" ON "Premio"("sorteioId", "ordem");
