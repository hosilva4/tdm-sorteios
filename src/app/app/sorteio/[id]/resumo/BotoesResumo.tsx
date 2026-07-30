"use client";

import { useState } from "react";

/** Ações do quadro resumo: imprimir/salvar PDF e copiar como texto. */
export function BotoesResumo({ textoResumo }: { textoResumo: string }) {
  const [copiado, setCopiado] = useState(false);

  return (
    <div className="linha-flex sem-impressao">
      <button className="botao" onClick={() => window.print()}>
        🖨️ Imprimir / salvar PDF
      </button>
      <button
        className="botao botao-secundario"
        onClick={async () => {
          await navigator.clipboard.writeText(textoResumo);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2000);
        }}
      >
        {copiado ? "Copiado!" : "📋 Copiar como texto"}
      </button>
    </div>
  );
}
