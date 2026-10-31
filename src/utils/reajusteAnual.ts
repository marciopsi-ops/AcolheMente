export type ModalidadeReajuste = "ipca" | "inpc" | "percentual" | "valor_fixo";

export interface HistoricoReajusteItem {
  id: string;
  anoCiclo: number;
  mesReferencia: number; // 1..12
  dataAplicacaoIso: string;
  acao: "aplicado" | "dispensado";
  modalidade: ModalidadeReajuste;
  indiceAplicadoPct?: number;
  valorAnterior: number;
  valorExatoCalculado?: number;
  valorNovo: number; // arredondado para o inteiro mais próximo (Math.round)
  fonteIndice?: "bcb_automatico" | "manual";
  competenciaAcumuladaBcb?: string;
  observacao?: string;
}

export interface ConfigReajusteAnual {
  ativo: boolean;
  mesReajuste?: number; // 1 (Janeiro) a 12 (Dezembro)
  modalidade: ModalidadeReajuste;
  percentualPersonalizado?: number; // usado quando modalidade === "percentual"
  valorFixoDireto?: number; // usado quando modalidade === "valor_fixo" (define o novo valor diretamente em R$)
  ultimoAnoProcessado?: number; // ex: 2026 (silencia o lembrete do ciclo já concluído/dispensado)
  avisoPrevioEnviadoCiclo?: number; // ex: 2026 (registra envio da mensagem de aviso prévio de 30 dias)
  avisoPrevioEnviadoEm?: string;
  historico?: HistoricoReajusteItem[];
  updatedAtIso?: string;
}

export interface IndicesOficiaisBCB {
  ipca12m: number | null;
  inpc12m: number | null;
  competenciaIpca?: string; // ex: "09/2026"
  competenciaInpc?: string;
  atualizadoEmIso: string;
  erroContingencia: boolean;
}

export type StatusLembreteReajuste =
  | "nao_configurado"
  | "aviso_previo"
  | "mes_vigente"
  | "processado_no_ciclo"
  | "em_dia";

export interface AvaliacaoLembreteReajuste {
  status: StatusLembreteReajuste;
  precisaAcao: boolean;
  anoCiclo: number;
  mesReajuste: number;
  mesAvisoPrevio: number;
  rotuloCurto: string;
  descricaoContextual: string;
}

export interface SimulacaoReajusteResult {
  modalidadeEfetiva: ModalidadeReajuste;
  indicePctUtilizado: number | null;
  valorAtual: number;
  valorExato: number;
  valorArredondado: number;
  diferencaReais: number;
  diferencaPercentualEfetiva: number;
  fonteIndice: "bcb_automatico" | "manual";
  competenciaBcb?: string;
  regraResumo: string;
  pendenteIndiceContingencia: boolean;
}

export const MESES_NOMES: string[] = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export const MESES_CURTOS: string[] = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

export function getNomeMesReajuste(mes?: number): string {
  if (!mes || mes < 1 || mes > 12) return "Não definido";
  return MESES_NOMES[mes - 1] || "Não definido";
}

export function getNomeCurtoMesReajuste(mes?: number): string {
  if (!mes || mes < 1 || mes > 12) return "—";
  return MESES_CURTOS[mes - 1] || "—";
}

