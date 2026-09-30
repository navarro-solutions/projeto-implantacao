import type { Base, Economia, Implantacao, Lancamento } from "./types";

// Dados fictícios para o painel funcionar antes de a planilha ser ligada.

const clientes = [
  { id: "CLI-001", nome: "Condomínio Parque das Flores", cidade: "São Paulo" },
  { id: "CLI-002", nome: "Edifício Solar Paulista", cidade: "São Paulo" },
  { id: "CLI-003", nome: "Residencial Vila Nova", cidade: "Santo André" },
  { id: "CLI-004", nome: "Condomínio Jardim Europa", cidade: "Barueri" },
  { id: "CLI-005", nome: "Centro Empresarial Alpha", cidade: "Osasco" },
  { id: "CLI-006", nome: "Residencial Bosque Azul", cidade: "Guarulhos" },
  { id: "CLI-007", nome: "Edifício Monte Verde", cidade: "São Paulo" },
];

const imp = (
  id: string,
  idCliente: string,
  tipo: string,
  descricao: string,
  dataInicio: string,
  dataConclusao: string | null,
  status: string,
  valorOrcado: number,
): Implantacao => ({ id, idCliente, tipo, descricao, dataInicio, dataConclusao, status, valorOrcado });

const implantacoes: Implantacao[] = [
  imp("IMP-001", "CLI-001", "Portaria remota", "Migração da portaria física para remota", "2026-03-02", "2026-04-10", "Concluída", 48000),
  imp("IMP-002", "CLI-002", "CFTV", "32 câmeras IP + NVR", "2026-03-16", "2026-04-02", "Concluída", 31500),
  imp("IMP-003", "CLI-003", "Controle de acesso", "Facial em 4 acessos + tags veiculares", "2026-04-06", "2026-05-08", "Concluída", 22800),
  imp("IMP-004", "CLI-004", "Interfonia", "Interfonia IP em 120 unidades", "2026-05-04", "2026-06-12", "Concluída", 27400),
  imp("IMP-005", "CLI-005", "CFTV", "Ampliação CFTV — 18 câmeras", "2026-06-01", "2026-06-26", "Concluída", 16900),
  imp("IMP-006", "CLI-006", "Portaria remota", "Portaria remota + clausura", "2026-07-06", "2026-08-21", "Concluída", 52300),
  imp("IMP-007", "CLI-007", "Controle de acesso", "Catracas e leitores QR no hall", "2026-08-03", null, "Em andamento", 35600),
  imp("IMP-008", "CLI-001", "CFTV", "Troca de câmeras analógicas por IP", "2026-08-24", null, "Em andamento", 19800),
  imp("IMP-009", "CLI-004", "Portaria remota", "Portaria remota bloco B", "2026-09-14", null, "Em andamento", 41200),
  imp("IMP-010", "CLI-002", "Interfonia", "Interfonia IP — torre 2", "2026-10-13", null, "Planejada", 18600),
];

let seqL = 0;
const lan = (
  idImplantacao: string,
  categoria: string,
  fornecedor: string,
  descricao: string,
  valor: number,
  vencimento: string,
  dataPagamento: string | null,
): Lancamento => ({
  id: `LAN-${String(++seqL).padStart(3, "0")}`,
  idImplantacao,
  categoria,
  fornecedor,
  descricao,
  valor,
  vencimento,
  dataPagamento,
});

const EQ = "Equipamentos/materiais";
const MO = "Mão de obra própria";
const TE = "Terceiros/empreiteiros";
const DE = "Deslocamento/infraestrutura";

