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

export type CategoriaCatalogo = "nr1_gro_pgr" | "palestras_workshops" | "diagnostico_psicossocial" | "plantao_crise" | "lideranca_saude" | "outros";

export interface ItemCatalogoCorporativo {
  id: string;
  titulo: string;
  categoria: CategoriaCatalogo;
  tagNormativa?: string; // Ex: "NR-1 / GRO / PGR", "CIPA", "ESG Social"
  descricaoCurta: string; // Breve resumo do que é
  comoFunciona: string; // Como funciona na prática
  publicoAlvo?: string; // Ex: Lideranças, CIPA, Toda a equipe
  cargaHorariaEstimada?: string; // Ex: "4 horas", "Ciclo mensal de 3 encontros", "Contínuo"
  formatoAtendimento?: "online" | "presencial" | "hibrido";
  beneficiosEsperados?: string[];
  ativo: boolean; // Se aparece no portal do RH
  destaque?: boolean; // Se ganha badge de destaque
  precoReferencia?: string; // Ex: "Sob consulta / Orçamento sob demanda", "A partir de R$ 1.200"
}

export interface SolicitacaoOrcamentoCorporativo {
  id: string;
  empresaId: string;
  empresaNome: string;
  catalogoItemId: string;
  catalogoItemTitulo: string;
  tagNormativa?: string;
  contatoNome: string;
  contatoEmail: string;
  contatoTelefone?: string;
  vidasEstimadas?: number;
  formatoDesejado?: "online" | "presencial" | "hibrido";
  urgencia?: "normal" | "alta" | "imediata";
  mensagemOuNecessidade?: string;
  indicadoresContexto?: string; // Ex: Resumo do mês/turnover no momento do pedido
  dataSolicitacao: string;
  status: "novo" | "em_analise" | "orcamento_enviado" | "contratado" | "arquivado";
}

