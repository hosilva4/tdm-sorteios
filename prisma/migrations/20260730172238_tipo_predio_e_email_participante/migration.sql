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
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Participante_sorteioId_fkey" FOREIGN KEY ("sorteioId") REFERENCES "Sorteio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Participante" ("criadoEm", "grupo", "id", "nome", "sorteioId", "telefone") SELECT "criadoEm", "grupo", "id", "nome", "sorteioId", "telefone" FROM "Participante";
DROP TABLE "Participante";
ALTER TABLE "new_Participante" RENAME TO "Participante";
CREATE TABLE "new_Sorteio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuarioId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipoPredio" TEXT NOT NULL DEFAULT 'residencial',
    "pago" BOOLEAN NOT NULL DEFAULT false,
    "umaChancePorGrupo" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Sorteio_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Sorteio" ("criadoEm", "id", "nome", "pago", "umaChancePorGrupo", "usuarioId") SELECT "criadoEm", "id", "nome", "pago", "umaChancePorGrupo", "usuarioId" FROM "Sorteio";
DROP TABLE "Sorteio";
ALTER TABLE "new_Sorteio" RENAME TO "Sorteio";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
