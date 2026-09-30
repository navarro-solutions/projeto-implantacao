import { createSign } from "node:crypto";
import { baseExemplo } from "./exemplo";
import { campo, linhasParaObjetos, lerCSV, paraDataISO, paraNumero, paraTexto } from "./parse";
import type { Base, BaseCarregada, Cliente, Economia, Implantacao, Lancamento } from "./types";

/** Nomes das abas na planilha. Podem ser trocados por variáveis de ambiente. */
export const ABAS = {
  clientes: process.env.ABA_CLIENTES || "Clientes",
  implantacoes: process.env.ABA_IMPLANTACOES || "Implantacoes",
  lancamentos: process.env.ABA_LANCAMENTOS || "Lancamentos",
  economias: process.env.ABA_ECONOMIAS || "Economias",
} as const;

export const REVALIDAR_SEGUNDOS = 300;

type Linhas = unknown[][];

// ---------- Leitura: planilha compartilhada por link (somente leitura) ----------

async function lerAbaPublica(sheetId: string, aba: string): Promise<Linhas> {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(aba)}`;
  const r = await fetch(url, { next: { revalidate: REVALIDAR_SEGUNDOS } });
  if (!r.ok) throw new Error(`Aba "${aba}": HTTP ${r.status}. A planilha está compartilhada como "Qualquer pessoa com o link"?`);
  const texto = await r.text();
  if (texto.trimStart().startsWith("<")) {
    throw new Error(`Aba "${aba}": o Google devolveu uma página de login. Compartilhe a planilha por link ou use a conta de serviço.`);
  }
  return lerCSV(texto);
}

// ---------- Leitura: API do Google Sheets com conta de serviço (planilha privada) ----------

const b64url = (s: string | Buffer) => Buffer.from(s).toString("base64url");

async function tokenContaServico(email: string, chavePrivada: string): Promise<string> {
  const agora = Math.floor(Date.now() / 1000);
  const cab = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const corpo = b64url(
    JSON.stringify({
      iss: email,
      scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: agora,
      exp: agora + 3600,
    }),
  );
  const assinador = createSign("RSA-SHA256");
  assinador.update(`${cab}.${corpo}`);
  const assinatura = assinador.sign(chavePrivada).toString("base64url");
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${cab}.${corpo}.${assinatura}`,
    }),
    cache: "no-store",
  });
  const j = (await r.json()) as { access_token?: string; error_description?: string };
  if (!j.access_token) throw new Error(`Falha ao autenticar a conta de serviço: ${j.error_description ?? r.status}`);
  return j.access_token;
}