export const DEFAULT_CATALOGO_CORPORATIVO: ItemCatalogoCorporativo[] = [
  {
    id: "nr1_gestao_riscos_psicossociais",
    titulo: "Assessoria NR-1: Gestão de Riscos Psicossociais (GRO & PGR)",
    categoria: "nr1_gro_pgr",
    tagNormativa: "Obrigatório NR-1 / GRO / PGR",
    descricaoCurta: "Estruturação técnica completa para identificação, mapeamento, matriz de risco e plano de ação contra fatores de estresse, assédio e esgotamento ocupacional exigidos pela NR-1.",
    comoFunciona: "Nossa equipe de psicólogos organizacionais e especialistas aplica instrumentos validados e escutas diagnósticas com os setores, cruzando dados de absenteísmo e turnover. Em seguida, elabora o Inventário de Riscos Psicossociais integrado ao PGR da empresa, fornecendo plano de intervenção preventiva e relatórios prontos para auditorias fiscais.",
    publicoAlvo: "RH, SESMT/CIPA, Jurídico e Alta Direção",
    cargaHorariaEstimada: "Ciclo diagnóstico de 30 a 45 dias com relatórios técnicos e suporte contínuo",
    formatoAtendimento: "hibrido",
    beneficiosEsperados: [
      "Conformidade legal plena com as diretrizes atualizadas da Norma Regulamentadora NR-1",
      "Redução direta de passivos trabalhistas relacionados a Burnout, assédio e afastamentos (FAP/NTEP)",
      "Matriz de gravidade e priorização de ações alinhada ao GRO/PGR da medicina do trabalho",
      "Melhoria do clima organizacional e mitigação de custos ocultos com absenteísmo"
    ],
    ativo: true,
    destaque: true,
    precoReferencia: "Sob medida conforme porte e quantidade de colaboradores",
  },
  {
    id: "palestra_prevencao_assedio_cipa",
    titulo: "Treinamento & Palestra: Prevenção ao Assédio e Clima Seguro (Lei 14.457/22 & CIPA)",
    categoria: "palestras_workshops",
    tagNormativa: "Obrigatório CIPA / Lei 14.457",
    descricaoCurta: "Capacitação interativa e humanizada para colaboradores e lideranças sobre prevenção ao assédio moral e sexual, respeito interpessoal e canal de apoio.",
    comoFunciona: "Conduzida por psicólogos especialistas em formato dinâmico, abordando situações do cotidiano corporativo, limites éticos, como identificar microagressões e o funcionamento do acolhimento confidencial. Inclui emissão de certificado e material para evidência documental da CIPA.",
    publicoAlvo: "Todos os colaboradores e comissão da CIPA/CIPATR",
    cargaHorariaEstimada: "Workshops de 1h30 a 2h00 por turma ou palestra magna para toda a organização",
    formatoAtendimento: "online",
    beneficiosEsperados: [
      "Cumprimento da obrigatoriedade anual da Lei 14.457/2022 (CIPA com foco em assédio)",
      "Ambiente psicologicamente seguro para comunicação transparente e denúncias legítimas",
      "Material de evidência e ata com lista de presença para inspeções e auditorias"
    ],
    ativo: true,
    destaque: true,
    precoReferencia: "Orçamento sob demanda por lote de colaboradores",
  },
  {
    id: "workshop_lideranca_acolhedora",
    titulo: "Workshop de Liderança Acolhedora: Manejo de Ansiedade e Burnout nas Equipes",
    categoria: "lideranca_saude",
    tagNormativa: "Desenvolvimento de Gestores & GRO",
    descricaoCurta: "Treinamento prático para coordenadores, supervisores e diretores identificarem sinais precoces de sofrimento mental nas suas equipes antes que se tornem afastamentos.",
    comoFunciona: "Sessões interativas de role-playing e estudos de caso focados em: como dar feedbacks sem gerar pânico, primeiros socorros emocionais, encaminhamento sem estigma para o Projeto AcolheMente e gestão saudável de prazos e metas.",
    publicoAlvo: "Gerentes, Coordenadores, Supervisores e Tech Leads",
    cargaHorariaEstimada: "Módulo imersivo de 4 horas ou trilha com 2 encontros de 2h",
    formatoAtendimento: "hibrido",
    beneficiosEsperados: [
      "Líderes preparados para agir preventivamente antes de crises graves",
      "Redução de turnover na equipe decorrente de atritos com a gestão",
      "Aumento da taxa de adesão ao acolhimento terapêutico nos casos mais críticos"
    ],
    ativo: true,
    destaque: false,
    precoReferencia: "Sob demanda por grupo de liderança",
  },
  {
    id: "plantao_escuta_gestao_crise",
    titulo: "Plantão Psicológico de Emergência & Gestão de Crise Organizacional",
    categoria: "plantao_crise",
    tagNormativa: "Intervenção Crítica Emergencial",
    descricaoCurta: "Suporte intensivo e imediato para equipes que vivenciaram eventos traumáticos, perdas de colegas, acidentes de trabalho graves ou processos intensos de reestruturação/layoffs.",
    comoFunciona: "Disponibilização rápida de plantonistas para salas individuais ou rodas de acolhimento em grupo (debriefing psicológico). Auxilia a equipe a processar o choque, restabelecer a estabilidade emocional e reduzir o impacto de estresse pós-traumático no trabalho.",
    publicoAlvo: "Equipes impactadas por eventos críticos ou setores sob pressão excepcional",
    cargaHorariaEstimada: "Atendimento emergencial de 24h a 72h conforme o evento ocorrido",
    formatoAtendimento: "online",
    beneficiosEsperados: [
      "Estabilização imediata da equipe em momentos de dor e estresse agudo",
      "Demonstração real de cuidado humano da liderança com os colaboradores",
      "Prevenção de TEPT (Transtorno de Estresse Pós-Traumático) e crises de pânico coletivas"
    ],
    ativo: true,
    destaque: false,
    precoReferencia: "Plano emergencial sob demanda",
  },
  {
    id: "diagnostico_termometro_emocional",
    titulo: "Censo de Saúde Mental & Clima Psicossocial (Diagnóstico Profundo)",
    categoria: "diagnostico_psicossocial",
    tagNormativa: "Evidência para Plano de Ação PGR",
    descricaoCurta: "Pesquisa diagnóstica anônima e confidencial com análise de dados preditivos sobre os principais estressores da equipe (sobrecarga, ergonomia cognitiva, reconhecimento, relações).",
    comoFunciona: "Disparo digital de formulário psicométrico protegido por sigilo. A IA e os psicólogos compilam dashboards estratificados por área (sem identificar indivíduos), identificando pontos de calor e entregando recomendações precisas de intervenção para a diretoria.",
    publicoAlvo: "100% da base de colaboradores",
    cargaHorariaEstimada: "Coleta em 15 dias + relatório executivo e apresentação para o board",
    formatoAtendimento: "online",
    beneficiosEsperados: [
      "Identificação antecipada de setores com risco iminente de afastamento por CID F32/F41",
      "Relatório executivo com KPIs prontos para apresentar em reuniões de diretoria e auditorias",
      "Fundamentação sólida de onde investir recursos de saúde e bem-estar com maior retorno (ROI)"
    ],
    ativo: true,
    destaque: false,
    precoReferencia: "Sob consulta conforme o número de colaboradores da empresa",
  },
];

