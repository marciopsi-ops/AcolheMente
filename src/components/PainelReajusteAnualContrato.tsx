import React, { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  History,
  Lock,
  MessageCircle,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import {
  ConfigReajusteAnual,
  HistoricoReajusteItem,
  IndicesOficiaisBCB,
  MESES_NOMES,
  ModalidadeReajuste,
  avaliarStatusLembreteReajuste,
  calcularSimulacaoReajuste,
  fetchIndicesOficiaisBCB,
  formatMoedaInteiraOuDecimal,
  gerarMensagemAvisoPrevioReajuste,
  getNomeMesReajuste,
  sanitizeConfigReajusteAnual,
} from "../utils/reajusteAnual";

export interface PainelReajusteAnualContratoProps {
  tipoCliente: "paciente" | "empresa";
  clienteNome: string;
  contatoNome?: string;
  contatoTelefone?: string;
  valorAtual: number;
  apenasIndicesOficiais: boolean;
  origemContratoLabel?: string;
  config?: ConfigReajusteAnual | null;
  profissionalNome?: string;
  profissionalCrp?: string;
  qtdLancamentosFuturos?: number;
  onSave: (
    novaConfig: ConfigReajusteAnual,
    opcoesAplicacao?: {
      novoValorBase?: number;
      atualizarAgendadosFuturos?: boolean;
      vigenciaAnoMes?: string;
    }
  ) => Promise<void> | void;
  showToast: (
    msg: string,
    type?: "success" | "error" | "info" | "warning"
  ) => void;
}

export const PainelReajusteAnualContrato: React.FC<
  PainelReajusteAnualContratoProps
> = ({
  tipoCliente,
  clienteNome,
  contatoNome,
  contatoTelefone,
  valorAtual,
  apenasIndicesOficiais,
  origemContratoLabel,
  config,
  profissionalNome,
  profissionalCrp,
  qtdLancamentosFuturos = 0,
  onSave,
  showToast,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showHistorico, setShowHistorico] = useState(false);
  const [saving, setSaving] = useState(false);

  // Estado editável local sincronizado com `config`
  const [ativo, setAtivo] = useState<boolean>(config?.ativo ?? true);
  const [mesReajuste, setMesReajuste] = useState<number>(
    config?.mesReajuste || 0
  );
  const [modalidade, setModalidade] = useState<ModalidadeReajuste>(() => {
    const inicial = config?.modalidade || "ipca";
    if (apenasIndicesOficiais && inicial !== "ipca" && inicial !== "inpc") {
      return "ipca";
    }
    return inicial;
  });
  const [percentualInput, setPercentualInput] = useState<string>(
    config?.percentualPersonalizado !== undefined
      ? String(config.percentualPersonalizado)
      : "5"
  );
  const [valorFixoDiretoInput, setValorFixoDiretoInput] = useState<string>(
    config?.valorFixoDireto !== undefined
      ? String(config.valorFixoDireto)
      : String(Math.round(valorAtual || 0))
  );
  const [contingenciaPctInput, setContingenciaPctInput] = useState<string>("");
  const [atualizarFuturos, setAtualizarFuturos] = useState<boolean>(true);

  // Índices oficiais BCB (IPCA / INPC)
  const [indicesBcb, setIndicesBcb] = useState<IndicesOficiaisBCB | null>(null);
  const [loadingBcb, setLoadingBcb] = useState<boolean>(false);

  useEffect(() => {
    setAtivo(config?.ativo ?? true);
    setMesReajuste(config?.mesReajuste || 0);
    const mod = config?.modalidade || "ipca";
    setModalidade(
      apenasIndicesOficiais && mod !== "ipca" && mod !== "inpc" ? "ipca" : mod
    );
    if (config?.percentualPersonalizado !== undefined) {
      setPercentualInput(String(config.percentualPersonalizado));
    }
    if (config?.valorFixoDireto !== undefined) {
      setValorFixoDiretoInput(String(config.valorFixoDireto));
    } else {
      setValorFixoDiretoInput(String(Math.round(valorAtual || 0)));
    }
  }, [
    config?.ativo,
    config?.mesReajuste,
    config?.modalidade,
    config?.percentualPersonalizado,
    config?.valorFixoDireto,
    apenasIndicesOficiais,
    valorAtual,
  ]);

  const precisaConsultarBcb =
    expanded ||
    Boolean(config?.mesReajuste) ||
    modalidade === "ipca" ||
    modalidade === "inpc";

  const carregarIndicesBcb = async (forcar = false) => {
    try {
      setLoadingBcb(true);
      const dados = await fetchIndicesOficiaisBCB(forcar);
      setIndicesBcb(dados);
      if (forcar && !dados.erroContingencia) {
        showToast(
          "Índices oficiais IPCA e INPC atualizados direto do Banco Central!",
          "success"
        );
      }
    } finally {
      setLoadingBcb(false);
    }
  };

  useEffect(() => {
    if (precisaConsultarBcb && !indicesBcb && !loadingBcb) {
      carregarIndicesBcb(false);
    }
  }, [precisaConsultarBcb]);

  const configRascunho: ConfigReajusteAnual = useMemo(() => {
    const pctNum = parseFloat(percentualInput.replace(",", "."));
    const fixoNum = parseFloat(valorFixoDiretoInput.replace(",", "."));
    return {
      ativo,
      mesReajuste: mesReajuste > 0 ? mesReajuste : undefined,
      modalidade:
        apenasIndicesOficiais && modalidade !== "ipca" && modalidade !== "inpc"
          ? "ipca"
          : modalidade,
      percentualPersonalizado: Number.isFinite(pctNum) ? pctNum : 0,
      valorFixoDireto: Number.isFinite(fixoNum)
        ? Math.max(0, fixoNum)
        : Math.round(valorAtual || 0),
      ultimoAnoProcessado: config?.ultimoAnoProcessado,
      avisoPrevioEnviadoCiclo: config?.avisoPrevioEnviadoCiclo,
      avisoPrevioEnviadoEm: config?.avisoPrevioEnviadoEm,
      historico: Array.isArray(config?.historico) ? config!.historico : [],
    };
  }, [
    ativo,
    mesReajuste,
    modalidade,
    apenasIndicesOficiais,
    percentualInput,
    valorFixoDiretoInput,
    valorAtual,
    config?.ultimoAnoProcessado,
    config?.avisoPrevioEnviadoCiclo,
    config?.avisoPrevioEnviadoEm,
    config?.historico,
  ]);

  const avaliacaoSalva = useMemo(
    () => avaliarStatusLembreteReajuste(config),
    [config]
  );

  const avaliacaoRascunho = useMemo(
    () => avaliarStatusLembreteReajuste(configRascunho),
    [configRascunho]
  );

  const contingenciaNum = useMemo(() => {
    if (!contingenciaPctInput.trim()) return null;
    const n = parseFloat(contingenciaPctInput.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }, [contingenciaPctInput]);

  const simulacao = useMemo(
    () =>
      calcularSimulacaoReajuste(
        valorAtual,
        configRascunho,
        apenasIndicesOficiais,
        indicesBcb,
        contingenciaNum
      ),
    [
      valorAtual,
      configRascunho,
      apenasIndicesOficiais,
      indicesBcb,
      contingenciaNum,
    ]
  );

  const historicoOrdenado = useMemo(() => {
    const arr = Array.isArray(config?.historico) ? [...config!.historico] : [];
    return arr.sort((a, b) =>
      (b.dataAplicacaoIso || "").localeCompare(a.dataAplicacaoIso || "")
    );
  }, [config?.historico]);

  const handleSalvarConfiguracao = async () => {
    if (ativo && (!mesReajuste || mesReajuste < 1 || mesReajuste > 12)) {
      showToast(
        "Selecione o mês de reajuste anual do contrato (Janeiro a Dezembro).",
        "warning"
      );
      return;
    }

    try {
      setSaving(true);
      const payload = sanitizeConfigReajusteAnual({
        ...configRascunho,
        updatedAtIso: new Date().toISOString(),
      });
      await onSave(payload);
      showToast("Regra de reajuste anual salva com sucesso!", "success");
    } finally {
      setSaving(false);
    }
  };

  const handleEnviarOuCopiarAvisoPrevio = async (viaWhatsapp: boolean) => {
    const mesAlvo = mesReajuste || config?.mesReajuste || 0;
    if (!mesAlvo) {
      showToast("Defina primeiro o mês de reajuste do contrato.", "warning");
      setExpanded(true);
      return;
    }

    const anoAlvo = avaliacaoRascunho.anoCiclo || new Date().getFullYear();
    const texto = gerarMensagemAvisoPrevioReajuste({
      tipoCliente,
      clienteNome,
      contatoNome,
      valorAtual,
      novoValor: simulacao.valorArredondado,
      mesReajuste: mesAlvo,
      anoCiclo: anoAlvo,
      regraLabel: simulacao.regraResumo,
      profissionalNome,
      profissionalCrp,
    });

    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto);
    }

    const novaCfg = sanitizeConfigReajusteAnual({
      ...configRascunho,
      mesReajuste: mesAlvo,
      avisoPrevioEnviadoCiclo: anoAlvo,
      avisoPrevioEnviadoEm: new Date().toISOString(),
      updatedAtIso: new Date().toISOString(),
    });
    await onSave(novaCfg);

    if (viaWhatsapp) {
      const digits = (contatoTelefone || "").replace(/\D/g, "");
      if (digits) {
        const phoneFull = digits.startsWith("55") ? digits : `55${digits}`;
        const link = document.createElement("a");
        link.href = `https://wa.me/${phoneFull}?text=${encodeURIComponent(
          texto
        )}`;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast(
          "Aviso prévio copiado e preparado para envio no WhatsApp!",
          "success"
        );
        return;
      }
      showToast(
        "Cliente sem telefone cadastrado — mensagem de aviso prévio copiada!",
        "info"
      );
      return;
    }

    showToast(
      "Mensagem de aviso prévio de 30 dias copiada para a área de transferência!",
      "success"
    );
  };

  const handleAplicarReajusteNoCiclo = async () => {
    const mesAlvo = mesReajuste || config?.mesReajuste || 0;
    if (!mesAlvo) {
      showToast("Selecione o mês base de reajuste antes de aplicar.", "warning");
      return;
    }
    if (simulacao.pendenteIndiceContingencia) {
      showToast(
        "Informe o percentual em contingência ou atualize a consulta ao Banco Central.",
        "warning"
      );
      return;
    }
    if (simulacao.valorArredondado <= 0) {
      showToast("O novo valor reajustado deve ser maior que zero.", "warning");
      return;
    }

    const anoAlvo = avaliacaoRascunho.anoCiclo || new Date().getFullYear();
    const vigenciaAnoMes = `${anoAlvo}-${String(mesAlvo).padStart(2, "0")}`;

    const novoItemHistorico: HistoricoReajusteItem = {
      id: `reaj-${Date.now()}`,
      anoCiclo: anoAlvo,
      mesReferencia: mesAlvo,
      dataAplicacaoIso: new Date().toISOString(),
      acao: "aplicado",
      modalidade: simulacao.modalidadeEfetiva,
      indiceAplicadoPct:
        simulacao.indicePctUtilizado !== null
          ? simulacao.indicePctUtilizado
          : undefined,
      valorAnterior: valorAtual,
      valorExatoCalculado: Math.round(simulacao.valorExato * 100) / 100,
      valorNovo: simulacao.valorArredondado,
      fonteIndice: simulacao.fonteIndice,
      competenciaAcumuladaBcb: simulacao.competenciaBcb,
      observacao: simulacao.regraResumo,
    };

    try {
      setSaving(true);
      const novaConfig = sanitizeConfigReajusteAnual({
        ...configRascunho,
        ativo: true,
        mesReajuste: mesAlvo,
        ultimoAnoProcessado: anoAlvo,
        historico: [
          novoItemHistorico,
          ...(Array.isArray(config?.historico) ? config!.historico : []),
        ].slice(0, 30),
        updatedAtIso: new Date().toISOString(),
      });

      await onSave(novaConfig, {
        novoValorBase: simulacao.valorArredondado,
        atualizarAgendadosFuturos: atualizarFuturos,
        vigenciaAnoMes,
      });

      showToast(
        `Reajuste aplicado! Novo valor vigente: ${formatMoedaInteiraOuDecimal(
          simulacao.valorArredondado
        )}.`,
        "success"
      );
      setExpanded(false);
    } finally {
      setSaving(false);
    }
  };

  const handleManterValorNesteCiclo = async () => {
    const mesAlvo = mesReajuste || config?.mesReajuste || 0;
    if (!mesAlvo) {
      showToast("Selecione o mês base de reajuste primeiro.", "warning");
      return;
    }
    const anoAlvo = avaliacaoRascunho.anoCiclo || new Date().getFullYear();
    const itemDispensa: HistoricoReajusteItem = {
      id: `reaj-disp-${Date.now()}`,
      anoCiclo: anoAlvo,
      mesReferencia: mesAlvo,
      dataAplicacaoIso: new Date().toISOString(),
      acao: "dispensado",
      modalidade: simulacao.modalidadeEfetiva,
      valorAnterior: valorAtual,
      valorNovo: valorAtual,
      observacao: `Valor mantido sem alteração no ciclo ${getNomeMesReajuste(
        mesAlvo
      )}/${anoAlvo}`,
    };

    try {
      setSaving(true);
      const novaConfig = sanitizeConfigReajusteAnual({
        ...configRascunho,
        mesReajuste: mesAlvo,
        ultimoAnoProcessado: anoAlvo,
        historico: [
          itemDispensa,
          ...(Array.isArray(config?.historico) ? config!.historico : []),
        ].slice(0, 30),
        updatedAtIso: new Date().toISOString(),
      });
      await onSave(novaConfig);
      showToast(
        `Ciclo ${anoAlvo} registrado mantendo ${formatMoedaInteiraOuDecimal(
          valorAtual
        )}. Próximo lembrete no próximo ano.`,
        "info"
      );
      setExpanded(false);
    } finally {
      setSaving(false);
    }
  };

  const modalidadeLabelCurta = (m?: ModalidadeReajuste) => {
    if (m === "inpc") return "INPC (12m BCB)";
    if (m === "percentual")
      return `${Number(config?.percentualPersonalizado || 0).toLocaleString(
        "pt-BR"
      )}%`;
    if (m === "valor_fixo")
      return `Valor Direto (${formatMoedaInteiraOuDecimal(
        Math.round(Number(config?.valorFixoDireto || valorAtual))
      )})`;
    return "IPCA (12m BCB)";
  };

  return (
    <div className="border-b border-soft bg-white">
      {/* BARRA COMPACTA DE REAJUSTE ANUAL */}
      <div className="px-3.5 py-2.5 sm:px-4 flex flex-wrap items-center justify-between gap-2.5 bg-warm/25">
        <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
          <div className="w-7 h-7 rounded-lg bg-forest/8 text-forest flex items-center justify-center shrink-0">
            <TrendingUp className="w-3.5 h-3.5 text-forest" />
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="font-bold text-forest">
              Reajuste Anual de Contrato
            </span>
            <span aria-hidden="true" className="text-forest/30">
              ·
            </span>

            {config?.mesReajuste && config.ativo !== false ? (
              <>
                <span className="text-forest/80 font-medium">
                  Mês base:{" "}
                  <strong className="text-forest">
                    {getNomeMesReajuste(config.mesReajuste)}
                  </strong>
                </span>
                <span aria-hidden="true" className="text-forest/30">
                  ·
                </span>
                <span className="font-mono tabular-nums text-forest/75">
                  Regra: {modalidadeLabelCurta(config.modalidade)}
                </span>
                {avaliacaoSalva.status === "processado_no_ciclo" && (
                  <>
                    <span aria-hidden="true" className="text-forest/30">
                      ·
                    </span>
                    <span className="text-emerald-700 font-semibold inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Ciclo {avaliacaoSalva.anoCiclo} em dia
                    </span>
                  </>
                )}
              </>
            ) : (
              <span className="text-forest/60">
                Mês de reajuste anual ainda não configurado
              </span>
            )}

            {apenasIndicesOficiais && (
              <>
                <span aria-hidden="true" className="text-forest/30">
                  ·
                </span>
                <span className="text-[11px] text-forest/65 inline-flex items-center gap-1">
                  <Lock className="w-3 h-3 text-forest/55" />
                  Índice oficial ({origemContratoLabel || "IPCA ou INPC"})
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {historicoOrdenado.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setExpanded(true);
                setShowHistorico((prev) => !prev);
              }}
              className="px-2.5 py-1 rounded-lg border border-soft bg-white hover:bg-warm text-[11px] font-semibold text-forest/75 hover:text-forest transition-colors inline-flex items-center gap-1 cursor-pointer"
              title="Ver histórico auditável de reajustes anuais"
            >
              <History className="w-3 h-3 text-forest/60" />
              <span>Histórico ({historicoOrdenado.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="px-3 py-1 rounded-lg border border-soft bg-white hover:bg-warm text-xs font-semibold text-forest transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-700" />
            <span>
              {expanded
                ? "Recolher"
                : config?.mesReajuste
                ? "Configurar / Simular"
                : "Definir Mês de Reajuste"}
            </span>
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-forest/60" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-forest/60" />
            )}
          </button>
        </div>
      </div>

      {/* BANNER AUTOMÁTICO DE LEMBRETE (1 MÊS ANTES OU MÊS VIGENTE PENDENTE) */}
      {avaliacaoSalva.precisaAcao && (
        <div className="mx-3.5 my-2.5 sm:mx-4 p-3 sm:p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-200 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
              <Bell className="w-4 h-4 text-amber-700" />
            </div>
            <div className="min-w-0 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <strong className="text-amber-950 font-bold">
                  {avaliacaoSalva.status === "aviso_previo"
                    ? `Lembrete de 30 dias · Reajuste em ${getNomeMesReajuste(
                        avaliacaoSalva.mesReajuste
                      )}/${avaliacaoSalva.anoCiclo}`
                    : `Mês de Reajuste Contratual · ${getNomeMesReajuste(
                        avaliacaoSalva.mesReajuste
                      )}/${avaliacaoSalva.anoCiclo}`}
                </strong>
                {config?.avisoPrevioEnviadoCiclo === avaliacaoSalva.anoCiclo && (
                  <span className="text-[11px] text-emerald-800 font-semibold">
                    · Aviso prévio já copiado/enviado
                  </span>
                )}
              </div>
              <p className="text-amber-900/85 mt-0.5 leading-relaxed">
                Valor atual:{" "}
                <strong className="font-mono tabular-nums">
                  {formatMoedaInteiraOuDecimal(valorAtual)}
                </strong>{" "}
                → Sugestão arredondada ({simulacao.regraResumo}):{" "}
                <strong className="font-mono tabular-nums text-emerald-900">
                  {formatMoedaInteiraOuDecimal(simulacao.valorArredondado)}
                </strong>
                .
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleEnviarOuCopiarAvisoPrevio(true)}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-emerald-50 text-emerald-900 border border-amber-300 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Enviar aviso prévio ético de 30 dias no WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>Aviso Prévio WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => handleEnviarOuCopiarAvisoPrevio(false)}
              className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-warm text-forest border border-amber-200 text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
              title="Copiar texto do aviso prévio de 30 dias"
            >
              <Copy className="w-3.5 h-3.5 text-forest/70" />
              <span>Copiar Aviso</span>
            </button>

            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="px-3 py-1.5 rounded-lg bg-forest hover:bg-forest/90 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 text-sun" />
              <span>Revisar & Aplicar</span>
            </button>
          </div>
        </div>
      )}

      {/* PAINEL EXPANDIDO DE CONFIGURAÇÃO, SIMULAÇÃO E APLICAÇÃO */}
      {expanded && (
        <div className="px-3.5 py-4 sm:px-4 bg-white border-t border-soft/80 space-y-4 text-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* COLUNA 1: MÊS BASE & MODALIDADE */}
            <div className="lg:col-span-7 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-forest mb-1">
                    Mês Base do Reajuste Anual
                  </label>
                  <select
                    value={mesReajuste}
                    onChange={(e) => setMesReajuste(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-soft bg-warm/30 text-forest font-semibold text-xs focus:outline-none focus:border-forest cursor-pointer"
                  >
                    <option value={0}>Selecione o mês de aniversário...</option>
                    {MESES_NOMES.map((nome, idx) => (
                      <option key={nome} value={idx + 1}>
                        {String(idx + 1).padStart(2, "0")} · {nome} (lembrete em{" "}
                        {idx === 0 ? "Dezembro" : MESES_NOMES[idx - 1]})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-soft bg-warm/20 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={ativo}
                      onChange={(e) => setAtivo(e.target.checked)}
                      className="w-4 h-4 accent-emerald-700 rounded cursor-pointer"
                    />
                    <div className="min-w-0">
                      <span className="font-bold text-forest block leading-tight">
                        Lembrete 1 mês antes ativo
                      </span>
                      <span className="text-[11px] text-forest/60 block truncate">
                        Alerta na esteira e na ficha financeira
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* SELETOR DE ÍNDICE OU VALOR DIRETO CONFORME GOVERNANÇA */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                  <label className="text-[11px] font-bold text-forest">
                    {apenasIndicesOficiais
                      ? "Índice Oficial Obrigatório (Triagem Acessível / Corporativo)"
                      : "Critério de Reajuste (À escolha do profissional)"}
                  </label>

                  <button
                    type="button"
                    disabled={loadingBcb}
                    onClick={() => carregarIndicesBcb(true)}
                    className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    title="Consultar acumulado de 12 meses diretamente na API oficial do Banco Central do Brasil"
                  >
                    <RefreshCw
                      className={`w-3 h-3 ${loadingBcb ? "animate-spin" : ""}`}
                    />
                    <span>
                      {loadingBcb ? "Consultando BCB..." : "Atualizar IPCA/INPC (BCB)"}
                    </span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* Opção IPCA */}
                  <button
                    type="button"
                    onClick={() => setModalidade("ipca")}
                    className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                      modalidade === "ipca"
                        ? "bg-forest text-white border-forest"
                        : "bg-warm/25 hover:bg-warm/60 text-forest border-soft"
                    }`}
                  >
                    <span className="font-bold block text-xs">IPCA (IBGE)</span>
                    <span
                      className={`font-mono tabular-nums text-[11px] block mt-0.5 ${
                        modalidade === "ipca"
                          ? "text-emerald-200"
                          : "text-forest/70"
                      }`}
                    >
                      {loadingBcb && !indicesBcb
                        ? "Carregando..."
                        : indicesBcb?.ipca12m !== null &&
                          indicesBcb?.ipca12m !== undefined
                        ? `${indicesBcb.ipca12m.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}% (12m)`
                        : "Automático BCB"}
                    </span>
                  </button>

                  {/* Opção INPC */}
                  <button
                    type="button"
                    onClick={() => setModalidade("inpc")}
                    className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                      modalidade === "inpc"
                        ? "bg-forest text-white border-forest"
                        : "bg-warm/25 hover:bg-warm/60 text-forest border-soft"
                    }`}
                  >
                    <span className="font-bold block text-xs">INPC (IBGE)</span>
                    <span
                      className={`font-mono tabular-nums text-[11px] block mt-0.5 ${
                        modalidade === "inpc"
                          ? "text-emerald-200"
                          : "text-forest/70"
                      }`}
                    >
                      {loadingBcb && !indicesBcb
                        ? "Carregando..."
                        : indicesBcb?.inpc12m !== null &&
                          indicesBcb?.inpc12m !== undefined
                        ? `${indicesBcb.inpc12m.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}% (12m)`
                        : "Automático BCB"}
                    </span>
                  </button>

                  {/* Opções Livres apenas para Externos & Empresas B2B */}
                  {!apenasIndicesOficiais && (
                    <>
                      <button
                        type="button"
                        onClick={() => setModalidade("percentual")}
                        className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                          modalidade === "percentual"
                            ? "bg-forest text-white border-forest"
                            : "bg-warm/25 hover:bg-warm/60 text-forest border-soft"
                        }`}
                      >
                        <span className="font-bold block text-xs">
                          Índice Livre (%)
                        </span>
                        <span
                          className={`text-[11px] block mt-0.5 ${
                            modalidade === "percentual"
                              ? "text-white/80"
                              : "text-forest/65"
                          }`}
                        >
                          Percentual à escolha
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setModalidade("valor_fixo")}
                        className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                          modalidade === "valor_fixo"
                            ? "bg-forest text-white border-forest"
                            : "bg-warm/25 hover:bg-warm/60 text-forest border-soft"
                        }`}
                      >
                        <span className="font-bold block text-xs">
                          Valor Fixo (R$)
                        </span>
                        <span
                          className={`text-[11px] block mt-0.5 ${
                            modalidade === "valor_fixo"
                              ? "text-white/80"
                              : "text-forest/65"
                          }`}
                        >
                          Definir diretamente
                        </span>
                      </button>
                    </>
                  )}
                </div>

                {apenasIndicesOficiais && (
                  <p className="text-[11px] text-forest/65 mt-1.5 flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-forest/50 shrink-0" />
                    <span>
                      Para contratos via{" "}
                      <strong>
                        {origemContratoLabel || "Triagem Acessível e Corporativo"}
                      </strong>
                      , a atualização anual segue exclusivamente o acumulado oficial de 12 meses do{" "}
                      <strong>IPCA</strong> ou <strong>INPC</strong> (Banco Central / IBGE).
                    </span>
                  </p>
                )}
              </div>

              {/* INPUT CONDICIONAL PARA PERCENTUAL LIVRE OU VALOR FIXO DIRETO OU CONTINGÊNCIA BCB */}
              {!apenasIndicesOficiais && modalidade === "percentual" && (
                <div className="p-3 rounded-xl bg-warm/25 border border-soft flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label className="font-bold text-forest block">
                      Percentual de Reajuste Anual (%)
                    </label>
                    <span className="text-[11px] text-forest/65">
                      Aplicado sobre {formatMoedaInteiraOuDecimal(valorAtual)} com arredondamento para o inteiro mais próximo.
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={percentualInput}
                      onChange={(e) => setPercentualInput(e.target.value)}
                      className="w-28 px-3 py-1.5 rounded-lg border border-soft bg-white text-right font-mono tabular-nums font-bold text-sm text-forest focus:outline-none focus:border-forest"
                    />
                    <span className="font-mono font-bold text-forest">%</span>
                  </div>
                </div>
              )}

              {!apenasIndicesOficiais && modalidade === "valor_fixo" && (
                <div className="p-3 rounded-xl bg-warm/25 border border-soft flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label className="font-bold text-forest block">
                      Novo Valor Definido Diretamente (R$)
                    </label>
                    <span className="text-[11px] text-forest/65">
                      Informe diretamente o novo valor final acordado (arredondado para R$ inteiro mais próximo).
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-mono font-bold text-forest">R$</span>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={valorFixoDiretoInput}
                      onChange={(e) => setValorFixoDiretoInput(e.target.value)}
                      className="w-32 px-3 py-1.5 rounded-lg border border-soft bg-white text-right font-mono tabular-nums font-bold text-sm text-forest focus:outline-none focus:border-forest"
                    />
                  </div>
                </div>
              )}

              {(modalidade === "ipca" || modalidade === "inpc") &&
                indicesBcb?.erroContingencia && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="font-bold text-amber-950 block">
                        API do Banco Central indisponível no momento (Contingência)
                      </span>
                      <span className="text-[11px] text-amber-900/80">
                        Informe manualmente o acumulado de 12 meses do{" "}
                        {modalidade.toUpperCase()} (%) ou clique em Atualizar.
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Ex: 4,50"
                        value={contingenciaPctInput}
                        onChange={(e) => setContingenciaPctInput(e.target.value)}
                        className="w-28 px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-right font-mono tabular-nums font-bold text-sm text-forest focus:outline-none focus:border-amber-600"
                      />
                      <span className="font-mono font-bold text-amber-950">%</span>
                    </div>
                  </div>
                )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <span className="text-[11px] text-forest/65 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-forest/50 shrink-0" />
                  <span>{avaliacaoRascunho.descricaoContextual}</span>
                </span>

                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSalvarConfiguracao}
                  className="px-3.5 py-2 rounded-xl bg-warm hover:bg-soft/70 text-forest border border-soft font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Salvar Mês & Regra</span>
                </button>
              </div>
            </div>

            {/* COLUNA 2: RESUMO ARREDONDADO, AVISO PRÉVIO & APLICAÇÃO SEGURA */}
            <div className="lg:col-span-5 p-3.5 rounded-2xl bg-warm/30 border border-soft flex flex-col justify-between gap-3">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-forest/75">
                    Simulação com Arredondamento
                  </span>
                  <span className="text-[11px] font-mono tabular-nums text-forest/65">
                    Inteiro mais próximo
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white border border-soft space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-forest/65">Valor base atual</span>
                    <span className="font-mono tabular-nums font-semibold text-forest">
                      {formatMoedaInteiraOuDecimal(valorAtual)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-forest/65">Critério selecionado</span>
                    <span className="font-medium text-forest text-right">
                      {simulacao.regraResumo}
                    </span>
                  </div>

                  {simulacao.modalidadeEfetiva !== "valor_fixo" && (
                    <div className="flex items-center justify-between text-[11px] text-forest/55">
                      <span>Cálculo exato sem arredondar</span>
                      <span className="font-mono tabular-nums">
                        {formatMoedaInteiraOuDecimal(simulacao.valorExato)}
                      </span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-soft flex items-baseline justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-forest block">
                        Novo Valor Arredondado
                      </span>
                      <span className="text-[10px] text-forest/55">
                        {simulacao.diferencaReais >= 0 ? "+" : ""}
                        {formatMoedaInteiraOuDecimal(simulacao.diferencaReais)} (
                        {simulacao.diferencaPercentualEfetiva >= 0 ? "+" : ""}
                        {simulacao.diferencaPercentualEfetiva.toLocaleString(
                          "pt-BR",
                          {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          }
                        )}
                        %)
                      </span>
                    </div>
                    <span className="text-lg font-extrabold text-emerald-800 font-mono tabular-nums">
                      {formatMoedaInteiraOuDecimal(simulacao.valorArredondado)}
                    </span>
                  </div>
                </div>

                {/* Proteção do histórico financeiro */}
                <label className="flex items-start gap-2 text-[11px] text-forest/75 cursor-pointer select-none pt-0.5">
                  <input
                    type="checkbox"
                    checked={atualizarFuturos}
                    onChange={(e) => setAtualizarFuturos(e.target.checked)}
                    className="mt-0.5 w-3.5 h-3.5 accent-emerald-700 rounded cursor-pointer"
                  />
                  <span className="leading-snug">
                    Atualizar também lançamentos{" "}
                    <strong>agendados e em aberto</strong> a partir da vigência
                    {qtdLancamentosFuturos > 0
                      ? ` (${qtdLancamentosFuturos} agendamento(s) na planilha)`
                      : ""}
                    . Sessões/serviços já realizados ou pagos permanecem intactos.
                  </span>
                </label>
              </div>

              <div className="space-y-2 pt-2 border-t border-soft/80">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleEnviarOuCopiarAvisoPrevio(true)}
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-200 font-semibold text-[11px] inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Enviar Aviso (30d)</span>
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleEnviarOuCopiarAvisoPrevio(false)}
                    className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-warm text-forest border border-soft font-semibold text-[11px] inline-flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                    title="Copiar mensagem de aviso prévio"
                  >
                    <Copy className="w-3.5 h-3.5 text-forest/65" />
                    <span>Copiar</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    disabled={saving || !mesReajuste}
                    onClick={handleAplicarReajusteNoCiclo}
                    className="flex-1 px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-sun" />
                    <span>
                      Aplicar Reajuste (
                      {formatMoedaInteiraOuDecimal(simulacao.valorArredondado)})
                    </span>
                  </button>

                  {mesReajuste > 0 && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={handleManterValorNesteCiclo}
                      className="px-2.5 py-2 rounded-xl bg-white hover:bg-warm text-forest/75 hover:text-forest border border-soft font-semibold text-[11px] transition-colors cursor-pointer disabled:opacity-50"
                      title="Dispensar reajuste neste ciclo anual mantendo o valor atual"
                    >
                      Manter Atual
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* HISTÓRICO DE REAJUSTES DO CONTRATO */}
          {(showHistorico || historicoOrdenado.length > 0) && (
            <div className="pt-3 border-t border-soft/70">
              <button
                type="button"
                onClick={() => setShowHistorico((prev) => !prev)}
                className="text-[11px] font-bold text-forest/75 hover:text-forest inline-flex items-center gap-1.5 cursor-pointer"
              >
                <History className="w-3.5 h-3.5 text-forest/60" />
                <span>
                  Histórico de Ciclos Anuais ({historicoOrdenado.length})
                </span>
                {showHistorico ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {showHistorico && historicoOrdenado.length > 0 && (
                <div className="mt-2 divide-y divide-soft border border-soft rounded-xl bg-warm/15 overflow-hidden">
                  {historicoOrdenado.map((h) => (
                    <div
                      key={h.id}
                      className="px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px]"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-forest">
                          Ciclo {getNomeMesReajuste(h.mesReferencia)}/{h.anoCiclo}
                        </span>
                        <span aria-hidden="true" className="text-forest/30">
                          ·
                        </span>
                        <span className="text-forest/75">
                          {h.acao === "dispensado"
                            ? "Valor mantido no ciclo"
                            : h.observacao || h.modalidade.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-mono tabular-nums">
                        <span className="text-forest/60">
                          {formatMoedaInteiraOuDecimal(h.valorAnterior)} →{" "}
                          <strong className="text-emerald-800">
                            {formatMoedaInteiraOuDecimal(h.valorNovo)}
                          </strong>
                        </span>
                        <span aria-hidden="true" className="text-forest/30">
                          ·
                        </span>
                        <span className="text-forest/55">
                          {new Date(h.dataAplicacaoIso).toLocaleDateString(
                            "pt-BR"
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
