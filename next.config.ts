import type { NextConfig } from "next";

// Cabeçalhos de segurança aplicados a todas as rotas.
const cabecalhosSeguranca = [
  // Força HTTPS por 2 anos (inclui subdomínios); o navegador nem tenta HTTP.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Impede o site de ser embutido em iframes (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  // Impede o navegador de "adivinhar" tipos de conteúdo.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Não vaza a URL completa para outros sites.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Desliga APIs sensíveis do navegador que o app não usa.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
];

const nextConfig: NextConfig = {
  // Não anuncia a tecnologia do servidor no header X-Powered-By.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: cabecalhosSeguranca }];
  },
};

export default nextConfig;
