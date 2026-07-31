import { redirect } from "next/navigation";

/** Rota antiga: o checkout agora é unificado em /app/pagamento. */
export default function PaginaAssinar() {
  redirect("/app/pagamento/assinatura");
}
