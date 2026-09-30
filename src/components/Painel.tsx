"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import type { BaseCarregada } from "@/lib/types";
import {
  CATEGORIAS,
  ORIGENS,
  brl,
  brlCurto,
  dataBR,
  hojeSP,
  pct,
  resumir,
  situacao,
  type ResumoImplantacao,
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
    const s = (lista: ResumoImplantacao[], f: (r: ResumoImplantacao) => number) => lista.reduce((a, r) => a + f(r), 0);
    const concl = linhas.filter((r) => r.concluida && r.provisionado > 0);
    const provConcl = s(concl, (r) => r.provisionado);
    const categorias = [...new Set([...CATEGORIAS, ...linhas.flatMap((r) => [...Object.keys(r.porCategoria), ...Object.keys(r.provPorCategoria)])])];
    return {
      provisionado: s(linhas, (r) => r.provisionado),
      custo: s(linhas, (r) => r.custo),
      pago: s(linhas, (r) => r.pago),
      aVencer: s(linhas, (r) => r.aVencer),
      vencido: s(linhas, (r) => r.vencido),
      economia: s(concl, (r) => r.economia),
      econExecucao: s(concl, (r) => r.econExecucao),
      econNegociacao: s(concl, (r) => r.econNegociacao),
      econEstoque: s(concl, (r) => r.econEstoque),
      nConcluidas: concl.length,
      nEstouro: concl.filter((r) => r.economia < 0).length,
      econSobreProv: provConcl ? s(concl, (r) => r.economia) / provConcl : 0,
      saldoAndamento: s(linhas.filter((r) => !r.concluida), (r) => r.saldo),
      porCategoria: categorias
        .map((c) => ({
          rotulo: c,
          provisionado: s(linhas, (r) => r.provPorCategoria[c] ?? 0),
          gasto: s(linhas, (r) => r.porCategoria[c] ?? 0),
        }))
        .filter((c) => c.provisionado || c.gasto),
    };
  }, [linhas]);

  const idsFiltrados = new Set(linhas.map((r) => r.imp.id));
  const nomePorImp = new Map(linhas.map((r) => [r.imp.id, r.cliente]));
  const contasAbertas = base.lancamentos
    .filter((l) => idsFiltrados.has(l.idImplantacao))
    .map((l) => ({ l, s: situacao(l, dia) }))
    .filter((x) => x.s !== "Pago")
    .sort((a, b) =>
      a.s === b.s ? (a.l.vencimento ?? "").localeCompare(b.l.vencimento ?? "") : a.s === "Vencido" ? -1 : 1,
    );

  const tooltip = useTooltip();
  const filtrosAtivos = [fTipo, fCliente, fStatus, fAno].some((f) => f !== TODOS);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Implantações</h1>
          <p className="mt-1 text-sm text-ink-2">Quanto podia gastar, quanto gastou e quanto economizou</p>
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
      <section aria-label="Indicadores" className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi rotulo="Provisionado" valor={brl(tot.provisionado)} nota="Quanto podia gastar" />
        <Kpi
          rotulo="Gasto"
          valor={brl(tot.custo)}
          nota={tot.provisionado ? `${pct(tot.custo / tot.provisionado)} do provisionado` : "—"}
        />
        <Kpi
          rotulo="Economia"
          valor={brl(tot.economia)}
          destaque={tot.economia >= 0 ? "bom" : "ruim"}
          nota={
            tot.nConcluidas
              ? `${pct(tot.econSobreProv)} do provisionado · ${tot.nConcluidas} concluídas${tot.nEstouro ? ` · ${tot.nEstouro} com estouro` : ""}`
              : "Nenhuma concluída ainda"
          }
        />
        <Kpi rotulo="Pago" valor={brl(tot.pago)} nota={tot.custo ? `${pct(tot.pago / tot.custo)} do gasto` : "—"} />
        <Kpi
          rotulo="A vencer"
          valor={brl(tot.aVencer)}
          nota={`${contasAbertas.filter((c) => c.s === "A vencer").length} contas`}
        />
        <Kpi
          rotulo="Vencido"
          valor={brl(tot.vencido)}
          destaque={tot.vencido > 0 ? "ruim" : undefined}
          nota={
            tot.vencido > 0
              ? `${contasAbertas.filter((c) => c.s === "Vencido").length} contas em atraso`
              : "Nada em atraso"
          }
        />
      </section>

      {/* Provisionado × gasto por implantação */}
      <Cartao
        titulo="Provisionado × gasto por implantação"
        subtitulo="A faixa clara é o que podia gastar; a barra é o que gastou. Passe o mouse para ver o detalhe."
        className="mt-4"
      >
        <Legenda />
        <BulletPorImplantacao linhas={linhas} tooltip={tooltip} />
      </Cartao>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Cartao
          titulo="Provisionado × gasto por categoria"
          subtitulo="Soma das implantações filtradas (inclui as em andamento)"
        >
          <BulletPorCategoria itens={tot.porCategoria} tooltip={tooltip} />
        </Cartao>
        <Cartao
          titulo="De onde veio a economia"
          subtitulo={`Implantações concluídas · economia total ${brl(tot.economia)}`}
        >
          <BarrasOrigem
            total={tot.economia}
            tooltip={tooltip}
            itens={[
              { rotulo: ORIGENS[1], valor: tot.econNegociacao, nota: "Lançado na aba Economias" },
              { rotulo: ORIGENS[2], valor: tot.econEstoque, nota: "Lançado na aba Economias" },
              {
                rotulo: tot.econExecucao >= 0 ? "Execução abaixo do provisionado" : "Execução acima do provisionado",
                valor: tot.econExecucao,
                nota: "Economia total − negociação − estoque",
              },
            ]}
          />
        </Cartao>
      </div>

      {/* Tabela de implantações */}
      <Cartao titulo="Implantações" className="mt-4" semPadding>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <Th>Implantação</Th>
                <Th>Tipo</Th>
                <Th>Status</Th>
                <Th direita>Provisionado</Th>
                <Th direita>Gasto</Th>
                <Th direita>Usado</Th>
                <Th direita>Economia / saldo</Th>
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
                  <Td>{r.provisionado ? brl(r.provisionado) : <span className="text-muted">sem provisão</span>}</Td>
                  <Td>{brl(r.custo)}</Td>
                  <Td>
                    {r.provisionado ? (
                      <span className={r.custo > r.provisionado ? "text-critical-text" : "text-ink-2"}>
                        {pct(r.custo / r.provisionado)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td>
                    <Saldo r={r} />
                  </Td>
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
          Economia = provisionado − gasto, contada quando a implantação é concluída. Nas em andamento, o valor é o saldo
          que ainda pode ser gasto.
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

type TooltipApi = ReturnType<typeof useTooltip>;

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
        style={{
          background: base.avisos.length ? "var(--critical)" : base.fonte === "exemplo" ? "var(--muted)" : "var(--good)",
        }}
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
  destaque,
}: {
  rotulo: string;
  valor: string;
  nota?: string;
  destaque?: "bom" | "ruim";
}) {
  const faixa = destaque === "bom" ? "var(--good)" : destaque === "ruim" ? "var(--critical)" : undefined;
  return (
    <div
      className="rounded-xl border border-line bg-surface p-4"
      style={faixa ? { boxShadow: `inset 0 3px 0 ${faixa}` } : undefined}
    >
      <div className="flex items-center gap-1.5 text-sm text-ink-2">
        {destaque === "ruim" && (
          <span aria-hidden className="text-critical-text">
            ●
          </span>
        )}
        {rotulo}
      </div>
      <div className="num mt-1 text-xl font-semibold tracking-tight xl:text-2xl">{valor}</div>
      {nota && (
        <div className={`mt-1 text-xs ${destaque === "ruim" ? "text-critical-text" : "text-muted"}`}>{nota}</div>
      )}
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

function Legenda() {
  const itens = [
    { rotulo: "Provisionado", cor: "var(--track)" },
    { rotulo: "Gasto", cor: "var(--series-1)" },
    { rotulo: "Acima do provisionado", cor: "var(--critical)" },
  ];
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

/** Faixa = provisionado; barra = gasto até o provisionado; parte vermelha = o que passou. */
function Bullet({ provisionado, gasto, max }: { provisionado: number; gasto: number; max: number }) {
  const w = (v: number) => `${(v / max) * 100}%`;
  const dentro = Math.min(gasto, provisionado || gasto);
  const acima = provisionado ? Math.max(0, gasto - provisionado) : 0;
  return (
    <div className="relative h-4">
      {provisionado > 0 && <div className="absolute inset-y-0 left-0 rounded-r-[4px]" style={{ width: w(provisionado), background: "var(--track)" }} />}
      {dentro > 0 && (
        <div
          className="bar absolute top-1 bottom-1 left-0 rounded-r-[4px]"
          style={{ width: `max(2px, ${w(dentro)})`, background: "var(--series-1)" }}
        />
      )}
      {acima > 0 && (
        <div
          className="bar absolute top-1 bottom-1 rounded-r-[4px]"
          style={{ left: `calc(${w(provisionado)} + 2px)`, width: `max(2px, calc(${w(acima)} - 2px))`, background: "var(--critical)" }}
        />
      )}
      {provisionado > 0 && (
        <div
          aria-hidden
          className="absolute -top-0.5 -bottom-0.5 w-[2px] rounded-full"
          style={{ left: `calc(${w(provisionado)} - 1px)`, background: "var(--ink-2)" }}
        />
      )}
    </div>
  );
}

function Saldo({ r }: { r: ResumoImplantacao }) {
  if (!r.provisionado) return <span className="text-muted">—</span>;
  if (r.concluida) {
    return r.economia >= 0 ? (
      <span className="text-good-text">economia {brl(r.economia)}</span>
    ) : (
      <span className="text-critical-text">▲ estouro {brl(-r.economia)}</span>
    );
  }
  return r.saldo >= 0 ? (
    <span className="text-ink-2">disponível {brl(r.saldo)}</span>
  ) : (
    <span className="text-critical-text">▲ acima {brl(-r.saldo)}</span>
  );
}

function textoSaldoCurto(r: ResumoImplantacao) {
  if (!r.provisionado) return { t: "sem provisão", cls: "text-muted" };
  if (r.concluida)
    return r.economia >= 0
      ? { t: `economia ${brlCurto(r.economia)}`, cls: "text-good-text" }
      : { t: `estouro ${brlCurto(-r.economia)}`, cls: "text-critical-text" };
  return r.saldo >= 0
    ? { t: `disponível ${brlCurto(r.saldo)}`, cls: "text-muted" }
    : { t: `acima ${brlCurto(-r.saldo)}`, cls: "text-critical-text" };
}

function BulletPorImplantacao({ linhas, tooltip }: { linhas: ResumoImplantacao[]; tooltip: TooltipApi }) {
  const ordenadas = [...linhas].sort((a, b) => Math.max(b.provisionado, b.custo) - Math.max(a.provisionado, a.custo));
  const max = Math.max(1, ...ordenadas.map((r) => Math.max(r.provisionado, r.custo)));
  if (!ordenadas.length) return <p className="py-6 text-center text-sm text-muted">Sem dados.</p>;
  return (
    <div className="space-y-1">
      {ordenadas.map((r) => {
        const s = textoSaldoCurto(r);
        const linhasTip: TooltipLinha[] = [
          { rotulo: "Provisionado", valor: brl(r.provisionado), cor: "var(--track)" },
          { rotulo: "Gasto", valor: brl(r.custo), cor: "var(--series-1)" },
          { rotulo: r.concluida ? "Economia" : "Saldo", valor: brl(r.concluida ? r.economia : r.saldo) },
          ...(r.concluida && r.provisionado
            ? [
                { rotulo: "  negociação", valor: brl(r.econNegociacao) },
                { rotulo: "  estoque", valor: brl(r.econEstoque) },
                { rotulo: "  execução", valor: brl(r.econExecucao) },
              ]
            : []),
        ];
        return (
          <div
            key={r.imp.id}
            className="grid grid-cols-[minmax(0,8rem)_1fr] items-center gap-3 rounded-md px-1 py-1.5 hover:bg-hover sm:grid-cols-[minmax(0,14rem)_1fr_11.5rem]"
            onMouseMove={(e) => tooltip.mostrar(e, `${r.cliente} — ${r.imp.tipo}`, linhasTip)}
            onMouseLeave={tooltip.esconder}
          >
            <div className="min-w-0">
              <div className="truncate text-sm">{r.cliente}</div>
              <div className="truncate text-xs text-muted">
                {r.imp.tipo} · {r.imp.status}
              </div>
            </div>
            <Bullet provisionado={r.provisionado} gasto={r.custo} max={max} />
            <div className="num col-span-2 whitespace-nowrap text-right text-xs sm:col-span-1">
              <div className="text-ink-2">
                {brlCurto(r.custo)}
                {r.provisionado ? <span className="text-muted"> de {brlCurto(r.provisionado)}</span> : null}
              </div>
              <div className={s.cls}>{s.t}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BulletPorCategoria({
  itens,
  tooltip,
}: {
  itens: { rotulo: string; provisionado: number; gasto: number }[];
  tooltip: TooltipApi;
}) {
  const max = Math.max(1, ...itens.map((i) => Math.max(i.provisionado, i.gasto)));
  if (!itens.length) return <p className="py-6 text-center text-sm text-muted">Sem dados.</p>;
  return (
    <div className="space-y-3">
      {itens.map((i) => {
        const saldo = i.provisionado - i.gasto;
        return (
          <div
            key={i.rotulo}
            className="rounded-md px-1 py-1 hover:bg-hover"
            onMouseMove={(e) =>
              tooltip.mostrar(e, i.rotulo, [
                { rotulo: "Provisionado", valor: brl(i.provisionado), cor: "var(--track)" },
                { rotulo: "Gasto", valor: brl(i.gasto), cor: "var(--series-1)" },
                { rotulo: saldo >= 0 ? "Sobra" : "Acima", valor: brl(Math.abs(saldo)) },
              ])
            }
            onMouseLeave={tooltip.esconder}
          >
            <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
              <span>{i.rotulo}</span>
              <span className="num text-ink-2">
                {brl(i.gasto)}
                <span className="text-xs text-muted"> de {brl(i.provisionado)}</span>
              </span>
            </div>
            <Bullet provisionado={i.provisionado} gasto={i.gasto} max={max} />
          </div>
        );
      })}
    </div>
  );
}

function BarrasOrigem({
  itens,
  total,
  tooltip,
}: {
  itens: { rotulo: string; valor: number; nota?: string }[];
  total: number;
  tooltip: TooltipApi;
}) {
  const max = Math.max(1, ...itens.map((i) => Math.abs(i.valor)));
  return (
    <div className="space-y-3">
      {itens.map((i) => {
        const neg = i.valor < 0;
        const cor = neg ? "var(--critical)" : "var(--series-2)";
        return (
          <div
            key={i.rotulo}
            className="rounded-md px-1 py-1 hover:bg-hover"
            onMouseMove={(e) =>
              tooltip.mostrar(e, i.rotulo, [
                { rotulo: "Valor", valor: brl(i.valor), cor },
                { rotulo: "Da economia total", valor: total > 0 ? pct(i.valor / total) : "—" },
                ...(i.nota ? [{ rotulo: i.nota, valor: "" }] : []),
              ])
            }
            onMouseLeave={tooltip.esconder}
          >
            <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
              <span className={neg ? "text-critical-text" : ""}>{i.rotulo}</span>
              <span className={`num ${neg ? "text-critical-text" : "text-ink-2"}`}>{brl(i.valor)}</span>
            </div>
            <div className="h-2.5">
              {i.valor !== 0 && (
                <div
                  className="bar h-full rounded-r-[4px]"
                  style={{ width: `${Math.max(0.5, (Math.abs(i.valor) / max) * 100)}%`, background: cor }}
                />
              )}
            </div>
          </div>
        );
      })}
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
