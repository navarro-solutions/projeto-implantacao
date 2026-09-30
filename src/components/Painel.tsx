"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import type { BaseCarregada } from "@/lib/types";
import {
  CATEGORIAS,
  ORIGENS,
  brl,
  brlCurto,
  dataBR,
  ehConcluida,
  hojeSP,
  pct,
  resumir,
  situacao,
} from "@/lib/calculos";
import { Tooltip, useTooltip, type TooltipLinha } from "./Tooltip";

const TODOS = "__todos__";
const semAssinatura = () => () => {};

export default function Painel({ base }: { base: BaseCarregada }) {
  // "hoje" é calculado no navegador para que vencido/a vencer fique certo mesmo com a página em cache.
  const hoje = useSyncExternalStore(semAssinatura, hojeSP, () => null);
  const dia = hoje ?? base.atualizadoEm.slice(0, 10);

  const [fTipo, setFTipo] = useState(TODOS);
  const [fCliente, setFCliente] = useState(TODOS);
  const [fStatus, setFStatus] = useState(TODOS);
  const [fAno, setFAno] = useState(TODOS);

  const todos = useMemo(() => resumir(base, dia), [base, dia]);

  const opcoes = useMemo(() => {
    const uniq = (xs: string[]) => [...new Set(xs.filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
    return {
      tipos: uniq(todos.map((r) => r.imp.tipo)),
      clientes: uniq(todos.map((r) => r.cliente)),
      status: uniq(todos.map((r) => r.imp.status)),
      anos: uniq(todos.map((r) => r.imp.dataInicio?.slice(0, 4) ?? "")).reverse(),
    };
  }, [todos]);

  const linhas = useMemo(
    () =>
      todos.filter(
        (r) =>
          (fTipo === TODOS || r.imp.tipo === fTipo) &&
          (fCliente === TODOS || r.cliente === fCliente) &&
          (fStatus === TODOS || r.imp.status === fStatus) &&
          (fAno === TODOS || r.imp.dataInicio?.startsWith(fAno)),
      ),
    [todos, fTipo, fCliente, fStatus, fAno],
  );

  const tot = useMemo(() => {
    const s = (f: (r: (typeof linhas)[number]) => number) => linhas.reduce((a, r) => a + f(r), 0);
    const concluidas = linhas.filter((r) => ehConcluida(r.imp));
    const orcadoConcluidas = concluidas.reduce((a, r) => a + r.imp.valorOrcado, 0);
    return {
      custo: s((r) => r.custo),
      pago: s((r) => r.pago),
      aVencer: s((r) => r.aVencer),
      vencido: s((r) => r.vencido),
      economia: s((r) => r.economia),
      econExecucao: s((r) => r.econExecucao),
      econNegociacao: s((r) => r.econNegociacao),
      econEstoque: s((r) => r.econEstoque),
      orcado: s((r) => r.imp.valorOrcado),
      nConcluidas: concluidas.length,
      econSobreOrcado: orcadoConcluidas
        ? concluidas.reduce((a, r) => a + r.economia, 0) / orcadoConcluidas
        : 0,
      porCategoria: CATEGORIAS.map((c) => ({ rotulo: c, valor: s((r) => r.porCategoria[c] ?? 0) })),
    };
  }, [linhas]);

  const idsFiltrados = new Set(linhas.map((r) => r.imp.id));
  const nomePorImp = new Map(linhas.map((r) => [r.imp.id, r.cliente]));
  const contasAbertas = base.lancamentos
    .filter((l) => idsFiltrados.has(l.idImplantacao))
    .map((l) => ({ l, s: situacao(l, dia) }))
    .filter((x) => x.s !== "Pago")
    .sort((a, b) => (a.s === b.s ? (a.l.vencimento ?? "").localeCompare(b.l.vencimento ?? "") : a.s === "Vencido" ? -1 : 1));

  const tooltip = useTooltip();
  const filtrosAtivos = [fTipo, fCliente, fStatus, fAno].some((f) => f !== TODOS);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Implantações</h1>
          <p className="mt-1 text-sm text-ink-2">Quanto cada implantação custou e quanto foi economizado</p>
        </div>
        <FonteDados base={base} />
      </header>

      {base.fonte === "exemplo" && (
        <Aviso tom="info">
          Mostrando <strong>dados de exemplo</strong>. Configure <code className="num">GOOGLE_SHEET_ID</code> para ler
          a planilha real.
        </Aviso>
      )}
      {base.avisos.map((a) => (
        <Aviso key={a} tom="erro">
          {a}
        </Aviso>
      ))}

      {/* Filtros — uma linha acima de tudo */}
      <section aria-label="Filtros" className="mt-6 flex flex-wrap items-center gap-2">
        <Filtro rotulo="Tipo" valor={fTipo} set={setFTipo} opcoes={opcoes.tipos} />
        <Filtro rotulo="Cliente" valor={fCliente} set={setFCliente} opcoes={opcoes.clientes} />
        <Filtro rotulo="Status" valor={fStatus} set={setFStatus} opcoes={opcoes.status} />
        <Filtro rotulo="Ano de início" valor={fAno} set={setFAno} opcoes={opcoes.anos} />
        {filtrosAtivos && (
          <button
            onClick={() => {
              setFTipo(TODOS);
              setFCliente(TODOS);
              setFStatus(TODOS);
              setFAno(TODOS);
            }}
            className="rounded-md px-2.5 py-1.5 text-sm text-ink-2 underline-offset-2 hover:underline"
          >
            Limpar filtros
          </button>
        )}
        <span className="ml-auto text-sm text-muted">
          {linhas.length} {linhas.length === 1 ? "implantação" : "implantações"}
        </span>
      </section>

      {/* KPIs */}
      <section aria-label="Indicadores" className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi rotulo="Custo total" valor={brl(tot.custo)} nota={`Orçado: ${brl(tot.orcado)}`} />
        <Kpi rotulo="Pago" valor={brl(tot.pago)} nota={tot.custo ? `${pct(tot.pago / tot.custo)} do custo` : "—"} />
        <Kpi
          rotulo="A vencer"
          valor={brl(tot.aVencer)}
          nota={`${contasAbertas.filter((c) => c.s === "A vencer").length} contas`}
        />
        <Kpi
          rotulo="Vencido"
          valor={brl(tot.vencido)}
          alerta={tot.vencido > 0}
          nota={
            tot.vencido > 0 ? `${contasAbertas.filter((c) => c.s === "Vencido").length} contas em atraso` : "Nada em atraso"
          }
        />
        <Kpi
          rotulo="Economizado"
          valor={brl(tot.economia)}
          destaque
          nota={tot.nConcluidas ? `${pct(tot.econSobreOrcado)} do orçado das concluídas` : "Sem implantações concluídas"}
        />
      </section>

      {/* Custo × economia por implantação */}
      <Cartao
        titulo="Custo × economia por implantação"
        subtitulo="Ordenado pelo custo. Passe o mouse para ver o detalhe."
        className="mt-4"
      >
        <Legenda
          itens={[
            { rotulo: "Custo", cor: "var(--series-1)" },
            { rotulo: "Economia", cor: "var(--series-2)" },
          ]}
        />
        <BarrasPorImplantacao linhas={linhas} tooltip={tooltip} />
      </Cartao>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Cartao titulo="De onde veio a economia" subtitulo={`Total: ${brl(tot.economia)}`}>
          <BarrasSimples
            cor="var(--series-2)"
            total={tot.economia}
            tooltip={tooltip}
            itens={[
              { rotulo: ORIGENS[0], valor: tot.econExecucao, nota: "Só implantações concluídas" },
              { rotulo: ORIGENS[1], valor: tot.econNegociacao },
              { rotulo: ORIGENS[2], valor: tot.econEstoque },
            ]}
          />
        </Cartao>
        <Cartao titulo="Custo por categoria" subtitulo={`Total: ${brl(tot.custo)}`}>
          <BarrasSimples cor="var(--series-1)" total={tot.custo} tooltip={tooltip} itens={tot.porCategoria} />
        </Cartao>
      </div>

      {/* Tabela de implantações */}
      <Cartao titulo="Implantações" className="mt-4" semPadding>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <Th>Implantação</Th>
                <Th>Tipo</Th>
                <Th>Status</Th>
                <Th direita>Orçado</Th>
                <Th direita>Custo</Th>
                <Th direita>Desvio</Th>
                <Th direita>Economia</Th>
                <Th direita>Em aberto</Th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((r) => (
                <tr key={r.imp.id} className="border-b border-line last:border-0 hover:bg-hover">
                  <td className="px-4 py-2.5">
                    <div className="font-medium">{r.cliente}</div>
                    <div className="text-xs text-muted">
                      {r.imp.id} · {r.imp.descricao || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-ink-2">{r.imp.tipo}</td>
                  <td className="px-4 py-2.5 text-ink-2">{r.imp.status}</td>
                  <Td>{brl(r.imp.valorOrcado)}</Td>
                  <Td>{brl(r.custo)}</Td>
                  <Td>
                    {r.imp.valorOrcado && ehConcluida(r.imp) ? (
                      <span className={r.desvio > 0 ? "text-critical-text" : "text-ink-2"}>
                        {r.desvio > 0 ? "▲ " : r.desvio < 0 ? "▼ " : ""}
                        {brl(Math.abs(r.desvio))}
                      </span>
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td>{r.economia ? brl(r.economia) : "—"}</Td>
                  <Td>
                    {r.vencido > 0 ? (
                      <span className="text-critical-text">{brl(r.aVencer + r.vencido)}</span>
                    ) : r.aVencer ? (
                      brl(r.aVencer)
                    ) : (
                      "—"
                    )}
                  </Td>
                </tr>
              ))}
              {!linhas.length && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted">
                    Nenhuma implantação com esses filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="border-t border-line px-4 py-2.5 text-xs text-muted">
          Desvio = custo − orçado, só para concluídas (▲ acima do orçado). Economia de execução = o que sobra de orçado − custo depois de
          descontar negociação e estoque, só para implantações concluídas.
        </p>
      </Cartao>

      {/* Contas em aberto */}
      <Cartao titulo="Contas em aberto" subtitulo="Vencidas primeiro, depois por vencimento" className="mt-4" semPadding>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <Th>Situação</Th>
                <Th>Vencimento</Th>
                <Th>Implantação</Th>
                <Th>Fornecedor</Th>
                <Th>Categoria</Th>
                <Th direita>Valor</Th>
              </tr>
            </thead>
            <tbody>
              {contasAbertas.map(({ l, s }) => (
                <tr key={l.id} className="border-b border-line last:border-0 hover:bg-hover">
                  <td className="px-4 py-2.5">
                    <Situacao s={s} />
                  </td>
                  <td className="num px-4 py-2.5">{dataBR(l.vencimento)}</td>
                  <td className="px-4 py-2.5">
                    <div>{nomePorImp.get(l.idImplantacao)}</div>
                    <div className="text-xs text-muted">{l.idImplantacao}</div>
                  </td>
                  <td className="px-4 py-2.5 text-ink-2">
                    <div>{l.fornecedor || "—"}</div>
                    {l.descricao && <div className="text-xs text-muted">{l.descricao}</div>}
                  </td>
                  <td className="px-4 py-2.5 text-ink-2">{l.categoria}</td>
                  <Td>{brl(l.valor)}</Td>
                </tr>
              ))}
              {!contasAbertas.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    Nenhuma conta em aberto.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Cartao>

      <footer className="mt-8 text-xs text-muted">
        Dados lidos em {new Date(base.atualizadoEm).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} ·
        atualiza a cada 5 minutos
      </footer>

      <Tooltip estado={tooltip.estado} />
    </main>
  );
}

// ---------------- Componentes ----------------

function FonteDados({ base }: { base: BaseCarregada }) {
  const rotulo =
    base.fonte === "exemplo"
      ? "Dados de exemplo"
      : base.fonte === "google-sheets-api"
        ? "Google Sheets (privada)"
        : "Google Sheets";
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs text-ink-2">
      <span
        aria-hidden
        className="h-2 w-2 rounded-full"
        style={{ background: base.avisos.length ? "var(--critical)" : base.fonte === "exemplo" ? "var(--muted)" : "var(--good)" }}
      />
      {rotulo}
    </span>
  );
}

function Aviso({ tom, children }: { tom: "info" | "erro"; children: React.ReactNode }) {
  return (
    <div
      role={tom === "erro" ? "alert" : "status"}
      className="mt-4 flex gap-2 rounded-lg border border-line bg-surface px-4 py-3 text-sm text-ink-2"
      style={tom === "erro" ? { borderColor: "var(--critical)" } : undefined}
    >
      <span aria-hidden>{tom === "erro" ? "⚠️" : "ℹ️"}</span>
      <div>{children}</div>
    </div>
  );
}

function Filtro({
  rotulo,
  valor,
  set,
  opcoes,
}: {
  rotulo: string;
  valor: string;
  set: (v: string) => void;
  opcoes: string[];
}) {
  return (
    <label className="flex items-center gap-2 rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm">
      <span className="text-muted">{rotulo}</span>
      <select
        value={valor}
        onChange={(e) => set(e.target.value)}
        className="max-w-[12rem] cursor-pointer bg-transparent font-medium text-ink outline-none"
      >
        <option value={TODOS}>Todos</option>
        {opcoes.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function Kpi({
  rotulo,
  valor,
  nota,
  alerta,
  destaque,
}: {
  rotulo: string;
  valor: string;
  nota?: string;
  alerta?: boolean;
  destaque?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-line bg-surface p-4 ${destaque ? "col-span-2 lg:col-span-1" : ""}`}
      style={destaque ? { boxShadow: "inset 0 3px 0 var(--series-2)" } : alerta ? { boxShadow: "inset 0 3px 0 var(--critical)" } : undefined}
    >
      <div className="flex items-center gap-1.5 text-sm text-ink-2">
        {alerta && (
          <span aria-hidden className="text-critical-text">
            ●
          </span>
        )}
        {rotulo}
      </div>
      <div className="num mt-1 text-xl font-semibold tracking-tight sm:text-2xl">{valor}</div>
      {nota && <div className={`mt-1 text-xs ${alerta ? "text-critical-text" : "text-muted"}`}>{nota}</div>}
    </div>
  );
}

function Cartao({
  titulo,
  subtitulo,
  children,
  className = "",
  semPadding,
}: {
  titulo: string;
  subtitulo?: string;
  children: React.ReactNode;
  className?: string;
  semPadding?: boolean;
}) {
  return (
    <section className={`rounded-xl border border-line bg-surface ${className}`}>
      <div className={semPadding ? "px-4 pt-4 pb-3" : "px-4 pt-4"}>
        <h2 className="text-base font-semibold">{titulo}</h2>
        {subtitulo && <p className="mt-0.5 text-xs text-muted">{subtitulo}</p>}
      </div>
      <div className={semPadding ? "" : "p-4 pt-3"}>{children}</div>
    </section>
  );
}

function Legenda({ itens }: { itens: { rotulo: string; cor: string }[] }) {
  return (
    <div className="mb-3 flex flex-wrap gap-4 text-xs text-ink-2">
      {itens.map((i) => (
        <span key={i.rotulo} className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ background: i.cor }} />
          {i.rotulo}
        </span>
      ))}
    </div>
  );
}

type TooltipApi = ReturnType<typeof useTooltip>;

function BarrasPorImplantacao({
  linhas,
  tooltip,
}: {
  linhas: ReturnType<typeof resumir>;
  tooltip: TooltipApi;
}) {
  const ordenadas = [...linhas].sort((a, b) => b.custo - a.custo);
  const max = Math.max(1, ...ordenadas.map((r) => Math.max(r.custo, r.economia)));
  if (!ordenadas.length) return <p className="py-6 text-center text-sm text-muted">Sem dados.</p>;
  return (
    <div className="space-y-1">
      {ordenadas.map((r) => {
        const linhasTip: TooltipLinha[] = [
          { rotulo: "Custo", valor: brl(r.custo), cor: "var(--series-1)" },
          { rotulo: "Economia", valor: brl(r.economia), cor: "var(--series-2)" },
          { rotulo: "Orçado", valor: brl(r.imp.valorOrcado) },
          ...(r.economia
            ? [
                { rotulo: "  execução", valor: brl(r.econExecucao) },
                { rotulo: "  negociação", valor: brl(r.econNegociacao) },
                { rotulo: "  estoque", valor: brl(r.econEstoque) },
              ]
            : []),
        ];
        return (
          <div
            key={r.imp.id}
            className="grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-3 rounded-md px-1 py-1.5 hover:bg-hover sm:grid-cols-[minmax(0,15rem)_1fr]"
            onMouseMove={(e) => tooltip.mostrar(e, `${r.cliente} — ${r.imp.tipo}`, linhasTip)}
            onMouseLeave={tooltip.esconder}
          >
            <div className="min-w-0">
              <div className="truncate text-sm">{r.cliente}</div>
              <div className="truncate text-xs text-muted">
                {r.imp.tipo} · {r.imp.status}
              </div>
            </div>
            <div className="space-y-[2px]">
              <Barra valor={r.custo} max={max} cor="var(--series-1)" rotulo={brlCurto(r.custo)} />
              <Barra valor={r.economia} max={max} cor="var(--series-2)" rotulo={r.economia ? brlCurto(r.economia) : ""} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Barra({ valor, max, cor, rotulo }: { valor: number; max: number; cor: string; rotulo: string }) {
  const w = valor > 0 ? Math.max(0.5, (valor / max) * 100) : 0;
  return (
    <div className="flex h-3 items-center gap-2">
      <div className="relative h-full flex-1">
        {w > 0 && <div className="bar h-full rounded-r-[4px]" style={{ width: `${w}%`, background: cor }} />}
      </div>
      <span className="num w-[4.75rem] shrink-0 whitespace-nowrap text-right text-xs text-ink-2">{rotulo}</span>
    </div>
  );
}

function BarrasSimples({
  itens,
  cor,
  total,
  tooltip,
}: {
  itens: { rotulo: string; valor: number; nota?: string }[];
  cor: string;
  total: number;
  tooltip: TooltipApi;
}) {
  const max = Math.max(1, ...itens.map((i) => i.valor));
  return (
    <div className="space-y-3">
      {itens.map((i) => (
        <div
          key={i.rotulo}
          className="rounded-md px-1 py-1 hover:bg-hover"
          onMouseMove={(e) =>
            tooltip.mostrar(e, i.rotulo, [
              { rotulo: "Valor", valor: brl(i.valor), cor },
              { rotulo: "Participação", valor: total ? pct(i.valor / total) : "—" },
              ...(i.nota ? [{ rotulo: i.nota, valor: "" }] : []),
            ])
          }
          onMouseLeave={tooltip.esconder}
        >
          <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
            <span>{i.rotulo}</span>
            <span className="num text-ink-2">
              {brl(i.valor)} <span className="text-xs text-muted">· {total ? pct(i.valor / total) : "—"}</span>
            </span>
          </div>
          <div className="h-2.5 rounded-r-[4px] bg-transparent">
            {i.valor > 0 && (
              <div className="bar h-full rounded-r-[4px]" style={{ width: `${Math.max(0.5, (i.valor / max) * 100)}%`, background: cor }} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function Situacao({ s }: { s: "Pago" | "A vencer" | "Vencido" }) {
  if (s === "Vencido")
    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-critical-text">
        <span aria-hidden>⚠</span> Vencido
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 text-ink-2">
      <span aria-hidden>◷</span> {s}
    </span>
  );
}

function Th({ children, direita }: { children: React.ReactNode; direita?: boolean }) {
  return <th className={`px-4 py-2 font-medium ${direita ? "text-right" : ""}`}>{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="num px-4 py-2.5 text-right">{children}</td>;
}
