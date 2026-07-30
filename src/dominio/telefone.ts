export function limparTexto(v: unknown): string {
  if (v == null) return "";
  return String(v).replace(/\s+/g, " ").trim();
}

export function soDigitos(v: unknown): string {
  return String(v ?? "").replace(/\D/g, "");
}

/**
 * Formata telefones brasileiros. Números do Excel podem chegar com sufixo ".0".
 * 11 dígitos → (11) 98765-4321 · 10 → (11) 3456-7890 · 13 começando em 55 → +55 (…)
 * Qualquer outro formato é devolvido como veio.
 */
export function formatarTelefone(v: unknown): string {
  const bruto = limparTexto(v).replace(/\.0$/, "");
  const d = soDigitos(bruto);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  if (d.length === 13 && d.startsWith("55"))
    return `+55 (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  return bruto;
}

/** Máscara LGPD: só os 4 primeiros dígitos ficam visíveis, o resto vira "•". */
export function mascararTelefone(tel: string): string {
  let visiveis = 0;
  return tel.replace(/\d/g, (d) => (++visiveis <= 4 ? d : "•"));
}