const lancamentos: Lancamento[] = [
  lan("IMP-001", EQ, "Intelbras (distribuidor)", "Controladores, câmeras e cabeamento", 24800, "2026-03-20", "2026-03-19"),
  lan("IMP-001", MO, "Equipe interna", "Instalação — 3 técnicos", 9600, "2026-04-15", "2026-04-15"),
  lan("IMP-001", TE, "Elétrica Silva", "Infra elétrica e eletrocalhas", 6200, "2026-04-20", "2026-04-22"),
  lan("IMP-001", DE, "Frota própria", "Combustível e pedágios", 1350, "2026-04-15", "2026-04-15"),

  lan("IMP-002", EQ, "Hikvision (distribuidor)", "Câmeras IP e NVR", 17900, "2026-03-25", "2026-03-25"),
  lan("IMP-002", MO, "Equipe interna", "Instalação e configuração", 5800, "2026-04-10", "2026-04-10"),
  lan("IMP-002", TE, "Rede & Cia", "Cabeamento estruturado", 4100, "2026-04-12", "2026-04-12"),
  lan("IMP-002", DE, "Frota própria", "Deslocamentos", 720, "2026-04-10", "2026-04-10"),

  lan("IMP-003", EQ, "ControlID (distribuidor)", "Leitores faciais e antenas UHF", 11200, "2026-04-20", "2026-04-20"),
  lan("IMP-003", MO, "Equipe interna", "Instalação", 4800, "2026-05-15", "2026-05-15"),
  lan("IMP-003", TE, "Serralheria Aço Forte", "Adequação de portões", 3900, "2026-05-20", "2026-05-28"),
  lan("IMP-003", DE, "Frota própria", "Deslocamentos", 980, "2026-05-15", "2026-05-15"),

  lan("IMP-004", EQ, "Intelbras (distribuidor)", "Centrais e terminais IP", 15600, "2026-05-18", "2026-05-18"),
  lan("IMP-004", MO, "Equipe interna", "Instalação em 120 unidades", 7400, "2026-06-20", "2026-06-20"),
  lan("IMP-004", TE, "Rede & Cia", "Passagem de cabos", 3300, "2026-06-25", "2026-06-25"),
  lan("IMP-004", DE, "Frota própria", "Deslocamentos", 860, "2026-06-20", "2026-06-20"),

  lan("IMP-005", EQ, "Hikvision (distribuidor)", "Câmeras e switch PoE", 9800, "2026-06-10", "2026-06-10"),
  lan("IMP-005", MO, "Equipe interna", "Instalação", 3900, "2026-07-05", "2026-07-05"),
  lan("IMP-005", TE, "Rede & Cia", "Cabeamento", 2400, "2026-07-08", "2026-07-08"),
  lan("IMP-005", DE, "Frota própria", "Deslocamentos", 540, "2026-07-05", "2026-07-05"),

  lan("IMP-006", EQ, "Intelbras (distribuidor)", "Controladores, clausura e câmeras", 27900, "2026-07-20", "2026-07-20"),
  lan("IMP-006", MO, "Equipe interna", "Instalação — 4 técnicos", 11200, "2026-08-28", "2026-08-28"),
  lan("IMP-006", TE, "Elétrica Silva", "Infra elétrica", 7600, "2026-09-05", null),
  lan("IMP-006", DE, "Frota própria", "Deslocamentos", 1480, "2026-08-28", "2026-08-28"),

  lan("IMP-007", EQ, "ControlID (distribuidor)", "Catracas e leitores QR", 19400, "2026-08-20", "2026-08-20"),
  lan("IMP-007", MO, "Equipe interna", "Instalação (parcial)", 4200, "2026-09-25", null),
  lan("IMP-007", TE, "Serralheria Aço Forte", "Base das catracas", 5100, "2026-10-10", null),

  lan("IMP-008", EQ, "Hikvision (distribuidor)", "Câmeras IP", 10400, "2026-09-10", "2026-09-10"),
  lan("IMP-008", MO, "Equipe interna", "Instalação", 3600, "2026-10-15", null),

  lan("IMP-009", EQ, "Intelbras (distribuidor)", "Controladores e câmeras", 21800, "2026-10-05", null),
  lan("IMP-009", TE, "Elétrica Silva", "Infra elétrica", 4900, "2026-09-26", null),
];

let seqE = 0;
const eco = (idImplantacao: string, origem: string, descricao: string, valor: number, data: string): Economia => ({
  id: `ECO-${String(++seqE).padStart(3, "0")}`,
  idImplantacao,
  origem,
  descricao,
  valor,
  data,
});

const economias: Economia[] = [
  eco("IMP-001", "Negociação na compra", "Desconto de 8% no lote de controladores", 2150, "2026-03-19"),
  eco("IMP-001", "Reaproveitamento de estoque", "Rack e nobreak do estoque", 1800, "2026-03-25"),
  eco("IMP-002", "Negociação na compra", "Frete grátis + 5% à vista", 1100, "2026-03-25"),
  eco("IMP-003", "Reaproveitamento de estoque", "Fechaduras magnéticas do estoque", 1350, "2026-04-20"),
  eco("IMP-004", "Negociação na compra", "Desconto por volume nos terminais", 1900, "2026-05-18"),
  eco("IMP-006", "Negociação na compra", "Desconto de 6% no kit clausura", 1650, "2026-07-20"),
  eco("IMP-006", "Reaproveitamento de estoque", "Câmeras remanejadas de outra obra", 2400, "2026-07-22"),
  eco("IMP-007", "Negociação na compra", "Condição especial em catracas", 2300, "2026-08-20"),
  eco("IMP-008", "Reaproveitamento de estoque", "Switch PoE do estoque", 950, "2026-09-10"),
];

export const baseExemplo: Base = { clientes, implantacoes, lancamentos, economias };
