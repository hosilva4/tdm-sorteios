"use client";

import { useState } from "react";
import { assinarPlano, comprarAvulsoCartao } from "@/app/acoes/pagamentos";
import { FormCartao } from "@/components/FormCartao";
import { CompraPix } from "@/components/CompraPix";

interface Props {
  produto: "avulso" | "assinatura";
  configurado: boolean;
  chavePublica: string;
  precoTexto: string;
}

/**
 * Checkout unificado: o produto define os métodos de pagamento.
 * Avulso: PIX ou cartão. Assinatura: cartão (com renovação automática).
 */
export function Checkout({ produto, configurado, chavePublica, precoTexto }: Props) {
  const [metodo, setMetodo] = useState<"pix" | "cartao">(
    produto === "assinatura" ? "cartao" : "pix"
  );

  if (produto === "assinatura") {
    return chavePublica ? (
      <FormCartao
        chavePublica={chavePublica}
        textoBotao={`Assinar por ${precoTexto}/mês`}
        acao={assinarPlano}
        urlSucesso="/app/perfil"
      />
    ) : (
      <div className="aviso-info">
        A assinatura ainda não está disponível neste ambiente: configure o
        PAGBANK_TOKEN (e, em sandbox, a chave pública em
        NEXT_PUBLIC_PAGBANK_PUBLIC_KEY).
      </div>
    );
  }

  return (
    <div>
      <p className="rotulo">Como você quer pagar?</p>
      <div className="linha-flex" style={{ marginBottom: "1rem" }}>
        <button
          className={`botao ${metodo === "pix" ? "" : "botao-secundario"}`}
          onClick={() => setMetodo("pix")}
        >
          ⚡ PIX
        </button>
        <button
          className={`botao ${metodo === "cartao" ? "" : "botao-secundario"}`}
          onClick={() => setMetodo("cartao")}
          disabled={!chavePublica}
          title={
            chavePublica
              ? undefined
              : "Cartão indisponível: chave pública do PagBank não configurada."
          }
        >
          💳 Cartão de crédito
        </button>
      </div>

      {metodo === "pix" ? (
        <CompraPix configurado={configurado} />
      ) : (
        <FormCartao
          chavePublica={chavePublica}
          textoBotao={`Pagar ${precoTexto} no cartão`}
          acao={comprarAvulsoCartao}
          mensagemSucesso="Pagamento aprovado! O crédito já está disponível na sua conta."
        />
      )}
    </div>
  );
}
