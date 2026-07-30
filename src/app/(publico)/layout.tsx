import Link from "next/link";
import { usuarioDaSessao } from "@/lib/sessao";

/** Header fixo das páginas públicas (landing, entrar, cadastro). */
export default async function LayoutPublico({
  children,
}: {
  children: React.ReactNode;
}) {
  const logado = Boolean(await usuarioDaSessao());

  return (
    <>
      <header className="topo">
        <div className="container topo-conteudo">
          <Link href="/" className="logo">
            TDM <span>Sorteios</span>
          </Link>
          <nav className="nav">
            {logado ? (
              <Link href="/app" className="botao">
                Meus sorteios
              </Link>
            ) : (
              <>
                <Link href="/entrar">Entrar</Link>
                <Link href="/cadastro" className="botao">
                  Criar conta
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      {children}
    </>
  );
}
