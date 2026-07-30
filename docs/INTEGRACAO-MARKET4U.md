# Integração com a market4u — avaliação (fase 2)

Objetivo: ao se cadastrar como cliente market4u durante a inauguração, a
pessoa entraria automaticamente no sorteio (e vice-versa).

## O que sabemos hoje (avaliado em 30/07/2026)

- O cadastro de clientes da market4u acontece **exclusivamente pelo app
  oficial** (Android/iOS): a pessoa baixa o app, preenche os dados, cadastra
  cartão e seleciona o ponto de venda.
- A plataforma da market4u é **proprietária e desenvolvida internamente**
  (gestão de vendas, estoque, clientes, dashboards). **Não há API pública nem
  documentação de integração** divulgada no site ou em canais para
  desenvolvedores.
- Conclusão: integração direta (fase 2) **depende de parceria com a
  franqueadora** — não há caminho técnico aberto hoje.

## Decisão de fase 1 (implementada)

Cadastros separados:

1. O visitante se cadastra no sorteio pelo **modo tablet** (`/evento/[id]`):
   nome, WhatsApp e apartamento. Deduplicação por WhatsApp no mesmo sorteio.
2. O incentivo para baixar o app market4u fica por conta do material do evento
   (banner/QR code impresso) e da equipe presente.

## Caminhos possíveis para a fase 2 (em ordem de preferência)

1. **Parceria oficial com a franqueadora** — solicitar acesso à API interna de
   cadastro (o franqueado tem canal direto com o suporte/expansão). Pontos a
   levantar: existe endpoint de criação de cliente? Webhook de novo cadastro
   por ponto de venda? Autenticação por franqueado?
2. **QR code no fluxo do tablet** — na tela de sucesso do sorteio, exibir QR
   code para baixar o app market4u (deep link da loja). Sem API, é integração
   "suave": não vincula os cadastros, mas encadeia as duas ações no evento.
   Custo baixo; pode entrar já na fase 1.5.
3. **Conciliação manual assistida** — exportar os participantes (nome +
   WhatsApp) e cruzar com o relatório de novos clientes do painel do
   franqueado no período do evento. Sem automação, mas mede a conversão
   evento → cliente.

## Dados que já coletamos pensando na fase 2

- WhatsApp normalizado (dedupe por dígitos) — provável chave de cruzamento
  com a base market4u.
- Data/hora do cadastro (`Participante.criadoEm`) — permite recortar o
  período do evento.

Fontes da avaliação:
- https://market4u.com.br/blog/tudo-sobre-o-market4u/
- https://market4u.com.br/blog/como-funciona-o-market4u-em-empresas-entenda-o-passo-a-passo/
- https://market4u.com.br/blog/como-e-o-suporte-ao-franqueado-do-market4u/
