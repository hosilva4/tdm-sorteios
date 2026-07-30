-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "creditos" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Assinatura" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuarioId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "pagbankId" TEXT,
    "proximaCobrancaEm" DATETIME,
    "criadaEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadaEm" DATETIME NOT NULL,
    CONSTRAINT "Assinatura_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Pagamento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuarioId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "valorCentavos" INTEGER NOT NULL,
    "metodo" TEXT,
    "pagbankOrderId" TEXT,
    "pagbankChargeId" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "Pagamento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Sorteio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuarioId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "pago" BOOLEAN NOT NULL DEFAULT false,
    "umaChancePorGrupo" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Sorteio_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Participante" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sorteioId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "grupo" TEXT NOT NULL DEFAULT '',
    "telefone" TEXT NOT NULL DEFAULT '',
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Participante_sorteioId_fkey" FOREIGN KEY ("sorteioId") REFERENCES "Sorteio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Ganhador" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sorteioId" TEXT NOT NULL,
    "participanteId" TEXT NOT NULL,
    "posicao" INTEGER NOT NULL,
    "tamanhoUrna" INTEGER NOT NULL,
    "sorteadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Ganhador_sorteioId_fkey" FOREIGN KEY ("sorteioId") REFERENCES "Sorteio" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Ganhador_participanteId_fkey" FOREIGN KEY ("participanteId") REFERENCES "Participante" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Assinatura_usuarioId_key" ON "Assinatura"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Assinatura_pagbankId_key" ON "Assinatura"("pagbankId");

-- CreateIndex
CREATE UNIQUE INDEX "Pagamento_pagbankOrderId_key" ON "Pagamento"("pagbankOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Pagamento_pagbankChargeId_key" ON "Pagamento"("pagbankChargeId");

-- CreateIndex
CREATE UNIQUE INDEX "Ganhador_participanteId_key" ON "Ganhador"("participanteId");

-- CreateIndex
CREATE UNIQUE INDEX "Ganhador_sorteioId_posicao_key" ON "Ganhador"("sorteioId", "posicao");
