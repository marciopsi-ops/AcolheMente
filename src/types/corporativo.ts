export interface CargoEmpresa {
  id: string;
  nome: string;
}

export interface ServicoCorporativoConfig {
  servicoId: string;
  nome: string;
  descricao: string;
  categoriaPublico: "adulto" | "casal" | "adolescente" | "infantil" | "geral";
  precosPorCargo: Record<
    string,
    {
      valorSessao: number;
      frequenciaRecomendada: string;
      sessoesMesEstimadas: number;
    }
  >;
}

export interface EmpresaBeneficioConfig {
  cargos: CargoEmpresa[];
  servicos: ServicoCorporativoConfig[];
}

export const DEFAULT_CARGOS_EMPRESA: CargoEmpresa[] = [
  { id: "operacional", nome: "Operacional / Assistente" },
  { id: "analista", nome: "Analista / Especialista" },
  { id: "coordenacao", nome: "Liderança / Coordenação" },
  { id: "gerencia", nome: "Gerência / Diretoria" },
];

export const DEFAULT_SERVICOS_CORPORATIVOS: ServicoCorporativoConfig[] = [
  {
    servicoId: "terapia_individual_adulto",
    nome: "Terapia Individual (Adulto)",
    descricao: "Atendimento psicoterapêutico individual para autoconhecimento, manejo de ansiedade, estresse e demandas emocionais.",
    categoriaPublico: "adulto",
    precosPorCargo: {
      operacional: { valorSessao: 60, frequenciaRecomendada: "Semanal (4 sessões/mês)", sessoesMesEstimadas: 4 },
      analista: { valorSessao: 80, frequenciaRecomendada: "Semanal (4 sessões/mês)", sessoesMesEstimadas: 4 },
      coordenacao: { valorSessao: 100, frequenciaRecomendada: "Semanal (4 sessões/mês)", sessoesMesEstimadas: 4 },
      gerencia: { valorSessao: 130, frequenciaRecomendada: "Semanal (4 sessões/mês)", sessoesMesEstimadas: 4 },
    },
  },
  {
    servicoId: "terapia_casal",
    nome: "Terapia de Casal",
    descricao: "Espaço seguro de diálogo e mediação para resolução de conflitos, fortalecimento de vínculos e alinhamento afetivo.",
    categoriaPublico: "casal",
    precosPorCargo: {
      operacional: { valorSessao: 90, frequenciaRecomendada: "Quinzenal (2 sessões/mês)", sessoesMesEstimadas: 2 },
      analista: { valorSessao: 120, frequenciaRecomendada: "Quinzenal (2 sessões/mês)", sessoesMesEstimadas: 2 },
      coordenacao: { valorSessao: 140, frequenciaRecomendada: "Quinzenal (2 sessões/mês)", sessoesMesEstimadas: 2 },
      gerencia: { valorSessao: 170, frequenciaRecomendada: "Quinzenal (2 sessões/mês)", sessoesMesEstimadas: 2 },
    },
  },
  {
    servicoId: "terapia_adolescente",
    nome: "Terapia para Adolescentes",
    descricao: "Acolhimento focado nos desafios da adolescência, orientação escolar/vocacional, ansiedade e relações familiares.",
    categoriaPublico: "adolescente",
    precosPorCargo: {
      operacional: { valorSessao: 65, frequenciaRecomendada: "Semanal (4 sessões/mês)", sessoesMesEstimadas: 4 },
      analista: { valorSessao: 80, frequenciaRecomendada: "Semanal (4 sessões/mês)", sessoesMesEstimadas: 4 },
      coordenacao: { valorSessao: 95, frequenciaRecomendada: "Semanal (4 sessões/mês)", sessoesMesEstimadas: 4 },
      gerencia: { valorSessao: 120, frequenciaRecomendada: "Semanal (4 sessões/mês)", sessoesMesEstimadas: 4 },
    },
  },
  {
    servicoId: "terapia_infantil",
    nome: "Terapia Infantil (Crianças)",
    descricao: "Ludoterapia e acompanhamento do desenvolvimento infantil, manejo de comportamento e orientação parental.",
    categoriaPublico: "infantil",
    precosPorCargo: {
      operacional: { valorSessao: 70, frequenciaRecomendada: "Semanal (4 sessões/mês)", sessoesMesEstimadas: 4 },
      analista: { valorSessao: 85, frequenciaRecomendada: "Semanal (4 sessões/mês)", sessoesMesEstimadas: 4 },
      coordenacao: { valorSessao: 100, frequenciaRecomendada: "Semanal (4 sessões/mês)", sessoesMesEstimadas: 4 },
      gerencia: { valorSessao: 125, frequenciaRecomendada: "Semanal (4 sessões/mês)", sessoesMesEstimadas: 4 },
    },
  },
  {
    servicoId: "orientacao_carreira",
    nome: "Orientação Profissional & Carreira",
    descricao: "Aconselhamento para planejamento profissional, transição de carreira, gestão de estresse laboral e liderança.",
    categoriaPublico: "geral",
    precosPorCargo: {
      operacional: { valorSessao: 70, frequenciaRecomendada: "Quinzenal (2 sessões/mês)", sessoesMesEstimadas: 2 },
      analista: { valorSessao: 90, frequenciaRecomendada: "Quinzenal (2 sessões/mês)", sessoesMesEstimadas: 2 },
      coordenacao: { valorSessao: 120, frequenciaRecomendada: "Quinzenal (2 sessões/mês)", sessoesMesEstimadas: 2 },
      gerencia: { valorSessao: 150, frequenciaRecomendada: "Quinzenal (2 sessões/mês)", sessoesMesEstimadas: 2 },
    },
  },
];

export type StatusFichaCorporativa = "solicitacao_servico" | "paciente" | "alta" | "interrupcao";

export interface HistoricoFichaCorporativa {
  data: string;
  autor: string;
  acao: string;
  detalhes?: string;
}

export interface FichaBordoCorporativa {
  id: string;
  status: StatusFichaCorporativa;
  tipoAcolhimento: "corporativo";
  empresaId: string;
  empresaNome: string;
  codigoAcesso?: string;
  colaboradorNome: string;
  colaboradorWhatsapp: string;
  cargoId: string;
  cargoNome: string;
  beneficiarioTipo: "titular" | "dependente";
  dependenteInfo?: string;
  dependenteParentesco?: string;
  servicoId: string;
  servicoNome: string;
  turnoPreferencia: string;
  queixa: string;
  valorSessao: number;
  frequenciaRecomendada: string;
  profissionalId: string;
  profissionalNome: string;
  profissionalCrp?: string;
  profissionalFoto?: string;
  createdAt: any;
  updatedAt?: any;
  dataAceite?: any;
  aceitoPor?: string;
  dataDesfecho?: any;
  motivoDesfecho?: string;
  observacoesTriagem?: string;
  historico?: HistoricoFichaCorporativa[];
}
