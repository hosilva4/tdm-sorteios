import Link from "next/link";
import { exigirUsuario } from "@/lib/usuario-atual";
import { sair } from "@/app/acoes/auth";

export default async function LayoutApp({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await exigirUsuario();

  return (
    <>
      <header className="topo">
        <div className="container topo-conteudo">
          <Link href="/app" className="logo">
            TDM <span>Sorteios</span>
          </Link>
          <nav className="nav">
            <Link href="/app/comprar" className="texto-pequeno">
              {usuario.assinaturaAtiva ? (
                <span className="selo selo-ok">Assinatura ativa</span>
              ) : (
                <span className="selo selo-neutro">
                  {usuario.creditos}{" "}
                  {usuario.creditos === 1 ? "crédito" : "créditos"}
                </span>
              )}
            </Link>
            <Link
              href="/app/perfil"
              className="texto-suave texto-pequeno"
              title="Minha conta"
            >
              {usuario.nome}
            </Link>
            <form action={sair}>
              <button className="botao botao-secundario" type="submit">
                Sair
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="container">{children}</main>
    </>
  );
}
