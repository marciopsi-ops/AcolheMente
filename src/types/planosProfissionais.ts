export interface PlanoProfissionalItem {
  id: string; // "plano_1" | "plano_2" | "plano_3"
  nome: string;
  subtitulo: string;
  valorMensal: string; // ex: "29,90"
  descricao: string;
  horasInclusas?: string; // legado opcional (não mais vinculado aos planos)
  recursos: string[];
  destaque?: boolean;
  ativo: boolean;
}

export type CanonicalPlanId = "plano_1" | "plano_2" | "plano_3";

export type ModalidadeCredencial =
  | "assinatura_padrao"
  | "cortesia_essencial"
  | "cortesia_plena"
  | "usuario_teste";

export interface ModalidadeCredencialMeta {
  value: ModalidadeCredencial;
  label: string;
  shortLabel: string;
  description: string;
}

export const MODALIDADES_CREDENCIAL_OPCOES: ModalidadeCredencialMeta[] = [
  {
    value: "assinatura_padrao",
    label: "Assinatura Padrão (Pagante)",
    shortLabel: "Assinatura Padrão",
    description:
      "Segue as travas normais de cobrança/Stripe e as funcionalidades do plano contratado ou atribuído pela Gestão.",
  },
  {
    value: "cortesia_essencial",
    label: "Cortesia Essencial (Plano Acolher)",
    shortLabel: "Cortesia Essencial",
    description:
      "Isento de cobranças da plataforma. Habilita exclusivamente os recursos do Plano Acolher (Essencial).",
  },
  {
    value: "cortesia_plena",
    label: "Cortesia Plena (Acesso Total / VIP)",
    shortLabel: "Cortesia Plena",
    description:
      "Isento de cobranças da plataforma. Libera 100% dos recursos ativos (incluindo Plano Integrar: Externos, Empresas B2B e White-Label).",
  },
  {
    value: "usuario_teste",
    label: "Credencial Usuário Teste (Homologação)",
    shortLabel: "Usuário Teste",
    description:
      "Isento de cobranças e com 100% dos recursos ativos liberados para testes, porém oculto da vitrine pública de pacientes.",
  },
];

const REGEX_RECURSO_HORAS_VINCULADAS =
  /(at[eé]\s+\d+\s*horas|acima\s+de\s+\d+\s*horas|\d+\s*h(?:oras)?\s*(?:\/|\s+por\s+|\s+)m[êe]s|horas\s+mensais\s+de\s+atendimento)/i;

export function filterRecursosSemHorasVinculadas(recursos?: string[]): string[] {
  if (!Array.isArray(recursos)) return [];
  return recursos.filter(
    (rec) => !REGEX_RECURSO_HORAS_VINCULADAS.test(String(rec || "").trim())
  );
}

export function sanitizePlanoSemHoras(
  plano: PlanoProfissionalItem
): PlanoProfissionalItem {
  const { horasInclusas: _omitHoras, ...rest } = plano;
  const descricaoLimpa = String(rest.descricao || "").replace(
    /com\s+at[eé]\s+\d+\s*horas\/m[êe]s\s+dedicadas\s+a\s+acolhimentos\s+com\s+valores\s+acess[íi]veis/i,
    "com acolhimentos acessíveis e autonomia no gerenciamento da sua cota de horários"
  );
  return {
    ...rest,
    descricao: descricaoLimpa,
    recursos: filterRecursosSemHorasVinculadas(rest.recursos),
  };
}