export function parseValorMonetarioSeguro(val: any, fallback = 0): number {
  if (val === null || val === undefined || val === "") return fallback;
  if (typeof val === "number") return Number.isFinite(val) ? val : fallback;
  const raw = String(val).replace(/R\$/gi, "").trim();
  const match = raw.match(/-?\d+[\d.,]*/);
  if (!match) return fallback;
  let numStr = match[0];
  if (numStr.includes(",") && numStr.includes(".")) {
    numStr = numStr.replace(/\./g, "").replace(",", ".");
  } else if (numStr.includes(",")) {
    numStr = numStr.replace(",", ".");
  }
  const parsed = parseFloat(numStr);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function formatMoedaInteiraOuDecimal(valor: number): string {
  const num = Number.isFinite(valor) ? valor : 0;
  return `R$ ${num.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const BCB_CACHE_KEY = "acolhe_indices_bcb_v1";
const BCB_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 horas

let memoryIndicesCache: { data: IndicesOficiaisBCB; savedAt: number } | null = null;

interface BcbSeriePonto {
  data: string; // DD/MM/YYYY
  valor: string; // ex: "0.44"
}

function calcularAcumulado12Meses(pontos: BcbSeriePonto[]): {
  acumuladoPct: number | null;
  ultimaCompetencia?: string;
} {
  if (!Array.isArray(pontos) || pontos.length === 0) {
    return { acumuladoPct: null };
  }
  const ultimos12 = pontos.slice(-12);
  let fator = 1;
  let validCount = 0;
  let ultimaData = "";

  for (const p of ultimos12) {
    const taxa = parseFloat(String(p?.valor ?? "").replace(",", "."));
    if (Number.isFinite(taxa)) {
      fator *= 1 + taxa / 100;
      validCount++;
      if (p?.data) ultimaData = p.data;
    }
  }

  if (validCount === 0) {
    return { acumuladoPct: null };
  }

  const acumulado = (fator - 1) * 100;
  let ultimaCompetencia: string | undefined;
  if (ultimaData) {
    const partes = ultimaData.split("/");
    if (partes.length === 3) {
      ultimaCompetencia = `${partes[1]}/${partes[2]}`;
    } else {
      ultimaCompetencia = ultimaData;
    }
  }

  return {
    acumuladoPct: Math.round(acumulado * 100) / 100,
    ultimaCompetencia,
  };
}

async function fetchBcbSerieUltimos12(codigoSerie: 433 | 188): Promise<{
  acumuladoPct: number | null;
  ultimaCompetencia?: string;
}> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${codigoSerie}/dados/ultimos/12?formato=json`;
    const resp = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!resp.ok) {
      return { acumuladoPct: null };
    }
    const json = (await resp.json()) as BcbSeriePonto[];
    return calcularAcumulado12Meses(json);
  } catch {
    return { acumuladoPct: null };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchIndicesOficiaisBCB(
  forceRefresh = false
): Promise<IndicesOficiaisBCB> {
  const now = Date.now();

  if (!forceRefresh && memoryIndicesCache && now - memoryIndicesCache.savedAt < BCB_CACHE_TTL_MS) {
    return memoryIndicesCache.data;
  }

  if (!forceRefresh && typeof window !== "undefined") {
    try {
      const raw = window.sessionStorage.getItem(BCB_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { data: IndicesOficiaisBCB; savedAt: number };
        if (
          parsed?.data &&
          typeof parsed.savedAt === "number" &&
          now - parsed.savedAt < BCB_CACHE_TTL_MS &&
          !parsed.data.erroContingencia
        ) {
          memoryIndicesCache = parsed;
          return parsed.data;
        }
      }
    } catch {
      // ignora falha de sessionStorage
    }
  }

  const [resIpca, resInpc] = await Promise.all([
    fetchBcbSerieUltimos12(433),
    fetchBcbSerieUltimos12(188),
  ]);

  const erroContingencia = resIpca.acumuladoPct === null && resInpc.acumuladoPct === null;

  const resultado: IndicesOficiaisBCB = {
    ipca12m: resIpca.acumuladoPct,
    inpc12m: resInpc.acumuladoPct,
    competenciaIpca: resIpca.ultimaCompetencia,
    competenciaInpc: resInpc.ultimaCompetencia,
    atualizadoEmIso: new Date().toISOString(),
    erroContingencia,
  };

  if (!erroContingencia) {
    memoryIndicesCache = { data: resultado, savedAt: now };
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem(
          BCB_CACHE_KEY,
          JSON.stringify({ data: resultado, savedAt: now })
        );
      } catch {
        // ignora quota
      }
    }
  }

  return resultado;
}

