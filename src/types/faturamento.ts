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
 * garantindo sincronia total com todos os campos de Meu Perfil (`cpf`, `chavePix`/`pixKey`,
 * `dadosPJ`/`perfilPJ` e `companyData` da Página White-Label).
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

  const nomeProf = source.name || source.nome || "";
  const cpfProf = source.cpf || "";
  const pixProf = source.chavePix || source.pixKey || "";
  const padraoVia: ViaFaturamento = source.faturamentoPadrao === "PJ" ? "PJ" : "PF";

  const pjLegado: DadosPessoaJuridicaLegado =
    source.dadosPJ || source.perfilPJ || {};
  const wlCompany = source.companyData || {};

  const pjMerged: DadosPessoaJuridicaLegado = {
    razaoSocial: pjLegado.razaoSocial?.trim() || wlCompany.razaoSocial?.trim() || "",
    nomeFantasia:
      pjLegado.nomeFantasia?.trim() ||
      wlCompany.nomeFantasia?.trim() ||
      wlCompany.razaoSocial?.trim() ||
      "",
    cnpj: pjLegado.cnpj?.trim() || wlCompany.cnpj?.trim() || "",
    inscricaoMunicipal: pjLegado.inscricaoMunicipal?.trim() || "",
    chavePixPJ: pjLegado.chavePixPJ?.trim() || "",
    enderecoPJ:
      pjLegado.enderecoPJ?.trim() || wlCompany.enderecoEmpresa?.trim() || "",
    cnae: pjLegado.cnae?.trim() || "8650-0/03",
  };

  const temPjFallback = Boolean(
    pjMerged.cnpj || pjMerged.razaoSocial || pjMerged.nomeFantasia
  );

  const rawList: PerfilFaturamentoItem[] = Array.isArray(source.perfisFaturamento)
    ? source.perfisFaturamento.filter(Boolean)
    : [];

  if (rawList.length > 0) {
    let hydratedList: PerfilFaturamentoItem[] = rawList.map((item) => {
      const via: ViaFaturamento = item.via === "PJ" ? "PJ" : "PF";
      const subtipo: SubtipoPerfilFaturamento =
        item.subtipo || (via === "PJ" ? "empresa_cnpj" : "conta_cpf");
      const isPrimaryPf =
        via === "PF" &&
        subtipo === "conta_cpf" &&
        (item.id === "pf_principal" ||
          rawList.findIndex((x) => x.via !== "PJ" && x.subtipo !== "dinheiro_fisico") ===
            rawList.indexOf(item));
      const isPrimaryPj =
        via === "PJ" &&
        (item.id === "pj_principal" ||
          rawList.findIndex((x) => x.via === "PJ") === rawList.indexOf(item));

      return {
        ...item,
        via,
        subtipo,
        declararIr:
          via === "PJ"
            ? false
            : typeof item.declararIr === "boolean"
            ? item.declararIr
            : subtipo === "dinheiro_fisico"
            ? false
            : true,
        titularNome:
          via === "PF"
            ? item.titularNome?.trim() || nomeProf
            : item.titularNome,
        cpf:
          isPrimaryPf && !item.cpf?.trim() && cpfProf
            ? cpfProf
            : item.cpf,
        chavePix:
          isPrimaryPf && !item.chavePix?.trim() && pixProf
            ? pixProf
            : item.chavePix,
        razaoSocial:
          isPrimaryPj && !item.razaoSocial?.trim() && pjMerged.razaoSocial
            ? pjMerged.razaoSocial
            : item.razaoSocial,
        nomeFantasia:
          isPrimaryPj && !item.nomeFantasia?.trim() && pjMerged.nomeFantasia
            ? pjMerged.nomeFantasia
            : item.nomeFantasia,
        cnpj:
          isPrimaryPj && !item.cnpj?.trim() && pjMerged.cnpj
            ? pjMerged.cnpj
            : item.cnpj,
        enderecoPJ:
          isPrimaryPj && !item.enderecoPJ?.trim() && pjMerged.enderecoPJ
            ? pjMerged.enderecoPJ
            : item.enderecoPJ,
        chavePixPJ:
          isPrimaryPj && !item.chavePixPJ?.trim() && pjMerged.chavePixPJ
            ? pjMerged.chavePixPJ
            : item.chavePixPJ,
      };
    });

    const jaTemPJ = hydratedList.some((p) => p.via === "PJ");
    if (!jaTemPJ && temPjFallback) {
      hydratedList = [
        ...hydratedList,
        {
          id: "pj_principal",
          via: "PJ",
          subtipo: "empresa_cnpj",
          apelido:
            pjMerged.nomeFantasia ||
            pjMerged.razaoSocial ||
            "Empresa Principal (CNPJ)",
          padrao: padraoVia === "PJ",
          declararIr: false,
          razaoSocial: pjMerged.razaoSocial || "",
          nomeFantasia: pjMerged.nomeFantasia || "",
          cnpj: pjMerged.cnpj || "",
          inscricaoMunicipal: pjMerged.inscricaoMunicipal || "",
          chavePixPJ: pjMerged.chavePixPJ || "",
          enderecoPJ: pjMerged.enderecoPJ || "",
          cnae: pjMerged.cnae || "8650-0/03",
        },
      ];
      if (padraoVia === "PJ") {
        hydratedList = hydratedList.map((p) => ({
          ...p,
          padrao: p.id === "pj_principal",
        }));
      }
    }

    const hasPadrao = hydratedList.some((p) => p.padrao);
    return hydratedList.map((item, idx) => ({
      ...item,
      padrao: hasPadrao ? Boolean(item.padrao) : idx === 0,
    }));
  }

  const hydrated: PerfilFaturamentoItem[] = [
    {
      id: "pf_principal",
      via: "PF",
      subtipo: "conta_cpf",
      apelido: "CPF Principal",
      padrao: padraoVia === "PF" || !temPjFallback,
      declararIr: true,
      titularNome: nomeProf,
      cpf: cpfProf,
      chavePix: pixProf,
    },
  ];

  if (temPjFallback) {
    hydrated.push({
      id: "pj_principal",
      via: "PJ",
      subtipo: "empresa_cnpj",
      apelido:
        pjMerged.nomeFantasia ||
        pjMerged.razaoSocial ||
        "Empresa Principal (CNPJ)",
      padrao: padraoVia === "PJ",
      declararIr: false,
      razaoSocial: pjMerged.razaoSocial || "",
      nomeFantasia: pjMerged.nomeFantasia || "",
      cnpj: pjMerged.cnpj || "",
      inscricaoMunicipal: pjMerged.inscricaoMunicipal || "",
      chavePixPJ: pjMerged.chavePixPJ || "",
      enderecoPJ: pjMerged.enderecoPJ || "",
      cnae: pjMerged.cnae || "8650-0/03",
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

export function getPerfilDocumentoCurto(perfil: PerfilFaturamentoItem): string {
  if (perfil.via === "PJ") {
    return perfil.cnpj?.trim() ? `CNPJ ${perfil.cnpj.trim()}` : "Pessoa Jurídica";
  }
  if (perfil.subtipo === "dinheiro_fisico") {
    return "Caixa Físico";
  }
  return perfil.cpf?.trim() ? `CPF ${perfil.cpf.trim()}` : "Pessoa Física";
}

export function getPerfilChavePixEfetiva(
  perfil?: PerfilFaturamentoItem | null,
  fallbackPix?: string
): string {
  if (!perfil) return fallbackPix || "";
  if (perfil.via === "PJ") {
    return (
      perfil.chavePixPJ?.trim() ||
      perfil.cnpj?.trim() ||
      fallbackPix?.trim() ||
      ""
    );
  }
  return perfil.chavePix?.trim() || fallbackPix?.trim() || "";
}

export function getPerfilFavorecidoEfetivo(
  perfil?: PerfilFaturamentoItem | null,
  fallbackNome?: string
): string {
  if (!perfil) return fallbackNome || "";
  if (perfil.via === "PJ") {
    return (
      perfil.razaoSocial?.trim() ||
      perfil.nomeFantasia?.trim() ||
      perfil.apelido?.trim() ||
      fallbackNome ||
      ""
    );
  }
  return perfil.titularNome?.trim() || fallbackNome || perfil.apelido || "";
}

export function formatPerfilSelectOption(perfil: PerfilFaturamentoItem): string {
  const label = formatPerfilCurtoLabel(perfil);
  if (perfil.via === "PJ" && perfil.cnpj?.trim()) {
    return `[PJ] ${label} · CNPJ ${perfil.cnpj.trim()}`;
  }
  if (perfil.via === "PF" && perfil.subtipo === "conta_cpf" && perfil.cpf?.trim()) {
    return `[PF] ${label} · CPF ${perfil.cpf.trim()}`;
  }
  return `[${perfil.via}] ${label}`;
}
