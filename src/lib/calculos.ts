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
  /** Quanto se podia gastar (soma da aba Provisionado; se vazia, a coluna da aba Implantacoes). */
  provisionado: number;
  provPorCategoria: Record<string, number>;
  custo: number;
  pago: number;
  aVencer: number;
  vencido: number;
  porCategoria: Record<string, number>;
  /** provisionado − gasto. Em andamento = quanto ainda pode gastar; concluída = economia (negativo = estouro). */
  saldo: number;
  concluida: boolean;
  /** Só concluídas: provisionado − gasto (pode ser negativa). */
  economia: number;
  econNegociacao: number;
  econEstoque: number;
  /** economia − negociação − estoque: o que sobrou (ou estourou) na execução. */
  econExecucao: number;
}

/**
 * Regra da economia: do quanto eu podia gastar (provisionado) para o quanto eu gastei.
 * Só conta quando a implantação está concluída — antes disso o saldo ainda pode ser gasto.
 * Negociação e reaproveitamento de estoque (aba Economias) explicam parte dessa economia;
 * o restante é a execução.
 */
export function resumir(base: Base, hoje: string): ResumoImplantacao[] {
  const nomeCliente = new Map(base.clientes.map((c) => [c.id, c.nome]));
  return base.implantacoes.map((imp) => {
    const lans = base.lancamentos.filter((l) => l.idImplantacao === imp.id);
    const ecos = base.economias.filter((e) => e.idImplantacao === imp.id);
    const provs = base.provisoes.filter((p) => p.idImplantacao === imp.id);

    const provPorCategoria: Record<string, number> = {};
    for (const p of provs) {
      const cat = p.categoria || "Sem categoria";
      provPorCategoria[cat] = (provPorCategoria[cat] ?? 0) + p.valor;
    }
    const provisionado = provs.length ? provs.reduce((a, p) => a + p.valor, 0) : imp.provisionadoInformado;
    if (!provs.length && imp.provisionadoInformado) provPorCategoria["Sem categoria"] = imp.provisionadoInformado;

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
    const saldo = provisionado - custo;
    const concluida = ehConcluida(imp);
    const economia = concluida && provisionado > 0 ? saldo : 0;
    const somaEco = (f: (o: string) => boolean) => ecos.filter((e) => f(norm(e.origem))).reduce((a, e) => a + e.valor, 0);
    const econEstoque = concluida ? somaEco((o) => o.includes("estoque")) : 0;
    const econNegociacao = concluida ? somaEco((o) => !o.includes("estoque")) : 0;
    return {
      imp,
      cliente: nomeCliente.get(imp.idCliente) ?? imp.idCliente,
      provisionado,
      provPorCategoria,
      custo,
      pago,
      aVencer,
      vencido,
      porCategoria,
      saldo,
      concluida,
      economia,
      econNegociacao,
      econEstoque,
      econExecucao: concluida && provisionado > 0 ? economia - econNegociacao - econEstoque : 0,
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