/**
 * Avalia o status do ciclo anual de reajuste com antecedência de 1 mês.
 * - Se mesReajuste = 5 (Maio), o aviso prévio dispara em 4 (Abril) do mesmo ano.
 * - Se mesReajuste = 1 (Janeiro), o aviso prévio dispara em 12 (Dezembro) do ano anterior,
 *   apontando para o anoCiclo = anoAtual + 1.
 */
export function avaliarStatusLembreteReajuste(
  config?: ConfigReajusteAnual | null,
  dataRef: Date = new Date()
): AvaliacaoLembreteReajuste {
  const mesReajuste = Number(config?.mesReajuste || 0);
  if (!config || config.ativo === false || !mesReajuste || mesReajuste < 1 || mesReajuste > 12) {
    return {
      status: "nao_configurado",
      precisaAcao: false,
      anoCiclo: dataRef.getFullYear(),
      mesReajuste: 0,
      mesAvisoPrevio: 0,
      rotuloCurto: "Sem mês definido",
      descricaoContextual: "Defina o mês base para ativar o lembrete anual com 30 dias de antecedência.",
    };
  }

  const mesAtual = dataRef.getMonth() + 1; // 1..12
  const anoAtual = dataRef.getFullYear();
  const mesAvisoPrevio = mesReajuste === 1 ? 12 : mesReajuste - 1;
  const nomeMesBase = getNomeMesReajuste(mesReajuste);
  const nomeMesAviso = getNomeMesReajuste(mesAvisoPrevio);

  // Caso 1: Estamos exatamente 1 mês antes do mês de reajuste
  if (mesAtual === mesAvisoPrevio) {
    const anoCiclo = mesReajuste === 1 ? anoAtual + 1 : anoAtual;
    const jaProcessado = (config.ultimoAnoProcessado || 0) >= anoCiclo;

    if (jaProcessado) {
      return {
        status: "processado_no_ciclo",
        precisaAcao: false,
        anoCiclo,
        mesReajuste,
        mesAvisoPrevio,
        rotuloCurto: `Ciclo ${anoCiclo} concluído`,
        descricaoContextual: `O reajuste de ${nomeMesBase}/${anoCiclo} já foi processado.`,
      };
    }

    return {
      status: "aviso_previo",
      precisaAcao: true,
      anoCiclo,
      mesReajuste,
      mesAvisoPrevio,
      rotuloCurto: `Reajuste em ${nomeMesBase} (30 dias)`,
      descricaoContextual: `Falta 1 mês para o aniversário contratual (${nomeMesBase}/${anoCiclo}). Revise o valor e envie o aviso prévio.`,
    };
  }

  // Caso 2: Estamos no próprio mês de reajuste
  if (mesAtual === mesReajuste) {
    const anoCiclo = anoAtual;
    const jaProcessado = (config.ultimoAnoProcessado || 0) >= anoCiclo;

    if (jaProcessado) {
      return {
        status: "processado_no_ciclo",
        precisaAcao: false,
        anoCiclo,
        mesReajuste,
        mesAvisoPrevio,
        rotuloCurto: `Reajuste ${anoCiclo} em dia`,
        descricaoContextual: `Ciclo de ${nomeMesBase}/${anoCiclo} já atualizado.`,
      };
    }

    return {
      status: "mes_vigente",
      precisaAcao: true,
      anoCiclo,
      mesReajuste,
      mesAvisoPrevio,
      rotuloCurto: `Mês de Reajuste (${nomeMesBase})`,
      descricaoContextual: `Estamos no mês base de reajuste (${nomeMesBase}/${anoCiclo}) e a atualização deste ciclo ainda está pendente.`,
    };
  }

  // Demais meses do ano: verifica qual é o próximo ciclo
  const proximoAnoCiclo = mesAtual > mesReajuste ? anoAtual + 1 : anoAtual;
  const jaProcessadoAtual = (config.ultimoAnoProcessado || 0) >= anoAtual;

  return {
    status: jaProcessadoAtual && mesAtual > mesReajuste ? "processado_no_ciclo" : "em_dia",
    precisaAcao: false,
    anoCiclo: proximoAnoCiclo,
    mesReajuste,
    mesAvisoPrevio,
    rotuloCurto: `Mês base: ${nomeMesBase}`,
    descricaoContextual: `Próximo lembrete automático em ${nomeMesAviso} para vigência em ${nomeMesBase}/${proximoAnoCiclo}.`,
  };
}

