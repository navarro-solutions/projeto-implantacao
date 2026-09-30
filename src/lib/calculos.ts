import type { Base, Implantacao, Lancamento } from "./types";

export const TIPOS = ["Portaria remota", "CFTV", "Controle de acesso", "Interfonia"];
export const CATEGORIAS = [
  "Equipamentos/materiais",
  "Mão de obra própria",
  "Terceiros/empreiteiros",
  "Deslocamento/infraestrutura",
];
export const ORIGENS = ["Execução abaixo do orçado", "Negociação na compra", "Reaproveitamento de estoque"];
export const STATUS = ["Planejada", "Em andamento", "Concluída"];

export type SituacaoLancamento = "Pago" | "A vencer" | "Vencido";

/** Data de hoje (aaaa-mm-dd) no fuso de São Paulo. */
export function hojeSP(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

export function situacao(l: Lancamento, hoje: string): SituacaoLancamento {
  if (l.dataPagamento) return "Pago";
  if (l.vencimento && l.vencimento < hoje) return "Vencido";
  return "A vencer";
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export function ehConcluida(i: Implantacao) {
  return norm(i.status).startsWith("conclu");
}

export interface ResumoImplantacao {
  imp: Implantacao;
  cliente: string;
  custo: number;
  pago: number;
  aVencer: number;
  vencido: number;
  porCategoria: Record<string, number>;
  econNegociacao: number;
  econEstoque: number;
  econExecucao: number;
  economia: number;
  /** custo − orçado (negativo = abaixo do orçado) */
  desvio: number;
}

/**
 * Regra da economia (evita contar duas vezes):
 * negociação e reaproveitamento são lançados na aba Economias;
 * "execução abaixo do orçado" é só o que sobra da diferença orçado − custo depois deles,
 * e só conta para implantações concluídas.
 */
export function resumir(base: Base, hoje: string): ResumoImplantacao[] {
  const nomeCliente = new Map(base.clientes.map((c) => [c.id, c.nome]));
  return base.implantacoes.map((imp) => {
    const lans = base.lancamentos.filter((l) => l.idImplantacao === imp.id);
    const ecos = base.economias.filter((e) => e.idImplantacao === imp.id);
    let pago = 0,
      aVencer = 0,
      vencido = 0;
    const porCategoria: Record<string, number> = {};
    for (const l of lans) {
      const s = situacao(l, hoje);
      if (s === "Pago") pago += l.valor;
      else if (s === "Vencido") vencido += l.valor;
      else aVencer += l.valor;
      const cat = l.categoria || "Sem categoria";
      porCategoria[cat] = (porCategoria[cat] ?? 0) + l.valor;
    }
    const custo = pago + aVencer + vencido;
    const econNegociacao = ecos.filter((e) => norm(e.origem).includes("negoci")).reduce((a, e) => a + e.valor, 0);
    const econEstoque = ecos.filter((e) => norm(e.origem).includes("estoque")).reduce((a, e) => a + e.valor, 0);
    const outras = ecos
      .filter((e) => !norm(e.origem).includes("negoci") && !norm(e.origem).includes("estoque"))
      .reduce((a, e) => a + e.valor, 0);
    const econExecucao =
      ehConcluida(imp) && imp.valorOrcado > 0
        ? Math.max(0, imp.valorOrcado - custo - econNegociacao - econEstoque - outras)
        : 0;
    return {
      imp,
      cliente: nomeCliente.get(imp.idCliente) ?? imp.idCliente,
      custo,
      pago,
      aVencer,
      vencido,
      porCategoria,
      econNegociacao: econNegociacao + outras,
      econEstoque,
      econExecucao,
      economia: econNegociacao + econEstoque + outras + econExecucao,
      desvio: custo - imp.valorOrcado,
    };
  });
}

export const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export const brlCurto = (v: number) => {
  const a = Math.abs(v);
  if (a >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  if (a >= 1_000) return `R$ ${(v / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return brl(v);
};

export const pct = (v: number) => `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

export const dataBR = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "—");
