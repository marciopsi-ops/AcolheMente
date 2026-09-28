import React, { useState } from "react";
import {
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Sparkles,
  ShieldCheck,
  FileCheck2,
  Users,
  Clock,
  Laptop,
  Building,
  RotateCcw,
  Tag,
  DollarSign,
  AlertCircle,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import {
  ItemCatalogoCorporativo,
  CategoriaCatalogo,
  DEFAULT_CATALOGO_CORPORATIVO,
  getCatalogoEmpresa,
} from "../types/corporativo";

interface EmpresaCatalogoManagerProps {
  empresa: {
    id: string;
    nomeEmpresa?: string;
    razaoSocial?: string;
    catalogoServicosConfig?: ItemCatalogoCorporativo[];
    [key: string]: any;
  };
  onSaveCatalogo: (catalogoAtualizado: ItemCatalogoCorporativo[]) => void;
  onShowToast?: (msg: string, type?: "success" | "error" | "info") => void;
}

const CATEGORIA_LABELS: Record<CategoriaCatalogo, { label: string; badgeBg: string; badgeText: string }> = {
  nr1_gro_pgr: { label: "NR-1 / GRO & PGR", badgeBg: "bg-rose-100", badgeText: "text-rose-900" },
  palestras_workshops: { label: "Palestras & Workshops CIPA", badgeBg: "bg-blue-100", badgeText: "text-blue-900" },
  diagnostico_psicossocial: { label: "Diagnóstico Psicossocial", badgeBg: "bg-purple-100", badgeText: "text-purple-900" },
  plantao_crise: { label: "Plantão & Gestão de Crise", badgeBg: "bg-amber-100", badgeText: "text-amber-900" },
  lideranca_saude: { label: "Liderança & Saúde Mental", badgeBg: "bg-emerald-100", badgeText: "text-emerald-900" },
  outros: { label: "Outras Intervenções", badgeBg: "bg-gray-100", badgeText: "text-gray-800" },
};

export function EmpresaCatalogoManager({
  empresa,
  onSaveCatalogo,
  onShowToast,
}: EmpresaCatalogoManagerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [catalogo, setCatalogo] = useState<ItemCatalogoCorporativo[]>(() =>
    getCatalogoEmpresa(empresa)
  );

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [formItem, setFormItem] = useState<Partial<ItemCatalogoCorporativo>>({});
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  const handleToggleAtivo = (id: string) => {
    const updated = catalogo.map((item) =>
      item.id === id ? { ...item, ativo: !item.ativo } : item
    );
    setCatalogo(updated);
    onSaveCatalogo(updated);
    onShowToast?.("Visibilidade do serviço atualizada no Portal do RH!", "success");
  };

  const handleToggleDestaque = (id: string) => {
    const updated = catalogo.map((item) =>
      item.id === id ? { ...item, destaque: !item.destaque } : item
    );
    setCatalogo(updated);
    onSaveCatalogo(updated);
    onShowToast?.("Destaque atualizado!", "success");
  };

  const handleDeleteItem = (id: string) => {
    if (confirm("Deseja remover este serviço do catálogo desta empresa?")) {
      const updated = catalogo.filter((item) => item.id !== id);
      setCatalogo(updated);
      onSaveCatalogo(updated);
      onShowToast?.("Item removido do catálogo.", "info");
    }
  };

  const handleResetPadrao = () => {
    if (confirm("Deseja restaurar o catálogo padrão de intervenções NR-1 e serviços corporativos?")) {
      setCatalogo(DEFAULT_CATALOGO_CORPORATIVO);
      onSaveCatalogo(DEFAULT_CATALOGO_CORPORATIVO);
      onShowToast?.("Catálogo padrão restaurado!", "success");
    }
  };

  const handleStartEdit = (item: ItemCatalogoCorporativo) => {
    setIsCreatingNew(false);
    setEditingItemId(item.id);
    setFormItem({ ...item, beneficiosEsperados: [...(item.beneficiosEsperados || [])] });
  };

  const handleStartNew = () => {
    setEditingItemId(null);
    setIsCreatingNew(true);
    setFormItem({
      id: `servico_custom_${Date.now()}`,
      titulo: "",
      categoria: "nr1_gro_pgr",
      tagNormativa: "NR-1 / GRO",
      descricaoCurta: "",
      comoFunciona: "",
      publicoAlvo: "Colaboradores e Liderança",
      cargaHorariaEstimada: "Conforme demanda",
      formatoAtendimento: "online",
      beneficiosEsperados: [],
      ativo: true,
      destaque: false,
      precoReferencia: "Sob consulta / Orçamento sob demanda",
    });
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formItem.titulo || !formItem.descricaoCurta) {
      alert("Por favor, preencha pelo menos o título e uma breve descrição do serviço.");
      return;
    }

    let updated: ItemCatalogoCorporativo[];
    if (isCreatingNew) {
      const newItem: ItemCatalogoCorporativo = {
        id: formItem.id || `servico_${Date.now()}`,
        titulo: formItem.titulo,
        categoria: formItem.categoria || "outros",
        tagNormativa: formItem.tagNormativa || "",
        descricaoCurta: formItem.descricaoCurta,
        comoFunciona: formItem.comoFunciona || "",
        publicoAlvo: formItem.publicoAlvo || "",
        cargaHorariaEstimada: formItem.cargaHorariaEstimada || "",
        formatoAtendimento: formItem.formatoAtendimento || "online",
        beneficiosEsperados: formItem.beneficiosEsperados || [],
        ativo: formItem.ativo ?? true,
        destaque: formItem.destaque ?? false,
        precoReferencia: formItem.precoReferencia || "Sob consulta",
      };
      updated = [newItem, ...catalogo];
    } else {
      updated = catalogo.map((it) => (it.id === editingItemId ? ({ ...it, ...formItem } as ItemCatalogoCorporativo) : it));
    }

    setCatalogo(updated);
    onSaveCatalogo(updated);
    setEditingItemId(null);
    setIsCreatingNew(false);
    onShowToast?.("Catálogo de produtos e serviços atualizado com sucesso!", "success");
  };

  const totalAtivos = catalogo.filter((c) => c.ativo).length;

  return (
    <div className="bg-white rounded-2xl border border-soft p-4 sm:p-5 shadow-xs transition-all">
      {/* Header Central e Discreto */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-soft">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sun/20 border border-sun/40 flex items-center justify-center text-forest shrink-0">
            <BookOpen className="w-5 h-5 text-forest" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-forest flex items-center gap-1.5">
                Catálogo de Serviços & Intervenções NR-1 (GRO / PGR)
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                {totalAtivos} ativos no Portal RH
              </span>
            </div>
            <p className="text-[11px] text-forest/70">
              Produtos e intervenções que a empresa visualiza no portal para solicitar orçamento conforme seus indicadores.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-warm hover:bg-soft text-forest text-xs font-semibold rounded-xl border border-soft transition-colors cursor-pointer"
          >
            <span>{isExpanded ? "Ocultar Edição" : "Configurar Serviços"}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Pré-visualização resumida quando recolhido */}
      {!isExpanded && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {catalogo.slice(0, 4).map((serv) => (
            <span
              key={serv.id}
              className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg border font-medium ${
                serv.ativo ? "bg-warm/60 border-soft text-forest" : "bg-gray-100 border-gray-200 text-gray-600 opacity-60 line-through"
              }`}
            >
              <FileCheck2 className="w-3 h-3 text-emerald-600" />
              <span className="truncate max-w-[200px]">{serv.titulo}</span>
            </span>
          ))}
          {catalogo.length > 4 && (
            <span className="text-[11px] text-forest/60 font-semibold">
              +{catalogo.length - 4} outros serviços
            </span>
          )}
        </div>
      )}

      {/* Painel de Edição Expandido */}
      {isExpanded && (
        <div className="mt-4 space-y-4 animate-in fade-in-50">
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
            <div className="flex items-center gap-2 text-xs text-amber-900">
              <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                Personalize os serviços disponíveis para <strong>{empresa.nomeEmpresa || empresa.razaoSocial || "esta empresa"}</strong>. Cada item pode ser editado, ativado ou complementado com novos temas de palestras e laudos.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleStartNew}
                className="flex items-center gap-1 px-2.5 py-1 bg-forest text-white hover:bg-forest/90 text-xs font-bold rounded-lg shadow-2xs transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-sun" />
                <span>Novo Serviço</span>
              </button>
              <button
                type="button"
                onClick={handleResetPadrao}
                className="flex items-center gap-1 px-2 py-1 bg-white hover:bg-gray-50 text-forest/70 hover:text-forest text-xs font-semibold rounded-lg border border-soft transition-colors cursor-pointer"
                title="Restaurar lista padrão"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden sm:inline">Padrão</span>
              </button>
            </div>
          </div>

          {/* Modal / Formulário inline de Criação / Edição */}
          {(isCreatingNew || editingItemId) && (
            <form onSubmit={handleSaveForm} className="bg-warm/40 border-2 border-forest/30 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-soft">
                <h5 className="font-serif text-sm font-bold text-forest flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-sun-dark" />
                  <span>{isCreatingNew ? "Cadastrar Novo Produto ou Intervenção" : "Editar Serviço do Catálogo"}</span>
                </h5>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingNew(false);
                    setEditingItemId(null);
                  }}
                  className="p-1 text-forest/50 hover:text-forest rounded-lg hover:bg-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div className="sm:col-span-2 flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-forest/70">Título do Serviço / Intervenção *</label>
                  <input
                    type="text"
                    required
                    value={formItem.titulo || ""}
                    onChange={(e) => setFormItem({ ...formItem, titulo: e.target.value })}
                    placeholder="Ex: Assessoria NR-1: Gestão de Riscos Psicossociais (GRO & PGR)"
                    className="text-xs bg-white border border-soft px-3 py-2 rounded-xl text-forest font-semibold focus:outline-none focus:border-forest"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-forest/70">Tag Normativa / Selo</label>
                  <input
                    type="text"
                    value={formItem.tagNormativa || ""}
                    onChange={(e) => setFormItem({ ...formItem, tagNormativa: e.target.value })}
                    placeholder="Ex: Obrigatório NR-1 / GRO"
                    className="text-xs bg-white border border-soft px-3 py-2 rounded-xl text-forest focus:outline-none focus:border-forest"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-forest/70">Categoria</label>
                  <select
                    value={formItem.categoria || "nr1_gro_pgr"}
                    onChange={(e) => setFormItem({ ...formItem, categoria: e.target.value as CategoriaCatalogo })}
                    className="text-xs bg-white border border-soft px-3 py-2 rounded-xl text-forest font-semibold focus:outline-none focus:border-forest cursor-pointer"
                  >
                    <option value="nr1_gro_pgr">NR-1 / GRO & PGR</option>
                    <option value="palestras_workshops">Palestras & Workshops CIPA</option>
                    <option value="diagnostico_psicossocial">Diagnóstico Psicossocial</option>
                    <option value="plantao_crise">Plantão & Gestão de Crise</option>
                    <option value="lideranca_saude">Liderança & Saúde Mental</option>
                    <option value="outros">Outras Intervenções</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-forest/70">Formato</label>
                  <select
                    value={formItem.formatoAtendimento || "online"}
                    onChange={(e) => setFormItem({ ...formItem, formatoAtendimento: e.target.value as any })}
                    className="text-xs bg-white border border-soft px-3 py-2 rounded-xl text-forest font-semibold focus:outline-none focus:border-forest cursor-pointer"
                  >
                    <option value="online">Online (Remoto)</option>
                    <option value="presencial">Presencial na Empresa</option>
                    <option value="hibrido">Híbrido (Online + Presencial)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-forest/70">Carga Horária / Prazo</label>
                  <input
                    type="text"
                    value={formItem.cargaHorariaEstimada || ""}
                    onChange={(e) => setFormItem({ ...formItem, cargaHorariaEstimada: e.target.value })}
                    placeholder="Ex: 4 horas ou Ciclo de 30 dias"
                    className="text-xs bg-white border border-soft px-3 py-2 rounded-xl text-forest focus:outline-none focus:border-forest"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-forest/70">
                    O que é? (Breve Descrição) *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={formItem.descricaoCurta || ""}
                    onChange={(e) => setFormItem({ ...formItem, descricaoCurta: e.target.value })}
                    placeholder="Resumo claro e atrativo para o gestor de RH..."
                    className="text-xs bg-white border border-soft px-3 py-2 rounded-xl text-forest focus:outline-none focus:border-forest resize-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-forest/70">
                    Como funciona na prática?
                  </label>
                  <textarea
                    rows={2}
                    value={formItem.comoFunciona || ""}
                    onChange={(e) => setFormItem({ ...formItem, comoFunciona: e.target.value })}
                    placeholder="Explicação da metodologia, etapas e entregáveis..."
                    className="text-xs bg-white border border-soft px-3 py-2 rounded-xl text-forest focus:outline-none focus:border-forest resize-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-forest/70">Público-Alvo</label>
                  <input
                    type="text"
                    value={formItem.publicoAlvo || ""}
                    onChange={(e) => setFormItem({ ...formItem, publicoAlvo: e.target.value })}
                    placeholder="Ex: Lideranças, CIPA, Toda a equipe"
                    className="text-xs bg-white border border-soft px-3 py-2 rounded-xl text-forest focus:outline-none focus:border-forest"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-forest/70">Preço / Condição de Referência</label>
                  <input
                    type="text"
                    value={formItem.precoReferencia || ""}
                    onChange={(e) => setFormItem({ ...formItem, precoReferencia: e.target.value })}
                    placeholder="Ex: Sob consulta ou A partir de R$ 1.500"
                    className="text-xs bg-white border border-soft px-3 py-2 rounded-xl text-forest focus:outline-none focus:border-forest"
                  />
                </div>

                <div className="flex items-center gap-4 pt-4">
                  <label className="flex items-center gap-1.5 text-xs text-forest font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formItem.ativo ?? true}
                      onChange={(e) => setFormItem({ ...formItem, ativo: e.target.checked })}
                      className="rounded accent-forest"
                    />
                    <span>Ativo no Portal</span>
                  </label>

                  <label className="flex items-center gap-1.5 text-xs text-forest font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formItem.destaque ?? false}
                      onChange={(e) => setFormItem({ ...formItem, destaque: e.target.checked })}
                      className="rounded accent-amber-500"
                    />
                    <span>Destaque ⭐</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-soft">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingNew(false);
                    setEditingItemId(null);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-forest/70 hover:text-forest rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-forest text-white hover:bg-forest/90 font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 text-sun" />
                  <span>Salvar Serviço</span>
                </button>
              </div>
            </form>
          )}

          {/* Lista de Serviços */}
          <div className="grid grid-cols-1 gap-3">
            {catalogo.map((item) => {
              const catMeta = CATEGORIA_LABELS[item.categoria] || CATEGORIA_LABELS.outros;
              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
                    item.ativo
                      ? "bg-white border-soft hover:border-sun/60 shadow-2xs"
                      : "bg-gray-50/70 border-gray-200 opacity-60"
                  }`}
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${catMeta.badgeBg} ${catMeta.badgeText}`}>
                        {catMeta.label}
                      </span>
                      {item.tagNormativa && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          {item.tagNormativa}
                        </span>
                      )}
                      {item.destaque && (
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-sun-dark text-forest">
                          Destaque
                        </span>
                      )}
                      <span className="text-[10px] text-forest/60 font-medium">
                        {item.formatoAtendimento === "online" ? "🌐 Online" : item.formatoAtendimento === "presencial" ? "🏢 Presencial" : "🔄 Híbrido"}
                        {item.cargaHorariaEstimada ? ` • ${item.cargaHorariaEstimada}` : ""}
                      </span>
                    </div>

                    <h5 className="font-serif text-sm font-bold text-forest truncate">{item.titulo}</h5>
                    <p className="text-xs text-forest/70 line-clamp-2 leading-relaxed">{item.descricaoCurta}</p>
                    {item.comoFunciona && (
                      <p className="text-[11px] text-forest/60 line-clamp-1 italic">
                        <strong>Como funciona:</strong> {item.comoFunciona}
                      </p>
                    )}
                  </div>

                  {/* Ações Rápidas */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <button
                      type="button"
                      onClick={() => handleToggleAtivo(item.id)}
                      className={`p-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                        item.ativo
                          ? "bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                          : "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200"
                      }`}
                      title={item.ativo ? "Ocultar no Portal do RH" : "Exibir no Portal do RH"}
                    >
                      {item.ativo ? <Eye className="w-3.5 h-3.5 text-emerald-600" /> : <EyeOff className="w-3.5 h-3.5 text-gray-500" />}
                      <span className="text-[11px]">{item.ativo ? "Ativo" : "Oculto"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStartEdit(item)}
                      className="p-1.5 bg-warm hover:bg-soft text-forest rounded-xl border border-soft transition-colors cursor-pointer"
                      title="Editar detalhes do serviço"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl border border-rose-200 transition-colors cursor-pointer"
                      title="Excluir este serviço"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
