// Preços em centavos. Ajuste aqui (e recrie o plano no PagBank se mudar a assinatura).
export const PRECO_AVULSO_CENTAVOS = 990; // R$ 9,90 por sorteio
export const PRECO_ASSINATURA_CENTAVOS = 2990; // R$ 29,90/mês, sorteios ilimitados

export function formatarReais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
