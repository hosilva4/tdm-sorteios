import Link from "next/link";
import { exigirUsuario } from "@/lib/usuario-atual";
import { Wizard } from "./Wizard";

export default async function PaginaNovoSorteio() {
  await exigirUsuario();

  return (
    <div className="espaco-vertical" style={{ paddingBottom: "3rem" }}>
      <div className="cabecalho-pagina">
        <div>
          <p className="texto-pequeno" style={{ margin: 0 }}>
            <Link href="/app">← Meus sorteios</Link>
          </p>
          <h1 style={{ marginBottom: 0 }}>Novo sorteio</h1>
        </div>
      </div>
      <Wizard />
    </div>
  );
}
