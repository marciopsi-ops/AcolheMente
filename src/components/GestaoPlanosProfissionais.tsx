import React, { useState } from "react";
import { 
  Sparkles, 
  Check, 
  Plus, 
  Trash2, 
  CreditCard, 
  CheckCircle2, 
  RotateCcw, 
  Layers, 
  Star,
  Clock,
  Eye,
  AlertCircle,
  HelpCircle,
  ToggleLeft,
  ToggleRight
} from "lucide-react";
import { PlanoProfissionalItem, PLANOS_PROFISSIONAIS_PADRAO } from "../types/planosProfissionais";

interface GestaoPlanosProfissionaisProps {
  planos: PlanoProfissionalItem[];
  exibirPlanos?: boolean;
  onToggleExibirPlanos?: (novoValor: boolean) => Promise<void> | void;
  exibirPlanosPainel?: boolean;
  onToggleExibirPlanosPainel?: (novoValor: boolean) => Promise<void> | void;
  onSavePlanos: (novosPlanos: PlanoProfissionalItem[]) => Promise<void> | void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export function GestaoPlanosProfissionais({
  planos = PLANOS_PROFISSIONAIS_PADRAO,
  exibirPlanos = false,
  onToggleExibirPlanos,
  exibirPlanosPainel = true,
  onToggleExibirPlanosPainel,
  onSavePlanos,
  showToast,
}: GestaoPlanosProfissionaisProps) {
  const currentPlanos = planos && planos.length > 0 ? planos : PLANOS_PROFISSIONAIS_PADRAO;
  const [listaPlanos, setListaPlanos] = useState<PlanoProfissionalItem[]>(currentPlanos);
  const [isTogglingExibir, setIsTogglingExibir] = useState(false);
  const [isTogglingExibirPainel, setIsTogglingExibirPainel] = useState(false);
  const [planoAtivoAba, setPlanoAtivoAba] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [novoRecursoTexto, setNovoRecursoTexto] = useState("");

  // Garante índice seguro
  const safeIndex = planoAtivoAba >= 0 && planoAtivoAba < listaPlanos.length ? planoAtivoAba : 0;
  const planoEditando = listaPlanos[safeIndex] || PLANOS_PROFISSIONAIS_PADRAO[0];

  const handleUpdateCampo = (field: keyof PlanoProfissionalItem, value: any) => {
    const updated = [...listaPlanos];
    updated[safeIndex] = {
      ...updated[safeIndex],
      [field]: value,
    };
    setListaPlanos(updated);
  };

  const handleAddRecurso = () => {
    if (!novoRecursoTexto.trim()) return;
    const updated = [...listaPlanos];
    const recs = [...(updated[safeIndex].recursos || []), novoRecursoTexto.trim()];
    updated[safeIndex] = {
      ...updated[safeIndex],
      recursos: recs,
    };
    setListaPlanos(updated);
    setNovoRecursoTexto("");
  };

  const handleRemoveRecurso = (index: number) => {
    const updated = [...listaPlanos];
    const recs = updated[safeIndex].recursos.filter((_, idx) => idx !== index);
    updated[safeIndex] = {
      ...updated[safeIndex],
      recursos: recs,
    };
    setListaPlanos(updated);
  };

  const handleSetDestaque = (index: number) => {
    const updated = listaPlanos.map((p, idx) => ({
      ...p,
      destaque: idx === index,
    }));
    setListaPlanos(updated);
  };

  const handleToggleAtivo = (index: number) => {
    const updated = [...listaPlanos];
    updated[index] = {
      ...updated[index],
      ativo: !updated[index].ativo,
    };
    setListaPlanos(updated);
  };

  const handleAdicionarNovoPlano = () => {
    const novoNum = listaPlanos.length + 1;
    const novoPlano: PlanoProfissionalItem = {
      id: `plano_${Date.now()}`,
      nome: `Novo Plano ${novoNum}`,
      subtitulo: "Plano Personalizado",
      valorMensal: "39,90",
      horasInclusas: "Até 12 horas/mês",
      descricao: "Descrição do novo plano para psicólogos, psicanalistas e terapeutas da rede.",
      recursos: [
        "Acesso à triagem da rede AcolheMente",
        "Perfil profissional na plataforma pública",
        "Prontuário eletrônico seguro"
      ],
      destaque: false,
      ativo: true,
    };
    const updated = [...listaPlanos, novoPlano];
    setListaPlanos(updated);
    setPlanoAtivoAba(updated.length - 1);
    showToast(`Novo plano ${novoNum} adicionado ao quadro. Preencha os campos e salve.`, "info");
  };

  const handleRemoverPlano = (index: number) => {
    if (listaPlanos.length <= 1) {
      showToast("É necessário manter ao menos 1 plano cadastrado no quadro.", "error");
      return;
    }
    const planoParaRemover = listaPlanos[index];
    if (window.confirm(`Deseja realmente remover o plano "${planoParaRemover.nome}"?`)) {
      const updated = listaPlanos.filter((_, idx) => idx !== index);
      setListaPlanos(updated);
      setPlanoAtivoAba(Math.max(0, index - 1));
      showToast(`Plano "${planoParaRemover.nome}" removido do quadro. Lembre-se de salvar.`, "info");
    }
  };

  const handleSalvar = async () => {
    setIsSaving(true);
    try {
      await onSavePlanos(listaPlanos);
      showToast("Quadro de Planos atualizado e sincronizado com sucesso!", "success");
    } catch (err) {
      console.error(err);
      showToast("Erro ao salvar os planos.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetarPadrao = () => {
    if (window.confirm("Deseja restaurar os 3 planos para a configuração padrão oficial da plataforma (Acolher R$ 29,90, Integrar R$ 49,90, Pleno R$ 79,90)?")) {
      setListaPlanos(PLANOS_PROFISSIONAIS_PADRAO);
      onSavePlanos(PLANOS_PROFISSIONAIS_PADRAO);
      setPlanoAtivoAba(0);
      showToast("3 Planos restaurados para o padrão oficial da rede.", "info");
    }
  };

  return (
    <div className="bg-warm/30 p-6 md:p-8 rounded-3xl border border-soft space-y-6">
      {/* Header do Bloco */}
      <div className="flex flex-col gap-4 border-b border-soft pb-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 bg-sun-light text-forest text-[10px] font-bold rounded-full border border-sun-dark/30 uppercase tracking-wider">
              Quadro Integrado da Rede
            </span>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
              {listaPlanos.filter(p => p.ativo).length} Ativo(s)
            </span>
          </div>
          <h4 className="font-serif text-2xl font-bold text-forest">
            Gestão dos 3 Planos de Adesão da Rede
          </h4>
        </div>
        
        <p className="text-xs text-forest/75 leading-relaxed max-w-3xl">
          Defina os 3 planos de participação da rede profissional. Os valores e detalhes configurados aqui alimentam diretamente a página de apresentação e a ficha de credenciamento.
        </p>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleAdicionarNovoPlano}
            className="px-3.5 py-2 rounded-xl border border-sun-dark/40 bg-sun-light hover:bg-sun text-forest text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Adicionar mais um plano ao quadro se necessário"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Plano</span>
          </button>
          <button
            type="button"
            onClick={handleResetarPadrao}
            className="px-3.5 py-2 rounded-xl border border-soft bg-white text-forest text-xs font-semibold hover:bg-warm flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Restaurar valores de fábrica dos 3 planos"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar 3 Planos</span>
          </button>
          <button
            type="button"
            onClick={handleSalvar}
            disabled={isSaving}
            className="px-5 py-2 bg-forest hover:bg-forest/90 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-sun" />
            <span>{isSaving ? "Salvando..." : "Salvar Quadro de Planos"}</span>
          </button>
        </div>
      </div>

      {/* Chave Seletora de Exibição dos Planos na Página Pública */}
      <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
        exibirPlanos 
          ? "bg-emerald-500/10 border-emerald-500/30" 
          : "bg-amber-500/10 border-amber-500/30"
      } flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
        <div className="flex items-start gap-3.5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            exibirPlanos ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"
          }`}>
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-forest">
                Chave Seletora: Exibição dos Planos na Página Pública
              </span>
              <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                exibirPlanos 
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300" 
                  : "bg-amber-100 text-amber-900 border border-amber-300"
              }`}>
                {exibirPlanos ? "Planos Visíveis Publicamente" : "Planos Ocultos (Modo 3 Meses de Isenção)"}
              </span>
            </div>
            <p className="text-xs text-forest/80 leading-relaxed mt-1 max-w-2xl">
              {exibirPlanos 
                ? "Os 3 planos e seus respectivos valores estão visíveis na página de apresentação pública e na seleção da ficha de inscrição."
                : "A tabela de planos está oculta na página pública. No lugar, são destacados os recursos práticos (assistente de recibos/NF, controle financeiro, notificações) e a oportunidade de incentivo com 3 meses de isenção total."}
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={isTogglingExibir}
          onClick={async () => {
            if (onToggleExibirPlanos) {
              setIsTogglingExibir(true);
              try {
                await onToggleExibirPlanos(!exibirPlanos);
                showToast(
                  !exibirPlanos 
                    ? "Planos habilitados na página pública dos profissionais!" 
                    : "Planos ocultados na página pública. A página agora exibe os recursos e a isenção de 3 meses.",
                  "success"
                );
              } catch (e) {
                console.error(e);
                showToast("Erro ao alterar visibilidade dos planos.", "error");
              } finally {
                setIsTogglingExibir(false);
              }
            }
          }}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shrink-0 transition-all cursor-pointer shadow-sm ${
            exibirPlanos
              ? "bg-emerald-700 hover:bg-emerald-800 text-white"
              : "bg-amber-700 hover:bg-amber-800 text-white"
          }`}
        >
          {exibirPlanos ? (
            <>
              <ToggleRight className="w-5 h-5 text-emerald-200" />
              <span>{isTogglingExibir ? "Alterando..." : "Desabilitar Planos na Página"}</span>
            </>
          ) : (
            <>
              <ToggleLeft className="w-5 h-5 text-amber-200" />
              <span>{isTogglingExibir ? "Alterando..." : "Habilitar Planos na Página"}</span>
            </>
          )}
        </button>
      </div>

      {/* Chave Seletora 2: Exibição dos Planos no Painel do Profissional */}
      <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
        exibirPlanosPainel !== false 
          ? "bg-emerald-500/10 border-emerald-500/30" 
          : "bg-amber-500/10 border-amber-500/30"
      } flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
        <div className="flex items-start gap-3.5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            exibirPlanosPainel !== false ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"
          }`}>
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-forest">
                Chave Seletora: Exibição dos Planos no Painel do Profissional
              </span>
              <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                exibirPlanosPainel !== false 
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300" 
                  : "bg-amber-100 text-amber-900 border border-amber-300"
              }`}>
                {exibirPlanosPainel !== false ? "Planos Visíveis no Painel" : "Planos Ocultos no Painel"}
              </span>
            </div>
            <p className="text-xs text-forest/80 leading-relaxed mt-1 max-w-2xl">
              {exibirPlanosPainel !== false 
                ? "Os profissionais visualizam os planos de adesão disponíveis em seu painel de pagamentos (com exceção de cortesia que exibe apenas o plano Acolher)."
                : "Os planos de adesão estão ocultos no painel dos profissionais. Profissionais em cortesia mantêm acesso ao Plano Acolher."}
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={isTogglingExibirPainel}
          onClick={async () => {
            if (onToggleExibirPlanosPainel) {
              setIsTogglingExibirPainel(true);
              try {
                const novoVal = exibirPlanosPainel === false ? true : false;
                await onToggleExibirPlanosPainel(novoVal);
                showToast(
                  novoVal 
                    ? "Planos habilitados no painel dos profissionais!" 
                    : "Planos ocultados no painel dos profissionais.",
                  "success"
                );
              } catch (e) {
                console.error(e);
                showToast("Erro ao alterar visibilidade no painel.", "error");
              } finally {
                setIsTogglingExibirPainel(false);
              }
            }
          }}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shrink-0 transition-all cursor-pointer shadow-sm ${
            exibirPlanosPainel !== false
              ? "bg-emerald-700 hover:bg-emerald-800 text-white"
              : "bg-amber-700 hover:bg-amber-800 text-white"
          }`}
        >
          {exibirPlanosPainel !== false ? (
            <>
              <ToggleRight className="w-5 h-5 text-emerald-200" />
              <span>{isTogglingExibirPainel ? "Alterando..." : "Desabilitar no Painel"}</span>
            </>
          ) : (
            <>
              <ToggleLeft className="w-5 h-5 text-amber-200" />
              <span>{isTogglingExibirPainel ? "Alterando..." : "Habilitar no Painel"}</span>
            </>
          )}
        </button>
      </div>

      {/* Abas Seletoras dos Planos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-3">
        {listaPlanos.map((plano, idx) => {
          const isSelected = safeIndex === idx;
          return (
            <button
              key={plano.id || idx}
              type="button"
              onClick={() => setPlanoAtivoAba(idx)}
              className={`p-4 rounded-2xl border text-left flex flex-col justify-between gap-2.5 transition-all cursor-pointer relative ${
                isSelected
                  ? "bg-white border-forest ring-2 ring-forest/20 shadow-md scale-[1.01]"
                  : "bg-white/60 border-soft hover:bg-white hover:border-forest/40"
              } ${!plano.ativo ? "opacity-60 bg-slate-50" : ""}`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-[10px] font-bold uppercase tracking-wider text-forest/60 flex items-center gap-1">
                  Plano {idx + 1}
                  {!plano.ativo && <span className="text-rose-600 font-extrabold">(Inativo)</span>}
                </span>
                {plano.destaque && (
                  <span className="inline-flex items-center gap-1 text-[9px] bg-sun text-forest font-extrabold px-2 py-0.5 rounded-full shadow-2xs">
                    <Star className="w-2.5 h-2.5 fill-forest" />
                    Destaque Principal
                  </span>
                )}
              </div>

              <div>
                <h5 className="font-serif text-sm font-bold text-forest leading-tight">
                  {plano.nome || `Plano ${idx + 1}`}
                </h5>
                <p className="text-[11px] text-forest/70 line-clamp-1 mt-0.5">
                  {plano.subtitulo || plano.descricao}
                </p>
              </div>

              <div className="flex items-baseline justify-between pt-2 border-t border-soft/50 w-full">
                <div className="flex items-baseline gap-1">
                  <span className="text-xs text-forest/60 font-semibold">R$</span>
                  <span className="text-base font-bold text-forest">{plano.valorMensal || "0,00"}</span>
                  <span className="text-[10px] text-forest/50">/mês</span>
                </div>
                <span className="text-[10px] font-medium text-forest/60 bg-warm/80 px-2 py-0.5 rounded-md">
                  {plano.horasInclusas || "Horas flexíveis"}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Editor do Plano Selecionado */}
      {planoEditando && (
        <div className="bg-white p-5 sm:p-7 rounded-2xl border border-soft shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-soft pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-forest" />
              <span className="font-serif text-base font-bold text-forest">
                Editando: {planoEditando.nome}
              </span>
              <span className="text-xs text-forest/50">
                (ID: {planoEditando.id})
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleToggleAtivo(safeIndex)}
                className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                  planoEditando.ativo
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                    : "bg-rose-50 text-rose-800 border-rose-300"
                }`}
                title="Ativar ou desativar este plano na plataforma"
              >
                {planoEditando.ativo ? <ToggleRight className="w-4 h-4 text-emerald-600" /> : <ToggleLeft className="w-4 h-4 text-rose-500" />}
                <span>{planoEditando.ativo ? "Plano Ativo" : "Plano Inativo"}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSetDestaque(safeIndex)}
                className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                  planoEditando.destaque 
                    ? "bg-sun text-forest border-sun-dark/40 shadow-2xs" 
                    : "bg-warm text-forest/70 border-soft hover:bg-sun-light hover:text-forest"
                }`}
              >
                <Star className={`w-3.5 h-3.5 ${planoEditando.destaque ? "fill-forest" : ""}`} />
                <span>{planoEditando.destaque ? "Plano em Destaque (Principal)" : "Definir como Destaque"}</span>
              </button>

              {listaPlanos.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoverPlano(safeIndex)}
                  className="px-2.5 py-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer border border-rose-200"
                  title="Remover plano do quadro"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Excluir</span>
                </button>
              )}
            </div>
          </div>

          {/* Campos Básicos */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase text-forest/70">
                Nome do Plano *
              </label>
              <input
                type="text"
                value={planoEditando.nome}
                onChange={(e) => handleUpdateCampo("nome", e.target.value)}
                placeholder="Ex: Plano Integrar (Intermediário)"
                className="w-full px-3.5 py-2.5 bg-warm/40 border border-soft rounded-xl text-xs font-semibold text-forest focus:outline-none focus:border-forest"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase text-forest/70">
                Valor Mensal (R$) *
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-xs font-bold text-forest/60">R$</span>
                <input
                  type="text"
                  value={planoEditando.valorMensal}
                  onChange={(e) => handleUpdateCampo("valorMensal", e.target.value)}
                  placeholder="49,90"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-warm/40 border border-soft rounded-xl text-xs font-bold text-forest focus:outline-none focus:border-forest"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase text-forest/70">
                Subtítulo / Selo de Destaque
              </label>
              <input
                type="text"
                value={planoEditando.subtitulo}
                onChange={(e) => handleUpdateCampo("subtitulo", e.target.value)}
                placeholder="Ex: Mais Procurado • Clínico & Corporativo"
                className="w-full px-3.5 py-2.5 bg-warm/40 border border-soft rounded-xl text-xs text-forest focus:outline-none focus:border-forest"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase text-forest/70">
                Horas Inclusas Estimadas
              </label>
              <div className="relative flex items-center">
                <Clock className="w-3.5 h-3.5 text-forest/50 absolute left-3" />
                <input
                  type="text"
                  value={planoEditando.horasInclusas}
                  onChange={(e) => handleUpdateCampo("horasInclusas", e.target.value)}
                  placeholder="Ex: Até 16 horas/mês"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-warm/40 border border-soft rounded-xl text-xs text-forest focus:outline-none focus:border-forest"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold uppercase text-forest/70">
              Descrição Geral do Plano
            </label>
            <textarea
              rows={2}
              value={planoEditando.descricao}
              onChange={(e) => handleUpdateCampo("descricao", e.target.value)}
              placeholder="Ex: Mais vagas na esteira clínica e acesso prioritário à Triagem Corporativa com empresas parceiras."
              className="w-full px-3.5 py-2.5 bg-warm/40 border border-soft rounded-xl text-xs text-forest focus:outline-none focus:border-forest resize-none leading-relaxed"
            />
          </div>

          {/* Lista de Recursos / Vantagens do Plano */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase text-forest/70">
                Recursos e Benefícios Liberados Neste Plano
              </label>
              <span className="text-[10px] text-forest/50">
                {planoEditando.recursos?.length || 0} benefício(s) cadastrado(s)
              </span>
            </div>

            <div className="space-y-2">
              {(planoEditando.recursos || []).map((rec, rIdx) => (
                <div 
                  key={rIdx} 
                  className="flex items-center justify-between gap-2.5 p-2.5 bg-warm/40 rounded-xl border border-soft/70 text-xs text-forest font-medium"
                >
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{rec}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveRecurso(rIdx)}
                    className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Remover benefício"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Adicionar novo recurso */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={novoRecursoTexto}
                onChange={(e) => setNovoRecursoTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddRecurso();
                  }
                }}
                placeholder="Digite um novo benefício e clique em Adicionar (ou pressione Enter)..."
                className="flex-1 px-3.5 py-2 bg-warm/30 border border-soft rounded-xl text-xs text-forest focus:outline-none focus:border-forest"
              />
              <button
                type="button"
                onClick={handleAddRecurso}
                className="px-4 py-2 bg-warm hover:bg-sun text-forest border border-soft rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar</span>
              </button>
            </div>
          </div>

          {/* Rodapé do Editor */}
          <div className="pt-3 border-t border-soft flex items-center justify-between flex-wrap gap-2">
            <span className="text-[11px] text-forest/60">
              * As alterações serão salvas ao clicar em <strong>Salvar Quadro de Planos</strong>.
            </span>
            <button
              type="button"
              onClick={handleSalvar}
              disabled={isSaving}
              className="px-5 py-2.5 bg-forest hover:bg-forest/90 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-sun" />
              <span>{isSaving ? "Salvando..." : "Salvar Quadro de Planos"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
