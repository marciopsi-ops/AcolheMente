import type { ConfigReajusteAnual } from "../utils/reajusteAnual";

export type StatusEmpresaB2B =
  | "ativa_recorrente"
  | "projeto_pontual"
  | "prospeccao"
  | "encerrada";

export const STATUS_EMPRESA_B2B_LABELS: Record<StatusEmpresaB2B, string> = {
  ativa_recorrente: "Ativa · Recorrente",
  projeto_pontual: "Projeto Pontual",
  prospeccao: "Prospecção / Orçamento",
  encerrada: "Contrato Encerrado",
};

export const TIPOS_SERVICO_B2B_SUGESTOES = [
  "Palestra Corporativa",
  "Workshop / Treinamento",
  "Consultoria Riscos Psicossociais (NR-1)",
  "Plantão Psicológico In-Company",
  "Roda de Conversa / Escuta Ativa",
  "Mentoria para Lideranças",
  "Assessoria Mensal ao RH",
  "Grupo Terapêutico / Temático",
];

export interface ServicoB2BFaturamentoItem {
  id: string;
  numeroItem: number;
  data: string; // YYYY-MM-DD
  horario?: string; // HH:MM opcional (se preenchido, sincroniza bloqueio na Agenda)
  duracaoMinutos?: number;
  descricaoServico: string;
  modalidade: "online" | "presencial";
  statusExecucao: "agendado" | "em_execucao" | "realizado" | "cancelado";
  valor: number;
  perfilFaturamentoId?: string;
  viaFaturamento?: "PF" | "PJ";
  declararIrOverride?: boolean;
  statusNotaFiscal: "pendente" | "emitida" | "dispensada";
  numeroNotaFiscal?: string;
  statusPagamento: "pago" | "pendente";
  dataPagamento?: string;
  formaPagamento?: "Pix" | "TED / Transferência" | "Boleto" | "Cartão" | "Dinheiro" | "Outro";
  observacoes?: string;
}

export interface RegistroBordoEmpresaB2B {
  id: string;
  data: string; // YYYY-MM-DD
  tipo: "reuniao_rh" | "ata_entrega" | "relatorio_tecnico" | "anotacao";
  titulo: string;
  conteudo: string;
  servicoVinculadoId?: string;
  createdAtIso?: string;
}

export interface PropostaContratoB2B {
  escopoContratado?: string;
  periodicidade?: string;
  vigenciaInicio?: string;
  vigenciaFim?: string;
  valorAcordadoPadrao?: number;
  condicaoPagamento?: string;
  statusContrato?: "rascunho" | "enviado" | "assinado" | "encerrado";
  minutaPersonalizada?: string;
}

export interface EmpresaClienteB2B {
  id: string;
  profissionalId: string;
  profissionalNome?: string;
  nomeFantasia: string;
  razaoSocial: string;
  cnpj: string;
  inscricaoMunicipal?: string;
  inscricaoEstadual?: string;
  ramoAtividade?: string;
  cep?: string;
  enderecoCompleto?: string;
  cidade?: string;
  uf?: string;
  contatoNome: string;
  contatoCargo?: string;
  contatoTelefone: string;
  contatoEmail?: string;
  emailFinanceiroNf?: string;
  condicaoPagamentoPadrao?: string;
  valorServicoPadrao?: number;
  statusComercial: StatusEmpresaB2B;
  perfilFaturamento?: "PF" | "PJ";
  perfilFaturamentoId?: string;
  historicoServicos?: ServicoB2BFaturamentoItem[];
  registrosBordo?: RegistroBordoEmpresaB2B[];
  propostaContrato?: PropostaContratoB2B;
  reajusteAnual?: ConfigReajusteAnual;
  observacoesGerais?: string;
  createdAt?: any;
  updatedAt?: any;
}
