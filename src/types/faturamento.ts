export type ViaFaturamento = "PF" | "PJ";

export type SubtipoPerfilFaturamento =
  | "conta_cpf"
  | "dinheiro_fisico"
  | "empresa_cnpj";

export interface DadosPessoaJuridicaLegado {
  razaoSocial?: string;
  nomeFantasia?: string;
  cnpj?: string;
  inscricaoMunicipal?: string;
  chavePixPJ?: string;
  enderecoPJ?: string;
  cnae?: string;
}

export interface PerfilFaturamentoItem {
  id: string;
  via: ViaFaturamento;
  subtipo: SubtipoPerfilFaturamento;
  apelido: string;
  padrao?: boolean;
  /**
   * Define se os recebimentos vinculados a este perfil entram por padrão na
   * base tributável de Pessoa Física (IRPF / Carnê-Leão / Receita Saúde).
   * - Em perfis "dinheiro_fisico", nasce como false por padrão (caixa gerencial).
   * - Em perfis "empresa_cnpj" (PJ), é sempre false pois a tributação ocorre no CNPJ.
   */
  declararIr: boolean;

  // Campos Pessoa Física / Caixa
  titularNome?: string;
  cpf?: string;
  chavePix?: string;

  // Campos Pessoa Jurídica
  razaoSocial?: string;
  nomeFantasia?: string;
  cnpj?: string;
  inscricaoMunicipal?: string;
  cnae?: string;
  enderecoPJ?: string;
  chavePixPJ?: string;

  // Dados bancários opcionais (útil para recebimento corporativo TED / Boleto)
  bancoNome?: string;
  bancoAgencia?: string;
  bancoConta?: string;
}

/**
 * Hidrata e normaliza a carteira de perfis de faturamento do profissional,
 * garantindo retrocompatibilidade 100% transparente com contas que possuem
 * apenas `cpf`, `chavePix`/`pixKey` e `dadosPJ`/`perfilPJ` legados.
 */
export function normalizePerfisFaturamento(source?: any): PerfilFaturamentoItem[] {
  if (!source) {
    return [
      {
        id: "pf_principal",
        via: "PF",
        subtipo: "conta_cpf",
        apelido: "CPF Principal",
        padrao: true,
        declararIr: true,
      },
    ];
  }

  const rawList: PerfilFaturamentoItem[] = Array.isArray(source.perfisFaturamento)
    ? source.perfisFaturamento.filter(Boolean)
    : [];

  if (rawList.length > 0) {
    const hasPadrao = rawList.some((p) => p.padrao);
    return rawList.map((item, idx) => ({
      ...item,
      via: item.via === "PJ" ? "PJ" : "PF",
      subtipo:
        item.subtipo ||
        (item.via === "PJ" ? "empresa_cnpj" : "conta_cpf"),
      declararIr:
        item.via === "PJ"
          ? false
          : typeof item.declararIr === "boolean"
          ? item.declararIr
          : item.subtipo === "dinheiro_fisico"
          ? false
          : true,
      padrao: hasPadrao ? Boolean(item.padrao) : idx === 0,
    }));
  }

  const nomeProf = source.name || source.nome || "";
  const cpfProf = source.cpf || "";
  const pixProf = source.chavePix || source.pixKey || "";
  const padraoVia: ViaFaturamento = source.faturamentoPadrao === "PJ" ? "PJ" : "PF";
  const pjLegado: DadosPessoaJuridicaLegado =
    source.dadosPJ || source.perfilPJ || {};
  const temPjLegado = Boolean(
    pjLegado?.cnpj?.trim() || pjLegado?.razaoSocial?.trim() || pjLegado?.nomeFantasia?.trim()
  );

  const hydrated: PerfilFaturamentoItem[] = [
    {
      id: "pf_principal",
      via: "PF",
      subtipo: "conta_cpf",
      apelido: "CPF Principal",
      padrao: padraoVia === "PF" || !temPjLegado,
      declararIr: true,
      titularNome: nomeProf,
      cpf: cpfProf,
      chavePix: pixProf,
    },
  ];

  if (temPjLegado) {
    hydrated.push({
      id: "pj_principal",
      via: "PJ",
      subtipo: "empresa_cnpj",
      apelido:
        pjLegado.nomeFantasia?.trim() ||
        pjLegado.razaoSocial?.trim() ||
        "Empresa Principal (CNPJ)",
      padrao: padraoVia === "PJ",
      declararIr: false,
      razaoSocial: pjLegado.razaoSocial || "",
      nomeFantasia: pjLegado.nomeFantasia || "",
      cnpj: pjLegado.cnpj || "",
      inscricaoMunicipal: pjLegado.inscricaoMunicipal || "",
      chavePixPJ: pjLegado.chavePixPJ || "",
      enderecoPJ: pjLegado.enderecoPJ || "",
      cnae: pjLegado.cnae || "8650-0/03",
    });
  }

  return hydrated;
}