export const PLANOS_PROFISSIONAIS_PADRAO: PlanoProfissionalItem[] = [
  {
    id: "plano_1",
    nome: "Plano Acolher (Essencial)",
    subtitulo: "Essencial • Rede Social & Corporativa",
    valorMensal: "29,90",
    descricao:
      "Operação completa na rede AcolheMente com acolhimentos acessíveis, convênios corporativos da rede, blog, eventos e autonomia na sua cota de horários.",
    recursos: [
      "Esteira de pacientes de Valores Acessíveis e Convênios Corporativos da rede",
      "Agenda clínica, Prontuário sigiloso, Contratos/Termos e Backup",
      "Faturamento PF/PJ integrado dos atendimentos da rede",
      "Publicação em Meus Artigos (Blog), Eventos e Parcerias",
      "Perfil público institucional com destaque nas buscas e Selo Sênior",
      "Autonomia para definir e gerenciar sua cota de horários",
    ],
    destaque: false,
    ativo: true,
  },
  {
    id: "plano_2",
    nome: "Plano Integrar (Expansão & White-Label)",
    subtitulo: "Mais Procurado • Consultório Particular & B2B",
    valorMensal: "49,90",
    descricao:
      "Tudo do Plano Acolher somado à gestão completa da sua carteira particular externa, empresas clientes B2B próprias e página White-Label independente.",
    recursos: [
      "Tudo o que está incluído no Plano Acolher (Essencial)",
      "Gestão da carteira particular própria (Meus Pacientes > Externos)",
      "Gestão de Empresas Clientes próprias e contratos B2B (aba Empresas)",
      "Página Profissional White-Label independente (marca própria, mapa e QR Code)",
      "Faturamento PF/PJ expandido (pacientes externos e empresas B2B próprias)",
    ],
    destaque: true,
    ativo: true,
  },
  {
    id: "plano_3",
    nome: "Plano Pleno (IA & APIs Avançadas)",
    subtitulo: "Em Desenvolvimento • Inteligência Artificial",
    valorMensal: "79,90",
    descricao:
      "Em desenvolvimento: reunirá tudo do Plano Integrar com recursos avançados de Inteligência Artificial clínica e integrações com APIs avançadas.",
    recursos: [
      "Tudo o que está incluído no Plano Integrar",
      "Assistentes e recursos avançados de Inteligência Artificial (em desenvolvimento)",
      "Integrações automatizadas com APIs avançadas (em desenvolvimento)",
    ],
    destaque: false,
    ativo: false,
  },
];

