// Dados de teste: usuário demo + sorteio pré-existente com 20 participantes.
// Roda automaticamente após `prisma migrate dev` / `prisma migrate reset`,
// ou manualmente com `npx prisma db seed`. Idempotente: pode rodar de novo.

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const db = new PrismaClient();

const PARTICIPANTES = [
  { nome: "Ana Beatriz Souza", grupo: "Apto 101", telefone: "(41) 99811-2001", email: "ana.souza@email.com" },
  { nome: "Bruno Carvalho", grupo: "Apto 102", telefone: "(41) 99811-2002", email: "bruno.carvalho@email.com" },
  { nome: "Carla Mendes", grupo: "Apto 103", telefone: "(41) 99811-2003" },
  { nome: "Diego Ferreira", grupo: "Apto 104", telefone: "(41) 99811-2004" },
  { nome: "Elaine Prado", grupo: "Apto 201", telefone: "(41) 99811-2005", email: "elaine.prado@email.com" },
  { nome: "Felipe Rocha", grupo: "Apto 201", telefone: "(41) 99811-2006" },
  { nome: "Gabriela Lima", grupo: "Apto 202", telefone: "(41) 99811-2007" },
  { nome: "Henrique Alves", grupo: "Apto 203", telefone: "(41) 99811-2008" },
  { nome: "Isabela Martins", grupo: "Apto 204", telefone: "(41) 99811-2009" },
  { nome: "João Pedro Nunes", grupo: "Apto 301", telefone: "(41) 99811-2010" },
  { nome: "Karina Oliveira", grupo: "Apto 301", telefone: "(41) 99811-2011" },
  { nome: "Lucas Barbosa", grupo: "Apto 302", telefone: "(41) 99811-2012" },
  { nome: "Mariana Castro", grupo: "Apto 303", telefone: "(41) 99811-2013" },
  { nome: "Natália Ribeiro", grupo: "Apto 304", telefone: "(41) 99811-2014" },
  { nome: "Otávio Santana", grupo: "Bloco B 101", telefone: "(41) 99811-2015" },
  { nome: "Patrícia Gomes", grupo: "Bloco B 102", telefone: "(41) 99811-2016" },
  { nome: "Rafael Teixeira", grupo: "Bloco B 103", telefone: "(41) 99811-2017" },
  { nome: "Simone Duarte", grupo: "Bloco B 103", telefone: "(41) 99811-2018" },
  { nome: "Thiago Moraes", grupo: "Bloco B 104", telefone: "(41) 99811-2019" },
  { nome: "Vanessa Cardoso", grupo: "", telefone: "(41) 99811-2020", email: "vanessa.cardoso@email.com" },
];

// Sorteio comercial: o agrupador vira "Setor" na interface.
const PARTICIPANTES_COMERCIAL = [
  { nome: "Adriana Vasquez", grupo: "Financeiro", telefone: "(41) 99822-3001", email: "adriana@empresa.com.br" },
  { nome: "Caio Monteiro", grupo: "Financeiro", telefone: "(41) 99822-3002" },
  { nome: "Débora Pires", grupo: "RH", telefone: "(41) 99822-3003", email: "debora@empresa.com.br" },
  { nome: "Eduardo Sales", grupo: "Comercial", telefone: "(41) 99822-3004" },
  { nome: "Fernanda Torres", grupo: "Comercial", telefone: "(41) 99822-3005", email: "fernanda@empresa.com.br" },
  { nome: "Gustavo Reis", grupo: "TI", telefone: "(41) 99822-3006" },
  { nome: "Helena Costa", grupo: "Jurídico", telefone: "(41) 99822-3007" },
  { nome: "Igor Fontes", grupo: "", telefone: "(41) 99822-3008" },
];

async function main() {
  const usuario = await db.usuario.upsert({
    where: { email: "teste@tdm.com.br" },
    update: {},
    create: {
      email: "teste@tdm.com.br",
      nome: "Franqueado Teste",
      senhaHash: await bcrypt.hash("teste1234", 10),
      creditos: 3,
    },
  });

  const sorteios = [
    {
      nome: "Inauguração Condomínio Teste",
      tipoPredio: "residencial",
      regraLgpd: true,
      regraMaiorIdade: false,
      participantes: PARTICIPANTES,
      premios: [
        { ordem: 1, tipo: "voucher", descricao: "Voucher R$ 50 no market4u", quantidade: 3 },
        { ordem: 2, tipo: "brinde", descricao: "Kit de boas-vindas", quantidade: 1 },
      ],
    },
    {
      nome: "Inauguração Empresarial Teste",
      tipoPredio: "comercial",
      regraLgpd: true,
      regraMaiorIdade: true,
      participantes: PARTICIPANTES_COMERCIAL,
      premios: [
        { ordem: 1, tipo: "cupom", descricao: "Cupom de 20% na primeira compra", quantidade: 2 },
      ],
    },
  ];

  for (const s of sorteios) {
    const existente = await db.sorteio.findFirst({
      where: { usuarioId: usuario.id, nome: s.nome },
    });
    if (existente) {
      console.log(`Seed: "${s.nome}" já existe, pulando.`);
      continue;
    }
    const sorteio = await db.sorteio.create({
      data: {
        usuarioId: usuario.id,
        nome: s.nome,
        tipoPredio: s.tipoPredio,
        umaChancePorGrupo: false,
        regraLgpd: s.regraLgpd,
        regraMaiorIdade: s.regraMaiorIdade,
        premios: { create: s.premios },
      },
    });
    await db.participante.createMany({
      data: s.participantes.map((p) => ({ ...p, sorteioId: sorteio.id })),
    });
    console.log(
      `Seed: "${s.nome}" (${s.tipoPredio}) com ${s.participantes.length} participantes.`
    );
  }

  console.log("Seed: usuário teste@tdm.com.br (senha teste1234).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
