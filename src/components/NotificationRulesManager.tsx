import React, { useState, useEffect } from "react";
import {
  Bell,
  Mail,
  MessageSquare,
  Clock,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  Send,
  Sparkles,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Info,
  Sliders,
  ExternalLink,
  Users,
  Check,
  Zap,
} from "lucide-react";
import {
  NotificationTrigger,
  NotificationAudience,
  NOTIFICATION_AVAILABLE_VARIABLES,
} from "../types/notificationRules";
import {
  getNotificationTriggers,
  saveNotificationTriggers,
  dispatchNotificationEvent,
  interpolateVariables,
  fetchNotificationHistory,
} from "../lib/notificationRulesService";

interface NotificationRulesManagerProps {
  onShowToast: (message: string, type: "success" | "error" | "info") => void;
  whatsappInstanceName?: string;
  whatsappConnected?: boolean;
}

export const NotificationRulesManager: React.FC<NotificationRulesManagerProps> = ({
  onShowToast,
  whatsappInstanceName = "acolhemente",
  whatsappConnected = false,
}) => {
  const [triggers, setTriggers] = useState<NotificationTrigger[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"regua" | "historico">("regua");
  const [filterAudience, setFilterAudience] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // History state
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Edit / Create Trigger Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState<NotificationTrigger | null>(null);
  const [channelTab, setChannelTab] = useState<"whatsapp" | "email">("whatsapp");
  const [previewEmailModal, setPreviewEmailModal] = useState<string | null>(null);

  // Test Modal
  const [testModalTrigger, setTestModalTrigger] = useState<NotificationTrigger | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testFeedback, setTestFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Load triggers on mount
  useEffect(() => {
    loadTriggers();
  }, []);

  const loadTriggers = async () => {
    setIsLoading(true);
    try {
      const data = await getNotificationTriggers();
      setTriggers(data);
    } catch (err) {
      console.error(err);
      onShowToast("Erro ao carregar gatilhos de notificação.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const data = await fetchNotificationHistory(30);
      setHistoryItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleToggleActive = async (triggerId: string) => {
    const updated = triggers.map((t) =>
      t.id === triggerId ? { ...t, active: !t.active } : t
    );
    setTriggers(updated);
    const ok = await saveNotificationTriggers(updated);
    if (ok) {
      onShowToast("Status do gatilho atualizado.", "success");
    } else {
      onShowToast("Erro ao salvar alteração.", "error");
      loadTriggers();
    }
  };

  const handleOpenCreateModal = () => {
    const newTrigger: NotificationTrigger = {
      id: `custom_${Date.now()}`,
      nome: "",
      descricao: "",
      categoria: "paciente",
      isCustom: true,
      active: true,
      timing: {
        type: "immediate",
        delayMinutes: 0,
      },
      email: {
        enabled: true,
        subject: "AcolheMente - Notificação Importante",
        bodyHtml: `<h3 style="color: #1e352f;">Olá, {nome}!</h3>\n<p>Esta é uma mensagem automática do Projeto AcolheMente Saúde.</p>`,
      },
      whatsapp: {
        enabled: true,
        messageText: "Olá, *{primeiro_nome}*! 👋 Esta é uma mensagem importante do *AcolheMente*.",
      },
    };
    setEditingTrigger(newTrigger);
    setChannelTab("whatsapp");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (trigger: NotificationTrigger) => {
    // Deep clone to allow editing safely
    setEditingTrigger(JSON.parse(JSON.stringify(trigger)));
    setChannelTab("whatsapp");
    setIsModalOpen(true);
  };

  const handleSaveTrigger = async () => {
    if (!editingTrigger) return;
    if (!editingTrigger.nome.trim()) {
      onShowToast("Por favor, preencha o nome do gatilho.", "error");
      return;
    }

    setIsSaving(true);
    try {
      const exists = triggers.some((t) => t.id === editingTrigger.id);
      let updatedList: NotificationTrigger[];
      if (exists) {
        updatedList = triggers.map((t) =>
          t.id === editingTrigger.id ? { ...editingTrigger, updatedAt: new Date().toISOString() } : t
        );
      } else {
        updatedList = [
          ...triggers,
          {
            ...editingTrigger,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];
      }

      setTriggers(updatedList);
      const success = await saveNotificationTriggers(updatedList);
      if (success) {
        onShowToast("Gatilho salvo com sucesso!", "success");
        setIsModalOpen(false);
        setEditingTrigger(null);
      } else {
        onShowToast("Falha ao salvar gatilho no banco de dados.", "error");
      }
    } catch (err) {
      console.error(err);
      onShowToast("Erro ao salvar gatilho.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCustomTrigger = async (triggerId: string) => {
    if (!window.confirm("Deseja realmente excluir este gatilho personalizado?")) return;

    const filtered = triggers.filter((t) => t.id !== triggerId);
    setTriggers(filtered);
    const ok = await saveNotificationTriggers(filtered);
    if (ok) {
      onShowToast("Gatilho removido com sucesso.", "success");
    } else {
      onShowToast("Erro ao remover gatilho.", "error");
      loadTriggers();
    }
  };

  const handleInsertVariable = (tag: string, targetField: "whatsapp" | "emailSubject" | "emailBody") => {
    if (!editingTrigger) return;
    if (targetField === "whatsapp") {
      setEditingTrigger({
        ...editingTrigger,
        whatsapp: {
          ...editingTrigger.whatsapp,
          messageText: (editingTrigger.whatsapp.messageText || "") + " " + tag,
        },
      });
    } else if (targetField === "emailSubject") {
      setEditingTrigger({
        ...editingTrigger,
        email: {
          ...editingTrigger.email,
          subject: (editingTrigger.email.subject || "") + " " + tag,
        },
      });
    } else {
      setEditingTrigger({
        ...editingTrigger,
        email: {
          ...editingTrigger.email,
          bodyHtml: (editingTrigger.email.bodyHtml || "") + " " + tag,
        },
      });
    }
  };

  const handleOpenTestModal = (trigger: NotificationTrigger) => {
    setTestModalTrigger(trigger);
    setTestFeedback(null);
    setTestPhone("");
    setTestEmail("");
  };

  const handleExecuteTest = async () => {
    if (!testModalTrigger) return;
    if (!testPhone && !testEmail) {
      onShowToast("Informe ao menos um telefone ou e-mail de teste.", "error");
      return;
    }

    setIsSendingTest(true);
    setTestFeedback(null);
    try {
      const sampleVars = {
        nome: "Usuário de Teste",
        primeiro_nome: "Usuário",
        email: testEmail || "teste@acolhemente.com.br",
        telefone: testPhone || "(11) 99999-9999",
        profissional: "Dr(a). Ana Paula Silveira",
        valor_sessao: "R$ 60,00",
        frequencia: "Semanal",
        link_proposta: `${window.location.origin}/?view=proposta&id=demo-test`,
        link_pagamento: "https://buy.stripe.com/acolhemente",
        empresa: "Empresa Parceira Teste",
        data: new Date().toLocaleDateString("pt-BR"),
        plataforma: "AcolheMente Saúde",
      };

      const res = await dispatchNotificationEvent({
        eventId: testModalTrigger.id,
        recipientEmail: testEmail ? testEmail.trim() : undefined,
        recipientPhone: testPhone ? testPhone.trim() : undefined,
        recipientName: "Usuário de Teste",
        variables: sampleVars,
        forceImmediate: true, // Em testes sempre enviamos de imediato
      });

      if (res.success) {
        const details = [];
        if (res.emailSent) details.push("E-mail enviado");
        if (res.whatsappSent) details.push("WhatsApp enviado");
        if (!res.emailSent && !res.whatsappSent) {
          details.push("Nenhum canal ativo ou dados ausentes");
        }

        setTestFeedback({
          success: true,
          message: `Teste concluído com sucesso! (${details.join(", ")})`,
        });
        onShowToast("Disparo de teste efetuado!", "success");
      } else {
        setTestFeedback({
          success: false,
          message: res.error || "Falha ao processar o teste.",
        });
      }
    } catch (err: any) {
      setTestFeedback({
        success: false,
        message: err?.message || "Erro inesperado ao realizar disparo de teste.",
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  // Filter triggers
  const filteredTriggers = triggers.filter((t) => {
    if (filterAudience !== "all" && t.categoria !== filterAudience) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        t.nome.toLowerCase().includes(q) ||
        t.descricao.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const audienceLabels: Record<NotificationAudience, { label: string; color: string }> = {
    paciente: { label: "Paciente", color: "bg-teal-50 text-teal-800 border-teal-200" },
    profissional: { label: "Psicólogo", color: "bg-indigo-50 text-indigo-800 border-indigo-200" },
    empresa: { label: "Empresa / B2B", color: "bg-amber-50 text-amber-800 border-amber-200" },
    equipe: { label: "Equipe Interna", color: "bg-purple-50 text-purple-800 border-purple-200" },
    personalizado: { label: "Personalizado", color: "bg-slate-50 text-slate-800 border-slate-200" },
  };

  const getDelayLabel = (trigger: NotificationTrigger) => {
    if (!trigger.timing || trigger.timing.type === "immediate" || !trigger.timing.delayMinutes) {
      return { text: "Imediato", isDelayed: false };
    }
    const mins = trigger.timing.delayMinutes;
    if (mins < 60) {
      return { text: `${mins} min`, isDelayed: true };
    }
    if (mins % 1440 === 0) {
      const days = mins / 1440;
      return { text: `${days} ${days === 1 ? "dia" : "dias"}`, isDelayed: true };
    }
    const hours = (mins / 60).toFixed(1).replace(".0", "");
    return { text: `${hours} h`, isDelayed: true };
  };

  return (
    <div className="space-y-6">
      {/* Header & Subtabs */}
      <div className="bg-white p-6 rounded-3xl border border-soft shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-forest text-white rounded-2xl shadow-xs">
              <Bell className="w-5 h-5 text-sun" />
            </div>
            <div>
              <h2 className="font-serif text-2xl text-forest font-semibold">
                Central de Mensagens & Régua de Comunicação
              </h2>
              <p className="text-xs text-forest/70">
                Gerencie o fluxo de comunicações por WhatsApp e E-mail, personalize tempos de resposta e adicione novos gatilhos.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-warm/60 p-1 rounded-2xl border border-soft text-xs font-semibold">
            <button
              onClick={() => setActiveSubTab("regua")}
              className={`px-3.5 py-1.5 rounded-xl transition-all ${
                activeSubTab === "regua"
                  ? "bg-white text-forest shadow-xs font-bold"
                  : "text-forest/70 hover:text-forest"
              }`}
            >
              Régua & Gatilhos ({triggers.length})
            </button>
            <button
              onClick={() => {
                setActiveSubTab("historico");
                loadHistory();
              }}
              className={`px-3.5 py-1.5 rounded-xl transition-all ${
                activeSubTab === "historico"
                  ? "bg-white text-forest shadow-xs font-bold"
                  : "text-forest/70 hover:text-forest"
              }`}
            >
              Histórico de Disparos
            </button>
          </div>

          {activeSubTab === "regua" && (
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-4 py-2 bg-forest text-white rounded-2xl hover:bg-forest/90 transition-all text-xs font-bold flex items-center gap-1.5 shadow-xs shrink-0"
            >
              <Plus className="w-4 h-4 text-sun" />
              <span>Novo Gatilho</span>
            </button>
          )}
        </div>
      </div>

      {/* WhatsApp Status Alert Bar */}
      <div
        className={`p-3.5 rounded-2xl border text-xs flex flex-wrap items-center justify-between gap-3 ${
          whatsappConnected
            ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
            : "bg-amber-50/70 border-amber-200 text-amber-900"
        }`}
      >
        <div className="flex items-center gap-2">
          {whatsappConnected ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          )}
          <span>
            <strong>Instância WhatsApp ({whatsappInstanceName}):</strong>{" "}
            {whatsappConnected
              ? "Conectada e pronta para envio automático de mensagens."
              : "Instância desconectada ou aguardando QR Code. Os disparos por WhatsApp ficarão retidos até a conexão."}
          </span>
        </div>
        <div className="text-[11px] text-forest/70 font-mono flex items-center gap-1.5">
          <Mail className="w-3.5 h-3.5 text-sky-600" />
          <span>E-mails: Disparados via Webhook / Brevo em tempo real</span>
        </div>
      </div>

      {activeSubTab === "regua" ? (
        <>
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              <span className="text-xs text-forest/60 font-semibold flex items-center gap-1 shrink-0">
                <Filter className="w-3.5 h-3.5" /> Público:
              </span>
              {[
                { id: "all", label: "Todos" },
                { id: "paciente", label: "Pacientes" },
                { id: "profissional", label: "Psicólogos" },
                { id: "empresa", label: "Empresas" },
                { id: "personalizado", label: "Personalizados" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setFilterAudience(item.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    filterAudience === item.id
                      ? "bg-forest text-white shadow-2xs"
                      : "bg-white text-forest/70 border border-soft hover:border-forest/30"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-forest/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome, evento ou tag..."
                className="w-full bg-white border border-soft rounded-2xl pl-9 pr-3 py-1.5 text-xs text-forest focus:outline-none focus:border-forest"
              />
            </div>
          </div>

          {/* Triggers Grid */}
          {isLoading ? (
            <div className="p-12 text-center text-forest/60 text-sm flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-forest/50" />
              <span>Carregando régua de notificações...</span>
            </div>
          ) : filteredTriggers.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-soft space-y-3">
              <Bell className="w-8 h-8 text-forest/30 mx-auto" />
              <p className="text-sm font-semibold text-forest">Nenhum gatilho encontrado com os filtros atuais.</p>
              <button
                onClick={() => {
                  setFilterAudience("all");
                  setSearchQuery("");
                }}
                className="text-xs text-forest underline font-bold"
              >
                Limpar filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTriggers.map((trigger) => {
                const audienceMeta = audienceLabels[trigger.categoria] || audienceLabels.personalizado;
                const delayInfo = getDelayLabel(trigger);

                return (
                  <div
                    key={trigger.id}
                    className={`bg-white rounded-3xl p-5 border transition-all relative flex flex-col justify-between ${
                      trigger.active
                        ? "border-soft shadow-xs hover:border-forest/40"
                        : "border-soft/60 bg-warm/15 opacity-75"
                    }`}
                  >
                    <div>
                      {/* Top bar: Badges & Switch */}
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${audienceMeta.color}`}
                          >
                            {audienceMeta.label}
                          </span>

                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1 ${
                              delayInfo.isDelayed
                                ? "bg-amber-50 text-amber-900 border-amber-200"
                                : "bg-emerald-50 text-emerald-900 border-emerald-200"
                            }`}
                          >
                            <Clock className="w-3 h-3 shrink-0" />
                            <span>{delayInfo.isDelayed ? `Delay: ${delayInfo.text}` : "Imediato"}</span>
                          </span>

                          {trigger.isCustom && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-800 border border-sky-200">
                              Personalizado
                            </span>
                          )}
                        </div>

                        {/* Switch Active */}
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            checked={trigger.active}
                            onChange={() => handleToggleActive(trigger.id)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-warm-dark/40 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-soft after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-forest"></div>
                        </label>
                      </div>

                      {/* Title & Description */}
                      <h3 className="font-serif text-lg font-bold text-forest leading-snug">
                        {trigger.nome}
                      </h3>
                      <p className="text-xs text-forest/70 mt-1 line-clamp-2 min-h-[32px]">
                        {trigger.descricao || "Sem descrição informada."}
                      </p>

                      {/* Channels info preview */}
                      <div className="mt-4 pt-3 border-t border-soft/60 grid grid-cols-2 gap-2 text-xs">
                        <div
                          className={`p-2 rounded-xl border flex flex-col gap-1 ${
                            trigger.whatsapp.enabled
                              ? "bg-emerald-50/50 border-emerald-200/80 text-emerald-950"
                              : "bg-warm/30 border-soft/80 text-forest/40"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-bold text-[11px]">
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>WhatsApp</span>
                            <span className="text-[10px] ml-auto font-normal">
                              {trigger.whatsapp.enabled ? "Ativo" : "Desativado"}
                            </span>
                          </div>
                          <p className="text-[10px] text-forest/70 line-clamp-1 italic">
                            "{trigger.whatsapp.messageText.substring(0, 45)}..."
                          </p>
                        </div>

                        <div
                          className={`p-2 rounded-xl border flex flex-col gap-1 ${
                            trigger.email.enabled
                              ? "bg-sky-50/50 border-sky-200/80 text-sky-950"
                              : "bg-warm/30 border-soft/80 text-forest/40"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-bold text-[11px]">
                            <Mail className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                            <span>E-mail</span>
                            <span className="text-[10px] ml-auto font-normal">
                              {trigger.email.enabled ? "Ativo" : "Desativado"}
                            </span>
                          </div>
                          <p className="text-[10px] text-forest/70 line-clamp-1 italic">
                            "{trigger.email.subject || "Sem assunto"}"
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="mt-4 pt-3 border-t border-soft/60 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(trigger)}
                          className="px-3 py-1.5 rounded-xl border border-soft hover:bg-warm/50 text-forest text-xs font-bold transition-all flex items-center gap-1.5"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-forest/70" />
                          <span>Editar Modelo & Tempo</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenTestModal(trigger)}
                          className="px-2.5 py-1.5 rounded-xl border border-soft hover:bg-warm/50 text-forest/80 text-xs font-semibold transition-all flex items-center gap-1"
                          title="Fazer disparo de teste para você mesmo"
                        >
                          <Send className="w-3 h-3 text-forest/60" />
                          <span className="hidden sm:inline">Testar</span>
                        </button>
                      </div>

                      {trigger.isCustom && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomTrigger(trigger.id)}
                          className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Excluir este gatilho personalizado"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* History View */
        <div className="bg-white p-6 rounded-3xl border border-soft shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-bold text-forest">
                Auditoria de Envios Recentes
              </h3>
              <p className="text-xs text-forest/60">
                Acompanhe as últimas mensagens despachadas pela plataforma.
              </p>
            </div>
            <button
              onClick={loadHistory}
              disabled={isLoadingHistory}
              className="px-3 py-1.5 rounded-xl border border-soft hover:bg-warm/50 text-xs font-bold text-forest flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHistory ? "animate-spin" : ""}`} />
              <span>Atualizar</span>
            </button>
          </div>

          {isLoadingHistory ? (
            <div className="p-8 text-center text-xs text-forest/60">Carregando histórico...</div>
          ) : historyItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-forest/50 bg-warm/20 rounded-2xl">
              Nenhum envio recente registrado no histórico.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-soft text-forest/60 uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Data / Hora</th>
                    <th className="py-2.5 px-3">Gatilho</th>
                    <th className="py-2.5 px-3">Destinatário</th>
                    <th className="py-2.5 px-3">Canais</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-soft/50">
                  {historyItems.map((item) => (
                    <tr key={item.id} className="hover:bg-warm/20 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-forest/70 whitespace-nowrap">
                        {item.createdAt?.toDate
                          ? item.createdAt.toDate().toLocaleString("pt-BR")
                          : "Recente"}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-forest">
                        {item.triggerName || item.triggerId}
                      </td>
                      <td className="py-2.5 px-3 text-forest/80">
                        {item.recipientEmail && (
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-sky-600" />
                            <span>{item.recipientEmail}</span>
                          </div>
                        )}
                        {item.recipientPhone && (
                          <div className="flex items-center gap-1 font-mono text-[11px]">
                            <MessageSquare className="w-3 h-3 text-emerald-600" />
                            <span>{item.recipientPhone}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          {item.emailSent && (
                            <span className="px-2 py-0.5 bg-sky-100 text-sky-800 rounded font-semibold text-[10px]">
                              E-mail OK
                            </span>
                          )}
                          {item.whatsappSent && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold text-[10px]">
                              WhatsApp OK
                            </span>
                          )}
                          {!item.emailSent && !item.whatsappSent && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-semibold text-[10px]">
                              Sem canal
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Edit / Create Trigger Modal */}
      {isModalOpen && editingTrigger && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-[2rem] border border-soft shadow-xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-soft flex items-center justify-between bg-warm/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-forest text-white rounded-xl">
                  <Sliders className="w-5 h-5 text-sun" />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-bold text-forest">
                    {editingTrigger.isCustom && !triggers.some((t) => t.id === editingTrigger.id)
                      ? "Criar Novo Gatilho de Notificação"
                      : `Editar Gatilho: ${editingTrigger.nome || "Novo"}`}
                  </h3>
                  <p className="text-xs text-forest/70">
                    Configure as regras de envio, tempo de resposta e conteúdo de E-mail e WhatsApp.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-forest/40 hover:text-forest text-2xl font-light"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Basic Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-forest/70 mb-1.5">
                    Nome do Gatilho / Evento *
                  </label>
                  <input
                    type="text"
                    value={editingTrigger.nome}
                    onChange={(e) =>
                      setEditingTrigger({ ...editingTrigger, nome: e.target.value })
                    }
                    placeholder="Ex: Boas-vindas após Cadastro"
                    className="w-full bg-warm/20 border border-soft rounded-xl px-3.5 py-2 text-sm text-forest focus:outline-none focus:border-forest"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-forest/70 mb-1.5">
                    Público-Alvo / Categoria
                  </label>
                  <select
                    value={editingTrigger.categoria}
                    onChange={(e) =>
                      setEditingTrigger({
                        ...editingTrigger,
                        categoria: e.target.value as NotificationAudience,
                      })
                    }
                    className="w-full bg-warm/20 border border-soft rounded-xl px-3.5 py-2 text-sm text-forest focus:outline-none focus:border-forest"
                  >
                    <option value="paciente">Paciente (Acolhido)</option>
                    <option value="profissional">Psicólogo (Corpo Clínico)</option>
                    <option value="empresa">Empresa Parceira / B2B</option>
                    <option value="equipe">Equipe Interna / Coordenação</option>
                    <option value="personalizado">Personalizado / Geral</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-forest/70 mb-1.5">
                    Descrição da Ocasião de Disparo
                  </label>
                  <input
                    type="text"
                    value={editingTrigger.descricao}
                    onChange={(e) =>
                      setEditingTrigger({ ...editingTrigger, descricao: e.target.value })
                    }
                    placeholder="Ex: Quando a triagem finaliza o enquadramento de valor e envia para o acolhido."
                    className="w-full bg-warm/20 border border-soft rounded-xl px-3.5 py-2 text-xs text-forest focus:outline-none focus:border-forest"
                  />
                </div>
              </div>

              {/* TIMING CONFIGURATION (TEMPO DE RESPOSTA) */}
              <div className="p-4 bg-warm/30 rounded-2xl border border-soft space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-forest/80" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-forest">
                      Tempo de Resposta & Programação do Disparo
                    </h4>
                  </div>
                  <span className="text-[11px] text-forest/60">
                    Defina se o envio ocorre na hora ou após um tempo de espera
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      setEditingTrigger({
                        ...editingTrigger,
                        timing: { type: "immediate", delayMinutes: 0 },
                      })
                    }
                    className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                      editingTrigger.timing.type === "immediate"
                        ? "bg-white border-forest shadow-2xs text-forest"
                        : "bg-white/60 border-soft text-forest/70 hover:bg-white"
                    }`}
                  >
                    <Zap className={`w-4 h-4 shrink-0 mt-0.5 ${editingTrigger.timing.type === "immediate" ? "text-amber-500" : "text-forest/40"}`} />
                    <div>
                      <div className="font-bold text-xs">Imediato (Instantâneo)</div>
                      <div className="text-[11px] text-forest/60">
                        Dispara assim que o evento acontecer no sistema.
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setEditingTrigger({
                        ...editingTrigger,
                        timing: {
                          type: "delay",
                          delayMinutes: editingTrigger.timing.delayMinutes || 15,
                        },
                      })
                    }
                    className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                      editingTrigger.timing.type === "delay"
                        ? "bg-white border-forest shadow-2xs text-forest"
                        : "bg-white/60 border-soft text-forest/70 hover:bg-white"
                    }`}
                  >
                    <Clock className={`w-4 h-4 shrink-0 mt-0.5 ${editingTrigger.timing.type === "delay" ? "text-amber-600" : "text-forest/40"}`} />
                    <div>
                      <div className="font-bold text-xs">Atraso Programado (Delay)</div>
                      <div className="text-[11px] text-forest/60">
                        Aguardar um intervalo de minutos, horas ou dias.
                      </div>
                    </div>
                  </button>
                </div>

                {editingTrigger.timing.type === "delay" && (
                  <div className="p-3 bg-white rounded-xl border border-soft space-y-2.5 animate-fade-in">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="text-xs font-bold text-forest">
                        Intervalo de Espera (em minutos):
                      </label>
                      <div className="flex items-center gap-1.5 font-mono text-xs">
                        <input
                          type="number"
                          min="1"
                          max="43200"
                          value={editingTrigger.timing.delayMinutes || 0}
                          onChange={(e) =>
                            setEditingTrigger({
                              ...editingTrigger,
                              timing: {
                                ...editingTrigger.timing,
                                delayMinutes: Math.max(1, parseInt(e.target.value) || 1),
                              },
                            })
                          }
                          className="w-20 px-2.5 py-1 bg-warm/20 border border-soft rounded-lg text-center font-bold text-forest"
                        />
                        <span className="text-forest/70">minutos</span>
                      </div>
                    </div>

                    {/* Quick Presets */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] uppercase font-bold text-forest/50 mr-1">
                        Atalhos rápidos:
                      </span>
                      {[
                        { label: "5 min", val: 5 },
                        { label: "15 min", val: 15 },
                        { label: "30 min", val: 30 },
                        { label: "1 hora", val: 60 },
                        { label: "2 horas", val: 120 },
                        { label: "24h (1 dia)", val: 1440 },
                        { label: "3 dias", val: 4320 },
                        { label: "7 dias", val: 10080 },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() =>
                            setEditingTrigger({
                              ...editingTrigger,
                              timing: {
                                ...editingTrigger.timing,
                                delayMinutes: preset.val,
                              },
                            })
                          }
                          className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold border transition-all ${
                            editingTrigger.timing.delayMinutes === preset.val
                              ? "bg-forest text-white border-forest"
                              : "bg-warm/40 text-forest/70 border-soft hover:bg-warm"
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Dynamic Variables Bar */}
              <div className="p-3 bg-warm/30 rounded-2xl border border-soft">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-forest flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-sun-dark" />
                    Variáveis Dinâmicas Disponíveis (Clique para inserir)
                  </span>
                  <span className="text-[10px] text-forest/60">
                    Substituídas pelos dados reais no momento do envio
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {NOTIFICATION_AVAILABLE_VARIABLES.map((v) => (
                    <button
                      key={v.tag}
                      type="button"
                      onClick={() =>
                        handleInsertVariable(
                          v.tag,
                          channelTab === "whatsapp" ? "whatsapp" : "emailBody"
                        )
                      }
                      title={`Inserir ${v.label} (Exemplo: ${v.example})`}
                      className="px-2 py-1 bg-white hover:bg-forest hover:text-white text-forest/80 rounded-lg text-xs font-mono border border-soft transition-colors flex items-center gap-1 shadow-2xs"
                    >
                      <span className="font-bold text-forest hover:text-white">{v.tag}</span>
                      <span className="text-[10px] opacity-70">({v.label})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* CHANNEL TABS: WhatsApp vs E-mail */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-soft pb-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setChannelTab("whatsapp")}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                        channelTab === "whatsapp"
                          ? "bg-emerald-600 text-white shadow-2xs"
                          : "bg-warm/50 text-forest/70 hover:text-forest"
                      }`}
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Canal WhatsApp</span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          editingTrigger.whatsapp.enabled ? "bg-emerald-300" : "bg-forest/30"
                        }`}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() => setChannelTab("email")}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                        channelTab === "email"
                          ? "bg-sky-600 text-white shadow-2xs"
                          : "bg-warm/50 text-forest/70 hover:text-forest"
                      }`}
                    >
                      <Mail className="w-4 h-4" />
                      <span>Canal E-mail</span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          editingTrigger.email.enabled ? "bg-sky-300" : "bg-forest/30"
                        }`}
                      />
                    </button>
                  </div>

                  {channelTab === "whatsapp" ? (
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-forest">
                      <input
                        type="checkbox"
                        checked={editingTrigger.whatsapp.enabled}
                        onChange={(e) =>
                          setEditingTrigger({
                            ...editingTrigger,
                            whatsapp: {
                              ...editingTrigger.whatsapp,
                              enabled: e.target.checked,
                            },
                          })
                        }
                        className="rounded border-soft text-forest focus:ring-forest"
                      />
                      <span>Habilitar envio de WhatsApp para este gatilho</span>
                    </label>
                  ) : (
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-forest">
                      <input
                        type="checkbox"
                        checked={editingTrigger.email.enabled}
                        onChange={(e) =>
                          setEditingTrigger({
                            ...editingTrigger,
                            email: {
                              ...editingTrigger.email,
                              enabled: e.target.checked,
                            },
                          })
                        }
                        className="rounded border-soft text-forest focus:ring-forest"
                      />
                      <span>Habilitar envio de E-mail para este gatilho</span>
                    </label>
                  )}
                </div>

                {/* WhatsApp Tab Content */}
                {channelTab === "whatsapp" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-forest uppercase tracking-wider">
                        Texto da Mensagem no WhatsApp (com suporte a formatação WhatsApp: *negrito*, _itálico_)
                      </label>
                      <span className="text-[11px] text-forest/50 font-mono">
                        {editingTrigger.whatsapp.messageText.length} caracteres
                      </span>
                    </div>

                    <textarea
                      rows={7}
                      value={editingTrigger.whatsapp.messageText}
                      onChange={(e) =>
                        setEditingTrigger({
                          ...editingTrigger,
                          whatsapp: {
                            ...editingTrigger.whatsapp,
                            messageText: e.target.value,
                          },
                        })
                      }
                      placeholder="Escreva aqui a mensagem do WhatsApp..."
                      className="w-full bg-warm/20 border border-soft rounded-2xl p-4 text-xs font-mono text-forest focus:outline-none focus:border-forest leading-relaxed"
                    />

                    {/* WhatsApp Bubble Preview */}
                    <div className="p-4 bg-[#e5ddd5] rounded-2xl border border-soft/60 space-y-1">
                      <div className="text-[10px] uppercase font-bold text-forest/50">
                        Pré-visualização (Simulação com dados de exemplo):
                      </div>
                      <div className="bg-white p-3 rounded-xl rounded-tl-none shadow-xs text-xs text-forest max-w-md whitespace-pre-line leading-relaxed font-sans">
                        {interpolateVariables(editingTrigger.whatsapp.messageText, {
                          nome: "Mariana da Silva",
                          primeiro_nome: "Mariana",
                          profissional: "Dr(a). Carlos Mendes",
                          valor_sessao: "R$ 60,00",
                          frequencia: "Semanal",
                          link_proposta: `${window.location.origin}/?view=proposta&id=123`,
                          link_pagamento: "https://buy.stripe.com/acolhemente",
                          empresa: "Tech Inovação S.A.",
                          data: new Date().toLocaleDateString("pt-BR"),
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* E-mail Tab Content */}
                {channelTab === "email" && (
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-forest uppercase tracking-wider">
                          Assunto do E-mail
                        </label>
                        <button
                          type="button"
                          onClick={() => handleInsertVariable("{nome}", "emailSubject")}
                          className="text-[10px] text-sky-800 underline font-semibold"
                        >
                          + Inserir {`{nome}`} no assunto
                        </button>
                      </div>
                      <input
                        type="text"
                        value={editingTrigger.email.subject}
                        onChange={(e) =>
                          setEditingTrigger({
                            ...editingTrigger,
                            email: {
                              ...editingTrigger.email,
                              subject: e.target.value,
                            },
                          })
                        }
                        placeholder="Ex: AcolheMente - Notificação Importante"
                        className="w-full bg-warm/20 border border-soft rounded-xl px-3.5 py-2 text-xs font-semibold text-forest focus:outline-none focus:border-forest"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-forest uppercase tracking-wider">
                          Corpo do E-mail (HTML ou Texto Formatado)
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewEmailModal(
                              interpolateVariables(editingTrigger.email.bodyHtml, {
                                nome: "Mariana da Silva",
                                primeiro_nome: "Mariana",
                                profissional: "Dr(a). Carlos Mendes",
                                valor_sessao: "R$ 60,00",
                                frequencia: "Semanal",
                                link_proposta: `${window.location.origin}/?view=proposta&id=123`,
                                link_pagamento: "https://buy.stripe.com/acolhemente",
                                empresa: "Tech Inovação S.A.",
                                data: new Date().toLocaleDateString("pt-BR"),
                              })
                            )
                          }
                          className="text-xs text-sky-800 font-bold flex items-center gap-1 hover:underline"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Pré-visualizar E-mail Renderizado</span>
                        </button>
                      </div>
                      <textarea
                        rows={8}
                        value={editingTrigger.email.bodyHtml}
                        onChange={(e) =>
                          setEditingTrigger({
                            ...editingTrigger,
                            email: {
                              ...editingTrigger.email,
                              bodyHtml: e.target.value,
                            },
                          })
                        }
                        placeholder="Escreva o HTML do e-mail..."
                        className="w-full bg-warm/20 border border-soft rounded-2xl p-4 text-xs font-mono text-forest focus:outline-none focus:border-forest leading-relaxed"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-soft bg-warm/20 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-soft hover:bg-warm/50 text-forest text-xs font-bold"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSaveTrigger}
                disabled={isSaving}
                className="px-6 py-2 bg-forest text-white hover:bg-forest/90 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-sun" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 text-sun" />
                    <span>Salvar Configurações do Gatilho</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Trigger Modal */}
      {testModalTrigger && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl border border-soft shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-forest text-white rounded-xl">
                  <Send className="w-4 h-4 text-sun" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-forest">
                    Testar Disparo de Mensagem
                  </h3>
                  <p className="text-[11px] text-forest/60 line-clamp-1">
                    {testModalTrigger.nome}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTestModalTrigger(null)}
                className="text-forest/40 hover:text-forest text-xl"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-forest/70">
              Informe seu próprio número e/ou e-mail para receber uma amostra real desta notificação com dados fictícios.
            </p>

            <div className="space-y-3">
              {testModalTrigger.whatsapp.enabled && (
                <div>
                  <label className="block text-xs font-bold text-forest mb-1">
                    WhatsApp para Teste (com DDD):
                  </label>
                  <input
                    type="text"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="Ex: 11987654321"
                    className="w-full bg-warm/20 border border-soft rounded-xl px-3 py-2 text-xs text-forest focus:outline-none focus:border-forest"
                  />
                </div>
              )}

              {testModalTrigger.email.enabled && (
                <div>
                  <label className="block text-xs font-bold text-forest mb-1">
                    E-mail para Teste:
                  </label>
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="Ex: seu-email@exemplo.com"
                    className="w-full bg-warm/20 border border-soft rounded-xl px-3 py-2 text-xs text-forest focus:outline-none focus:border-forest"
                  />
                </div>
              )}
            </div>

            {testFeedback && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  testFeedback.success
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-rose-50 border-rose-200 text-rose-900"
                }`}
              >
                {testFeedback.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{testFeedback.message}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTestModalTrigger(null)}
                className="px-3.5 py-1.5 rounded-xl border border-soft hover:bg-warm/50 text-xs font-bold text-forest"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={handleExecuteTest}
                disabled={isSendingTest}
                className="px-4 py-1.5 bg-forest text-white hover:bg-forest/90 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
              >
                {isSendingTest ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-sun" />
                    <span>Disparando...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 text-sun" />
                    <span>Enviar Teste Agora</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Email Render Modal */}
      {previewEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-2xl max-h-[85vh] rounded-3xl border border-soft shadow-xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-soft flex items-center justify-between bg-warm/30">
              <span className="font-serif text-base font-bold text-forest">
                Pré-visualização do E-mail
              </span>
              <button
                type="button"
                onClick={() => setPreviewEmailModal(null)}
                className="text-forest/40 hover:text-forest text-xl"
              >
                ✕
              </button>
            </div>
            <div
              className="p-6 overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: previewEmailModal }}
            />
            <div className="p-3 border-t border-soft text-right bg-warm/10">
              <button
                type="button"
                onClick={() => setPreviewEmailModal(null)}
                className="px-4 py-1.5 bg-forest text-white rounded-xl text-xs font-bold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
