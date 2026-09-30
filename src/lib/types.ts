export type TipoImplantacao =
  | "Portaria remota"
  | "CFTV"
  | "Controle de acesso"
  | "Interfonia"
  | string;

export type StatusImplantacao = "Planejada" | "Em andamento" | "Concluída" | string;

export type CategoriaCusto =
  | "Equipamentos/materiais"
  | "Mão de obra própria"
  | "Terceiros/empreiteiros"
  | "Deslocamento/infraestrutura"
  | string;

export type OrigemEconomia =
  | "Execução abaixo do orçado"
  | "Negociação na compra"
  | "Reaproveitamento de estoque"
  | string;

export interface Cliente {
  id: string;
  nome: string;
  cidade: string;
}

export interface Implantacao {
  id: string;
  idCliente: string;
  tipo: TipoImplantacao;
  descricao: string;
  dataInicio: string | null; // ISO yyyy-mm-dd
  dataConclusao: string | null;
  status: StatusImplantacao;
  valorOrcado: number;
}

export interface Lancamento {
  id: string;
  idImplantacao: string;
  categoria: CategoriaCusto;
  fornecedor: string;
  descricao: string;
  valor: number;
  vencimento: string | null;
  dataPagamento: string | null;
}

export interface Economia {
  id: string;
  idImplantacao: string;
  origem: OrigemEconomia;
  descricao: string;
  valor: number;
  data: string | null;
}

export interface Base {
  clientes: Cliente[];
  implantacoes: Implantacao[];
  lancamentos: Lancamento[];
  economias: Economia[];
}

export type FonteDados = "google-sheets-api" | "google-sheets-publica" | "exemplo";

export interface BaseCarregada extends Base {
  fonte: FonteDados;
  atualizadoEm: string;
  avisos: string[];
}
