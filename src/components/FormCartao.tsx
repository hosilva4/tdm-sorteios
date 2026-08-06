"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

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

/** "1226" → "12/26" conforme o usuário digita. */
function mascaraValidade(valor: string): string {
  const d = valor.replace(/\D/g, "").slice(0, 4);
  return d.length >= 3 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

/** "40132417812" → "401.324.178-12" conforme o usuário digita. */
function mascaraCpf(valor: string): string {
  return valor
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

interface Props {
  chavePublica: string;
  textoBotao: string;
  /** Server action que recebe o FormData com os dados criptografados. */
  acao: (
    anterior: { ok?: boolean; erro?: string },
    formData: FormData
  ) => Promise<{ ok?: boolean; erro?: string }>;
  /** Para onde ir após o sucesso; sem valor, mostra mensagem e atualiza. */
  urlSucesso?: string;
  mensagemSucesso?: string;
}

/**
 * Formulário de cartão compartilhado (compra avulsa e assinatura): coleta os
 * dados, criptografa no navegador com o SDK do PagBank e envia à action.
 */
export function FormCartao({
  chavePublica,
  textoBotao,
  acao,
  urlSucesso,
  mensagemSucesso,
}: Props) {
  const router = useRouter();
  const [, iniciarTransicao] = useTransition();
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [sdkPronto, setSdkPronto] = useState(false);
  const [validade, setValidade] = useState("");
  const [cpf, setCpf] = useState("");

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
    dados.set("cartaoCriptografado", criptografia.encryptedCard);
    // O CVV vai junto (a API exige card.security_code); não é armazenado.
    dados.set("cvv", String(campos.get("cvv") ?? ""));
    dados.set("ultimos4", numero.slice(-4));
    dados.set("bandeira", bandeiraDoNumero(numero));

    setEnviando(true);
    const resultado = await acao({}, dados);
    setEnviando(false);

    if (resultado.ok) {
      if (urlSucesso) {
        iniciarTransicao(() => router.push(urlSucesso));
      } else {
        setSucesso(true);
        iniciarTransicao(() => router.refresh());
      }
    } else {
      setErro(resultado.erro ?? "Não foi possível concluir o pagamento.");
    }
  }

  if (sucesso) {
    return (
      <div className="aviso-info" style={{ background: "var(--sucesso-suave)", borderColor: "#bbf7d0" }}>
        {mensagemSucesso ?? "Pagamento aprovado!"}
      </div>
    );
  }

  return (
    <>
      <Script
        src="https://assets.pagseguro.com.br/checkout-sdk-js/rc/dist/browser/pagseguro.min.js"
        // onReady (e não onLoad): dispara também quando o componente remonta
        // com o SDK já carregado (ex.: reabrir o modal de troca de cartão);
        // com onLoad o botão ficava preso em "Carregando pagamento…".
        onReady={() => setSdkPronto(true)}
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
              inputMode="numeric"
              pattern="\d{2}\s*/\s*\d{2,4}"
              maxLength={5}
              value={validade}
              onChange={(e) => setValidade(mascaraValidade(e.target.value))}
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
            maxLength={14}
            value={cpf}
            onChange={(e) => setCpf(mascaraCpf(e.target.value))}
            required
          />
        </div>
        <button
          className="botao"
          style={{ width: "100%" }}
          disabled={enviando || !sdkPronto}
        >
          {enviando
            ? "Processando pagamento…"
            : sdkPronto
              ? textoBotao
              : "Carregando pagamento…"}
        </button>
      </form>
      <p className="texto-suave texto-pequeno" style={{ marginBottom: 0 }}>
        Os dados do cartão são criptografados no seu navegador e enviados
        direto ao PagBank; nossos servidores não guardam o número.
      </p>
    </>
  );
}
