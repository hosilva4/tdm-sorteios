"use client";

import { useEffect, useRef } from "react";

// Rede de pontos animada em canvas cobrindo toda a superfície do telão:
// partículas em deriva lenta, ligadas por linhas quando próximas.

const COR_PONTO = "10, 161, 75"; // verde market4u em RGB
const DISTANCIA_LIGACAO = 140;
const VELOCIDADE = 0.35;

interface Ponto {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export function RedeDePontos() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let pontos: Ponto[] = [];
    let quadro = 0;
    let largura = 0;
    let altura = 0;

    function redimensionar() {
      if (!canvas || !ctx) return;
      const dpr = window.devicePixelRatio || 1;
      largura = window.innerWidth;
      altura = window.innerHeight;
      canvas.width = largura * dpr;
      canvas.height = altura * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Densidade proporcional à área, com limites para não pesar.
      const quantidade = Math.min(
        160,
        Math.max(50, Math.round((largura * altura) / 16000))
      );
      pontos = Array.from({ length: quantidade }, () => ({
        x: Math.random() * largura,
        y: Math.random() * altura,
        vx: (Math.random() - 0.5) * VELOCIDADE * 2,
        vy: (Math.random() - 0.5) * VELOCIDADE * 2,
      }));
    }

    function desenhar() {
      if (!ctx) return;
      ctx.clearRect(0, 0, largura, altura);

      for (const p of pontos) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > largura) p.vx *= -1;
        if (p.y < 0 || p.y > altura) p.vy *= -1;
      }

      for (let i = 0; i < pontos.length; i++) {
        for (let j = i + 1; j < pontos.length; j++) {
          const dx = pontos[i].x - pontos[j].x;
          const dy = pontos[i].y - pontos[j].y;
          const distancia = Math.hypot(dx, dy);
          if (distancia < DISTANCIA_LIGACAO) {
            const alfa = 0.08 * (1 - distancia / DISTANCIA_LIGACAO);
            ctx.strokeStyle = `rgba(${COR_PONTO}, ${alfa})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(pontos[i].x, pontos[i].y);
            ctx.lineTo(pontos[j].x, pontos[j].y);
            ctx.stroke();
          }
        }
      }

      ctx.fillStyle = `rgba(${COR_PONTO}, 0.22)`;
      for (const p of pontos) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

      quadro = requestAnimationFrame(desenhar);
    }

    redimensionar();
    desenhar();
    window.addEventListener("resize", redimensionar);
    return () => {
      cancelAnimationFrame(quadro);
      window.removeEventListener("resize", redimensionar);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}
