"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const INTERVALO_MS = 5000;

/** Recarrega os dados do telão a cada poucos segundos. */
export function AtualizadorTelao() {
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => router.refresh(), INTERVALO_MS);
    return () => clearInterval(timer);
  }, [router]);

  return null;
}
