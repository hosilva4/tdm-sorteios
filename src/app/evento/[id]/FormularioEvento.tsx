"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  cadastrarNoEvento,
  type EstadoCadastroEvento,
} from "@/app/acoes/sorteios";
import { CamposParticipante } from "@/componentes/CamposParticipante";

const SEGUNDOS_TELA_SUCESSO = 5;

interface Props {
  sorteioId: string;
  nomeSorteio: string;
  tipoPredio: string;
  regraLgpd: boolean;
  regraMaiorIdade: boolean;
  totalParticipantes: number;
  qrAndroid: string;
  qrIos: string;
}

export function FormularioEvento({
  sorteioId,
  nomeSorteio,
  tipoPredio,
  regraLgpd,
  regraMaiorIdade,
  totalParticipantes,
  qrAndroid,
  qrIos,
}: Props) {
  const router = useRouter();
  const [estado, acao, pendente] = useActionState(
    cadastrarNoEvento.bind(null, sorteioId),
    {} as EstadoCadastroEvento
  );
  // Chave do form: incrementa para limpar os campos ao voltar para o cadastro.
  const [versaoForm, setVersaoForm] = useState(0);
  const [mostrandoSucesso, setMostrandoSucesso] = useState(false);
  const ultimoOk = useRef<EstadoCadastroEvento | null>(null);

  useEffect(() => {
    if (estado.ok && estado !== ultimoOk.current) {
      ultimoOk.current = estado;
      setMostrandoSucesso(true);
      router.refresh();
      const timer = setTimeout(() => {
        setMostrandoSucesso(false);
        setVersaoForm((v) => v + 1);
      }, SEGUNDOS_TELA_SUCESSO * 1000);
      return () => clearTimeout(timer);
    }
  }, [estado, router]);

  return (
    <div className="quiosque">
      <div className="quiosque-cartao">
        {mostrandoSucesso ? (
          <div className="quiosque-sucesso">
            <div className="icone">🎉</div>
            <h1>Boa sorte, {estado.nome?.split(" ")[0]}!</h1>
            <p className="texto-suave" style={{ fontSize: "1.1rem" }}>
              Você está participando do sorteio. Fique por perto: o resultado
              sai ainda hoje!
            </p>
            <p className="texto-suave texto-pequeno">
              Ainda não baixou o app market4u? Aproveite e aponte a câmera para
              um dos códigos abaixo.
            </p>
            <div className="qr-grade">
              <figure>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrAndroid} alt="QR code do app market4u na Google Play" />
                <figcaption>Android</figcaption>
              </figure>
              <figure>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrIos} alt="QR code do app market4u na App Store" />
                <figcaption>iPhone</figcaption>
              </figure>
            </div>
            <button
              className="botao botao-secundario"
              onClick={() => {
                setMostrandoSucesso(false);
                setVersaoForm((v) => v + 1);
              }}
            >
              Cadastrar próxima pessoa
            </button>
          </div>
        ) : (
          <>
            <p
              className="texto-suave texto-pequeno"
              style={{ margin: "0 0 0.25rem", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}
            >
              Sorteio de inauguração
            </p>
            <h1>{nomeSorteio}</h1>

            <div className="caixa-app">
              <p style={{ margin: 0, fontWeight: 700 }}>
                1º passo: baixe o app market4u e faça seu cadastro de cliente
              </p>
              <p className="texto-suave texto-pequeno" style={{ margin: "0.25rem 0 0.75rem" }}>
                Aponte a câmera do seu celular para o código da sua loja de
                aplicativos.
              </p>
              <div className="qr-grade">
                <figure>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrAndroid} alt="QR code do app market4u na Google Play" />
                  <figcaption>Android</figcaption>
                </figure>
                <figure>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrIos} alt="QR code do app market4u na App Store" />
                  <figcaption>iPhone</figcaption>
                </figure>
              </div>
            </div>

            <p style={{ fontWeight: 700, marginBottom: "0.25rem" }}>
              2º passo: preencha seus dados e concorra aos prêmios de hoje
            </p>
            <p className="texto-suave texto-pequeno" style={{ marginTop: 0 }}>
              Leva menos de um minuto!
            </p>

            {estado.erro && <div className="aviso-erro">{estado.erro}</div>}

            <form action={acao} key={versaoForm}>
              <CamposParticipante
                tipoPredio={tipoPredio}
                regraLgpd={regraLgpd}
                regraMaiorIdade={regraMaiorIdade}
                grande
              />
              <button className="botao botao-largo" disabled={pendente}>
                {pendente ? "Enviando…" : "Quero participar 🍀"}
              </button>
            </form>

            <p
              className="texto-suave texto-pequeno"
              style={{ textAlign: "center", marginBottom: 0 }}
            >
              {totalParticipantes > 0
                ? `${totalParticipantes} ${
                    totalParticipantes === 1
                      ? "pessoa já está participando"
                      : "pessoas já estão participando"
                  }.`
                : "Seja a primeira pessoa a participar!"}{" "}
              Seus dados são usados apenas para o contato sobre o sorteio.
            </p>
          </>
        )}
      </div>

      <div className="quiosque-rodape">
        <button
          onClick={() => {
            if (
              confirm(
                "Concluir os cadastros e ir para a página do sorteio? (uso do responsável pelo evento)"
              )
            ) {
              router.push(`/app/sorteio/${sorteioId}`);
            }
          }}
        >
          Concluir cadastros
        </button>
      </div>
    </div>
  );
}