function stripAccentsLower(val?: string): string {
  return String(val || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function matchPlanItemToCanonicalId(
  pItem: Partial<PlanoProfissionalItem>,
  idx?: number
): CanonicalPlanId {
  const idNorm = stripAccentsLower(pItem?.id);
  const nomeNorm = stripAccentsLower(pItem?.nome);

  if (idNorm === "plano_1" || nomeNorm.includes("acolher") || nomeNorm.includes("essencial") || nomeNorm.includes("basico")) {
    return "plano_1";
  }
  if (idNorm === "plano_2" || nomeNorm.includes("integrar") || nomeNorm.includes("intermediario")) {
    return "plano_2";
  }
  if (idNorm === "plano_3" || nomeNorm.includes("pleno") || nomeNorm.includes("ia")) {
    return "plano_3";
  }
  if (idx === 0) return "plano_1";
  if (idx === 1) return "plano_2";
  return "plano_3";
}

/**
 * Normaliza o quadro de planos vindo do Firestore (`configuracoes/master`),
 * migrando automaticamente textos de fábrica legados (pré-reorganização v2)
 * sem sobrescrever edições manuais feitas posteriormente na Gestão Master.
 */
export function normalizePlanosConfig(
  rawPlanos?: PlanoProfissionalItem[],
  schemaVersion?: number
): PlanoProfissionalItem[] {
  if (!Array.isArray(rawPlanos) || rawPlanos.length === 0) {
    return PLANOS_PROFISSIONAIS_PADRAO.map(sanitizePlanoSemHoras);
  }

  return rawPlanos.map((raw, idx) => {
    const clean = sanitizePlanoSemHoras(raw);
    if (schemaVersion && schemaVersion >= 2) {
      return clean;
    }

    const canonical = matchPlanItemToCanonicalId(clean, idx);
    const nomeNorm = stripAccentsLower(clean.nome);

    // Migração suave dos padrões antigos de fábrica para a nova matriz oficial v2
    if (
      canonical === "plano_1" &&
      (nomeNorm === "plano acolher (basico)" || nomeNorm === "plano acolher")
    ) {
      return {
        ...PLANOS_PROFISSIONAIS_PADRAO[0],
        valorMensal: clean.valorMensal || PLANOS_PROFISSIONAIS_PADRAO[0].valorMensal,
        destaque: clean.destaque ?? PLANOS_PROFISSIONAIS_PADRAO[0].destaque,
        ativo: clean.ativo !== false,
      };
    }

    if (
      canonical === "plano_2" &&
      (nomeNorm === "plano integrar (intermediario)" || nomeNorm === "plano integrar")
    ) {
      return {
        ...PLANOS_PROFISSIONAIS_PADRAO[1],
        valorMensal: clean.valorMensal || PLANOS_PROFISSIONAIS_PADRAO[1].valorMensal,
        destaque: clean.destaque ?? PLANOS_PROFISSIONAIS_PADRAO[1].destaque,
        ativo: clean.ativo !== false,
      };
    }

    if (
      canonical === "plano_3" &&
      (nomeNorm === "plano pleno (avancado)" || nomeNorm === "plano pleno")
    ) {
      return {
        ...PLANOS_PROFISSIONAIS_PADRAO[2],
        valorMensal: clean.valorMensal || PLANOS_PROFISSIONAIS_PADRAO[2].valorMensal,
        destaque: false,
        // Plano 3 inicia inativo até ser desenvolvido, testado e ativado na Gestão
        ativo: false,
      };
    }

    return clean;
  });
}

export function getActivePlansForSelector(
  rawPlanos?: PlanoProfissionalItem[],
  schemaVersion?: number
): PlanoProfissionalItem[] {
  return normalizePlanosConfig(rawPlanos, schemaVersion).filter(
    (p) => p.ativo !== false
  );
}

export function resolveModalidadeCredencial(userOrProf: any): ModalidadeCredencial {
  if (!userOrProf) return "assinatura_padrao";
  const rawMod = String(userOrProf.modalidadeCredencial || "").trim();
  if (
    rawMod === "assinatura_padrao" ||
    rawMod === "cortesia_essencial" ||
    rawMod === "cortesia_plena" ||
    rawMod === "usuario_teste"
  ) {
    return rawMod;
  }
  if (userOrProf.isUsuarioTeste === true) {
    return "usuario_teste";
  }
  if (userOrProf.isCortesia === true) {
    return "cortesia_essencial";
  }
  return "assinatura_padrao";
}

export function isExemptFromPlatformBilling(userOrProf: any): boolean {
  if (!userOrProf) return false;
  const mod = resolveModalidadeCredencial(userOrProf);
  return (
    mod !== "assinatura_padrao" ||
    userOrProf.isCortesia === true ||
    userOrProf.statusPagamento === "isento" ||
    userOrProf.statusAssociado === "isento"
  );
}

export function hasFullAccessExemption(userOrProf: any): boolean {
  if (!userOrProf) return false;
  const mod = resolveModalidadeCredencial(userOrProf);
  return mod === "cortesia_plena" || mod === "usuario_teste";
}

export function isTestUserCredential(userOrProf: any): boolean {
  if (!userOrProf) return false;
  return (
    resolveModalidadeCredencial(userOrProf) === "usuario_teste" ||
    userOrProf.isUsuarioTeste === true
  );
}

/**
 * Converte valores atuais e legados (`"essencial"`, `"avancado"`, `"plano_1"`, `"plano_2"`, `"ia"`, etc.)
 * para o identificador canônico sincronizado com o Controle da Gestão Master.
 */
export function normalizeUserPlanId(rawPlano?: string): CanonicalPlanId {
  const norm = stripAccentsLower(rawPlano);
  if (!norm) return "plano_1";

  if (
    norm === "plano_3" ||
    norm === "ia" ||
    norm.includes("pleno")
  ) {
    return "plano_3";
  }

  // Legado "avancado" desbloqueava Externos, Empresas B2B e White-Label -> equivale exatamente ao Plano Integrar (plano_2)
  if (
    norm === "plano_2" ||
    norm.includes("integrar") ||
    norm.includes("intermed") ||
    norm === "avancado" ||
    norm.includes("avanc") ||
    norm === "premium" ||
    norm === "pro"
  ) {
    return "plano_2";
  }

  return "plano_1";
}

/**
 * Verifica se o profissional tem direito aos recursos do Plano Integrar:
 * - Meus Pacientes > Externos
 * - Empresas (carteira B2B própria)
 * - Página Profissional White-Label Independente
 * - Faturamento PF/PJ expandido (externos + B2B próprio)
 */
export function hasIntegrarFeatures(userOrProf: any): boolean {
  if (!userOrProf) return false;
  const mod = resolveModalidadeCredencial(userOrProf);
  if (mod === "cortesia_plena" || mod === "usuario_teste") {
    return true;
  }
  if (mod === "cortesia_essencial") {
    return false;
  }
  const canonical = normalizeUserPlanId(userOrProf.plano);
  return canonical === "plano_2" || canonical === "plano_3";
}

export function hasPlenoFeatures(userOrProf: any): boolean {
  if (!userOrProf) return false;
  const mod = resolveModalidadeCredencial(userOrProf);
  if (mod === "cortesia_plena" || mod === "usuario_teste") {
    return true;
  }
  if (mod === "cortesia_essencial") {
    return false;
  }
  return normalizeUserPlanId(userOrProf.plano) === "plano_3";
}

export function isPlanoIntegrarAutorizadoPelaGestao(userOrProf: any): boolean {
  if (!userOrProf) return false;
  if (hasFullAccessExemption(userOrProf)) return true;
  if (
    userOrProf.planoAvancadoLiberado === true ||
    userOrProf.planoIntegrarLiberado === true
  ) {
    return true;
  }
  const canonical = normalizeUserPlanId(userOrProf.plano);
  return canonical === "plano_2" || canonical === "plano_3";
}

export function getPlanDisplayName(
  userOrProf: any,
  rawPlanos?: PlanoProfissionalItem[],
  schemaVersion?: number
): string {
  const planos = normalizePlanosConfig(rawPlanos, schemaVersion);
  const mod = resolveModalidadeCredencial(userOrProf);

  if (mod === "cortesia_essencial") {
    const p1 = planos.find((p, i) => matchPlanItemToCanonicalId(p, i) === "plano_1");
    return `${p1?.nome || "Plano Acolher (Essencial)"} • Cortesia`;
  }
  if (mod === "cortesia_plena") {
    return "Cortesia Plena (Acesso Total)";
  }
  if (mod === "usuario_teste") {
    return "Credencial Usuário Teste (Acesso Total)";
  }

  const canonical = normalizeUserPlanId(userOrProf?.plano);
  const found = planos.find(
    (p, idx) => p.id === userOrProf?.plano || matchPlanItemToCanonicalId(p, idx) === canonical
  );
  return found?.nome || PLANOS_PROFISSIONAIS_PADRAO[0].nome;
}

export function getCredentialBadgeMeta(userOrProf: any): {
  modalidade: ModalidadeCredencial;
  label: string;
  shortLabel: string;
  tone: "default" | "purple" | "emerald" | "indigo";
} {
  const mod = resolveModalidadeCredencial(userOrProf);
  if (mod === "cortesia_plena") {
    return {
      modalidade: mod,
      label: "Cortesia Plena • Todos os Recursos Liberados",
      shortLabel: "Cortesia Plena",
      tone: "emerald",
    };
  }
  if (mod === "usuario_teste") {
    return {
      modalidade: mod,
      label: "Usuário Teste • Acesso Total (Oculto da Vitrine)",
      shortLabel: "Usuário Teste",
      tone: "indigo",
    };
  }
  if (mod === "cortesia_essencial") {
    return {
      modalidade: mod,
      label: "Cortesia Essencial • Plano Acolher",
      shortLabel: "Cortesia Acolher",
      tone: "purple",
    };
  }
  return {
    modalidade: "assinatura_padrao",
    label: "Assinatura Padrão",
    shortLabel: "Pagante",
    tone: "default",
  };
}
