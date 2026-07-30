"use client";

import Link from "next/link";
import { useActionState } from "react";
import { entrar, type EstadoAuth } from "@/app/acoes/auth";

const estadoInicial: EstadoAuth = {};

export default function PaginaEntrar() {
  const [estado, acao, pendente] = useActionState(entrar, estadoInicial);

  return (
    <main className="container-estreito" style={{ paddingTop: "3rem" }}>
      <div className="cartao">
        <h2>Entrar</h2>
        {estado.erro && <div className="aviso-erro">{estado.erro}</div>}
        <form action={acao}>
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
              autoComplete="current-password"
              required
            />
          </div>
          <button className="botao" style={{ width: "100%" }} disabled={pendente}>
            {pendente ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
      <p style={{ textAlign: "center" }} className="texto-pequeno">
        Ainda não tem conta? <Link href="/cadastro">Criar conta</Link>
      </p>
    </main>
  );
}
