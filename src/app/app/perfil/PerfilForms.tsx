"use client";

import { useActionState } from "react";
import {
  alterarSenha,
  atualizarPerfil,
  cancelarAssinatura,
  type EstadoConta,
} from "@/app/acoes/conta";

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