/**
 * Retorna o catálogo corporativo consolidado da empresa.
 * Se a empresa possuir customizações salvas em `catalogoServicosConfig`, utiliza-as;
 * caso contrário, retorna os itens padrões da plataforma.
 */
export function getCatalogoEmpresa(empresa: any): ItemCatalogoCorporativo[] {
  if (empresa?.catalogoServicosConfig && Array.isArray(empresa.catalogoServicosConfig) && empresa.catalogoServicosConfig.length > 0) {
    return empresa.catalogoServicosConfig;
  }
  return DEFAULT_CATALOGO_CORPORATIVO;
}

/**
 * Retorna o PIN numérico de 4 dígitos de acesso ao RH/Ficha de Bordo da Empresa.

 * Prioridade:
 * 1. Campo customizado no documento (pinAcessoRH ou pinAcesso)
 * 2. 4 primeiros dígitos do CNPJ
 * 3. 4 primeiros dígitos do ID ou "1234"
 */
export function getEmpresaPin(empresa: any): string {
  if (!empresa) return "1234";
  if (empresa.pinAcessoRH && String(empresa.pinAcessoRH).trim().length >= 4) {
    return String(empresa.pinAcessoRH).trim().slice(0, 4);
  }
  if (empresa.pinAcesso && String(empresa.pinAcesso).trim().length >= 4) {
    return String(empresa.pinAcesso).trim().slice(0, 4);
  }
  const cnpjDigits = (empresa.cnpj || "").replace(/\D/g, "");
  if (cnpjDigits.length >= 4) {
    return cnpjDigits.slice(0, 4);
  }
  const idDigits = (empresa.id || "").replace(/\D/g, "");
  if (idDigits.length >= 4) {
    return idDigits.slice(0, 4);
  }
  return "1234";
}

/**
 * Interface dos Temas e Queixas de Busca dos Colaboradores
 * Mapeados diretamente às soluções recomendadas do Catálogo Corporativo / NR-1.
 */
export interface TemaQueixaItem {
  id: string;
  label: string;
  categoria: string;
  iconeEmoji: string;
  servicoCatalogoSugeridoId: string;
  solucaoSugeridaTitulo: string;
  solucaoSugeridaDescricao: string;
}

