"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import {
  comprarAvulso,
  verificarPagamentoAvulso,
  type EstadoCompraPix,
} from "@/app/acoes/pagamentos";

const estadoInicial: EstadoCompraPix = {};

export function CompraPix({ configurado }: { configurado: boolean }) {
  const router = useRouter();
  const [estado, acao, pendente] = useActionState(comprarAvulso, estadoInicial);
  const [verificando, setVerificando] = useState(false);
  const [situacao, setSituacao] = useState("");
  const [copiado, setCopiado] = useState(false);

  if (!configurado) {
    return (
      <p className="texto-suave texto-pequeno">
        Compra indisponível: o PagBank ainda não foi configurado neste
        ambiente.
      </p>
    );
  }

  if (estado.pix) {
    const pix = estado.pix;
    return (
      <div>
        <p style={{ marginTop: 0 }}>
          <strong>Pague com PIX para liberar o crédito na hora.</strong>
        </p>
        {pix.qrImagemUrl && (
          <p style={{ textAlign: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pix.qrImagemUrl}
              alt="QR Code PIX para pagamento"
              width={180}
              height={180}
              style={{ border: "1px solid var(--borda)", borderRadius: 8 }}
            />
          </p>
        )}
        <p className="rotulo">PIX copia e cola</p>
        <textarea
          className="campo"
          readOnly
          rows={3}
          value={pix.copiaECola}
          onFocus={(e) => e.target.select()}
        />
        <div className="linha-flex" style={{ marginTop: "0.75rem" }}>
          <button
            className="botao botao-secundario"
            onClick={async () => {
              await navigator.clipboard.writeText(pix.copiaECola);
              setCopiado(true);
              setTimeout(() => setCopiado(false), 2000);
            }}
          >
            {copiado ? "Copiado!" : "Copiar código"}
          </button>
          <button
            className="botao"
            disabled={verificando}
            onClick={async () => {
              setVerificando(true);
              setSituacao("");
              const r = await verificarPagamentoAvulso(pix.pagamentoId);
              setVerificando(false);
              if (r.status === "aprovado") {
                setSituacao("Pagamento confirmado! Crédito liberado.");
                router.refresh();
              } else if (r.status === "pendente") {
                setSituacao(
                  "Ainda não identificamos o pagamento. Aguarde alguns segundos e verifique de novo."
                );
              } else {
                setSituacao(r.erro ?? "Não foi possível verificar.");
              }
            }}
          >
            {verificando ? "Verificando…" : "Já paguei, verificar"}
          </button>
        </div>
        {situacao && (
          <div className="aviso-info" style={{ marginTop: "0.75rem" }}>
            {situacao}
          </div>
        )}
        <p className="texto-suave texto-pequeno">
          O código expira em 1 hora. Assim que o PagBank confirmar, o crédito
          aparece na sua conta (também confirmamos automaticamente via
          webhook).
        </p>
      </div>
    );
  }

  return (
    <form action={acao}>
      {estado.erro && <div className="aviso-erro">{estado.erro}</div>}
      <div className="grupo-campo">
        <label className="rotulo" htmlFor="cpf-avulso">
          CPF do pagador
        </label>
        <input
          className="campo"
          id="cpf-avulso"
          name="cpf"
          inputMode="numeric"
          placeholder="000.000.000-00"
          required
        />
      </div>
      <button className="botao" disabled={pendente}>
        {pendente ? "Gerando PIX…" : "Comprar 1 sorteio com PIX"}
      </button>
    </form>
  );
}
