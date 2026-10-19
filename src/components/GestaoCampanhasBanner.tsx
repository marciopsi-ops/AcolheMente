import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  Calendar, 
  Eye, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Power, 
  Image as ImageIcon,
  Heart,
  PhoneCall,
  ArrowRight,
  HelpCircle,
  ExternalLink,
  Sliders,
  ToggleLeft,
  ToggleRight
} from "lucide-react";
import { CampanhaMesData, CampanhasConfigState } from "../types/campanhas";
import { CATALOGO_CAMPANHAS_PADRAO, CONFIG_CAMPANHAS_INICIAL } from "../data/campanhasCatalog";
import { 
  getLocalCampanhasConfig, 
  saveCampanhasConfig, 
  resolveCampanhaAtiva,
  getCampanhaDoMes
} from "../lib/campanhasService";

interface GestaoCampanhasBannerProps {
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export function GestaoCampanhasBanner({ showToast }: GestaoCampanhasBannerProps) {
  const [config, setConfig] = useState<CampanhasConfigState>(getLocalCampanhasConfig());
  const [mesSelecionadoEdicao, setMesSelecionadoEdicao] = useState<number>(() => {
    return new Date().getMonth() + 1; // Mês atual por padrão
  });
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const mesAtualCalendario = new Date().getMonth() + 1;

  // Carrega configuração
  useEffect(() => {
    setConfig(getLocalCampanhasConfig());
  }, []);

  const dadosMesSelecionado: CampanhaMesData = getCampanhaDoMes(mesSelecionadoEdicao, config);
  const campanhaAtivaAgora: CampanhaMesData | null = resolveCampanhaAtiva(config);

  const handleToggleBanner = () => {
    setConfig((prev) => ({
      ...prev,
      bannerAtivo: !prev.bannerAtivo,
    }));
    setHasChanges(true);
  };

  const handleToggleBotoesGeral = () => {
    setConfig((prev) => ({
      ...prev,
      exibirBotoesGeral: prev.exibirBotoesGeral === false ? true : false,
    }));
    setHasChanges(true);
  };

  const handleModoChange = (modo: "automatico" | "manual") => {
    setConfig((prev) => ({
      ...prev,
      modoExibicao: modo,
    }));
    setHasChanges(true);
  };

  const handleMesManualChange = (mes: number) => {
    setConfig((prev) => ({
      ...prev,
      mesManual: mes,
    }));
    setHasChanges(true);
  };

  const handleUpdateMesField = (field: keyof CampanhaMesData, value: any) => {
    setConfig((prev) => {
      const mesCustoms = prev.customizacoes[mesSelecionadoEdicao] || {};
      return {
        ...prev,
        customizacoes: {
          ...prev.customizacoes,
          [mesSelecionadoEdicao]: {
            ...mesCustoms,
            [field]: value,
          },
        },
      };
    });
    setHasChanges(true);
  };

  const handleResetMes = () => {
    if (!window.confirm(`Deseja restaurar as configurações originais padrão de ${dadosMesSelecionado.nomeCampanha}?`)) {
      return;
    }
    setConfig((prev) => {
      const nextCustoms = { ...prev.customizacoes };
      delete nextCustoms[mesSelecionadoEdicao];
      return {
        ...prev,
        customizacoes: nextCustoms,
      };
    });
    setHasChanges(true);
    showToast(`Configurações de ${dadosMesSelecionado.nomeCampanha} restauradas.`, "info");
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveCampanhasConfig(config);
      setHasChanges(false);
      showToast("Configurações do banner e campanhas salvas com sucesso!", "success");
    } catch (err) {
      console.error(err);
      showToast("Erro ao salvar configurações.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const nomesMeses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  // Cálculo de visibilidade dos botões para o preview em tempo real
  const botoesHabilitadosGeral = config.exibirBotoesGeral !== false;
  const botoesHabilitadosMes = dadosMesSelecionado.exibirBotoes !== false;
  const showBotaoPrincipalPreview = botoesHabilitadosGeral && botoesHabilitadosMes && (dadosMesSelecionado.exibirBotaoPrincipal !== false);
  const showBotaoSecundarioPreview = botoesHabilitadosGeral && botoesHabilitadosMes && (dadosMesSelecionado.exibirBotaoSecundario !== false);
  const temAlgumBotaoPreview = showBotaoPrincipalPreview || showBotaoSecundarioPreview;

  return (
    <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto pb-16 animate-in fade-in duration-300">
      
      {/* Header da Seção */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-soft shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sun/30 text-forest text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 text-sun-dark" />
            Configuração de Comunicação & Saúde Mental
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-forest">
            Campanhas Mensais & Banner do Topo
          </h2>
          <p className="text-forest/70 text-sm mt-1 max-w-3xl leading-relaxed">
            Controle a barra de conscientização no topo do site para cada mês do ano. Habilite ou desabilite os botões de ação com chaves seletoras, alterne entre modo automático e manual, edite frases, laços e imagens com visualização em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`px-5 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-md ${
              hasChanges 
                ? "bg-forest hover:bg-forest/90 text-white animate-pulse" 
                : "bg-emerald-700 hover:bg-emerald-800 text-white"
            }`}
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? "Salvando..." : hasChanges ? "Salvar Alterações *" : "Configurações Salvas"}</span>
          </button>
        </div>
      </div>

      {/* Grid de Controles Globais (Liga/Desliga + Modo + Chave Geral dos Botões) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Habilitar / Desabilitar Banner Geral */}
        <div className="bg-white rounded-3xl p-6 border border-soft shadow-xs flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Power className={`w-5 h-5 ${config.bannerAtivo ? "text-emerald-600" : "text-slate-400"}`} />
                <h3 className="font-serif text-lg font-semibold text-forest">
                  Banner no Topo
                </h3>
              </div>
              <p className="text-xs text-forest/70 mt-1">
                Ativa ou desativa a exibição da barra de campanha no topo do site para os visitantes.
              </p>
            </div>

            <button
              onClick={handleToggleBanner}
              className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                config.bannerAtivo ? "bg-emerald-600" : "bg-slate-300"
              }`}
              role="switch"
              aria-checked={config.bannerAtivo}
              title={config.bannerAtivo ? "Clique para desativar" : "Clique para ativar"}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  config.bannerAtivo ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="p-3.5 rounded-2xl bg-warm/50 border border-soft flex items-center justify-between text-xs">
            <span className="text-forest/80 font-medium">Status Atual:</span>
            {config.bannerAtivo ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Banner Ativado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-200 text-slate-700 font-bold text-[11px]">
                <AlertCircle className="w-3.5 h-3.5" />
                Banner Oculto
              </span>
            )}
          </div>
        </div>

        {/* Card 2: Chave Geral dos Botões no Banner */}
        <div className="bg-white rounded-3xl p-6 border border-soft shadow-xs flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Sliders className={`w-5 h-5 ${config.exibirBotoesGeral !== false ? "text-emerald-600" : "text-amber-500"}`} />
                <h3 className="font-serif text-lg font-semibold text-forest">
                  Chave Geral dos Botões
                </h3>
              </div>
              <p className="text-xs text-forest/70 mt-1">
                Habilita ou oculta os botões de ação ("Iniciar Acolhimento" e "Apoio 188") em todos os banners.
              </p>
            </div>

            <button
              onClick={handleToggleBotoesGeral}
              className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                config.exibirBotoesGeral !== false ? "bg-emerald-600" : "bg-slate-300"
              }`}
              role="switch"
              aria-checked={config.exibirBotoesGeral !== false}
              title={config.exibirBotoesGeral !== false ? "Clique para ocultar botões" : "Clique para habilitar botões"}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  config.exibirBotoesGeral !== false ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="p-3.5 rounded-2xl bg-warm/50 border border-soft flex items-center justify-between text-xs">
            <span className="text-forest/80 font-medium">Botões nos Banners:</span>
            {config.exibirBotoesGeral !== false ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Habilitados
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-[11px]">
                <AlertCircle className="w-3.5 h-3.5" />
                Ocultos Globalmente
              </span>
            )}
          </div>
        </div>