export const TEMAS_QUEIXAS_CORPORATIVAS: TemaQueixaItem[] = [
  {
    id: "ansiedade_estresse",
    label: "Ansiedade, Estresse & Tensão",
    categoria: "Saúde Emocional",
    iconeEmoji: "⚡",
    servicoCatalogoSugeridoId: "nr1_gestao_riscos_psicossociais",
    solucaoSugeridaTitulo: "Workshop de Manejo da Ansiedade & Gestão do Estresse",
    solucaoSugeridaDescricao: "Sessões focais para redução de estresse agudo, regulação emocional e pausas restaurativas no trabalho.",
  },
  {
    id: "burnout_sobrecarga",
    label: "Burnout, Sobrecarga & Esgotamento (NR-1)",
    categoria: "Saúde Ocupacional",
    iconeEmoji: "🔥",
    servicoCatalogoSugeridoId: "workshop_lideranca_acolhedora",
    solucaoSugeridaTitulo: "Treinamento de Liderança Acolhedora & Prevenção ao Burnout",
    solucaoSugeridaDescricao: "Mapeamento de sobrecarga e capacitação de gestores para detectar sinais precoces de exaustão e equilibrar metas.",
  },
  {
    id: "conflitos_relacionamentos",
    label: "Conflitos de Equipe & Relacionamento",
    categoria: "Clima & Relações Humanas",
    iconeEmoji: "🤝",
    servicoCatalogoSugeridoId: "palestra_prevencao_assedio_cipa",
    solucaoSugeridaTitulo: "Roda de Conversa & Comunicação Não-Violenta (CNV)",
    solucaoSugeridaDescricao: "Mediação de clima, alinhamento interpessoal e dinâmicas de segurança psicológica e respeito mútuo.",
  },
  {
    id: "tristeza_desanimo",
    label: "Depressão, Desânimo & Desmotivação",
    categoria: "Saúde Emocional",
    iconeEmoji: "🌧️",
    servicoCatalogoSugeridoId: "nr1_gestao_riscos_psicossociais",
    solucaoSugeridaTitulo: "Acolhimento Terapêutico Contínuo & Avaliação de Riscos",
    solucaoSugeridaDescricao: "Apoio clínico individualizado integrado a indicadores de suporte à vida e acompanhamento contínuo.",
  },
  {
    id: "sono_insonia",
    label: "Insônia & Distúrbios do Sono",
    categoria: "Qualidade de Vida",
    iconeEmoji: "🌙",
    servicoCatalogoSugeridoId: "nr1_gestao_riscos_psicossociais",
    solucaoSugeridaTitulo: "Palestra de Higiene do Sono & Foco Mental",
    solucaoSugeridaDescricao: "Orientação prática para melhorar a recuperação psicofísica, descanso e atenção no dia a dia.",
  },
  {
    id: "luto_crise",
    label: "Luto, Perdas & Situações de Crise",
    categoria: "Gestão de Crises",
    iconeEmoji: "🕊️",
    servicoCatalogoSugeridoId: "plantao_escuta_gestao_crise",
    solucaoSugeridaTitulo: "Plantão Psicológico & Suporte em Situações Críticas",
    solucaoSugeridaDescricao: "Intervenção focal rápida e acolhimento estruturado para colaboradores em momentos de vulnerabilidade ou perdas.",
  },
  {
    id: "carreira_desempenho",
    label: "Desenvolvimento de Carreira, Foco & Transição",
    categoria: "Performance & Carreira",
    iconeEmoji: "🎯",
    servicoCatalogoSugeridoId: "workshop_lideranca_acolhedora",
    solucaoSugeridaTitulo: "Mentoria de Carreira & Inteligência Emocional Profissional",
    solucaoSugeridaDescricao: "Fortalecimento de competências socioemocionais, clareza de metas e equilíbrio sob pressão.",
  },
  {
    id: "familia_parentalidade",
    label: "Desafios Familiares & Parentalidade",
    categoria: "Vida Pessoal & Família",
    iconeEmoji: "🏡",
    servicoCatalogoSugeridoId: "palestra_prevencao_assedio_cipa",
    solucaoSugeridaTitulo: "Ciclo de Apoio à Parentalidade & Conciliação Vida-Trabalho",
    solucaoSugeridaDescricao: "Orientação e acolhimento para pais, mães e cuidadores equilibrarem responsabilidades familiares e corporativas.",
  },
  {
    id: "autoconhecimento",
    label: "Autoconhecimento & Resiliência",
    categoria: "Desenvolvimento Pessoal",
    iconeEmoji: "🌱",
    servicoCatalogoSugeridoId: "workshop_lideranca_acolhedora",
    solucaoSugeridaTitulo: "Workshop de Autoliderança & Inteligência Emocional",
    solucaoSugeridaDescricao: "Práticas de autopercepção, gestão de limites e desenvolvimento sustentável da resiliência.",
  },
];