/**
 * Calcula a simulação de reajuste respeitando:
 * 1. Governança de índices oficiais (IPCA ou INPC) quando apenasIndicesOficiais === true;
 * 2. Definição direta do novo valor em R$ quando modalidade === "valor_fixo";
 * 3. Arredondamento para o inteiro mais próximo (Math.round).
 */
export function calcularSimulacaoReajuste(
  valorAtualRaw: number,
  config: Partial<ConfigReajusteAnual> | undefined | null,
  apenasIndicesOficiais: boolean,
  indicesBcb?: IndicesOficiaisBCB | null,
  contingenciaPctManual?: number | null
): SimulacaoReajusteResult {
  const valorAtual = Math.max(0, Number.isFinite(valorAtualRaw) ? valorAtualRaw : 0);

  let modalidadeEfetiva: ModalidadeReajuste = config?.modalidade || "ipca";
  if (apenasIndicesOficiais && modalidadeEfetiva !== "ipca" && modalidadeEfetiva !== "inpc") {
    modalidadeEfetiva = "ipca";
  }

  // Modalidade: Definir novo valor fixo diretamente em R$
  if (modalidadeEfetiva === "valor_fixo") {
    const alvoDireto =
      config?.valorFixoDireto !== undefined && Number.isFinite(Number(config.valorFixoDireto))
        ? Math.max(0, Number(config.valorFixoDireto))
        : valorAtual;
    const valorArredondado = Math.round(alvoDireto);
    const diferencaReais = valorArredondado - valorAtual;
    const diferencaPercentualEfetiva =
      valorAtual > 0 ? ((valorArredondado - valorAtual) / valorAtual) * 100 : 0;

    return {
      modalidadeEfetiva,
      indicePctUtilizado: null,
      valorAtual,
      valorExato: alvoDireto,
      valorArredondado,
      diferencaReais,
      diferencaPercentualEfetiva,
      fonteIndice: "manual",
      regraResumo: "Valor definido diretamente pelo profissional",
      pendenteIndiceContingencia: false,
    };
  }

  // Modalidade: Percentual livre definido pelo profissional
  if (modalidadeEfetiva === "percentual") {
    const pct = Number.isFinite(Number(config?.percentualPersonalizado))
      ? Number(config?.percentualPersonalizado)
      : 0;
    const valorExato = Math.max(0, valorAtual * (1 + pct / 100));
    const valorArredondado = Math.round(valorExato);
    const diferencaReais = valorArredondado - valorAtual;
    const diferencaPercentualEfetiva =
      valorAtual > 0 ? ((valorArredondado - valorAtual) / valorAtual) * 100 : 0;

    return {
      modalidadeEfetiva,
      indicePctUtilizado: pct,
      valorAtual,
      valorExato,
      valorArredondado,
      diferencaReais,
      diferencaPercentualEfetiva,
      fonteIndice: "manual",
      regraResumo: `Índice personalizado de ${pct.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}%`,
      pendenteIndiceContingencia: false,
    };
  }

  // Modalidade: Índices Oficiais (IPCA ou INPC) puxados automaticamente do BCB
  const isInpc = modalidadeEfetiva === "inpc";
  const labelOficial = isInpc ? "INPC" : "IPCA";
  const valorBcb = isInpc ? indicesBcb?.inpc12m ?? null : indicesBcb?.ipca12m ?? null;
  const competenciaBcb = isInpc ? indicesBcb?.competenciaInpc : indicesBcb?.competenciaIpca;

  if (valorBcb !== null && Number.isFinite(valorBcb)) {
    const pct = Math.max(0, valorBcb);
    const valorExato = valorAtual * (1 + pct / 100);
    const valorArredondado = Math.round(valorExato);
    const diferencaReais = valorArredondado - valorAtual;
    const diferencaPercentualEfetiva =
      valorAtual > 0 ? ((valorArredondado - valorAtual) / valorAtual) * 100 : 0;

    return {
      modalidadeEfetiva,
      indicePctUtilizado: pct,
      valorAtual,
      valorExato,
      valorArredondado,
      diferencaReais,
      diferencaPercentualEfetiva,
      fonteIndice: "bcb_automatico",
      competenciaBcb,
      regraResumo: `${labelOficial} acumulado 12m (${pct.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}%)${competenciaBcb ? ` · ref. ${competenciaBcb}` : ""}`,
      pendenteIndiceContingencia: false,
    };
  }

  // Contingência offline caso API do Banco Central esteja indisponível
  const pctContingencia =
    contingenciaPctManual !== null &&
    contingenciaPctManual !== undefined &&
    Number.isFinite(Number(contingenciaPctManual))
      ? Math.max(0, Number(contingenciaPctManual))
      : null;

  if (pctContingencia !== null) {
    const valorExato = valorAtual * (1 + pctContingencia / 100);
    const valorArredondado = Math.round(valorExato);
    const diferencaReais = valorArredondado - valorAtual;
    const diferencaPercentualEfetiva =
      valorAtual > 0 ? ((valorArredondado - valorAtual) / valorAtual) * 100 : 0;

    return {
      modalidadeEfetiva,
      indicePctUtilizado: pctContingencia,
      valorAtual,
      valorExato,
      valorArredondado,
      diferencaReais,
      diferencaPercentualEfetiva,
      fonteIndice: "manual",
      regraResumo: `${labelOficial} informado em contingência (${pctContingencia.toLocaleString(
        "pt-BR",
        { minimumFractionDigits: 2, maximumFractionDigits: 2 }
      )}%)`,
      pendenteIndiceContingencia: false,
    };
  }

  return {
    modalidadeEfetiva,
    indicePctUtilizado: null,
    valorAtual,
    valorExato: valorAtual,
    valorArredondado: Math.round(valorAtual),
    diferencaReais: 0,
    diferencaPercentualEfetiva: 0,
    fonteIndice: "bcb_automatico",
    regraResumo: `Aguardando consulta automática do ${labelOficial} (12m)`,
    pendenteIndiceContingencia: Boolean(indicesBcb?.erroContingencia),
  };
}

