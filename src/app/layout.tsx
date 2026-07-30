import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TDM Sorteios: sorteios para inaugurações de mercados autônomos",
  description:
    "Cadastre os visitantes no tablet durante a inauguração do seu market4u e sorteie os ganhadores na hora, com transparência total.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
