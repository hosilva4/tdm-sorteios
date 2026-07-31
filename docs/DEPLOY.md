# Deploy do TDM Sorteios (primeira versão)

Arquitetura de produção: **Vercel** (hospedagem Next.js) + **Neon**
(PostgreSQL gerenciado) + **PagBank** (pagamentos) + domínio próprio.

O deploy é contínuo: todo merge de pull request na branch **`main`** do
repositório `TDM4U/sorteio4u` publica automaticamente a nova versão em
produção; todo pull request aberto ganha um **preview** com URL própria.

## 1. Banco de dados (Supabase)

1. Crie a conta em https://supabase.com (pode entrar com o GitHub; o plano
   free não pede cartão).
2. **New project**: nome `sorteio4u`, região **South America (São Paulo)**,
   defina uma senha forte para o banco e guarde-a.
3. Com o projeto criado, clique em **Connect** (topo do painel) e copie as
   duas connection strings da aba ORMs/Prisma:
   - **Transaction pooler** (porta `6543`): será o `DATABASE_URL`. Acrescente
     `?pgbouncer=true&connection_limit=1` ao final se ainda não vier.
   - **Session pooler ou Direct connection** (porta `5432`): será o
     `DIRECT_URL`, usado apenas pelas migrações no deploy.
4. Substitua `[YOUR-PASSWORD]` nas duas strings pela senha do passo 2.
5. Na Vercel, cadastre **as duas** variáveis (`DATABASE_URL` e
   `DIRECT_URL`). As migrações são aplicadas automaticamente no deploy (o
   script `vercel-build` roda `prisma migrate deploy` antes do build).

Por que duas strings: em serverless o app precisa do **pooler** (muitas
conexões curtas), mas migrações precisam de **conexão direta**; o schema do
Prisma já está configurado com `url` + `directUrl` para isso.

Alternativas gratuitas, se preferir: Prisma Postgres (prisma.io, integra
pela marketplace da Vercel) ou Neon. Em dev local nada muda:
`docker compose up -d` (Postgres em
`postgresql://tdm:tdm@localhost:5432/tdm_sorteios`, com `DIRECT_URL` igual).

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
   | `DATABASE_URL` | pooler de transação do Supabase (porta 6543, `?pgbouncer=true`) |
   | `DIRECT_URL` | conexão direta/sessão do Supabase (porta 5432) |
   | `AUTH_SECRET` | gere um novo: `openssl rand -base64 32` (nunca reuse o de dev) |
   | `NEXT_PUBLIC_URL` | `https://sorteio4u.com.br` (sem barra no final) |
   | `PAGBANK_ENV` | `sandbox` até validar o fluxo; depois `production` |
   | `PAGBANK_TOKEN` | token da conta PagBank (sandbox e produção têm tokens distintos) |
   | `NEXT_PUBLIC_PAGBANK_PUBLIC_KEY` | só em sandbox: a chave pública padrão do ambiente. Em produção, deixe sem valor: o app gera/consulta a chave via API com o token e guarda na tabela `Config` |
   | `CRON_SECRET` | segredo do cron de renovação das assinaturas (gere com `openssl rand -base64 32`); a Vercel envia automaticamente nas execuções agendadas |

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
4. Atualize `NEXT_PUBLIC_URL` na Vercel para `https://sorteio4u.com.br` e faça um
   **Redeploy** (a variável é usada nos QR Codes do evento e no webhook).

## 4. PagBank em produção

1. Com o site no ar, cadastre a URL de notificação na conta PagBank
   (pedidos e assinaturas): `https://sorteio4u.com.br/api/webhooks/pagbank`.
2. Valide primeiro em `PAGBANK_ENV=sandbox`: compra avulsa via PIX,
   assinatura no cartão, renovação, suspensão e cancelamento.
3. Troque para `PAGBANK_ENV=production` com o token e a chave pública de
   produção e refaça um teste real de ponta a ponta.

**Como a assinatura funciona** (Orders API com recorrência, ver
`src/lib/pagbank.ts`): ao assinar, o app cobra o primeiro mês na hora
(`recurring: INITIAL`, cartão criptografado no navegador) e o PagBank
devolve um cartão armazenado (`CARD_...`). As renovações mensais são
disparadas pelo cron da Vercel (`vercel.json` → `/api/cron/renovacoes`,
diário ao meio-dia UTC), que cobra o cartão armazenado
(`recurring: SUBSEQUENT`) nas assinaturas vencidas; recusa suspende a
assinatura e o franqueado reativa com um novo cartão. O cron exige a env
`CRON_SECRET`. O webhook cobre a confirmação dos pedidos (PIX e cartão).

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

- [ ] Projeto Supabase criado; `DATABASE_URL` e `DIRECT_URL` na Vercel.
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
# .env: DATABASE_URL e DIRECT_URL = "postgresql://tdm:tdm@localhost:5432/tdm_sorteios"
npm run db:migrate            # aplica migrações (e roda o seed)
npm run dev
```

Sem Docker, crie um segundo projeto free no Supabase só para dev e use as
connection strings dele no `.env`.

## 8. Segurança do token PagBank (e demais segredos)

Como o token é protegido contra captura:

- **Nunca chega ao navegador.** `PAGBANK_TOKEN` não tem o prefixo
  `NEXT_PUBLIC_`, então o Next.js não o inclui em nenhum bundle enviado ao
  cliente. Reforço: `src/lib/pagbank.ts` importa `server-only`, o que faz o
  **build falhar** se algum componente cliente tentar importar o módulo.
- **Nenhuma API expõe o valor.** Não existe endpoint ou server action que
  leia e devolva variáveis de ambiente; as mensagens de erro ao usuário são
  genéricas e os logs do servidor não registram o token (só respostas da
  API PagBank, que não o contêm).
- **Em repouso:** o token vive apenas nas Environment Variables da Vercel
  (criptografadas) e no `.env` local, que está no `.gitignore` e nunca foi
  commitado. No repositório só existe `.env.example` com placeholders.
- **Em trânsito:** toda chamada à API PagBank sai do servidor via HTTPS, e
  o site força HTTPS no navegador com HSTS (2 anos, preload).
- **Cabeçalhos de segurança** (`next.config.ts`): HSTS,
  `X-Frame-Options: DENY` + `frame-ancestors 'none'` (anti-clickjacking),
  `nosniff`, `Referrer-Policy` e `Permissions-Policy` restritos,
  `X-Powered-By` removido.
- **O que o navegador usa é outra chave:** o formulário de cartão usa a
  `NEXT_PUBLIC_PAGBANK_PUBLIC_KEY`, que é **pública por design** (serve só
  para criptografar o cartão no dispositivo do cliente; não autoriza nada).
- **Webhook não confia em ninguém:** `/api/webhooks/pagbank` ignora o corpo
  recebido e reconsulta a API oficial antes de alterar o banco; um atacante
  que chame o webhook não consegue creditar nada nem extrair informação.

Cuidados operacionais:

1. Cadastre o token **direto na Vercel** (Production), sem colar em chats,
   commits ou arquivos versionados.
2. Use tokens distintos para sandbox e produção.
3. Se houver qualquer suspeita de vazamento, **revogue e gere outro** no
   painel PagBank e atualize a variável na Vercel (Redeploy aplica).
4. Restrinja quem tem acesso ao projeto na Vercel e à organização TDM4U no
   GitHub (2FA obrigatório é recomendado).
