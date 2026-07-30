import Link from "next/link";
import { redirect } from "next/navigation";
import { exigirUsuario } from "@/lib/usuario-atual";
import { pagbankConfigurado } from "@/lib/pagbank";
import { PRECO_ASSINATURA_CENTAVOS, formatarReais } from "@/lib/precos";
import { FormAssinatura } from "./FormAssinatura";

export default async function PaginaAssinar() {
  const usuario = await exigirUsuario();
  if (usuario.assinaturaAtiva) redirect("/app/perfil");

  const chavePublica = process.env.NEXT_PUBLIC_PAGBANK_PUBLIC_KEY ?? "";
  const pronto = pagbankConfigurado() && chavePublica;

  return (
    <div className="espaco-vertical" style={{ paddingBottom: "3rem" }}>
      <div className="cabecalho-pagina">
        <div>
          <p className="texto-pequeno" style={{ margin: 0 }}>
            <Link href="/app/comprar">← Créditos e assinatura</Link>
          </p>
          <h1 style={{ marginBottom: 0 }}>Assinar plano mensal</h1>
        </div>
      </div>

      <div className="cartao" style={{ maxWidth: 480 }}>
        <p style={{ marginTop: 0 }}>
          <strong>{formatarReais(PRECO_ASSINATURA_CENTAVOS)}/mês</strong>,
          sorteios ilimitados. Renovação automática todo mês no cartão, com
          cancelamento a qualquer momento.
        </p>
        {pronto ? (
          <FormAssinatura
            chavePublica={chavePublica}
            precoMensal={formatarReais(PRECO_ASSINATURA_CENTAVOS)}
          />
        ) : (
          <div className="aviso-info">
            A assinatura ainda não está disponível neste ambiente: faltam
            PAGBANK_TOKEN e NEXT_PUBLIC_PAGBANK_PUBLIC_KEY (ver docs/DEPLOY.md,
            seção 4).
          </div>
        )}
      </div>
    </div>
  );
}
