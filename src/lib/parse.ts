// Conversões tolerantes para os formatos que aparecem em planilhas brasileiras.

export function normalizarChave(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

/** Aceita 1234.5, "1234,50", "R$ 1.234,50", "1,234.50", "-R$ 10,00". */
export function paraNumero(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (v == null) return 0;
  let s = String(v).trim();
  if (!s) return 0;
  const negativo = /^-|^\(.*\)$/.test(s) || /-\s*R\$/.test(s);
  s = s.replace(/[^\d.,]/g, "");
  if (!s) return 0;
  const ultVirgula = s.lastIndexOf(",");
  const ultPonto = s.lastIndexOf(".");
  if (ultVirgula > ultPonto) {
    // vírgula decimal (padrão BR)
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (ultPonto > ultVirgula && ultVirgula !== -1) {
    // vírgula de milhar (padrão US)
    s = s.replace(/,/g, "");
  } else if (ultVirgula === -1 && (s.match(/\./g) ?? []).length > 1) {
    // "1.234.567" sem decimais
    s = s.replace(/\./g, "");
  } else if (ultVirgula === -1 && /^\d{1,3}\.\d{3}$/.test(s)) {
    // "1.234" em planilha pt-BR = mil duzentos e trinta e quatro
    s = s.replace(".", "");
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return 0;
  return negativo ? -n : n;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Aceita dd/mm/aaaa, dd/mm/aa, aaaa-mm-dd, número serial do Sheets/Excel. Devolve aaaa-mm-dd. */
export function paraDataISO(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) {
    // serial: dias desde 30/12/1899
    const ms = Math.round((v - 25569) * 86400 * 1000);
    const d = new Date(ms);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) {
    let ano = +m[3];
    if (ano < 100) ano += 2000;
    return `${ano}-${pad(+m[2])}-${pad(+m[1])}`;
  }
  if (/^\d+(\.\d+)?$/.test(s)) return paraDataISO(Number(s));
  return null;
}

export function paraTexto(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

/** CSV simples com aspas (RFC 4180). */
export function lerCSV(texto: string): string[][] {
  const linhas: string[][] = [];
  let linha: string[] = [];
  let campo = "";
  let emAspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (emAspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          campo += '"';
          i++;
        } else emAspas = false;
      } else campo += c;
    } else if (c === '"') emAspas = true;
    else if (c === ",") {
      linha.push(campo);
      campo = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = "";
    } else campo += c;
  }
  if (campo !== "" || linha.length) {
    linha.push(campo);
    linhas.push(linha);
  }
  return linhas.filter((l) => l.some((c) => c.trim() !== ""));
}

/** Converte linhas (1ª = cabeçalho) em objetos com chaves normalizadas. */
export function linhasParaObjetos(linhas: unknown[][]): Record<string, unknown>[] {
  if (!linhas.length) return [];
  const cab = linhas[0].map((c) => normalizarChave(String(c ?? "")));
  return linhas.slice(1).map((l) => {
    const o: Record<string, unknown> = {};
    cab.forEach((k, i) => {
      if (k) o[k] = l[i];
    });
    return o;
  });
}

/** Lê o primeiro campo existente entre os nomes aceitos. */
export function campo(o: Record<string, unknown>, ...nomes: string[]): unknown {
  for (const n of nomes) {
    const k = normalizarChave(n);
    if (o[k] !== undefined && o[k] !== "") return o[k];
  }
  return undefined;
}
