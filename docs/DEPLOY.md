# Deploy do TDM Sorteios

Guia para colocar o app em produção (Vercel + Postgres + PagBank).

## 1. Visão geral

- **Framework:** Next.js 15 (App Router, server actions).
- **Banco:** SQLite em desenvolvimento, PostgreSQL em produção.
- **Pagamentos:** PagBank (Orders API para sorteio avulso, Assinaturas para o
  plano mensal) — integração ainda pendente; ver §4.

## 2. Variáveis de ambiente

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DATABASE_URL` | sim | Conexão do banco (Postgres em produção). |
| `AUTH_SECRET` | sim | Segredo do token de sessão. Gere com `openssl rand -base64 32`. |
| `NEXT_PUBLIC_URL` | sim | URL pública do site (retornos de pagamento e webhooks). |
| `PAGBANK_ENV` | não | `sandbox` (padrão) ou `production`. |
| `PAGBANK_TOKEN` | não | Token da API do PagBank. Sem ele, os botões de compra apenas avisam que o pagamento não está configurado. |
| `NEXT_PUBLIC_PAGBANK_PUBLIC_KEY` | não | Chave pública para criptografar cartão no navegador (fluxo de assinatura). |

## 3. Banco de dados em produção

O schema usa SQLite em dev. Para produção:

1. Crie um Postgres (Neon, Vercel Postgres, Supabase…).
2. Em `prisma/schema.prisma`, troque o provider do datasource:

   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

3. Aponte `DATABASE_URL` para o Postgres e rode:

   ```sh
   npm run db:deploy   # prisma migrate deploy
   ```

   Observação: as migrações existentes foram geradas para SQLite. Na primeira
   configuração do Postgres, gere-as de novo a partir do schema
   (`prisma migrate dev --name init` apontando para um Postgres vazio) e
   versione o resultado.

## 4. PagBank (implementado)

Integração baseada em developer.pagbank.com.br/reference. Duas famílias de
endpoints (cliente em `src/lib/pagbank.ts`):

- **Orders API** (`{sandbox.}api.pagseguro.com/orders`): compra avulsa de
  crédito via PIX. A action `comprarAvulso` cria um `Pagamento` pendente e um
  pedido com QR Code (`reference_id` = id do pagamento). A confirmação chega
  pelo webhook ou pelo botão "Já paguei" (`conciliarPedidoAvulso`), que
  reconsulta o pedido e credita 1 sorteio de forma idempotente.
- **API de Assinaturas** (`{sandbox.}api.assinaturas.pagseguro.com`): plano
  mensal (criado uma única vez e guardado na tabela `Config`, chave
  `pagbank_plano_mensal_id`) + subscription com renovação automática mensal no
  cartão. O cartão é criptografado no navegador pelo SDK oficial
  (`NEXT_PUBLIC_PAGBANK_PUBLIC_KEY`); o servidor nunca vê o número. Status e
  validade (`next_invoice_at` → `Assinatura.proximaCobrancaEm`) são
  espelhados via webhook.

**Webhook:** `POST /api/webhooks/pagbank`. Cadastre essa URL nas preferências
de notificação da conta PagBank (pedidos e assinaturas). Autenticidade: o
handler ignora o corpo recebido, extrai apenas os ids (`ORDE_...`, `SUBS_...`)
e reconsulta a API oficial antes de alterar o banco.

**Configuração necessária:**

1. Crie a conta/aplicação no PagBank e gere o token (sandbox primeiro).
2. Preencha `PAGBANK_ENV`, `PAGBANK_TOKEN` e `NEXT_PUBLIC_PAGBANK_PUBLIC_KEY`.
3. Cadastre `NEXT_PUBLIC_URL + /api/webhooks/pagbank` como URL de notificação
   (pedidos e assinaturas). Em dev local, use um túnel (ngrok etc.) ou o botão
   "Já paguei" para conciliar manualmente.
4. Valide o fluxo completo em sandbox: PIX avulso, assinatura, renovação,
   suspensão por cobrança recusada e cancelamento.

Se `PRECO_ASSINATURA_CENTAVOS` mudar, apague a linha
`pagbank_plano_mensal_id` da tabela `Config` para o app criar um plano novo
(assinaturas antigas continuam no plano anterior).

## 5. Checklist de deploy

- [ ] `AUTH_SECRET` forte e exclusivo do ambiente.
- [ ] Provider do Prisma trocado para `postgresql` e migrações aplicadas.
- [ ] `NEXT_PUBLIC_URL` com a URL final (https).
- [ ] `npm run build` verde no CI (roda `prisma generate` antes do build).
- [ ] `npm test` verde (testes de domínio).
- [ ] PagBank em `sandbox` até validar o fluxo de ponta a ponta.
