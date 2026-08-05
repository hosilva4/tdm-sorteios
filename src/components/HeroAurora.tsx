"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AuroraBackground } from "@/components/ui/aurora-background";

/** Hero da landing com fundo aurora animado. */
export default function HeroAurora({ logado }: { logado: boolean }) {
  return (
    <AuroraBackground className="h-auto min-h-[calc(100vh-62px)] px-5 py-16">
      <motion.div
        initial={{ opacity: 0.0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0.3,
          duration: 0.8,
          ease: "easeInOut",
        }}
        className="relative flex flex-col gap-4 items-center justify-center text-center"
      >
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          Inaugure com a loja cheia:
          <br />
          o sorteio que atrai o condomínio inteiro
        </h1>
        <p className="text-base md:text-xl text-slate-600 max-w-xl">
          Os visitantes se cadastram sozinhos no tablet, você sorteia na hora
          com transparência total.
        </p>
        <Link
          href={logado ? "/app" : "/cadastro"}
          className="botao botao-grande"
        >
          Preparar meu sorteio
        </Link>
      </motion.div>
    </AuroraBackground>
  );
}