export function sanitizeConfigReajusteAnual(config: ConfigReajusteAnual): ConfigReajusteAnual {
  const stripUndefined = (val: any): any => {
    if (Array.isArray(val)) return val.map(stripUndefined);
    if (val && typeof val === "object" && val.constructor === Object) {
      return Object.fromEntries(
        Object.entries(val)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, stripUndefined(v)])
      );
    }
    return val;
  };
  return stripUndefined(config) as ConfigReajusteAnual;
}

export function gerarMensagemAvisoPrevioReajuste(params: {
  tipoCliente: "paciente" | "empresa";
  clienteNome: string;
  contatoNome?: string;
  valorAtual: number;
  novoValor: number;
  mesReajuste: number;
  anoCiclo: number;
  regraLabel: string;
  profissionalNome?: string;
  profissionalCrp?: string;
}): string {
  const {
    tipoCliente,
    clienteNome,
    contatoNome,
    valorAtual,
    novoValor,
    mesReajuste,
    anoCiclo,
    regraLabel,
    profissionalNome,
    profissionalCrp,
  } = params;

  const nomeMes = getNomeMesReajuste(mesReajuste);
  const vAtualFmt = formatMoedaInteiraOuDecimal(valorAtual);
  const vNovoFmt = formatMoedaInteiraOuDecimal(novoValor);
  const assinatura = profissionalNome
    ? `\n\nCom carinho e à disposição,\n*${profissionalNome}*${
        profissionalCrp ? ` (CRP ${profissionalCrp})` : ""
      }`
    : "";

  if (tipoCliente === "empresa") {
    const saudacao = contatoNome ? `Olá, ${contatoNome}! Tudo bem?` : `Olá! Tudo bem?`;
    return `${saudacao}\n\nEm atenção ao aniversário anual do nosso contrato de prestação de serviços junto à *${clienteNome}*, envio este comunicado com 30 dias de antecedência para informar a atualização anual de valores prevista para *${nomeMes} de ${anoCiclo}*.\n\n• Valor vigente atual: *${vAtualFmt}*\n• Critério de atualização: *${regraLabel}*\n• Novo valor vigente a partir de ${nomeMes}/${anoCiclo}: *${vNovoFmt}* (arredondado para o inteiro mais próximo)\n\nPermaneço inteiramente à disposição para qualquer alinhamento ou emissão documental necessária.${assinatura}`;
  }

  const primeiroNome = (clienteNome || "Paciente").trim().split(/\s+/)[0];
  return `Olá, ${primeiroNome}! Tudo bem?\n\nCom 30 dias de antecedência em relação ao nosso mês anual de referência contratual (*${nomeMes} de ${anoCiclo}*), gostaria de compartilhar com transparência a atualização anual do valor das nossas sessões:\n\n• Valor atual por sessão: *${vAtualFmt}*\n• Critério aplicado: *${regraLabel}*\n• Novo valor por sessão a partir de ${nomeMes}/${anoCiclo}: *${vNovoFmt}* (arredondado para o valor inteiro mais próximo)\n\nQualquer dúvida ou necessidade de conversarmos sobre isso na nossa próxima sessão, estou totalmente à disposição!${assinatura}`;
}

