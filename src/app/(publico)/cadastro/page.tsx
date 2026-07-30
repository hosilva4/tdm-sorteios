"use client";

import Link from "next/link";
import { useActionState } from "react";
import { cadastrar, type EstadoAuth } from "@/app/acoes/auth";

const estadoInicial: EstadoAuth = {};

export default function PaginaCadastro() {
  const [estado, acao, pendente] = useActionState(cadastrar, estadoInicial);

  return (
    <main className="container-estreito" style={{ paddingTop: "3rem" }}>
      <div className="cartao">
        <h2>Criar conta</h2>
        <p className="texto-suave texto-pequeno">
          Conta gratuita para franqueados. Você só paga quando realizar o
          sorteio da inauguração.
        </p>
        {estado.erro && <div className="aviso-erro">{estado.erro}</div>}
        <form action={acao}>
          <div className="grupo-campo">
            <label className="rotulo" htmlFor="nome">
              Nome
            </label>
            <input
              className="campo"
              id="nome"
              name="nome"
              autoComplete="name"
              required
            />
          </div>
          <div className="grupo-campo">
            <label className="rotulo" htmlFor="email">
              E-mail
            </label>
            <input
              className="campo"
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </div>
          <div className="grupo-campo">
            <label className="rotulo" htmlFor="senha">
              Senha
            </label>
            <input
              className="campo"
              id="senha"
              name="senha"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <button className="botao" style={{ width: "100%" }} disabled={pendente}>
            {pendente ? "Criando conta…" : "Criar conta"}
          </button>
        </form>
      </div>
      <p style={{ textAlign: "center" }} className="texto-pequeno">
        Já tem conta? <Link href="/entrar">Entrar</Link>
      </p>
    </main>
  );
}