/**
 * Resolve qual perfil de faturamento está ativo para uma ficha ou linha específica.
 */
export function resolvePerfilFaturamentoAtivo(
  perfis: PerfilFaturamentoItem[],
  perfilId?: string | null,
  fallbackVia?: ViaFaturamento | null
): PerfilFaturamentoItem {
  const lista = perfis.length > 0 ? perfis : normalizePerfisFaturamento();

  if (perfilId) {
    const exact = lista.find((p) => p.id === perfilId);
    if (exact) return exact;
  }

  if (fallbackVia) {
    const padraoDaVia = lista.find((p) => p.via === fallbackVia && p.padrao);
    if (padraoDaVia) return padraoDaVia;
    const primeiroDaVia = lista.find((p) => p.via === fallbackVia);
    if (primeiroDaVia) return primeiroDaVia;
  }

  return lista.find((p) => p.padrao) || lista[0];
}

/**
 * Determina se um item individual (sessão ou serviço) deve compor a base
 * tributável de IRPF / Receita Saúde (regra de dupla camada: override da linha -> regra do perfil).
 */
export function shouldDeclararIrForItem(
  item: { declararIrOverride?: boolean; formaPagamento?: string },
  perfilResolvido: PerfilFaturamentoItem
): boolean {
  if (perfilResolvido.via === "PJ") return false;
  if (typeof item.declararIrOverride === "boolean") {
    return item.declararIrOverride;
  }
  return perfilResolvido.declararIr !== false;
}

/**
 * Extrai campos legados (`dadosPJ`, `faturamentoPadrao`, `cpf`, `chavePix`, `pixKey`)
 * a partir da lista atualizada de perfis para manter 100% de sincronia no documento `users/{uid}`.
 */
export function extractLegacySyncFields(
  perfis: PerfilFaturamentoItem[],
  currentCpf?: string,
  currentPix?: string
) {
  const padraoItem = perfis.find((p) => p.padrao) || perfis[0];
  const faturamentoPadrao: ViaFaturamento = padraoItem?.via === "PJ" ? "PJ" : "PF";

  const pjPrincipal =
    perfis.find((p) => p.via === "PJ" && p.padrao) ||
    perfis.find((p) => p.via === "PJ");

  const pfPrincipal =
    perfis.find((p) => p.via === "PF" && p.subtipo === "conta_cpf" && p.padrao) ||
    perfis.find((p) => p.via === "PF" && p.subtipo === "conta_cpf");

  const dadosPJ: DadosPessoaJuridicaLegado = pjPrincipal
    ? {
        razaoSocial: pjPrincipal.razaoSocial || "",
        nomeFantasia: pjPrincipal.nomeFantasia || pjPrincipal.apelido || "",
        cnpj: pjPrincipal.cnpj || "",
        inscricaoMunicipal: pjPrincipal.inscricaoMunicipal || "",
        chavePixPJ: pjPrincipal.chavePixPJ || "",
        enderecoPJ: pjPrincipal.enderecoPJ || "",
        cnae: pjPrincipal.cnae || "8650-0/03",
      }
    : {};

  const sanitizedPerfis = perfis.map((p) =>
    Object.fromEntries(
      Object.entries(p).filter(([, val]) => val !== undefined)
    ) as PerfilFaturamentoItem
  );

  return {
    perfisFaturamento: sanitizedPerfis,
    faturamentoPadrao,
    dadosPJ,
    cpf: pfPrincipal?.cpf || currentCpf || "",
    chavePix: pfPrincipal?.chavePix || currentPix || "",
    pixKey: pfPrincipal?.chavePix || currentPix || "",
  };
}

export function formatPerfilCurtoLabel(perfil: PerfilFaturamentoItem): string {
  if (perfil.via === "PJ") {
    return perfil.apelido || perfil.nomeFantasia || perfil.razaoSocial || "CNPJ";
  }
  if (perfil.subtipo === "dinheiro_fisico") {
    return perfil.apelido || "Dinheiro Físico";
  }
  return perfil.apelido || "CPF";
}
