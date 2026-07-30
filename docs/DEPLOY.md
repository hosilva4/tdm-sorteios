# Deploy do TDM Sorteios (primeira versão)

Arquitetura de produção: **Vercel** (hospedagem Next.js) + **Neon**
(PostgreSQL gerenciado) + **PagBank** (pagamentos) + domínio próprio.

O deploy é contínuo: todo merge de pull request na branch **`main`** do
repositório `TDM4U/sorteio4u` publica automaticamente a nova versão em
produção; todo pull request aberto ganha um **preview** com URL própria.

## 1. Banco de dados (Neon)

1. Crie uma conta em https://neon.tech (plano free atende o início).
2. Crie o projeto `tdm-sorteios` na região `sa-east-1` (São Paulo, menor
   latência) e copie a **connection string** com pooling
   (`postgresql://...-pooler.../neondb?sslmode=require`).
3. Guarde a string: ela será o `DATABASE_URL` na Vercel. As migrações são
   aplicadas automaticamente no deploy (o script `vercel-build` roda
   `prisma migrate deploy` antes do build).

Dica: crie um **branch** de banco no Neon chamado `dev` e use a connection
string dele no seu `.env` local, mantendo produção isolada. Alternativa
local sem internet: `docker compose up -d` (Postgres em
`postgresql://tdm:tdm@localhost:5432/tdm_sorteios`).

## 2. Vercel (hospedagem + deploy contínuo)

1. Crie a conta em https://vercel.com com o login **da organização TDM4U**
   no GitHub (ou conecte a organização depois em Settings → Git).
2. **Add New → Project → Import** e escolha o repositório
   `TDM4U/sorteio4u`. A Vercel detecta Next.js e usa o script
   `vercel-build` do package.json automaticamente (gera o client, aplica as
   migrações e builda).
3. Antes do primeiro deploy, configure as **Environment Variables**
   (Production; repita em Preview se quiser previews funcionais):

   | Variável | Valor |
   | --- | --- |
   | `DATABASE_URL` | connection string do Neon (com pooling) |
   | `AUTH_SECRET` | gere um novo: `openssl rand -base64 32` (nunca reuse o de dev) |
   | `NEXT_PUBLIC_URL` | `https://SEU-DOMINIO` (sem barra no final) |
   | `PAGBANK_ENV` | `sandbox` até validar o fluxo; depois `production` |
   | `PAGBANK_TOKEN` | token da conta PagBank |
   | `NEXT_PUBLIC_PAGBANK_PUBLIC_KEY` | chave pública do PagBank |

4. Clique em **Deploy**. Ao final, o site sobe em
   `https://sorteio4u.vercel.app` (URL provisória).
5. Deploy contínuo: já está ativo por padrão. **Production Branch = `main`**
   (confira em Settings → Git). A partir daqui: merge de PR em `main` →
   produção; push em qualquer outra branch/PR → preview.

## 3. Domínio próprio

1. Na Vercel: **Settings → Domains → Add** e informe o domínio comprado
   (ex.: `sorteio4u.com.br`). Adicione também o `www` (a Vercel oferece o
   redirect de um para o outro).
2. No painel do registrador (Registro.br, GoDaddy etc.), crie os registros
   DNS que a Vercel indicar:
   - Apex (`sorteio4u.com.br`): registro **A** → `76.76.21.21`
   - `www`: registro **CNAME** → `cname.vercel-dns.com`
   (Se o DNS ficar hospedado na própria Vercel, basta trocar os
   nameservers que ela mostrar.)
3. Aguarde a propagação (minutos a algumas horas). O certificado HTTPS é
   emitido automaticamente.
4. Atualize `NEXT_PUBLIC_URL` na Vercel para `https://SEU-DOMINIO` e faça um
   **Redeploy** (a variável é usada nos QR Codes do evento e no webhook).

## 4. PagBank em produção

1. Com o site no ar, cadastre a URL de notificação na conta PagBank
   (pedidos e assinaturas): `https://SEU-DOMINIO/api/webhooks/pagbank`.
2. Valide primeiro em `PAGBANK_ENV=sandbox`: compra avulsa via PIX,
   assinatura no cartão, renovação, suspensão e cancelamento.
3. Troque para `PAGBANK_ENV=production` com o token e a chave pública de
   produção e refaça um teste real de ponta a ponta.

Detalhes da integração (endpoints, conciliação, plano mensal): ver o
código em `src/lib/pagbank.ts` e `src/lib/conciliacao.ts`. Se
`PRECO_ASSINATURA_CENTAVOS` mudar, apague a linha
`pagbank_plano_mensal_id` da tabela `Config` para o app criar um plano
novo.

## 5. Fluxo de trabalho no GitHub

- **Branch de produção:** `main`. Não commite direto nela; abra pull
  requests.
- **CI:** o workflow `.github/workflows/ci.yml` roda testes e build em todo
  pull request para `main` (e em pushes na `main`). Merge só com CI verde.
- **Preview:** a Vercel comenta em cada PR com a URL de preview para
  validar antes do merge.
- Recomendado (Settings → Branches → Add branch protection rule para
  `main`): exigir pull request, exigir o check `CI` verde e proibir force
  push.

## 6. Checklist do primeiro deploy

- [ ] Projeto Neon criado e `DATABASE_URL` na Vercel.
- [ ] `AUTH_SECRET` novo e exclusivo de produção.
- [ ] Primeiro deploy verde na URL `.vercel.app`.
- [ ] Domínio apontado e HTTPS ativo.
- [ ] `NEXT_PUBLIC_URL` com o domínio final + redeploy.
- [ ] Webhook PagBank cadastrado com o domínio final.
- [ ] Conta de teste criada em produção, sorteio de ponta a ponta no
  sandbox do PagBank.
- [ ] Proteção da branch `main` ativada no GitHub.

## 7. Ambiente local (depois da migração para Postgres)

O SQLite foi descontinuado; o dev local usa Postgres:

```sh
docker compose up -d          # sobe o Postgres local
# .env: DATABASE_URL="postgresql://tdm:tdm@localhost:5432/tdm_sorteios"
npm run db:migrate            # aplica migrações (e roda o seed)
npm run dev
```

Sem Docker, use a connection string do branch `dev` do Neon no `.env`.