        {/* Card 3: Modo de Ativação (Automático vs Manual) */}
        <div className="bg-white rounded-3xl p-6 border border-soft shadow-xs flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-forest" />
              <h3 className="font-serif text-lg font-semibold text-forest">
                Seleção do Mês
              </h3>
            </div>
            <p className="text-xs text-forest/70 mt-1">
              Acompanha o mês do calendário ou fixa um tema específico.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handleModoChange("automatico")}
              className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                config.modoExibicao === "automatico"
                  ? "bg-forest text-white border-forest shadow-xs"
                  : "bg-warm/40 text-forest border-soft hover:bg-warm"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider">Automático</span>
                {config.modoExibicao === "automatico" && <CheckCircle2 className="w-3.5 h-3.5 text-sun" />}
              </div>
              <span className={`text-[10px] leading-tight ${config.modoExibicao === "automatico" ? "text-white/80" : "text-forest/70"}`}>
                Muda no dia 1º de cada mês.
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleModoChange("manual")}
              className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                config.modoExibicao === "manual"
                  ? "bg-forest text-white border-forest shadow-xs"
                  : "bg-warm/40 text-forest border-soft hover:bg-warm"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider">Manual</span>
                {config.modoExibicao === "manual" && <CheckCircle2 className="w-3.5 h-3.5 text-sun" />}
              </div>
              <span className={`text-[10px] leading-tight ${config.modoExibicao === "manual" ? "text-white/80" : "text-forest/70"}`}>
                Fixa um tema independente do mês.
              </span>
            </button>
          </div>
        </div>

      </div>

      {/* Visualização Prévia ao Vivo do Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-soft shadow-xs flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-soft pb-3">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-forest" />
            <h3 className="font-serif text-lg font-semibold text-forest">
              Pré-Visualização do Banner em Tempo Real
            </h3>
            <span className="text-xs text-forest/60">
              ({nomesMeses[mesSelecionadoEdicao - 1]} - {dadosMesSelecionado.nomeCampanha})
            </span>
          </div>

          <div className="flex items-center gap-2">
            {campanhaAtivaAgora?.mes === dadosMesSelecionado.mes && config.bannerAtivo ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                ● Este tema está ATIVO no topo agora
              </span>
            ) : (
              <button
                onClick={() => {
                  handleModoChange("manual");
                  handleMesManualChange(dadosMesSelecionado.mes);
                }}
                className="px-3 py-1 rounded-full bg-warm hover:bg-sun text-forest text-[11px] font-bold border border-soft transition-colors cursor-pointer"
                title="Ativar este tema imediatamente no site"
              >
                Fixar este tema no topo do site agora
              </button>
            )}
          </div>
        </div>

        {/* Mockup do Banner Real */}
        <div className="w-full relative rounded-2xl overflow-hidden border border-slate-300 shadow-md py-4 sm:py-6 flex flex-col items-center justify-center text-center">
          {/* Background */}
          <div className="absolute inset-0 pointer-events-none bg-slate-900">
            <img
              src={dadosMesSelecionado.imagemFundoUrl}
              alt={dadosMesSelecionado.nomeCampanha}
              className="w-full h-full object-cover object-center"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/45 to-black/60" />
            <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
          </div>

          <div className="relative z-10 max-w-2xl px-4 flex flex-col items-center gap-2 text-white">
            {/* Top Badge */}
            <div className="flex items-center justify-center">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${dadosMesSelecionado.badgeBgClass} text-xs font-bold tracking-tight shadow-md`}>
                <span className="text-sm leading-none">{dadosMesSelecionado.lacoEmoji}</span>
                <span>{dadosMesSelecionado.nomeCampanha}</span>
                <span className="opacity-60">•</span>
                <span className="font-semibold text-[11px]">{dadosMesSelecionado.subtitulo}</span>
              </span>
            </div>

            {/* Frase */}
            <p className="text-xs sm:text-sm text-white font-medium leading-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] px-2">
              <strong className="font-semibold text-white">{dadosMesSelecionado.frasePrincipal}</strong>{" "}
              {dadosMesSelecionado.fraseComplementar}
            </p>

            {/* Botões com Chave Seletora */}
            {temAlgumBotaoPreview ? (
              <div className="flex items-center justify-center flex-wrap gap-2 pt-1">
                {showBotaoPrincipalPreview && (
                  <div className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-[#14342B] text-white border border-white/20 text-xs font-semibold rounded-full shadow-md">
                    <Heart className="w-3.5 h-3.5 text-sun shrink-0" />
                    <span>{dadosMesSelecionado.botaoPrincipalTexto}</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-0.5 shrink-0" />
                  </div>
                )}

                {showBotaoSecundarioPreview && (
                  <div className={`inline-flex items-center gap-1 px-3.5 py-1.5 ${dadosMesSelecionado.btnSecundarioBgClass} text-xs font-bold rounded-full shadow-md`}>
                    <PhoneCall className="w-3.5 h-3.5 shrink-0" />
                    <span>{dadosMesSelecionado.botaoSecundarioTexto}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="pt-1">
                <span className="text-[10px] bg-black/50 backdrop-blur-xs text-white/80 px-3 py-1 rounded-full border border-white/15 font-semibold">
                  (Botões de ação desabilitados pela chave seletora)
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Seletor dos 12 Meses (Cards de Navegação) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-soft shadow-xs flex flex-col gap-5">
        <div>
          <h3 className="font-serif text-lg font-semibold text-forest">
            Selecione o Mês para Visualizar e Customizar
          </h3>
          <p className="text-xs text-forest/70 mt-0.5">
            Clique em qualquer mês para editar textos, laço, foto ou chaves de botões.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {CATALOGO_CAMPANHAS_PADRAO.map((campanha) => {
            const isSelected = mesSelecionadoEdicao === campanha.mes;
            const isMesAtual = mesAtualCalendario === campanha.mes;
            const isAtivoNoSite = campanhaAtivaAgora?.mes === campanha.mes && config.bannerAtivo;
            const mesCustom = config.customizacoes[campanha.mes];
            const nomeCustom = mesCustom?.nomeCampanha || campanha.nomeCampanha;
            const emojiCustom = mesCustom?.lacoEmoji || campanha.lacoEmoji;

            return (
              <button
                key={campanha.mes}
                type="button"
                onClick={() => setMesSelecionadoEdicao(campanha.mes)}
                className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between gap-2 transition-all cursor-pointer relative ${
                  isSelected
                    ? "bg-warm border-forest ring-2 ring-forest/30 shadow-xs"
                    : "bg-white border-soft hover:bg-warm/50"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xl leading-none">{emojiCustom}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-forest/50">
                    {nomesMeses[campanha.mes - 1]}
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="font-serif text-xs font-bold text-forest leading-tight line-clamp-1">
                    {nomeCustom}
                  </span>
                  <span className="text-[10px] text-forest/70 leading-snug line-clamp-1">
                    {campanha.subtitulo}
                  </span>
                </div>

                <div className="flex items-center gap-1 flex-wrap pt-1">
                  {isAtivoNoSite && (
                    <span className="text-[9px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded-full">
                      Ativo no Site
                    </span>
                  )}
                  {isMesAtual && !isAtivoNoSite && (
                    <span className="text-[9px] bg-sun text-forest font-bold px-1.5 py-0.5 rounded-full">
                      Mês Corrente
                    </span>
                  )}
                  {Boolean(mesCustom) && (
                    <span className="text-[9px] bg-amber-100 text-amber-900 font-semibold px-1.5 py-0.5 rounded-full">
                      Editado
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Painel de Edição de Detalhes do Mês Selecionado */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-soft shadow-xs flex flex-col gap-6">
        <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-soft">
          <div className="flex items-center gap-3">
            <span className="text-3xl leading-none">{dadosMesSelecionado.lacoEmoji}</span>
            <div>
              <h3 className="font-serif text-xl font-bold text-forest">
                Editando Tema: {dadosMesSelecionado.nomeCampanha} ({nomesMeses[mesSelecionadoEdicao - 1]})
              </h3>
              <p className="text-xs text-forest/70">
                Personalize os textos, chaves seletoras de botões e foto de fundo deste mês.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleResetMes}
              className="px-3.5 py-2 rounded-xl border border-soft hover:bg-warm text-forest text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Restaurar padrão original deste mês"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar Este Mês</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Coluna 1: Textos & Identidade */}
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-bold text-forest block mb-1">
                  Nome da Campanha
                </label>
                <input
                  type="text"
                  value={dadosMesSelecionado.nomeCampanha}
                  onChange={(e) => handleUpdateMesField("nomeCampanha", e.target.value)}
                  placeholder="Ex: Setembro Amarelo"
                  className="w-full px-3 py-2 rounded-xl border border-soft bg-warm text-forest text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-forest/20"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-forest block mb-1">
                  Emoji do Laço
                </label>
                <input
                  type="text"
                  value={dadosMesSelecionado.lacoEmoji}
                  onChange={(e) => handleUpdateMesField("lacoEmoji", e.target.value)}
                  placeholder="💛"
                  className="w-full px-3 py-2 rounded-xl border border-soft bg-warm text-forest text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-forest/20"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-forest block mb-1">
                Subtítulo do Badge
              </label>
              <input
                type="text"
                value={dadosMesSelecionado.subtitulo}
                onChange={(e) => handleUpdateMesField("subtitulo", e.target.value)}
                placeholder="Ex: Valorização da Vida & Prevenção ao Suicídio"
                className="w-full px-3 py-2 rounded-xl border border-soft bg-warm text-forest text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-forest/20"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-forest block mb-1">
                Frase Principal em Destaque
              </label>
              <input
                type="text"
                value={dadosMesSelecionado.frasePrincipal}
                onChange={(e) => handleUpdateMesField("frasePrincipal", e.target.value)}
                placeholder="Ex: A sua vida tem um valor inestimável."
                className="w-full px-3 py-2 rounded-xl border border-soft bg-warm text-forest text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-forest/20"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-forest block mb-1">
                Frase Complementar de Acolhimento
              </label>
              <textarea
                rows={2}
                value={dadosMesSelecionado.fraseComplementar}
                onChange={(e) => handleUpdateMesField("fraseComplementar", e.target.value)}
                placeholder="Ex: Falar é o primeiro passo para o acolhimento."
                className="w-full px-3 py-2 rounded-xl border border-soft bg-warm text-forest text-xs font-medium focus:outline-none focus:ring-2 focus:ring-forest/20 resize-none"
              />
            </div>
          </div>

          {/* Coluna 2: Foto & Chaves Seletoras dos Botões */}
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-bold text-forest flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5" />
                  URL da Foto Panorâmica de Fundo
                </span>
                <span className="text-[10px] text-forest/50 font-normal">Recomendado: 2000x500px</span>
              </label>
              <input
                type="url"
                value={dadosMesSelecionado.imagemFundoUrl}
                onChange={(e) => handleUpdateMesField("imagemFundoUrl", e.target.value)}
                placeholder="https://... ou imagem local"
                className="w-full px-3 py-2 rounded-xl border border-soft bg-warm text-forest text-xs font-mono focus:outline-none focus:ring-2 focus:ring-forest/20"
              />
              <span className="text-[11px] text-forest/60 mt-1 block">
                Dica: Escolha fotos nítidas da natureza ou momentos humanos acolhedores. O sistema aplica o gradiente escurecido automaticamente.
              </span>
            </div>

            {/* Bloco de Chaves Seletoras dos Botões */}
            <div className="bg-warm/50 p-4 rounded-2xl border border-soft flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-soft pb-2.5">
                <div>
                  <span className="text-xs font-bold text-forest block">
                    Chave Seletora de Botões (Neste Mês)
                  </span>
                  <span className="text-[11px] text-forest/70">
                    Habilita ou oculta os botões no banner deste mês específico
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleUpdateMesField("exibirBotoes", dadosMesSelecionado.exibirBotoes === false ? true : false)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    dadosMesSelecionado.exibirBotoes !== false ? "bg-emerald-600" : "bg-slate-300"
                  }`}
                  role="switch"
                  aria-checked={dadosMesSelecionado.exibirBotoes !== false}
                  title={dadosMesSelecionado.exibirBotoes !== false ? "Botões ativados neste mês" : "Botões desativados neste mês"}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      dadosMesSelecionado.exibirBotoes !== false ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Chaves individuais de cada botão */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Chave Botão 1 */}
                <div className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                  dadosMesSelecionado.exibirBotoes !== false && dadosMesSelecionado.exibirBotaoPrincipal !== false
                    ? "bg-white border-forest/30 shadow-2xs"
                    : "bg-slate-100/70 border-slate-200 opacity-60"
                }`}>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-forest">Botão Primário</span>
                    <span className="text-[10px] text-forest/60">"Iniciar Acolhimento"</span>
                  </div>
                  <button
                    type="button"
                    disabled={dadosMesSelecionado.exibirBotoes === false}
                    onClick={() => handleUpdateMesField("exibirBotaoPrincipal", dadosMesSelecionado.exibirBotaoPrincipal === false ? true : false)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      dadosMesSelecionado.exibirBotoes !== false && dadosMesSelecionado.exibirBotaoPrincipal !== false ? "bg-emerald-600" : "bg-slate-300"
                    }`}
                    title="Habilitar ou desabilitar o Botão Primário"
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        dadosMesSelecionado.exibirBotoes !== false && dadosMesSelecionado.exibirBotaoPrincipal !== false ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Chave Botão 2 */}
                <div className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                  dadosMesSelecionado.exibirBotoes !== false && dadosMesSelecionado.exibirBotaoSecundario !== false
                    ? "bg-white border-forest/30 shadow-2xs"
                    : "bg-slate-100/70 border-slate-200 opacity-60"
                }`}>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-forest">Botão Secundário</span>
                    <span className="text-[10px] text-forest/60">"Apoio 188 / Ação"</span>
                  </div>
                  <button
                    type="button"
                    disabled={dadosMesSelecionado.exibirBotoes === false}
                    onClick={() => handleUpdateMesField("exibirBotaoSecundario", dadosMesSelecionado.exibirBotaoSecundario === false ? true : false)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      dadosMesSelecionado.exibirBotoes !== false && dadosMesSelecionado.exibirBotaoSecundario !== false ? "bg-emerald-600" : "bg-slate-300"
                    }`}
                    title="Habilitar ou desabilitar o Botão Secundário"
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        dadosMesSelecionado.exibirBotoes !== false && dadosMesSelecionado.exibirBotaoSecundario !== false ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Configuração de Textos e Ação dos Botões */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 transition-opacity ${
              dadosMesSelecionado.exibirBotoes === false ? "opacity-50 pointer-events-none" : ""
            }`}>
              <div>
                <label className="text-xs font-bold text-forest block mb-1">
                  Texto do Botão Primário
                  {dadosMesSelecionado.exibirBotaoPrincipal === false && (
                    <span className="text-[10px] text-rose-600 font-semibold ml-1.5">(Desabilitado)</span>
                  )}
                </label>
                <input
                  type="text"
                  disabled={dadosMesSelecionado.exibirBotaoPrincipal === false}
                  value={dadosMesSelecionado.botaoPrincipalTexto}
                  onChange={(e) => handleUpdateMesField("botaoPrincipalTexto", e.target.value)}
                  placeholder="Iniciar Acolhimento"
                  className="w-full px-3 py-2 rounded-xl border border-soft bg-warm text-forest text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-forest/20 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-forest block mb-1">
                  Texto do Botão Secundário
                  {dadosMesSelecionado.exibirBotaoSecundario === false && (
                    <span className="text-[10px] text-rose-600 font-semibold ml-1.5">(Desabilitado)</span>
                  )}
                </label>
                <input
                  type="text"
                  disabled={dadosMesSelecionado.exibirBotaoSecundario === false}
                  value={dadosMesSelecionado.botaoSecundarioTexto}
                  onChange={(e) => handleUpdateMesField("botaoSecundarioTexto", e.target.value)}
                  placeholder="Apoio Imediato • 188"
                  className="w-full px-3 py-2 rounded-xl border border-soft bg-warm text-forest text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-forest/20 disabled:bg-slate-100"
                />
              </div>
            </div>

            <div className={`transition-opacity ${
              dadosMesSelecionado.exibirBotoes === false || dadosMesSelecionado.exibirBotaoSecundario === false ? "opacity-50 pointer-events-none" : ""
            }`}>
              <label className="text-xs font-bold text-forest block mb-1">
                Ação do Botão Secundário
              </label>
              <select
                disabled={dadosMesSelecionado.exibirBotaoSecundario === false}
                value={dadosMesSelecionado.botaoSecundarioAcao}
                onChange={(e) => handleUpdateMesField("botaoSecundarioAcao", e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-soft bg-warm text-forest text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-forest/20"
              >
                <option value="cvv">Abrir Modal de Apoio Imediato (CVV 188 / SAMU 192)</option>
                <option value="acolhimento">Ir para Triagem AcolheMente</option>
                <option value="link">Abrir Link Externo Específico</option>
              </select>
            </div>

            {dadosMesSelecionado.botaoSecundarioAcao === "link" && dadosMesSelecionado.exibirBotaoSecundario !== false && (
              <div>
                <label className="text-xs font-bold text-forest block mb-1">
                  URL Externa
                </label>
                <input
                  type="url"
                  value={dadosMesSelecionado.linkSecundarioUrl || ""}
                  onChange={(e) => handleUpdateMesField("linkSecundarioUrl", e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-xl border border-soft bg-warm text-forest text-xs font-mono focus:outline-none focus:ring-2 focus:ring-forest/20"
                />
              </div>
            )}
          </div>

        </div>

        {/* Rodapé do Editor com botão de salvar */}
        <div className="pt-4 border-t border-soft flex items-center justify-between flex-wrap gap-4">
          <span className="text-xs text-forest/70">
            {hasChanges 
              ? "Há alterações pendentes nesta página. Lembre-se de salvar para aplicar no site." 
              : "Todas as alterações estão salvas e ativas no sistema."}
          </span>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-full bg-forest hover:bg-forest/90 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? "Salvando..." : "Salvar Alterações"}</span>
          </button>
        </div>

      </div>

    </div>
  );
}
