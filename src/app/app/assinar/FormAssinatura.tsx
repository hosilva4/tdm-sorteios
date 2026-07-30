"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { assinarPlano, type EstadoAssinatura } from "@/app/acoes/pagamentos";

declare global {
  interface Window {
    PagSeguro?: {
      encryptCard(dados: {
        publicKey: string;
        holder: string;
        number: string;
        expMonth: string;
        expYear: string;
        securityCode: string;
      }): { encryptedCard?: string; hasErrors: boolean; errors: unknown[] };
    };
  }
}

function bandeiraDoNumero(numero: string): string {
  if (/^4/.test(numero)) return "visa";
  if (/^(5[1-5]|2(2[2-9]|[3-6]|7[01]|720))/.test(numero)) return "mastercard";
  if (/^3[47]/.test(numero)) return "amex";
  return "";
}

export function FormAssinatura({
  chavePublica,
  precoMensal,
}: {
  chavePublica: string;
  precoMensal: string;
}) {
  const router = useRouter();
  const [, iniciarTransicao] = useTransition();
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [sdkPronto, setSdkPronto] = useState(false);

  async function aoEnviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");

    const form = e.currentTarget;
    const campos = new FormData(form);
    const numero = String(campos.get("numero") ?? "").replace(/\D/g, "");
    const validade = String(campos.get("validade") ?? "");
    const [mes, ano] = validade.split("/").map((p) => p.trim());
    const anoCompleto = ano?.length === 2 ? `20${ano}` : (ano ?? "");

    if (!window.PagSeguro) {
      setErro("O componente de pagamento ainda está carregando. Tente de novo.");
      return;
    }

    const criptografia = window.PagSeguro.encryptCard({
      publicKey: chavePublica,
      holder: String(campos.get("titular") ?? ""),
      number: numero,
      expMonth: mes ?? "",
      expYear: anoCompleto,
      securityCode: String(campos.get("cvv") ?? ""),
    });
    if (criptografia.hasErrors || !criptografia.encryptedCard) {
      setErro("Dados do cartão inválidos. Confira número, validade e CVV.");
      return;
    }

    const dados = new FormData();
    dados.set("titular", String(campos.get("titular") ?? ""));
    dados.set("cpf", String(campos.get("cpf") ?? ""));
    dados.set("celular", String(campos.get("celular") ?? ""));
    dados.set("cartaoCriptografado", criptografia.encryptedCard);
    dados.set("ultimos4", numero.slice(-4));
    dados.set("bandeira", bandeiraDoNumero(numero));

    setEnviando(true);
    const resultado: EstadoAssinatura = await assinarPlano({}, dados);
    setEnviando(false);

    if (resultado.ok) {
      iniciarTransicao(() => router.push("/app/perfil"));
    } else {
      setErro(resultado.erro ?? "Não foi possível assinar.");
    }
  }

  return (
    <>
      <Script
        src="https://assets.pagseguro.com.br/checkout-sdk-js/rc/dist/browser/pagseguro.min.js"
        onLoad={() => setSdkPronto(true)}
      />
      {erro && <div className="aviso-erro">{erro}</div>}
      <form onSubmit={aoEnviar}>
        <div className="grupo-campo">
          <label className="rotulo" htmlFor="titular">
            Nome impresso no cartão
          </label>
          <input className="campo" id="titular" name="titular" required />
        </div>
        <div className="grupo-campo">
          <label className="rotulo" htmlFor="numero">
            Número do cartão
          </label>
          <input
            className="campo"
            id="numero"
            name="numero"
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="0000 0000 0000 0000"
            required
          />
        </div>
        <div className="linha-flex">
          <div className="grupo-campo" style={{ flex: 1 }}>
            <label className="rotulo" htmlFor="validade">
              Validade (MM/AA)
            </label>
            <input
              className="campo"
              id="validade"
              name="validade"
              placeholder="09/29"
              autoComplete="cc-exp"
              pattern="\d{2}\s*/\s*\d{2,4}"
              required
            />
          </div>
          <div className="grupo-campo" style={{ flex: 1 }}>
            <label className="rotulo" htmlFor="cvv">
              CVV
            </label>
            <input
              className="campo"
              id="cvv"
              name="cvv"
              inputMode="numeric"
              autoComplete="cc-csc"
              maxLength={4}
              required
            />
          </div>
        </div>
        <div className="grupo-campo">
          <label className="rotulo" htmlFor="cpf">
            CPF do titular
          </label>
          <input
            className="campo"
            id="cpf"
            name="cpf"
            inputMode="numeric"
            placeholder="000.000.000-00"
            required
          />
        </div>
        <div className="grupo-campo">
          <label className="rotulo" htmlFor="celular">
            Celular com DDD
          </label>
          <input
            className="campo"
            id="celular"
            name="celular"
            inputMode="tel"
            placeholder="(41) 99876-5432"
            required
          />
        </div>
        <button
          className="botao"
          style={{ width: "100%" }}
          disabled={enviando || !sdkPronto}
        >
          {enviando
            ? "Criando assinatura…"
            : sdkPronto
              ? `Assinar por ${precoMensal}/mês`
              : "Carregando pagamento…"}
        </button>
      </form>
      <p className="texto-suave texto-pequeno" style={{ marginBottom: 0 }}>
        Os dados do cartão são criptografados no seu navegador e enviados
        direto ao PagBank; nossos servidores não guardam o número. A assinatura
        renova todo mês automaticamente e pode ser cancelada a qualquer momento
        na página Minha conta.
      </p>
    </>
  );
}