/**
 * Helper unificado para verificar se um cliente (paciente ou empresa B2B) está ativo
 * e deve exibir lembrete de reajuste na Esteira de Tarefas / Contador do Topo.
 */
export function isRegistroAtivoParaReajuste(
  origem: "acessivel" | "corporativo" | "externo" | "empresa_b2b",
  registro: any
): boolean {
  if (!registro) return false;

  if (origem === "empresa_b2b") {
    return (
      registro.statusComercial !== "encerrada" &&
      registro.statusComercial !== "prospeccao"
    );
  }

  if (origem === "corporativo") {
    return registro.status === "paciente";
  }

  if (origem === "acessivel") {
    if (registro.atribuicaoStatus && registro.atribuicaoStatus !== "Aceito") {
      return false;
    }
    const st = String(registro.status || "").toLowerCase();
    if (
      registro.ativo === false ||
      registro.desligado === true ||
      st.includes("alta") ||
      st.includes("rejeitad") ||
      st.includes("encerrad") ||
      st.includes("desist") ||
      st.includes("cancelad") ||
      st.includes("quebra") ||
      st.includes("devolvid") ||
      st.includes("standby")
    ) {
      return false;
    }
    return true;
  }

  // Carteira externa / particular
  const stExt = String(registro.statusTratamento || registro.status || "").toLowerCase();
  if (
    registro.ativo === false ||
    stExt.includes("alta") ||
    stExt.includes("pausa") ||
    stExt.includes("standby") ||
    stExt.includes("desligad") ||
    stExt.includes("inativ") ||
    stExt.includes("encerrad") ||
    stExt.includes("cancelad") ||
    stExt.includes("quebra")
  ) {
    return false;
  }
  return true;
}

export function buildReajusteAlertItemId(
  origem: "acessivel" | "corporativo" | "externo" | "empresa_b2b",
  entityId: string,
  anoCiclo: number
): string {
  return `prof-reajuste-${origem}-${entityId}-${anoCiclo}`;
}