async function lerAbasAPI(sheetId: string, email: string, chave: string, abas: string[]): Promise<Linhas[]> {
  const token = await tokenContaServico(email, chave);
  const qs = new URLSearchParams({ valueRenderOption: "UNFORMATTED_VALUE", dateTimeRenderOption: "SERIAL_NUMBER" });
  abas.forEach((a) => qs.append("ranges", `'${a.replace(/'/g, "''")}'`));
  const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchGet?${qs}`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const j = (await r.json()) as { valueRanges?: { values?: Linhas }[]; error?: { message: string } };
  if (!r.ok || !j.valueRanges) {
    throw new Error(
      `API do Sheets: ${j.error?.message ?? r.status}. Confira se a planilha foi compartilhada com ${email} e se os nomes das abas batem.`,
    );
  }
  return j.valueRanges.map((v) => v.values ?? []);
}

// ---------- Conversão das linhas para o modelo ----------

function montarBase(l: { clientes: Linhas; implantacoes: Linhas; lancamentos: Linhas; economias: Linhas }): Base {
  const clientes: Cliente[] = linhasParaObjetos(l.clientes)
    .map((o) => ({
      id: paraTexto(campo(o, "id_cliente", "id")),
      nome: paraTexto(campo(o, "nome", "cliente", "nome_cliente")),
      cidade: paraTexto(campo(o, "cidade")),
    }))
    .filter((c) => c.id);

  const implantacoes: Implantacao[] = linhasParaObjetos(l.implantacoes)
    .map((o) => ({
      id: paraTexto(campo(o, "id_implantacao", "id")),
      idCliente: paraTexto(campo(o, "id_cliente", "cliente")),
      tipo: paraTexto(campo(o, "tipo", "tipo_implantacao")),
      descricao: paraTexto(campo(o, "descricao", "escopo")),
      dataInicio: paraDataISO(campo(o, "data_inicio", "inicio")),
      dataConclusao: paraDataISO(campo(o, "data_conclusao", "conclusao", "data_fim")),
      status: paraTexto(campo(o, "status")) || "Planejada",
      valorOrcado: paraNumero(campo(o, "valor_orcado", "orcado", "orcamento")),
    }))
    .filter((i) => i.id);

  const lancamentos: Lancamento[] = linhasParaObjetos(l.lancamentos)
    .map((o, idx) => ({
      id: paraTexto(campo(o, "id_lancamento", "id")) || `L${idx + 1}`,
      idImplantacao: paraTexto(campo(o, "id_implantacao", "implantacao")),
      categoria: paraTexto(campo(o, "categoria", "tipo_custo")),
      fornecedor: paraTexto(campo(o, "fornecedor")),
      descricao: paraTexto(campo(o, "descricao")),
      valor: paraNumero(campo(o, "valor")),
      vencimento: paraDataISO(campo(o, "vencimento", "data_vencimento")),
      dataPagamento: paraDataISO(campo(o, "data_pagamento", "pagamento", "pago_em")),
    }))
    .filter((x) => x.idImplantacao && x.valor);

  const economias: Economia[] = linhasParaObjetos(l.economias)
    .map((o, idx) => ({
      id: paraTexto(campo(o, "id_economia", "id")) || `E${idx + 1}`,
      idImplantacao: paraTexto(campo(o, "id_implantacao", "implantacao")),
      origem: paraTexto(campo(o, "origem", "tipo")),
      descricao: paraTexto(campo(o, "descricao")),
      valor: paraNumero(campo(o, "valor")),
      data: paraDataISO(campo(o, "data")),
    }))
    .filter((x) => x.idImplantacao && x.valor);

  return { clientes, implantacoes, lancamentos, economias };
}

// ---------- Ponto de entrada ----------

export async function carregarBase(): Promise<BaseCarregada> {
  const sheetId = process.env.GOOGLE_SHEET_ID?.trim();
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const chave = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const atualizadoEm = new Date().toISOString();

  if (!sheetId) {
    return { ...baseExemplo, fonte: "exemplo", atualizadoEm, avisos: [] };
  }

  const nomes = [ABAS.clientes, ABAS.implantacoes, ABAS.lancamentos, ABAS.economias];
  try {
    let linhas: Linhas[];
    let fonte: BaseCarregada["fonte"];
    if (email && chave) {
      linhas = await lerAbasAPI(sheetId, email, chave, nomes);
      fonte = "google-sheets-api";
    } else {
      linhas = await Promise.all(nomes.map((n) => lerAbaPublica(sheetId, n)));
      fonte = "google-sheets-publica";
    }
    const [clientes, implantacoes, lancamentos, economias] = linhas;
    const base = montarBase({ clientes, implantacoes, lancamentos, economias });
    const avisos: string[] = [];
    if (!base.implantacoes.length) avisos.push(`A aba "${ABAS.implantacoes}" não tem linhas válidas (confira a coluna id_implantacao).`);
    return { ...base, fonte, atualizadoEm, avisos };
  } catch (e) {
    // Nunca mostrar dados fictícios quando a planilha está configurada: painel vazio + aviso.
    return {
      clientes: [],
      implantacoes: [],
      lancamentos: [],
      economias: [],
      fonte: email && chave ? "google-sheets-api" : "google-sheets-publica",
      atualizadoEm,
      avisos: [e instanceof Error ? e.message : "Erro ao ler a planilha."],
    };
  }
}
