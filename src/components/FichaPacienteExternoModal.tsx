import React, { useState } from "react";
import {
  User,
  Phone,
  Mail,
  Edit3,
  XCircle,
  FileText,
  CreditCard,
  BookOpen,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileSignature,
  UserX,
  Compass,
  MessageCircle,
  MapPin,
  Heart,
  ShieldCheck,
  Plus,
  Send,
  Save,
  Trash2,
  DollarSign,
  Briefcase,
  AlertCircle,
  Sparkles,
  Link2,
  Copy,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { PacienteProntuarioModal, ProntuarioRegistroItem } from "./PacienteProntuarioModal";
import { PacienteFaturamentoSpreadsheet, SessaoFaturamentoItem } from "./PacienteFaturamentoSpreadsheet";
import { ContratoGeradorModal } from "./ContratoGeradorModal";

interface FichaPacienteExternoModalProps {
  paciente: any;
  onClose: () => void;
  onUpdatePaciente: (updatedPaciente: any) => void;
  profile?: any;
  user?: any;
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
  onNavigateToAgenda?: (pacienteId?: string) => void;
}

export function FichaPacienteExternoModal({
  paciente,
  onClose,
  onUpdatePaciente,
  profile,
  user,
  showToast,
  onNavigateToAgenda,
}: FichaPacienteExternoModalProps) {
  const [currentPaciente, setCurrentPaciente] = useState<any>(paciente);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Submodals
  const [showProntuarioModal, setShowProntuarioModal] = useState(false);
  const [showFaturamentoModal, setShowFaturamentoModal] = useState(false);
  const [showContratoModal, setShowContratoModal] = useState(false);

  // Evolução rápida
  const [novaEvolucaoTexto, setNovaEvolucaoTexto] = useState("");
  const [novaEvolucaoTitulo, setNovaEvolucaoTitulo] = useState("Evolução de Sessão");
  const [novaEvolucaoModalidade, setNovaEvolucaoModalidade] = useState<"online" | "presencial">(
    currentPaciente.modalidade === "presencial" ? "presencial" : "online"
  );
  const [salvandoEvolucao, setSalvandoEvolucao] = useState(false);

  // Helper para salvar propriedade local e no Firestore
  const handleUpdateField = async (field: string, value: any) => {
    const updated = { ...currentPaciente, [field]: value };
    setCurrentPaciente(updated);
    try {
      if (currentPaciente.id) {
        await updateDoc(doc(db, "pacientes", currentPaciente.id), {
          [field]: value,
          updatedAt: serverTimestamp(),
        });
        onUpdatePaciente(updated);
      }
    } catch (err) {
      console.error("Erro ao atualizar campo do paciente:", err);
      showToast("Erro ao salvar alteração.", "error");
    }
  };

  const handleUpdateNestedField = async (parentField: string, subField: string, value: any) => {
    const currentParent = currentPaciente[parentField] || {};
    const updatedParent = { ...currentParent, [subField]: value };
    const updated = { ...currentPaciente, [parentField]: updatedParent };
    setCurrentPaciente(updated);
    try {
      if (currentPaciente.id) {
        await updateDoc(doc(db, "pacientes", currentPaciente.id), {
          [parentField]: updatedParent,
          updatedAt: serverTimestamp(),
        });
        onUpdatePaciente(updated);
      }
    } catch (err) {
      console.error("Erro ao atualizar campo aninhado:", err);
      showToast("Erro ao salvar alteração.", "error");
    }
  };

  // Salvar nova evolução rápida
  const handleAddQuickEvolucao = async () => {
    if (!novaEvolucaoTexto.trim()) {
      showToast("Escreva as anotações da evolução antes de salvar.", "warning");
      return;
    }
    setSalvandoEvolucao(true);
    try {
      const hoje = new Date().toISOString().split("T")[0];
      const hora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      const novoRegistro: ProntuarioRegistroItem = {
        id: `evol-${Date.now()}`,
        pacienteId: currentPaciente.id,
        dataRegistro: hoje,
        dataSessao: hoje,
        horario: hora,
        tipoRegistro: "evolucao",
        titulo: novaEvolucaoTitulo.trim() || "Evolução de Sessão",
        conteudo: novaEvolucaoTexto.trim(),
        humorOuEstadoGeral: "Estável / Colaborativo",
        profissionalId: profile?.uid || user?.uid,
        profissionalNome: profile?.name || profile?.nome || "Psicólogo(a)",
        profissionalCrp: profile?.crp || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const listaExistente = Array.isArray(currentPaciente.prontuarioClinico)
        ? currentPaciente.prontuarioClinico
        : [];
      const novaLista = [novoRegistro, ...listaExistente];

      await updateDoc(doc(db, "pacientes", currentPaciente.id), {
        prontuarioClinico: novaLista,
        updatedAt: serverTimestamp(),
      });

      const updated = { ...currentPaciente, prontuarioClinico: novaLista };
      setCurrentPaciente(updated);
      onUpdatePaciente(updated);
      setNovaEvolucaoTexto("");
      showToast("Evolução clínica registrada no prontuário com sucesso!", "success");
    } catch (err) {
      console.error("Erro ao salvar evolução rápida:", err);
      showToast("Erro ao registrar evolução clínica.", "error");
    } finally {
      setSalvandoEvolucao(false);
    }
  };

  // WhatsApp
  const telRaw = (currentPaciente.telefone || "").replace(/\D/g, "");
  const nomeDisplay = currentPaciente.nomeCivil || currentPaciente.nome || "Paciente";
  const openWhatsApp = (msgPersonalizada?: string) => {
    if (!telRaw) {
      showToast("Este paciente não possui telefone/WhatsApp cadastrado.", "warning");
      return;
    }
    const msg = msgPersonalizada || `Olá ${nomeDisplay}! Tudo bem? Gostaria de alinhar nosso próximo atendimento.`;
    const cleanNum = telRaw.startsWith("55") ? telRaw : `55${telRaw}`;
    window.open(`https://wa.me/${cleanNum}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // Cálculos de Sessões & Faturamento
  const sessoes: SessaoFaturamentoItem[] = Array.isArray(currentPaciente.historicoSessoes)
    ? currentPaciente.historicoSessoes
    : [];
  const sessoesRealizadas = sessoes.filter((s) => s.statusAtendimento === "realizada");
  const sessoesPagas = sessoes.filter((s) => s.statusPagamento === "pago");
  const sessoesPendentes = sessoes.filter(
    (s) => s.statusAtendimento === "realizada" && s.statusPagamento !== "pago"
  );
  const totalPago = sessoesPagas.reduce((acc, s) => acc + (Number(s.valor) || 0), 0);
  const totalPendente = sessoesPendentes.reduce((acc, s) => acc + (Number(s.valor) || 0), 0);

  // Status de Atendimento
  const statusAtual = currentPaciente.statusTratamento || currentPaciente.status || "Em Atendimento";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-1 sm:px-4 bg-forest/25 backdrop-blur-sm animate-in fade-in py-1 sm:py-3">
      <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-[98vw] 2xl:max-w-[1550px] h-[96vh] sm:h-[95vh] flex flex-col shadow-2xl border border-soft overflow-hidden animate-in zoom-in-95">
        
        {/* =========================================================================
            HEADER DA FICHA DE BORDO (Idêntico ao estilo do Acolhimento)
        ========================================================================== */}
        <div className="px-3 sm:px-6 py-2 sm:py-3 flex flex-col border-b border-soft bg-gradient-to-r from-emerald-50/50 via-white to-warm/40 gap-1.5 sm:gap-2 shrink-0">
          <div className="flex justify-between items-center gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="p-1.5 sm:p-2.5 rounded-xl shadow-xs shrink-0 flex items-center justify-center bg-forest text-white">
                <User className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-wrap">
                  <h3
                    className="font-serif text-sm sm:text-2xl text-forest font-bold truncate leading-tight"
                    title={nomeDisplay}
                  >
                    {nomeDisplay}
                  </h3>

                  {/* Badges de Identificação */}
                  <span className="text-[9px] sm:text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs shrink-0 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    Carteira Particular
                  </span>

                  {/* Status do Tratamento */}
                  <select
                    value={statusAtual}
                    onChange={(e) => {
                      handleUpdateField("statusTratamento", e.target.value);
                      handleUpdateField("status", e.target.value);
                    }}
                    className={`text-[9px] sm:text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border shrink-0 cursor-pointer focus:outline-none transition-colors ${
                      statusAtual === "Em Atendimento" || statusAtual === "Ativo"
                        ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                        : statusAtual === "Em Pausa" || statusAtual === "Standby"
                        ? "bg-amber-100 text-amber-900 border-amber-300"
                        : statusAtual === "Concluído" || statusAtual === "Alta"
                        ? "bg-blue-100 text-blue-800 border-blue-200"
                        : "bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    <option value="Em Atendimento">Em Atendimento</option>
                    <option value="Em Pausa">Em Pausa</option>
                    <option value="Concluído">Concluído (Alta)</option>
                    <option value="Inativo">Inativo / Desligado</option>
                  </select>
                </div>

                {/* Linha 2: Metadados */}
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5 text-[10px] sm:text-[11px] font-medium text-forest/70 mt-0.5">
                  <span className="font-mono text-forest/60 shrink-0">
                    #{currentPaciente.id?.slice(0, 6)}
                  </span>
                  {currentPaciente.cpf && (
                    <span className="font-mono text-forest/60">
                      CPF: {currentPaciente.cpf}
                    </span>
                  )}
                  {currentPaciente.origem && (
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase px-1.5 py-0.2 rounded-md bg-sun/30 text-forest border border-sun/50 truncate">
                      Origem: {currentPaciente.origem === "formulario_externo" ? "Link do Formulário" : currentPaciente.origem === "importacao_excel" ? "Planilha Excel" : currentPaciente.origem}
                    </span>
                  )}
                  {currentPaciente.valorSessao && (
                    <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.2 rounded-md border border-emerald-200">
                      R$ {currentPaciente.valorSessao} / sessão
                    </span>
                  )}
                  {currentPaciente.modalidade && (
                    <span className="capitalize text-forest/70 bg-warm px-1.5 py-0.2 rounded border border-soft">
                      {currentPaciente.modalidade}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Ações Rápidas do Topo */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {telRaw && (
                <button
                  type="button"
                  onClick={() => openWhatsApp()}
                  className="flex items-center justify-center gap-1 font-bold text-[10px] sm:text-xs p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-[#25D366] hover:bg-[#20b858] text-white shadow-2xs transition-all shrink-0 cursor-pointer"
                  title="Enviar WhatsApp para o paciente"
                >
                  <Phone className="w-3.5 h-3.5 text-white" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (isEditing) {
                    showToast("Dados salvos com sucesso!", "success");
                  }
                  setIsEditing(!isEditing);
                }}
                className={`flex items-center justify-center gap-1 font-bold text-[10px] sm:text-xs p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border transition-all shadow-2xs shrink-0 cursor-pointer ${
                  isEditing
                    ? "bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700"
                    : "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
                }`}
                title={isEditing ? "Concluir edição" : "Editar campos da ficha"}
              >
                {isEditing ? <Save className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{isEditing ? "Salvar" : "Editar"}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1 sm:p-1.5 text-forest/50 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors shrink-0 cursor-pointer"
                title="Fechar Ficha"
              >
                <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================================
            ACTION BAR (Sub-Header de Ações Rápidas)
        ========================================================================== */}
        <div className="flex items-center justify-between gap-1.5 sm:gap-2 px-2.5 sm:px-6 py-1.5 sm:py-2 bg-white border-b border-soft shrink-0 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Prontuário Clínico & Evoluções */}
            <button
              type="button"
              onClick={() => setShowProntuarioModal(true)}
              className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-bold text-forest bg-warm/60 hover:bg-emerald-50 hover:text-emerald-900 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border border-soft hover:border-emerald-300 transition-colors whitespace-nowrap shadow-2xs cursor-pointer"
              title="Abrir Prontuário Clínico Completo"
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>Prontuário Clínico</span>
              {Array.isArray(currentPaciente.prontuarioClinico) && currentPaciente.prontuarioClinico.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-emerald-100 text-emerald-800">
                  {currentPaciente.prontuarioClinico.length}
                </span>
              )}
            </button>

            {/* Sessões & Faturamento */}
            <button
              type="button"
              onClick={() => setShowFaturamentoModal(true)}
              className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-bold text-forest bg-warm/60 hover:bg-emerald-50 hover:text-emerald-900 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border border-soft hover:border-emerald-300 transition-colors whitespace-nowrap shadow-2xs cursor-pointer"
              title="Abrir Sessões, Faturamento e Recibos"
            >
              <CreditCard className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>Sessões & Faturamento</span>
              {sessoesPendentes.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-amber-100 text-amber-900">
                  {sessoesPendentes.length} pend.
                </span>
              )}
            </button>

            {/* Contrato Terapêutico Particular */}
            <button
              type="button"
              onClick={() => setShowContratoModal(true)}
              className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-bold text-forest bg-warm/60 hover:bg-emerald-50 hover:text-emerald-900 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border border-soft hover:border-emerald-300 transition-colors whitespace-nowrap shadow-2xs cursor-pointer"
              title="Gerenciar Contrato Terapêutico Particular"
            >
              <FileSignature className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>{currentPaciente.contratoAssinado ? "Contrato Assinado" : "Contrato"}</span>
              <span className={`w-2 h-2 rounded-full shrink-0 ml-0.5 ${currentPaciente.contratoAssinado ? "bg-emerald-500" : "bg-amber-500"}`} />
            </button>

            {/* Link de Atualização Cadastral para o Paciente */}
            <div className="flex items-center gap-0.5 bg-emerald-50/70 p-0.5 rounded-lg sm:rounded-xl border border-emerald-300/80 shadow-2xs shrink-0">
              <button
                type="button"
                onClick={() => {
                  const url = `${window.location.origin}/cadastro_externo?prof=${profile?.uid || user?.uid}&paciente=${currentPaciente.id}&tipo=externo`;
                  navigator.clipboard.writeText(url);
                  showToast("Link de atualização cadastral copiado para a área de transferência!", "success");
                }}
                className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-bold text-emerald-900 hover:bg-emerald-100/80 px-2 sm:px-2.5 py-1 rounded-md sm:rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                title="Copiar link para o paciente conferir e atualizar seu cadastro"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>Atualização de Cadastro</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const url = `${window.location.origin}/cadastro_externo?prof=${profile?.uid || user?.uid}&paciente=${currentPaciente.id}&tipo=externo`;
                  const msg = `Olá ${nomeDisplay}! Tudo bem? Para mantermos seus dados cadastrais e seu prontuário clínico sempre atualizados e em total conformidade, por favor acesse este link seguro para conferir e atualizar seu cadastro quando puder:\n\n${url}\n\nQualquer dúvida estou à disposição!`;
                  openWhatsApp(msg);
                }}
                className="p-1 sm:p-1.5 text-emerald-700 hover:text-emerald-950 hover:bg-emerald-100/80 rounded-md sm:rounded-lg transition-colors cursor-pointer"
                title="Enviar link de atualização cadastral via WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const url = `${window.location.origin}/cadastro_externo?prof=${profile?.uid || user?.uid}&paciente=${currentPaciente.id}&tipo=externo`;
                  window.open(url, "_blank");
                }}
                className="p-1 sm:p-1.5 text-emerald-700 hover:text-emerald-950 hover:bg-emerald-100/80 rounded-md sm:rounded-lg transition-colors cursor-pointer"
                title="Abrir formulário de atualização em nova aba"
              >
                <ExternalLink className="w-3.5 h-3.5 text-emerald-700" />
              </button>
            </div>
            {onNavigateToAgenda && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToAgenda(currentPaciente.id);
                }}
                className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-bold text-white bg-forest hover:bg-forest/90 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl shadow-2xs transition-all whitespace-nowrap cursor-pointer"
                title="Agendar na Agenda Clínica"
              >
                <Calendar className="w-3.5 h-3.5 text-sun shrink-0" />
                <span>Agendar Sessão</span>
              </button>
            )}
          </div>

          {/* Lado Direito: Ações de Status */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                const novo = statusAtual === "Inativo" ? "Em Atendimento" : "Inativo";
                handleUpdateField("statusTratamento", novo);
                handleUpdateField("status", novo);
                showToast(`Status alterado para: ${novo}`, "info");
              }}
              className="flex items-center gap-1 font-bold text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border border-soft bg-warm/50 text-forest/70 hover:text-forest transition-colors shadow-2xs cursor-pointer"
            >
              <UserX className="w-3.5 h-3.5 text-forest/50" />
              <span>{statusAtual === "Inativo" ? "Reativar Paciente" : "Arquivar"}</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            BARRA DE SEÇÕES ANCORADAS (Navegação Rápida)
        ========================================================================== */}
        <div className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-6 py-1.5 bg-warm/35 border-b border-soft shrink-0 overflow-x-auto scrollbar-none shadow-2xs">
          <span className="text-[9px] font-bold uppercase text-forest/50 shrink-0 flex items-center gap-1 pr-1">
            <Compass className="w-3 h-3 text-forest/60" /> Seções:
          </span>
          <button type="button" onClick={() => document.getElementById("sec-ext-1-pessoais")?.scrollIntoView({ behavior: "smooth" })} className="px-2 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-bold text-forest/80 hover:text-forest bg-white hover:bg-warm border border-soft rounded-md sm:rounded-lg shrink-0 transition-colors whitespace-nowrap shadow-2xs cursor-pointer">1. Pessoais</button>
          <button type="button" onClick={() => document.getElementById("sec-ext-2-responsavel")?.scrollIntoView({ behavior: "smooth" })} className="px-2 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-bold text-forest/80 hover:text-forest bg-white hover:bg-warm border border-soft rounded-md sm:rounded-lg shrink-0 transition-colors whitespace-nowrap shadow-2xs cursor-pointer">2. Responsável</button>
          <button type="button" onClick={() => document.getElementById("sec-ext-3-contato")?.scrollIntoView({ behavior: "smooth" })} className="px-2 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-bold text-forest/80 hover:text-forest bg-white hover:bg-warm border border-soft rounded-md sm:rounded-lg shrink-0 transition-colors whitespace-nowrap shadow-2xs cursor-pointer">3. Contato & Endereço</button>
          <button type="button" onClick={() => document.getElementById("sec-ext-4-clinico")?.scrollIntoView({ behavior: "smooth" })} className="px-2 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-bold text-forest/80 hover:text-forest bg-white hover:bg-warm border border-soft rounded-md sm:rounded-lg shrink-0 transition-colors whitespace-nowrap shadow-2xs cursor-pointer">4. Queixa & Clínico</button>
          <button type="button" onClick={() => document.getElementById("sec-ext-5-acordo")?.scrollIntoView({ behavior: "smooth" })} className="px-2 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-md sm:rounded-lg shrink-0 transition-colors whitespace-nowrap shadow-2xs cursor-pointer">5. Honorários & Acordo</button>
          <button type="button" onClick={() => document.getElementById("sec-ext-6-faturamento")?.scrollIntoView({ behavior: "smooth" })} className="px-2 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-bold text-forest/80 hover:text-forest bg-white hover:bg-warm border border-soft rounded-md sm:rounded-lg shrink-0 transition-colors whitespace-nowrap shadow-2xs cursor-pointer">6. Sessões & Finanças</button>
          <button type="button" onClick={() => document.getElementById("sec-ext-7-prontuario")?.scrollIntoView({ behavior: "smooth" })} className="px-2 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-bold text-forest/80 hover:text-forest bg-white hover:bg-warm border border-soft rounded-md sm:rounded-lg shrink-0 transition-colors whitespace-nowrap shadow-2xs cursor-pointer">7. Prontuário & Evoluções</button>
          <button type="button" onClick={() => document.getElementById("sec-ext-8-alertas")?.scrollIntoView({ behavior: "smooth" })} className="px-2 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-bold text-forest/80 hover:text-forest bg-white hover:bg-warm border border-soft rounded-md sm:rounded-lg shrink-0 transition-colors whitespace-nowrap shadow-2xs cursor-pointer">8. Alertas & WhatsApp</button>
        </div>

        {/* =========================================================================
            CORPO SCROLLÁVEL DA FICHA
        ========================================================================== */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 bg-warm/10 custom-scrollbar">

          {/* 1. DADOS PESSOAIS */}
          <div id="sec-ext-1-pessoais" className="bg-white p-4 sm:p-6 rounded-2xl border border-soft shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-soft pb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-forest/80 flex items-center gap-2">
                <User className="w-4 h-4 text-forest" /> 1. Dados Pessoais
              </h4>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-warm text-forest/70 border border-soft">
                Identificação
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div className="flex flex-col gap-1 min-w-0">
                <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                  Nome Completo
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={currentPaciente.nomeCivil || currentPaciente.nome || ""}
                    onChange={(e) => {
                      handleUpdateField("nomeCivil", e.target.value);
                      handleUpdateField("nome", e.target.value);
                    }}
                    className="text-xs sm:text-sm font-semibold text-forest border border-emerald-500/80 bg-emerald-50/50 rounded-lg px-2.5 py-1.5 w-full focus:outline-none"
                  />
                ) : (
                  <span className="text-xs sm:text-sm font-semibold text-forest">
                    {currentPaciente.nomeCivil || currentPaciente.nome || "-"}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 min-w-0">
                <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                  Nome Social / Como Prefere Ser Chamado
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={currentPaciente.nomeSocial || currentPaciente.nomeDesejado || ""}
                    onChange={(e) => handleUpdateField("nomeSocial", e.target.value)}
                    placeholder="Opcional"
                    className="text-xs sm:text-sm font-semibold text-forest border border-emerald-500/80 bg-emerald-50/50 rounded-lg px-2.5 py-1.5 w-full focus:outline-none"
                  />
                ) : (
                  <span className="text-xs sm:text-sm font-semibold text-forest">
                    {currentPaciente.nomeSocial || currentPaciente.nomeDesejado || "-"}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 min-w-0">
                <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                  CPF
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={currentPaciente.cpf || ""}
                    onChange={(e) => handleUpdateField("cpf", e.target.value)}
                    placeholder="000.000.000-00"
                    className="text-xs sm:text-sm font-semibold text-forest border border-emerald-500/80 bg-emerald-50/50 rounded-lg px-2.5 py-1.5 w-full focus:outline-none"
                  />
                ) : (
                  <span className="text-xs sm:text-sm font-semibold text-forest font-mono">
                    {currentPaciente.cpf || "-"}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 min-w-0">
                <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                  Data de Nascimento
                </span>
                {isEditing ? (
                  <input
                    type="date"
                    value={currentPaciente.dataNascimento || ""}
                    onChange={(e) => handleUpdateField("dataNascimento", e.target.value)}
                    className="text-xs sm:text-sm font-semibold text-forest border border-emerald-500/80 bg-emerald-50/50 rounded-lg px-2.5 py-1.5 w-full focus:outline-none"
                  />
                ) : (
                  <span className="text-xs sm:text-sm font-semibold text-forest">
                    {currentPaciente.dataNascimento ? new Date(currentPaciente.dataNascimento).toLocaleDateString("pt-BR") : "-"}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 min-w-0">
                <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                  Gênero / Identidade
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={currentPaciente.genero || ""}
                    onChange={(e) => handleUpdateField("genero", e.target.value)}
                    placeholder="Ex: Feminino, Masculino, Não-binário..."
                    className="text-xs sm:text-sm font-semibold text-forest border border-emerald-500/80 bg-emerald-50/50 rounded-lg px-2.5 py-1.5 w-full focus:outline-none"
                  />
                ) : (
                  <span className="text-xs sm:text-sm font-semibold text-forest">
                    {currentPaciente.genero || "-"}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 min-w-0">
                <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                  Profissão / Ocupação
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={currentPaciente.profissao || ""}
                    onChange={(e) => handleUpdateField("profissao", e.target.value)}
                    placeholder="Ex: Arquiteta, Estudante..."
                    className="text-xs sm:text-sm font-semibold text-forest border border-emerald-500/80 bg-emerald-50/50 rounded-lg px-2.5 py-1.5 w-full focus:outline-none"
                  />
                ) : (
                  <span className="text-xs sm:text-sm font-semibold text-forest">
                    {currentPaciente.profissao || "-"}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 min-w-0">
                <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                  Estado Civil
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={currentPaciente.estadoCivil || ""}
                    onChange={(e) => handleUpdateField("estadoCivil", e.target.value)}
                    placeholder="Ex: Solteiro(a), Casado(a)..."
                    className="text-xs sm:text-sm font-semibold text-forest border border-emerald-500/80 bg-emerald-50/50 rounded-lg px-2.5 py-1.5 w-full focus:outline-none"
                  />
                ) : (
                  <span className="text-xs sm:text-sm font-semibold text-forest">
                    {currentPaciente.estadoCivil || "-"}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 min-w-0">
                <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                  Fonte de Indicação
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={currentPaciente.fonteIndicacao || currentPaciente.origem || ""}
                    onChange={(e) => handleUpdateField("fonteIndicacao", e.target.value)}
                    placeholder="Ex: Instagram, Indicação de Amigo..."
                    className="text-xs sm:text-sm font-semibold text-forest border border-emerald-500/80 bg-emerald-50/50 rounded-lg px-2.5 py-1.5 w-full focus:outline-none"
                  />
                ) : (
                  <span className="text-xs sm:text-sm font-semibold text-forest">
                    {currentPaciente.fonteIndicacao || currentPaciente.origem || "-"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 2. RESPONSÁVEL LEGAL (Caso menor de idade ou dependente) */}
          <div id="sec-ext-2-responsavel" className="bg-white p-4 sm:p-6 rounded-2xl border border-soft shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-soft pb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-forest/80 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-forest" /> 2. Responsável Legal (Para menores ou dependentes)
              </h4>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-warm text-forest/70 border border-soft">
                Guarda & Contato
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex flex-col gap-1 min-w-0">
                <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                  Nome do Responsável
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={currentPaciente.responsavel?.nome || ""}
                    onChange={(e) => handleUpdateNestedField("responsavel", "nome", e.target.value)}
                    placeholder="Nome completo do responsável"
                    className="text-xs sm:text-sm font-semibold text-forest border border-emerald-500/80 bg-emerald-50/50 rounded-lg px-2.5 py-1.5 w-full focus:outline-none"
                  />
                ) : (
                  <span className="text-xs sm:text-sm font-semibold text-forest">
                    {currentPaciente.responsavel?.nome || "-"}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 min-w-0">
                <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                  Telefone do Responsável
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={currentPaciente.responsavel?.telefone || ""}
                    onChange={(e) => handleUpdateNestedField("responsavel", "telefone", e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="text-xs sm:text-sm font-semibold text-forest border border-emerald-500/80 bg-emerald-50/50 rounded-lg px-2.5 py-1.5 w-full focus:outline-none"
                  />
                ) : (
                  <span className="text-xs sm:text-sm font-semibold text-forest">
                    {currentPaciente.responsavel?.telefone || "-"}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 min-w-0">
                <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                  CPF do Responsável
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={currentPaciente.responsavel?.cpf || ""}
                    onChange={(e) => handleUpdateNestedField("responsavel", "cpf", e.target.value)}
                    placeholder="000.000.000-00"
                    className="text-xs sm:text-sm font-semibold text-forest border border-emerald-500/80 bg-emerald-50/50 rounded-lg px-2.5 py-1.5 w-full focus:outline-none"
                  />
                ) : (
                  <span className="text-xs sm:text-sm font-semibold text-forest font-mono">
                    {currentPaciente.responsavel?.cpf || "-"}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 min-w-0">
                <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                  E-mail do Responsável
                </span>
                {isEditing ? (
                  <input
                    type="email"
                    value={currentPaciente.responsavel?.email || ""}
                    onChange={(e) => handleUpdateNestedField("responsavel", "email", e.target.value)}
                    placeholder="email@exemplo.com"
                    className="text-xs sm:text-sm font-semibold text-forest border border-emerald-500/80 bg-emerald-50/50 rounded-lg px-2.5 py-1.5 w-full focus:outline-none"
                  />
                ) : (
                  <span className="text-xs sm:text-sm font-semibold text-forest truncate">
                    {currentPaciente.responsavel?.email || "-"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 3. CONTATO & ENDEREÇO */}
          <div id="sec-ext-3-contato" className="bg-white p-4 sm:p-6 rounded-2xl border border-soft shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-soft pb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-forest/80 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-forest" /> 3. Contatos & Endereço
              </h4>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-warm text-forest/70 border border-soft">
                Localização & Comunicação
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1 min-w-0">
                <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                  WhatsApp / Celular
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={currentPaciente.telefone || ""}
                    onChange={(e) => handleUpdateField("telefone", e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="text-xs sm:text-sm font-semibold text-forest border border-emerald-500/80 bg-emerald-50/50 rounded-lg px-2.5 py-1.5 w-full focus:outline-none"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-semibold text-forest">
                      {currentPaciente.telefone || "-"}
                    </span>
                    {telRaw && (
                      <button
                        type="button"
                        onClick={() => openWhatsApp()}
                        className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded font-bold border border-emerald-200 hover:bg-emerald-100 flex items-center gap-1 cursor-pointer"
                      >
                        <MessageCircle className="w-3 h-3 text-emerald-600" />
                        Chamar
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1 min-w-0">
                <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                  E-mail
                </span>
                {isEditing ? (
                  <input
                    type="email"
                    value={currentPaciente.email || ""}
                    onChange={(e) => handleUpdateField("email", e.target.value)}
                    placeholder="paciente@exemplo.com"
                    className="text-xs sm:text-sm font-semibold text-forest border border-emerald-500/80 bg-emerald-50/50 rounded-lg px-2.5 py-1.5 w-full focus:outline-none"
                  />
                ) : (
                  <span className="text-xs sm:text-sm font-semibold text-forest truncate">
                    {currentPaciente.email || "-"}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 min-w-0">
                <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                  Contato de Emergência
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={currentPaciente.contatoEmergencia || ""}
                    onChange={(e) => handleUpdateField("contatoEmergencia", e.target.value)}
                    placeholder="Nome e telefone de pessoa de confiança"
                    className="text-xs sm:text-sm font-semibold text-forest border border-emerald-500/80 bg-emerald-50/50 rounded-lg px-2.5 py-1.5 w-full focus:outline-none"
                  />
                ) : (
                  <span className="text-xs sm:text-sm font-semibold text-forest">
                    {currentPaciente.contatoEmergencia || "-"}
                  </span>
                )}
              </div>
            </div>

            {/* Endereço Residencial */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-soft/60">
              <div className="flex flex-col gap-1 min-w-0">
                <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                  CEP
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={currentPaciente.cep || currentPaciente.endereco?.cep || ""}
                    onChange={(e) => handleUpdateField("cep", e.target.value)}
                    placeholder="00000-000"
                    className="text-xs sm:text-sm font-semibold text-forest border border-emerald-500/80 bg-emerald-50/50 rounded-lg px-2.5 py-1.5 w-full focus:outline-none"
                  />
                ) : (
                  <span className="text-xs sm:text-sm font-semibold text-forest font-mono">
                    {currentPaciente.cep || currentPaciente.endereco?.cep || "-"}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 min-w-0 sm:col-span-2">
                <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                  Logradouro / Bairro
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={currentPaciente.enderecoCompleto || currentPaciente.endereco?.logradouro || ""}
                    onChange={(e) => handleUpdateField("enderecoCompleto", e.target.value)}
                    placeholder="Rua, número, complemento, bairro"
                    className="text-xs sm:text-sm font-semibold text-forest border border-emerald-500/80 bg-emerald-50/50 rounded-lg px-2.5 py-1.5 w-full focus:outline-none"
                  />
                ) : (
                  <span className="text-xs sm:text-sm font-semibold text-forest">
                    {currentPaciente.enderecoCompleto || currentPaciente.endereco?.logradouro || "-"}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 min-w-0">
                <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                  Cidade / UF
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={currentPaciente.cidadeEstado || (currentPaciente.cidade ? `${currentPaciente.cidade} - ${currentPaciente.uf || ""}` : "")}
                    onChange={(e) => handleUpdateField("cidadeEstado", e.target.value)}
                    placeholder="Cidade - UF"
                    className="text-xs sm:text-sm font-semibold text-forest border border-emerald-500/80 bg-emerald-50/50 rounded-lg px-2.5 py-1.5 w-full focus:outline-none"
                  />
                ) : (
                  <span className="text-xs sm:text-sm font-semibold text-forest">
                    {currentPaciente.cidadeEstado || (currentPaciente.cidade ? `${currentPaciente.cidade} - ${currentPaciente.uf || ""}` : "-")}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 4. QUEIXA PRINCIPAL & HISTÓRICO CLÍNICO */}
          <div id="sec-ext-4-clinico" className="bg-white p-4 sm:p-6 rounded-2xl border border-soft shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-soft pb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-forest/80 flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-600" /> 4. Queixa Principal & Informações Clínicas Iniciais
              </h4>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200">
                Anamnese Inicial
              </span>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider mb-1">
                  Queixa Principal / Motivo da Consulta
                </span>
                {isEditing ? (
                  <textarea
                    rows={3}
                    value={currentPaciente.queixaPrincipal || currentPaciente.motivo || ""}
                    onChange={(e) => {
                      handleUpdateField("queixaPrincipal", e.target.value);
                      handleUpdateField("motivo", e.target.value);
                    }}
                    placeholder="Descreva a queixa que motivou a busca pelo acompanhamento psicológico..."
                    className="w-full text-xs sm:text-sm text-forest border border-emerald-500/80 bg-emerald-50/30 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                ) : (
                  <div className="p-3.5 bg-warm/30 rounded-xl border border-soft text-xs sm:text-sm text-forest/90 leading-relaxed font-serif">
                    {currentPaciente.queixaPrincipal || currentPaciente.motivo || "Nenhuma queixa inicial registrada ainda."}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                    Já fez terapia antes?
                  </span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={currentPaciente.terapiaAnterior || ""}
                      onChange={(e) => handleUpdateField("terapiaAnterior", e.target.value)}
                      placeholder="Sim / Não (detalhes)"
                      className="text-xs sm:text-sm font-semibold text-forest border border-emerald-500/80 bg-emerald-50/50 rounded-lg px-2.5 py-1.5 w-full focus:outline-none"
                    />
                  ) : (
                    <span className="text-xs sm:text-sm font-semibold text-forest">
                      {currentPaciente.terapiaAnterior || "-"}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1 min-w-0">
                  <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                    Uso de Medicação Psiquiátrica?
                  </span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={currentPaciente.medicacao || ""}
                      onChange={(e) => handleUpdateField("medicacao", e.target.value)}
                      placeholder="Ex: Escitalopram 10mg..."
                      className="text-xs sm:text-sm font-semibold text-forest border border-emerald-500/80 bg-emerald-50/50 rounded-lg px-2.5 py-1.5 w-full focus:outline-none"
                    />
                  ) : (
                    <span className="text-xs sm:text-sm font-semibold text-forest">
                      {currentPaciente.medicacao || "Nenhuma medicação informada"}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1 min-w-0">
                  <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                    Disponibilidade de Dias/Horários
                  </span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={currentPaciente.disponibilidade || ""}
                      onChange={(e) => handleUpdateField("disponibilidade", e.target.value)}
                      placeholder="Ex: Terças à tarde, online"
                      className="text-xs sm:text-sm font-semibold text-forest border border-emerald-500/80 bg-emerald-50/50 rounded-lg px-2.5 py-1.5 w-full focus:outline-none"
                    />
                  ) : (
                    <span className="text-xs sm:text-sm font-semibold text-forest">
                      {currentPaciente.disponibilidade || "-"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 5. ACORDO PARTICULAR & HONORÁRIOS */}
          <div id="sec-ext-5-acordo" className="bg-white p-4 sm:p-6 rounded-2xl border border-emerald-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-700" /> 5. Acordo Particular & Honorários Profissionais
              </h4>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300">
                100% Honorários do Psicólogo
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex flex-col gap-1 min-w-0 bg-emerald-50/40 p-3 rounded-xl border border-emerald-200/60">
                <span className="block text-[10px] font-bold uppercase text-emerald-900/80 tracking-wider">
                  Valor por Sessão (R$)
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={currentPaciente.valorSessao || ""}
                    onChange={(e) => handleUpdateField("valorSessao", e.target.value)}
                    placeholder="150,00"
                    className="text-base font-bold text-emerald-900 border border-emerald-500 bg-white rounded-lg px-2.5 py-1 w-full focus:outline-none"
                  />
                ) : (
                  <span className="text-lg font-bold text-emerald-900">
                    R$ {currentPaciente.valorSessao || "A combinar"}
                  </span>
                )}
                <span className="text-[10px] text-emerald-700/80">Sem desconto da plataforma</span>
              </div>

              <div className="flex flex-col gap-1 min-w-0 p-3 bg-warm/30 rounded-xl border border-soft">
                <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                  Modalidade do Atendimento
                </span>
                {isEditing ? (
                  <select
                    value={currentPaciente.modalidade || "online"}
                    onChange={(e) => handleUpdateField("modalidade", e.target.value)}
                    className="text-xs font-semibold text-forest border border-emerald-500 bg-white rounded-lg px-2 py-1.5 w-full focus:outline-none cursor-pointer"
                  >
                    <option value="online">Online (Videochamada)</option>
                    <option value="presencial">Presencial (Consultório)</option>
                    <option value="hibrido">Híbrido</option>
                  </select>
                ) : (
                  <span className="text-sm font-semibold text-forest capitalize">
                    {currentPaciente.modalidade || "Online"}
                  </span>
                )}
                <span className="text-[10px] text-forest/50">Formato acordado com paciente</span>
              </div>

              <div className="flex flex-col gap-1 min-w-0 p-3 bg-warm/30 rounded-xl border border-soft">
                <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                  Periodicidade das Sessões
                </span>
                {isEditing ? (
                  <select
                    value={currentPaciente.frequenciaSessoes || "Semanal"}
                    onChange={(e) => handleUpdateField("frequenciaSessoes", e.target.value)}
                    className="text-xs font-semibold text-forest border border-emerald-500 bg-white rounded-lg px-2 py-1.5 w-full focus:outline-none cursor-pointer"
                  >
                    <option value="Semanal">Semanal (1x por semana)</option>
                    <option value="Quinzenal">Quinzenal</option>
                    <option value="2x por semana">2x por semana</option>
                    <option value="Mensal">Mensal</option>
                  </select>
                ) : (
                  <span className="text-sm font-semibold text-forest">
                    {currentPaciente.frequenciaSessoes || "Semanal"}
                  </span>
                )}
                <span className="text-[10px] text-forest/50">Frequência terapêutica</span>
              </div>

              <div className="flex flex-col gap-1 min-w-0 p-3 bg-warm/30 rounded-xl border border-soft">
                <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                  Forma de Pagamento
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={currentPaciente.formaPagamento || ""}
                    onChange={(e) => handleUpdateField("formaPagamento", e.target.value)}
                    placeholder="Ex: Pix, Cartão, Dinheiro..."
                    className="text-xs font-semibold text-forest border border-emerald-500 bg-white rounded-lg px-2.5 py-1.5 w-full focus:outline-none"
                  />
                ) : (
                  <span className="text-sm font-semibold text-forest">
                    {currentPaciente.formaPagamento || "Pix"}
                  </span>
                )}
                <span className="text-[10px] text-forest/50">Cobrança direta particular</span>
              </div>
            </div>

            {/* Chave Pix para envio ao paciente */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 text-xs">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="text-emerald-950 font-medium">
                  Chave Pix cadastrada para cobrança: <strong>{profile?.chavePix || "Cadastre sua chave no Perfil"}</strong>
                </span>
              </div>
              {profile?.chavePix && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(profile.chavePix);
                    showToast("Chave Pix copiada para a área de transferência!", "success");
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 rounded-lg font-bold border border-emerald-300 flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                >
                  <Copy className="w-3 h-3 text-emerald-600" />
                  Copiar Pix
                </button>
              )}
            </div>
          </div>

          {/* 6. SESSÕES & FATURAMENTO */}
          <div id="sec-ext-6-faturamento" className="bg-white p-4 sm:p-6 rounded-2xl border border-soft shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-soft pb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-forest/80 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-forest" /> 6. Sessões & Faturamento Particular
              </h4>
              <button
                type="button"
                onClick={() => setShowFaturamentoModal(true)}
                className="text-xs font-bold text-forest bg-warm hover:bg-emerald-50 hover:text-emerald-900 border border-soft hover:border-emerald-300 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <span>Abrir Planilha de Faturamento</span>
                <span className="text-xs">→</span>
              </button>
            </div>

            {/* Cards de Resumo */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-warm/40 border border-soft text-center">
                <span className="text-[10px] font-bold text-forest/60 uppercase block">Total de Sessões</span>
                <span className="text-lg font-extrabold text-forest">{sessoes.length}</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-center">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">Realizadas</span>
                <span className="text-lg font-extrabold text-emerald-800">{sessoesRealizadas.length}</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-100/50 border border-emerald-300 text-center">
                <span className="text-[10px] font-bold text-emerald-900 uppercase block">Total Recebido</span>
                <span className="text-lg font-extrabold text-emerald-950">R$ {totalPago.toFixed(2)}</span>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
                <span className="text-[10px] font-bold text-amber-900 uppercase block">Pendente</span>
                <span className="text-lg font-extrabold text-amber-900">R$ {totalPendente.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* 7. PRONTUÁRIO CLÍNICO & EVOLUÇÕES RÁPIDAS */}
          <div id="sec-ext-7-prontuario" className="bg-white p-4 sm:p-6 rounded-2xl border border-soft shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-soft pb-3">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-forest/80 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-700" /> 7. Prontuário Clínico & Evoluções
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {Array.isArray(currentPaciente.prontuarioClinico) ? currentPaciente.prontuarioClinico.length : 0} registros
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowProntuarioModal(true)}
                className="text-xs font-bold text-forest bg-warm hover:bg-emerald-50 hover:text-emerald-900 border border-soft hover:border-emerald-300 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <span>Ver Prontuário Completo</span>
                <span className="text-xs">→</span>
              </button>
            </div>

            {/* Caixa de Registro Rápido de Evolução */}
            <div className="bg-emerald-50/30 p-4 rounded-xl border border-emerald-200/80 flex flex-col gap-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Registrar Nova Evolução Clínica Rápida
                </span>
                <div className="flex items-center gap-2">
                  <select
                    value={novaEvolucaoModalidade}
                    onChange={(e) => setNovaEvolucaoModalidade(e.target.value as any)}
                    className="text-[11px] font-semibold text-forest bg-white border border-emerald-300 rounded-lg px-2 py-1 focus:outline-none"
                  >
                    <option value="online">Online</option>
                    <option value="presencial">Presencial</option>
                  </select>
                </div>
              </div>

              <input
                type="text"
                value={novaEvolucaoTitulo}
                onChange={(e) => setNovaEvolucaoTitulo(e.target.value)}
                placeholder="Título da sessão / tema principal"
                className="w-full text-xs font-bold text-forest bg-white border border-soft rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
              />

              <textarea
                rows={3}
                value={novaEvolucaoTexto}
                onChange={(e) => setNovaEvolucaoTexto(e.target.value)}
                placeholder="Descreva a evolução da sessão: humor do paciente, tópicos abordados, intervenções realizadas e combinados para a próxima consulta..."
                className="w-full text-xs text-forest bg-white border border-soft rounded-xl p-3 focus:outline-none focus:border-emerald-500 shadow-2xs leading-relaxed"
              />

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={salvandoEvolucao}
                  onClick={handleAddQuickEvolucao}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{salvandoEvolucao ? "Salvando..." : "Salvar no Prontuário"}</span>
                </button>
              </div>
            </div>

            {/* Linha do Tempo Recente */}
            {Array.isArray(currentPaciente.prontuarioClinico) && currentPaciente.prontuarioClinico.length > 0 ? (
              <div className="space-y-2.5 pt-2">
                <span className="text-[11px] font-bold text-forest/70 uppercase tracking-wider block">
                  Últimos Registros Clínicos
                </span>
                {currentPaciente.prontuarioClinico.slice(0, 3).map((reg: ProntuarioRegistroItem) => (
                  <div
                    key={reg.id}
                    className="p-3.5 rounded-xl border border-soft bg-white hover:border-emerald-200 transition-colors shadow-2xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-forest">{reg.titulo}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-warm text-forest/70 border border-soft uppercase">
                          {reg.tipoRegistro}
                        </span>
                      </div>
                      <span className="text-[11px] text-forest/50 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-forest/40" />
                        {reg.dataSessao} {reg.horario ? `às ${reg.horario}` : ""}
                      </span>
                    </div>
                    <p className="text-xs text-forest/80 line-clamp-2 leading-relaxed">
                      {reg.conteudo}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-6 bg-warm/20 rounded-xl border border-dashed border-soft text-forest/60 text-xs">
                Nenhum registro clínico realizado ainda. Utilize o campo acima para adicionar a primeira evolução.
              </div>
            )}
          </div>

          {/* 8. ALERTAS, LEMBRETES & WHATSAPP */}
          <div id="sec-ext-8-alertas" className="bg-white p-4 sm:p-6 rounded-2xl border border-soft shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-soft pb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-forest/80 flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-emerald-600" /> 8. Mensagens Rápidas & WhatsApp
              </h4>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                Comunicação Direta
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl border border-soft bg-warm/30 flex flex-col justify-between gap-3">
                <div>
                  <span className="font-bold text-xs text-forest block">Lembrete de Sessão</span>
                  <p className="text-[11px] text-forest/70 mt-1 leading-relaxed">
                    "Olá {nomeDisplay}! Passando para lembrar da nossa sessão de amanhã..."
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openWhatsApp(`Olá ${nomeDisplay}! Passando para confirmar nossa próxima sessão de terapia. Tudo certo para nosso horário?`)}
                  className="w-full py-2 bg-white hover:bg-emerald-50 text-emerald-800 font-bold text-xs rounded-lg border border-emerald-200 transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Send className="w-3 h-3 text-emerald-600" />
                  Enviar Lembrete
                </button>
              </div>

              <div className="p-3.5 rounded-xl border border-soft bg-warm/30 flex flex-col justify-between gap-3">
                <div>
                  <span className="font-bold text-xs text-forest block">Dados de Pagamento (Pix)</span>
                  <p className="text-[11px] text-forest/70 mt-1 leading-relaxed">
                    "Olá {nomeDisplay}! Seguem as informações para o pagamento da sessão via Pix..."
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openWhatsApp(`Olá ${nomeDisplay}! Segue a chave Pix para acerto dos honorários da sessão: ${profile?.chavePix || "sua_chave_pix"}. Muito obrigado!`)}
                  className="w-full py-2 bg-white hover:bg-emerald-50 text-emerald-800 font-bold text-xs rounded-lg border border-emerald-200 transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Send className="w-3 h-3 text-emerald-600" />
                  Enviar Dados Pix
                </button>
              </div>

              <div className="p-3.5 rounded-xl border border-soft bg-warm/30 flex flex-col justify-between gap-3">
                <div>
                  <span className="font-bold text-xs text-forest block">Link da Sala de Videochamada</span>
                  <p className="text-[11px] text-forest/70 mt-1 leading-relaxed">
                    "Olá {nomeDisplay}! Nosso atendimento online já vai começar..."
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openWhatsApp(`Olá ${nomeDisplay}! Nosso atendimento online está pronto para iniciar. Segue o link de acesso da nossa sala: ${profile?.linkMeet || window.location.origin}`)}
                  className="w-full py-2 bg-white hover:bg-emerald-50 text-emerald-800 font-bold text-xs rounded-lg border border-emerald-200 transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Send className="w-3 h-3 text-emerald-600" />
                  Enviar Link da Sala
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé da Ficha */}
        <div className="px-4 sm:px-6 py-2.5 sm:py-3 bg-white border-t border-soft flex items-center justify-between shrink-0">
          <div className="text-xs text-forest/60">
            Ficha de Bordo do Paciente Particular • Resguardada por Sigilo Profissional
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-forest hover:bg-forest/90 text-white font-bold text-xs shadow-xs cursor-pointer"
          >
            Fechar Ficha
          </button>
        </div>
      </div>

      {/* MODAL DE PRONTUÁRIO CLÍNICO INTEGRADO */}
      {showProntuarioModal && (
        <PacienteProntuarioModal
          isOpen={showProntuarioModal}
          onClose={() => setShowProntuarioModal(false)}
          pacienteId={currentPaciente.id}
          pacienteNome={nomeDisplay}
          pacienteCpf={currentPaciente.cpf}
          pacienteDataNascimento={currentPaciente.dataNascimento}
          pacienteTelefone={currentPaciente.telefone}
          registros={currentPaciente.prontuarioClinico || []}
          onSaveRegistros={async (novosRegistros) => {
            await handleUpdateField("prontuarioClinico", novosRegistros);
          }}
          sessoes={sessoes}
          onAbrirFaturamento={() => {
            setShowProntuarioModal(false);
            setShowFaturamentoModal(true);
          }}
          profissionalLogado={{
            uid: profile?.uid || user?.uid,
            nome: profile?.name || profile?.nome,
            name: profile?.name || profile?.nome,
            crp: profile?.crp,
          }}
          showToast={showToast}
        />
      )}

      {/* MODAL DE SESSÕES & FATURAMENTO INTEGRADO */}
      {showFaturamentoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-soft flex flex-col max-h-[92vh] overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-forest to-emerald-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-300" />
                <h3 className="font-bold text-sm sm:text-base font-serif">
                  Sessões & Faturamento • {nomeDisplay}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFaturamentoModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <PacienteFaturamentoSpreadsheet
                pacienteId={currentPaciente.id}
                pacienteNome={nomeDisplay}
                pacienteCpf={currentPaciente.cpf}
                pacienteTelefone={currentPaciente.telefone}
                pacienteEmail={currentPaciente.email}
                sessoes={sessoes}
                onSaveSessoes={async (novasSessoes) => {
                  await handleUpdateField("historicoSessoes", novasSessoes);
                }}
                profissionalLogado={{
                  uid: profile?.uid || user?.uid,
                  name: profile?.name || profile?.nome,
                  nome: profile?.name || profile?.nome,
                  crp: profile?.crp,
                  cpf: profile?.cpf,
                }}
                showToast={showToast}
                onAbrirProntuarioModal={() => {
                  setShowFaturamentoModal(false);
                  setShowProntuarioModal(true);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONTRATO TERAPÊUTICO */}
      {showContratoModal && (
        <ContratoGeradorModal
          isOpen={showContratoModal}
          paciente={currentPaciente}
          onClose={() => setShowContratoModal(false)}
          onContratoSalvo={(updated) => {
            setCurrentPaciente(updated);
            onUpdatePaciente(updated);
          }}
          profissionalLogado={profile}
          collectionName="pacientes"
          showToast={showToast}
        />
      )}
    </div>
  );
}
