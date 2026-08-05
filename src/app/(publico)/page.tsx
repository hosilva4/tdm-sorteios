import {
  ChatBubbleIcon,
  DesktopIcon,
  MagicWandIcon,
  MobileIcon,
  RocketIcon,
} from "@radix-ui/react-icons";
import { usuarioDaSessao } from "@/lib/sessao";
import HeroAurora from "@/components/HeroAurora";
import { BentoCard, BentoGrid } from "@/components/ui/bento-grid";
import {
  PRECO_ASSINATURA_CENTAVOS,
  PRECO_AVULSO_CENTAVOS,
  formatarReais,
} from "@/lib/precos";

const recursos = [
  {
    Icon: MobileIcon,
    name: "Modo tablet no evento",
    description:
      "Deixe o tablet na bancada: cada visitante se cadastra sozinho com nome, WhatsApp e apartamento. Sem papelzinho, sem fila, sem digitação depois.",
    href: "/cadastro",
    cta: "Preparar meu sorteio",
    background: null,
    className: "lg:col-start-2 lg:col-end-3 lg:row-start-1 lg:row-end-4",
  },
  {
    Icon: MagicWandIcon,
    name: "Sorteie na frente de todos",
    description:
      "Encerrou os cadastros? Sorteie os prêmios ali mesmo, com aleatoriedade criptográfica e sem repetir ganhador.",
    href: "/cadastro",
    cta: "Criar minha conta",
    background: null,
    className: "lg:col-start-1 lg:col-end-2 lg:row-start-1 lg:row-end-3",
  },
  {
    Icon: RocketIcon,
    name: "Pronto em um minuto",
    description:
      "Dê um nome, como “Inauguração Condomínio Solar”, abra o modo tablet e os cadastros já estão valendo.",
    href: "/cadastro",
    cta: "Começar agora",
    background: null,
    className: "lg:col-start-1 lg:col-end-2 lg:row-start-3 lg:row-end-4",
  },
  {
    Icon: DesktopIcon,
    name: "Telão ao vivo",
    description:
      "Projete o resultado em qualquer TV do salão: cada ganhador aparece na tela na hora do sorteio.",
    href: "#precos",
    cta: "Ver preços",
    background: null,
    className: "lg:col-start-3 lg:col-end-3 lg:row-start-1 lg:row-end-2",
  },
  {
    Icon: ChatBubbleIcon,
    name: "Ganhadores no WhatsApp",
    description:
      "Cada cadastro traz WhatsApp e apartamento: avise quem ganhou na hora, mesmo que a pessoa já tenha ido embora do evento.",
    href: "#precos",
    cta: "Ver preços",
    background: null,
    className: "lg:col-start-3 lg:col-end-3 lg:row-start-2 lg:row-end-4",
  },
];

export default async function PaginaInicial() {
  const logado = Boolean(await usuarioDaSessao());

  return (
    <>
      <HeroAurora logado={logado} />

      <main className="container">
        <section>
          <h2 style={{ textAlign: "center" }}>Como funciona no dia do evento</h2>
          <BentoGrid className="my-8 auto-rows-[11rem]">
            {recursos.map((recurso) => (
              <BentoCard key={recurso.name} {...recurso} />
            ))}
          </BentoGrid>
        </section>

        <section id="precos">
          <h2 style={{ textAlign: "center", marginTop: "3rem" }}>Preços</h2>
          <div className="grade-precos">
            <div className="cartao">
              <h3>Inauguração avulsa</h3>
              <div className="preco-valor">
                {formatarReais(PRECO_AVULSO_CENTAVOS)}
                <small> / sorteio</small>
              </div>
              <p className="texto-suave">
                Pague apenas quando inaugurar. Participantes ilimitados e
                quantos prêmios quiser no mesmo evento.
              </p>
            </div>
            <div className="cartao">
              <h3>
                Assinatura <span className="selo selo-neutro">ilimitada</span>
              </h3>
              <div className="preco-valor">
                {formatarReais(PRECO_ASSINATURA_CENTAVOS)}
                <small> / mês</small>
              </div>
              <p className="texto-suave">
                Para quem inaugura vários pontos por mês: sorteios ilimitados
                enquanto a assinatura estiver ativa. Cancele quando quiser.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="rodape">
        <div className="container">
          TDM Sorteios: sorteios transparentes para inaugurações de mercados
          autônomos. Produto independente, sem vínculo com a market4u.
        </div>
      </footer>
    </>
  );
}
