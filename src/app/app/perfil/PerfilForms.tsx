"use client";

import { useActionState, useState } from "react";
import {
  alterarSenha,
  atualizarPerfil,
  cancelarAssinatura,
  type EstadoConta,
} from "@/app/acoes/conta";
import { trocarCartaoAssinatura } from "@/app/acoes/pagamentos";
import { FormCartao } from "@/components/FormCartao";

const estadoInicial: EstadoConta = {};

export function FormDadosConta({ nome, email }: { nome: string; email: string }) {
  const [estado, acao, pendente] = useActionState(atualizarPerfil, estadoInicial);

  return (
    <form action={acao}>
      {estado.erro && <div className="aviso-erro">{estado.erro}</div>}
      {estado.ok && (
        <div className="aviso-info">Dados atualizados com sucesso.</div>
      )}
      <div className="grupo-campo">
        <label className="rotulo" htmlFor="perfil-nome">
          Nome
        </label>
        <input
          className="campo"
          id="perfil-nome"
          name="nome"
          defaultValue={nome}
          maxLength={120}
          required
        />
      </div>
      <div className="grupo-campo">
        <label className="rotulo" htmlFor="perfil-email">
          E-mail
        </label>
        <input
          className="campo"
          id="perfil-email"
          name="email"
          type="email"
          defaultValue={email}
          required
        />
      </div>
      <button className="botao" disabled={pendente}>
        {pendente ? "Salvando…" : "Salvar dados"}
      </button>
    </form>
  );
}

export function FormSenha() {
  const [estado, acao, pendente] = useActionState(alterarSenha, estadoInicial);

  return (
    <form action={acao}>
      {estado.erro && <div className="aviso-erro">{estado.erro}</div>}
      {estado.ok && <div className="aviso-info">Senha alterada com sucesso.</div>}
      <div className="grupo-campo">
        <label className="rotulo" htmlFor="senha-atual">
          Senha atual
        </label>
        <input
          className="campo"
          id="senha-atual"
          name="senhaAtual"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <div className="grupo-campo">
        <label className="rotulo" htmlFor="nova-senha">
          Nova senha
        </label>
        <input
          className="campo"
          id="nova-senha"
          name="novaSenha"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <button className="botao botao-secundario" disabled={pendente}>
        {pendente ? "Alterando…" : "Alterar senha"}
      </button>
    </form>
  );
}

/** Botão + modal para trocar o cartão da renovação automática. */
export function BotaoTrocarCartao({ chavePublica }: { chavePublica: string }) {
  const [aberto, setAberto] = useState(false);

  if (!chavePublica) return null;

  return (
    <>
      <button
        type="button"
        className="botao botao-secundario"
        onClick={() => setAberto(true)}
      >
        Trocar cartão
      </button>

      {aberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Trocar cartão da assinatura"
          onClick={() => setAberto(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-start justify-between gap-4">
              <h3 style={{ margin: 0 }}>Trocar cartão da assinatura</h3>
              <button
                type="button"
                aria-label="Fechar"
                className="text-2xl leading-none text-[var(--texto-suave)] hover:text-[var(--texto)]"
                onClick={() => setAberto(false)}
              >
                ×
              </button>
            </div>
            <p className="texto-suave texto-pequeno">
              Para validar o cartão novo, fazemos uma cobrança de R$ 1,00 que é
              estornada automaticamente. Nada muda na sua mensalidade: a
              próxima renovação continua na mesma data, no valor de sempre.
            </p>
            <FormCartao
              chavePublica={chavePublica}
              textoBotao="Validar e salvar o cartão"
              acao={trocarCartaoAssinatura}
              mensagemSucesso="Cartão atualizado! A cobrança de validação de R$ 1,00 é estornada automaticamente e a data da renovação não mudou."
            />
            <button
              type="button"
              className="botao botao-secundario mt-4 w-full"
              onClick={() => setAberto(false)}
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function BotaoCancelarAssinatura() {
  const [estado, acao, pendente] = useActionState(
    async (anterior: EstadoConta) => {
      void anterior;
      return cancelarAssinatura();
    },
    estadoInicial
  );

  return (
    <form
      action={acao}
      onSubmit={(e) => {
        if (!confirm("Cancelar sua assinatura? Você poderá voltar quando quiser.")) {
          e.preventDefault();
        }
      }}
    >
      {estado.erro && <div className="aviso-erro">{estado.erro}</div>}
      <button className="botao botao-perigo" disabled={pendente}>
        {pendente ? "Cancelando…" : "Cancelar assinatura"}
      </button>
    </form>
  );
}
