/** Soma 1 mês com ajuste de fim de mês (31/jan → 28/fev, não 3/mar). */
export function umMesDepois(data: Date): Date {
  const resultado = new Date(data);
  const dia = resultado.getDate();
  resultado.setMonth(resultado.getMonth() + 1);
  if (resultado.getDate() < dia) resultado.setDate(0);
  return resultado;
}
