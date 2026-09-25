export type CategoriaEmpresa = "empresa_direta" | "canal_parceiro" | "empresa_conectada";

export const CATEGORIAS_EMPRESA_CONFIG: {
  id: CategoriaEmpresa;
  label: string;
  badgeLabel: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  descricao: string;
}[] = [
  {
    id: "empresa_direta",
    label: "Empresa Cliente Direta",
    badgeLabel: "Cliente Direta",
    badgeBg: "bg-blue-100",
    badgeText: "text-blue-900",
    badgeBorder: "border-blue-200",
    descricao: "Possui colaboradores próprios com acesso ao acolhimento psicológico na plataforma.",
  },
  {
    id: "canal_parceiro",
    label: "Canal de Benefícios (Parceiro Comercial)",
    badgeLabel: "Canal Parceiro",
    badgeBg: "bg-purple-100",
    badgeText: "text-purple-900",
    badgeBorder: "border-purple-300",
    descricao: "Parceiro comercial/plataforma que intermedeia e conecta outras empresas à rede.",
  },
  {
    id: "empresa_conectada",
    label: "Empresa Conectada (Cliente via Canal)",
    badgeLabel: "Empresa Conectada",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-900",
    badgeBorder: "border-emerald-200",
    descricao: "Empresa parceira trazida e vinculada sob a gestão de um Canal de Benefícios pai.",
  },
];

export function sanitizeCategorias(cats: CategoriaEmpresa[]): CategoriaEmpresa[] {
  if (!cats || cats.length === 0) return ["empresa_direta"];
  // Regra 1: Empresa Conectada é mutuamente exclusiva com Canal de Benefícios e Empresa Direta
  if (cats.includes("empresa_conectada")) {
    return ["empresa_conectada"];
  }
  // Cliente Direta e Canal de Benefícios podem coexistir
  const valid = cats.filter((c) => c === "empresa_direta" || c === "canal_parceiro");
  return valid.length > 0 ? Array.from(new Set(valid)) : ["empresa_direta"];
}

export function getEmpresaCategorias(empresa: {
  categorias?: CategoriaEmpresa[];
  categoria?: CategoriaEmpresa;
  canalAtivaColaboradoresProprios?: boolean;
} | null | undefined): CategoriaEmpresa[] {
  if (!empresa) return ["empresa_direta"];
  if (Array.isArray(empresa.categorias) && empresa.categorias.length > 0) {
    return sanitizeCategorias(empresa.categorias);
  }
  if (empresa.categoria) {
    if (empresa.categoria === "canal_parceiro" && empresa.canalAtivaColaboradoresProprios) {
      return ["canal_parceiro", "empresa_direta"];
    }
    return sanitizeCategorias([empresa.categoria]);
  }
  return ["empresa_direta"];
}

export function getIncompatibleCategorias(targetCat: CategoriaEmpresa): CategoriaEmpresa[] {
  if (targetCat === "empresa_conectada") {
    return ["empresa_direta", "canal_parceiro"];
  }
  if (targetCat === "empresa_direta" || targetCat === "canal_parceiro") {
    return ["empresa_conectada"];
  }
  return [];
}

export function resolveNextCategorias(
  currentCats: CategoriaEmpresa[],
  targetCat: CategoriaEmpresa
): { nextCats: CategoriaEmpresa[]; removedIncompatible: CategoriaEmpresa[] } {
  const isCurrentlyActive = currentCats.includes(targetCat);

  if (isCurrentlyActive) {
    // Desmarcando a categoria
    if (currentCats.length <= 1) {
      return { nextCats: currentCats, removedIncompatible: [] };
    }
    const filtered = currentCats.filter((c) => c !== targetCat);
    return { nextCats: sanitizeCategorias(filtered), removedIncompatible: [] };
  }

  // Marcando a categoria
  if (targetCat === "empresa_conectada") {
    // Substitui qualquer outra categoria
    const removed = currentCats.filter((c) => c !== "empresa_conectada");
    return { nextCats: ["empresa_conectada"], removedIncompatible: removed };
  }

  // Marcando empresa_direta ou canal_parceiro
  const withoutIncompatible = currentCats.filter((c) => c !== "empresa_conectada");
  const removed = currentCats.filter((c) => c === "empresa_conectada");
  const next = Array.from(new Set([...withoutIncompatible, targetCat]));
  return { nextCats: sanitizeCategorias(next), removedIncompatible: removed };
}

export function hasEmpresaCategoria(
  empresa: any,
  cat: CategoriaEmpresa
): boolean {
  return getEmpresaCategorias(empresa).includes(cat);
}

export interface RegraPrecoCanal {
  valorTitularMensal?: number; // Ex: R$ 2,00
  valorDependenteMensal?: number; // Ex: R$ 1,00
  diaCorteMensal?: number; // Ex: 30
}

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

export interface ServicoAdicionalItem {
  id: string;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
  data: string;
  tipo?: "servico" | "desconto" | "ajuste";
  observacao?: string;
}

export type StatusFatura = "previsto" | "faturado" | "pago" | "cancelado";

export interface FaturaHistoricoItem {
  id: string;
  competencia: string; // Ex: "09/2026"
  mes: number;
  ano: number;
  quantidadeVidasFechamento: number;
  quantidadeTitulares?: number;
  quantidadeDependentes?: number;
  valorPorVida: number;
  subtotalVidas: number;
  servicosAdicionais: ServicoAdicionalItem[];
  totalServicosAdicionais: number;
  descontosAjustes?: number;
  valorTotal: number;
  status: StatusFatura;
  dataFechamento?: string;
  dataVencimento: string;
  dataPagamento?: string;
  comprovanteUrl?: string;
  observacoes?: string;
  fechadoPor?: string;
}

export interface FaturamentoConfig {
  modeloCobranca?: "por_vida" | "franquia_excedente" | "fixo_mensal";
  valorPorVida?: number;
  valorTitular?: number;
  valorDependente?: number;
  franquiaMinimaVidas?: number;
  valorFixoMensal?: number;
  diaVencimento?: number; // Ex: 10
  chavePix?: string;
  tipoChavePix?: "cnpj" | "email" | "telefone" | "aleatoria";
  favorecidoPix?: string;
  bancoNome?: string;
  bancoAgencia?: string;
  bancoConta?: string;
  servicosAdicionaisMesAtual?: ServicoAdicionalItem[];
  historicoFaturas?: FaturaHistoricoItem[];
}
