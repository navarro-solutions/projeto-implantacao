"use client";

import { useCallback, useState } from "react";

export interface TooltipLinha {
  rotulo: string;
  valor: string;
  cor?: string;
}

interface Estado {
  x: number;
  y: number;
  titulo: string;
  linhas: TooltipLinha[];
}

export function useTooltip() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const mostrar = useCallback((e: React.MouseEvent, titulo: string, linhas: TooltipLinha[]) => {
    setEstado({ x: e.clientX, y: e.clientY, titulo, linhas });
  }, []);
  const esconder = useCallback(() => setEstado(null), []);
  return { estado, mostrar, esconder };
}

export function Tooltip({ estado }: { estado: Estado | null }) {
  if (!estado) return null;
  const largura = 240;
  const esquerda =
    typeof window !== "undefined" && estado.x + largura + 24 > window.innerWidth
      ? estado.x - largura - 12
      : estado.x + 14;
  return (
    <div
      role="tooltip"
      className="pointer-events-none fixed z-50 rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg"
      style={{ left: esquerda, top: estado.y + 14, width: largura }}
    >
      <div className="mb-1.5 font-semibold text-ink">{estado.titulo}</div>
      <div className="space-y-1">
        {estado.linhas.map((l) => (
          <div key={l.rotulo} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 whitespace-pre text-ink-2">
              {l.cor && <span aria-hidden className="h-2 w-2 rounded-sm" style={{ background: l.cor }} />}
              {l.rotulo}
            </span>
            <span className="num font-medium text-ink">{l.valor}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
