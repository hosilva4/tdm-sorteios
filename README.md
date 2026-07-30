# Sorteio4U

Sorteios para inaugurações de mercados autônomos, feito para franqueados
market4u. O visitante se cadastra sozinho num tablet (ou pelo próprio
celular, via QR Code) durante o evento, e o responsável sorteia os prêmios
na hora, com transparência total para o condomínio.

**Produção:** https://sorteio4u.com.br

## Como funciona

1. **Crie o sorteio** num wizard de 3 passos: tipo de edifício (residencial
   ou comercial), prêmios (cupom, voucher, brinde ou outro, com quantidade e
   ordem de sorteio) e regras (uma chance por apartamento/setor,
   consentimento LGPD, maiores de 18).
2. **No evento**, o modo tablet fica na bancada: o visitante baixa o app
   market4u pelos QR Codes, preenche nome, WhatsApp, apartamento/setor e
   e-mail. Um telão público (com QR de cadastro) projeta tudo em tempo real.
3. **Sorteie**: aleatoriedade criptográfica, sem repetir ganhador, com o
   prêmio de cada posição definido de antemão. Ganhadores podem ser avisados
   por WhatsApp com um clique.
4. **Ao concluir**, o sorteio trava como prova do evento e gera um quadro
   resumo (imprimível/PDF ou texto para WhatsApp) para enviar ao condomínio.

Monetização: sorteio avulso (PIX) ou assinatura mensal ilimitada (cartão,
renovação automática), via PagBank.

## Stack

- [Next.js 15](https://nextjs.org) (App Router, Server Actions) + React 19
- [Prisma](https://prisma.io) + PostgreSQL
- Autenticação por cookie JWT (`jose` + `bcryptjs`)
- Pagamentos: PagBank (Orders API para PIX, API de Assinaturas para o plano
  mensal, cartão criptografado no navegador)
- Testes de domínio com [Vitest](https://vitest.dev)

## Rodando localmente

Pré-requisitos: Node 22+, Docker (para o Postgres local).

```sh
git clone https://github.com/TDM4U/sorteio4u.git
cd sorteio4u
npm install
cp .env.example .env        # ajuste se necessário
docker compose up -d        # Postgres local
npm run db:migrate          # migrações + seed de teste
npm run dev                 # http://localhost:3000
```

O seed cria o usuário de teste `teste@tdm.com.br` (senha `teste1234`, 3
créditos) com dois sorteios prontos, um residencial e um comercial.

Sem `PAGBANK_TOKEN`, o app funciona normalmente e apenas as compras ficam
indisponíveis com um aviso.

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento |
| `npm test` | testes de domínio (Vitest) |
| `npm run build` | build de produção |
| `npm run db:migrate` | cria/aplica migrações em dev (roda o seed) |
| `npm run db:seed` | popula os dados de teste |
| `npm run db:studio` | Prisma Studio |

## Estrutura

```
src/
  dominio/       lógica pura e testada (sorteio, prêmios, telefone)
  lib/           infraestrutura server-only (db, sessão, PagBank, conciliação)
  componentes/   componentes compartilhados
  app/           rotas (App Router)
    (publico)/   landing, entrar, cadastro
    app/         área logada (sorteios, wizard, perfil, compras)
    evento/      modo tablet do evento (sem menu)
    participar/  autocadastro público via QR (token)
    telao/       telão público de projeção (token)
    api/webhooks/pagbank/  confirmação de pagamentos
```

## Deploy e contribuição

- Deploy contínuo: merge de pull request na `main` publica em produção
  (Vercel); cada PR ganha uma URL de preview e roda o CI (testes + build).
- Passo a passo completo de infraestrutura, domínio, PagBank e segurança:
  [docs/DEPLOY.md](docs/DEPLOY.md).
- Avaliação da integração com a market4u:
  [docs/INTEGRACAO-MARKET4U.md](docs/INTEGRACAO-MARKET4U.md).
