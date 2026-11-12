import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RotateCcw,
  User,
  Phone,
  Video,
  MapPin,
  Sparkles,
  Lock,
  Check,
  FileText,
  Pin,
  Trash2,
  Edit2,
  ExternalLink,
  MessageSquare,
  TrendingUp,
  CalendarDays,
  List,
  X,
  AlertTriangle,
  Repeat,
  DollarSign,
  UserPlus,
  UserX,
  GripVertical,
} from "lucide-react";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";
import { formatProfessionalName } from "../utils/formatters";
import { Acolhimento } from "./ProfissionalEsteiraTarefas";
import { hasIntegrarFeatures } from "../types/planosProfissionais";

export interface AgendamentoSessao {
  id: string;
  profissionalId: string;
  pacienteId: string;
  pacienteNome: string;
  pacienteTelefone?: string;
  pacienteEmail?: string;
  data: string; // YYYY-MM-DD
  horario: string; // HH:MM
  duracaoMinutos: number; // default 50
  modalidade: "online" | "presencial";
  linkAtendimento?: string;
  localEndereco?: string;
  status: "agendada" | "realizada" | "falta_cobrada" | "remarcada" | "cancelada";
  valor?: number;
  observacoes?: string;
  isHorarioFixo?: boolean;
  diaSemanaFixo?: number; // 0 a 6
  frequenciaRecorrencia?: "semanal" | "quinzenal" | "mensal";
  frequencia?: "nenhuma" | "semanal" | "quinzenal" | "mensal";
  origemTipo?: string;
  servicoB2BId?: string;
  createdAt?: any;
  updatedAt?: any;
}

interface ProfissionalAgendaViewProps {
  profissionalUid: string;
  profissionalNome?: string;
  pacientesAtivos: Acolhimento[];
  pacientesExternos?: any[];
  fichasCorporativas?: any[];
  empresasB2B?: any[];
  plano?: string;
  userProfile?: any;
  onOpenPacienteDetalhes?: (pacienteId: string) => void;
  onNovoPacienteExternoCadastrado?: (paciente: any) => void;
  initialPacienteId?: string | null;
  onClearInitialPacienteId?: () => void;
  onGoToPlanos?: () => void;
}

type ViewMode = "dia" | "semana" | "mes" | "lista";
type StatusFilter = "todos" | "agendada" | "realizada" | "falta_cobrada" | "remarcada" | "cancelada";

export const formatarDataIso = (d: Date): string => {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
};

export const horaParaMinutos = (hhmm: string): number => {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

export const minutosParaHora = (mins: number): string => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

export const checarSobreposicaoHorario = (
  inicio1: number,
  _duracao1: number,
  inicio2: number,
  _duracao2: number
): boolean => {
  // Regra solicitada: para sinalizar conflito, usar sempre a regra mesmo horário + mesmo dia
  return inicio1 === inicio2;
};

export type FrequenciaFixaAgenda = "nenhuma" | "semanal" | "quinzenal" | "mensal";
export type MesesFixacaoAgenda = 1 | 2 | 3;

/**
 * Gera todas as datas (YYYY-MM-DD) de um agendamento fixo a partir da data inicial:
 * - "nenhuma": apenas [dataInicial]
 * - "semanal": 1x por semana no mesmo dia da semana (+7 dias), 4 sessões por mês (4, 8 ou 12)
 * - "quinzenal": a cada 2 semanas no mesmo dia da semana (+14 dias), 2 sessões por mês (2, 4 ou 6)
 * - "mensal": mesmo dia da semana a cada mês (ex.: toda 1ª quarta-feira do mês) para os próximos 1, 2 ou 3 meses
 */
export const gerarDatasOcorrenciasFixas = (
  dataInicialIso: string,
  frequencia: FrequenciaFixaAgenda,
  meses: MesesFixacaoAgenda
): string[] => {
  if (!dataInicialIso) return [];
  const partes = dataInicialIso.split("-").map(Number);
  if (partes.length !== 3 || partes.some((n) => Number.isNaN(n))) return [dataInicialIso];

  const [anoBase, mesBase1, diaBase] = partes;
  const mesBase = mesBase1 - 1;
  const baseDate = new Date(anoBase, mesBase, diaBase, 12, 0, 0);
  if (Number.isNaN(baseDate.getTime())) return [dataInicialIso];

  if (frequencia === "nenhuma") {
    return [formatarDataIso(baseDate)];
  }

  if (frequencia === "semanal") {
    const totalOcorrencias = meses * 4;
    const datas: string[] = [];
    for (let i = 0; i < totalOcorrencias; i++) {
      const d = new Date(anoBase, mesBase, diaBase + i * 7, 12, 0, 0);
      datas.push(formatarDataIso(d));
    }
    return datas;
  }

  if (frequencia === "quinzenal") {
    const totalOcorrencias = meses * 2;
    const datas: string[] = [];
    for (let i = 0; i < totalOcorrencias; i++) {
      const d = new Date(anoBase, mesBase, diaBase + i * 14, 12, 0, 0);
      datas.push(formatarDataIso(d));
    }
    return datas;
  }

  // Mensal: mesmo dia da semana a cada mês (ex.: toda 1ª quarta-feira do mês) pelos próximos N meses
  const diaSemanaAlvo = baseDate.getDay();
  const ordemNoMes = Math.floor((diaBase - 1) / 7) + 1; // 1ª, 2ª, 3ª, 4ª ou 5ª ocorrência no mês
  const datas: string[] = [formatarDataIso(baseDate)];

  for (let mOffset = 1; mOffset <= meses; mOffset++) {
    const primeiroDoMes = new Date(anoBase, mesBase + mOffset, 1, 12, 0, 0);
    const anoAlvo = primeiroDoMes.getFullYear();
    const mesAlvo = primeiroDoMes.getMonth();
    const offsetPrimeiroDia = (diaSemanaAlvo - primeiroDoMes.getDay() + 7) % 7;
    let diaCandidato = 1 + offsetPrimeiroDia + (ordemNoMes - 1) * 7;
    const ultimoDiaDoMes = new Date(anoAlvo, mesAlvo + 1, 0).getDate();
    if (diaCandidato > ultimoDiaDoMes) {
      diaCandidato -= 7;
    }
    const dataOcorrencia = new Date(anoAlvo, mesAlvo, diaCandidato, 12, 0, 0);
    datas.push(formatarDataIso(dataOcorrencia));
  }

  return datas;
};

export const getFrequenciaFixaLabel = (
  agendamento: Pick<AgendamentoSessao, "frequencia" | "frequenciaRecorrencia">,
  curto = false
): string => {
  const freq = agendamento.frequencia || agendamento.frequenciaRecorrencia || "semanal";
  if (curto) {
    if (freq === "quinzenal") return "Fixo · Quinzenal";
    if (freq === "mensal") return "Fixo · Mensal";
    return "Fixo · Semanal";
  }
  if (freq === "quinzenal") return "Fixo Quinzenal";
  if (freq === "mensal") return "Fixo Mensal";
  return "Fixo Semanal";
};

export function ProfissionalAgendaView({
  profissionalUid,
  profissionalNome = "Profissional",
  pacientesAtivos = [],
  pacientesExternos = [],
  fichasCorporativas = [],
  empresasB2B = [],
  plano = "",
  userProfile,
  onOpenPacienteDetalhes,
  onNovoPacienteExternoCadastrado,
  initialPacienteId,
  onClearInitialPacienteId,
  onGoToPlanos,
}: ProfissionalAgendaViewProps) {
  // Verificação de Plano Integrar / Credenciais com Acesso Total (libera carteira de pacientes externos)
  const isPlanoAvancado = useMemo(() => {
    return hasIntegrarFeatures(userProfile || { plano });
  }, [userProfile, plano]);

  // Estado principal de agendamentos
  const [agendamentos, setAgendamentos] = useState<AgendamentoSessao[]>([]);
  const [loading, setLoading] = useState(true);

  // Navegação de Período
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("semana");

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [modalidadeFilter, setModalidadeFilter] = useState<"todas" | "online" | "presencial">("todas");
  const [apenasFixos, setApenasFixos] = useState(false);
  const [filtroApenasHojeLista, setFiltroApenasHojeLista] = useState(false);

  // Modais
  const [showNovoModal, setShowNovoModal] = useState(false);
  const [showPlanoAvancadoModal, setShowPlanoAvancadoModal] = useState(false);
  const [showNovoPacienteExternoModal, setShowNovoPacienteExternoModal] = useState(false);
  const [selectedAgendamentoParaEditar, setSelectedAgendamentoParaEditar] = useState<AgendamentoSessao | null>(null);
  const [agendamentoParaExcluir, setAgendamentoParaExcluir] = useState<AgendamentoSessao | null>(null);

  // Estados de Drag and Drop & Remanejamento Rápido
  const [draggedAgendamento, setDraggedAgendamento] = useState<AgendamentoSessao | null>(null);
  const [dragOverDia, setDragOverDia] = useState<string | null>(null);
  const [dragOverHora, setDragOverHora] = useState<string | null>(null);
  const [toastMensagem, setToastMensagem] = useState<string | null>(null);
  const [remanejamentoModal, setRemanejamentoModal] = useState<{
    isOpen: boolean;
    agendamento: AgendamentoSessao;
    targetData: string;
    targetHorario: string;
    escopoSerie: "apenas_este" | "serie_toda";
    modoOrigem: "semana" | "dia" | "manual";
  } | null>(null);

  const showToast = (msg: string) => {
    setToastMensagem(msg);
    setTimeout(() => setToastMensagem(null), 3500);
  };

  // Form State para Novo / Editar Agendamento
  const [formPacienteId, setFormPacienteId] = useState("");
  const [formPacienteNome, setFormPacienteNome] = useState("");
  const [formPacienteTelefone, setFormPacienteTelefone] = useState("");
  const [formPacienteEmail, setFormPacienteEmail] = useState("");
  const [formData, setFormData] = useState(() => new Date().toISOString().split("T")[0]);
  const [formHorario, setFormHorario] = useState("14:00");
  const [formDuracao, setFormDuracao] = useState(50);
  const [formModalidade, setFormModalidade] = useState<"online" | "presencial">("online");
  const [formLinkAtendimento, setFormLinkAtendimento] = useState("");
  const [formLocalEndereco, setFormLocalEndereco] = useState("");
  const [formStatus, setFormStatus] = useState<"agendada" | "realizada" | "falta_cobrada" | "remarcada" | "cancelada">("agendada");
  const [formValor, setFormValor] = useState<string>("100");
  const [formFrequenciaFixa, setFormFrequenciaFixa] = useState<FrequenciaFixaAgenda>("nenhuma");
  const [formMesesFixar, setFormMesesFixar] = useState<MesesFixacaoAgenda>(1);
  const [formObservacoes, setFormObservacoes] = useState("");
  const [formErroValidacao, setFormErroValidacao] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State para Cadastro Rápido de Paciente Externo (Plano Avançado)
  const [novoPacienteNome, setNovoPacienteNome] = useState("");
  const [novoPacienteTelefone, setNovoPacienteTelefone] = useState("");
  const [novoPacienteEmail, setNovoPacienteEmail] = useState("");
  const [novoPacienteCpf, setNovoPacienteCpf] = useState("");
  const [novoPacienteDataNasc, setNovoPacienteDataNasc] = useState("");
  const [novoPacienteValor, setNovoPacienteValor] = useState("120");
  const [novoPacienteObs, setNovoPacienteObs] = useState("");
  const [isSalvandoPacienteExterno, setIsSalvandoPacienteExterno] = useState(false);

  // Autocomplete de Paciente
  const [pacienteSearchQuery, setPacienteSearchQuery] = useState("");
  const [isPacienteDropdownOpen, setIsPacienteDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsPacienteDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Escuta em tempo real dos agendamentos do profissional no Firestore
  useEffect(() => {
    if (!profissionalUid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, "agendamentos"),
      where("profissionalId", "==", profissionalUid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: AgendamentoSessao[] = [];
        snapshot.forEach((docSnap) => {
          items.push({
            id: docSnap.id,
            ...(docSnap.data() as Omit<AgendamentoSessao, "id">),
          });
        });
        setAgendamentos(items);
        setLoading(false);
      },
      (error) => {
        console.error("Erro ao carregar agendamentos:", error);
        handleFirestoreError(error, OperationType.GET, "agendamentos");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [profissionalUid]);

  // Lista unificada de pacientes (ativos da plataforma + carteira externa + corporativos ativos)
  const todosPacientesElegiveis = useMemo(() => {
    const list: Array<any> = [];
    const ids = new Set<string>();

    (pacientesAtivos || []).forEach((p) => {
      if (p.id) {
        ids.add(p.id);
        list.push({ ...p, isExterno: false });
      }
    });

    (pacientesExternos || []).forEach((p: any) => {
      if (p.id && !ids.has(p.id)) {
        ids.add(p.id);
        list.push({
          ...p,
          isExterno: true,
          viaAcesso: p.viaAcesso || "Particular",
          nomeCivil: p.nomeCivil || p.nome || "Paciente Particular",
        });
      }
    });

    (fichasCorporativas || []).forEach((f: any) => {
      if (
        f.id &&
        !ids.has(f.id) &&
        (f.status === "paciente" || f.status === "solicitacao_servico")
      ) {
        ids.add(f.id);
        const corpNome =
          f.nomeCivil ||
          f.pacienteNomeCompleto ||
          (f.beneficiarioTipo === "dependente" && f.dependenteInfo
            ? f.dependenteInfo
            : f.colaboradorNome) ||
          f.colaboradorNome ||
          f.nome ||
          "Paciente Corporativo";
        list.push({
          id: f.id,
          nome: corpNome,
          nomeCivil: corpNome,
          nomeDesejado: f.nomeSocial || f.nomeDesejado || corpNome,
          telefone:
            f.telefone ||
            f.pacienteTelefone ||
            f.colaboradorWhatsapp ||
            f.colaboradorTelefone ||
            "",
          email: f.email || f.pacienteEmail || f.colaboradorEmail || "",
          valorSessao: String(f.valorSessao || ""),
          viaAcesso: "Convênio Corporativo",
          isExterno: false,
          isCorporativo: true,
        });
      }
    });

    if (isPlanoAvancado) {
      (empresasB2B || []).forEach((emp: any) => {
        if (emp.id && !ids.has(emp.id) && emp.statusComercial !== "encerrada") {
          ids.add(emp.id);
          const empNome = `[B2B] ${emp.nomeFantasia || emp.razaoSocial || "Empresa Cliente"}`;
          list.push({
            id: emp.id,
            nome: empNome,
            nomeCivil: empNome,
            nomeDesejado: empNome,
            telefone: emp.contatoTelefone || "",
            email: emp.contatoEmail || emp.emailFinanceiroNf || "",
            valorSessao: String(emp.valorServicoPadrao || "1500"),
            viaAcesso: "Empresa B2B",
            isExterno: false,
            isEmpresaB2B: true,
          });
        }
      });
    }

    return list.sort((a, b) => {
      const nomeA = (a.nomeCivil || a.nome || a.nomeDesejado || "").toLowerCase();
      const nomeB = (b.nomeCivil || b.nome || b.nomeDesejado || "").toLowerCase();
      return nomeA.localeCompare(nomeB, "pt-BR");
    });
  }, [pacientesAtivos, pacientesExternos, fichasCorporativas, empresasB2B, isPlanoAvancado]);

  // Lista de pacientes elegíveis para agendamento (ativos + externos)
  const sugestoesPacientes = useMemo(() => {
    const queryLower = pacienteSearchQuery.toLowerCase().trim();
    return todosPacientesElegiveis.filter((p) => {
      const nome = (p.nomeCivil || p.nome || p.nomeDesejado || "").toLowerCase();
      const tel = (p.telefone || "").toLowerCase();
      if (!queryLower) return true;
      return nome.includes(queryLower) || tel.includes(queryLower);
    });
  }, [todosPacientesElegiveis, pacienteSearchQuery]);

  // Regra de Validação: Impossível agendar dois pacientes no mesmo horário (Sobreposição)
  const conflitoHorarioAtual = useMemo(() => {
    if (!formData || !formHorario) return null;
    const inicioMin = horaParaMinutos(formHorario);
    const duracaoMin = Number(formDuracao) || 50;
    const ignoreId = selectedAgendamentoParaEditar?.id;

    // Busca agendamentos ativos no mesmo dia e mesmo horário
    const conflito = agendamentos.find((a) => {
      if (a.id === ignoreId) return false;
      if (a.data !== formData) return false;
      if (a.status === "cancelada") return false;
      return a.horario === formHorario;
    });

    return conflito || null;
  }, [formData, formHorario, selectedAgendamentoParaEditar, agendamentos]);

  // Datas calculadas da recorrência quando o profissional escolhe fixar na agenda
  const vaiGerarSerieFixa = useMemo(() => {
    if (formFrequenciaFixa === "nenhuma") return false;
    if (!selectedAgendamentoParaEditar) return true;
    // Se estava avulso e o profissional decidiu fixar ao editar, também gera a série futura
    return !selectedAgendamentoParaEditar.isHorarioFixo;
  }, [formFrequenciaFixa, selectedAgendamentoParaEditar]);

  const datasSerieFixa = useMemo(() => {
    if (!vaiGerarSerieFixa || !formData) return [];
    return gerarDatasOcorrenciasFixas(formData, formFrequenciaFixa, formMesesFixar);
  }, [vaiGerarSerieFixa, formData, formFrequenciaFixa, formMesesFixar]);

  // Verificação de conflito nas datas futuras se for Horário Fixo com recorrência
  const conflitosHorarioRecorrente = useMemo(() => {
    if (!vaiGerarSerieFixa || datasSerieFixa.length <= 1 || !formHorario) return [];

    const inicioMin = horaParaMinutos(formHorario);
    const duracaoMin = Number(formDuracao) || 50;
    const conflitos: { data: string; pacienteNome: string; horario: string }[] = [];

    for (const proximaDataStr of datasSerieFixa.slice(1)) {
      const conflito = agendamentos.find((a) => {
        if (a.data !== proximaDataStr) return false;
        if (a.status === "cancelada") return false;
        return a.horario === formHorario;
      });

      if (conflito) {
        conflitos.push({
          data: proximaDataStr,
          pacienteNome: conflito.pacienteNome,
          horario: conflito.horario,
        });
      }
    }
    return conflitos;
  }, [vaiGerarSerieFixa, datasSerieFixa, formHorario, formDuracao, agendamentos]);

  // Conflito em tempo real ao remanejar via arrastar e soltar (mini modal de horário)
  const conflitoRemanejamento = useMemo(() => {
    if (!remanejamentoModal) return null;
    const { agendamento, targetData, targetHorario } = remanejamentoModal;
    if (!targetData || !targetHorario) return null;
    const inicioMin = horaParaMinutos(targetHorario);
    const duracaoMin = agendamento.duracaoMinutos || 50;

    return agendamentos.find((a) => {
      if (a.id === agendamento.id) return false;
      if (a.data !== targetData) return false;
      if (a.status === "cancelada") return false;
      return a.horario === targetHorario;
    }) || null;
  }, [remanejamentoModal, agendamentos]);

  // Navegação de Datas
  const hoje = useMemo(() => new Date(), []);

  const handlePrev = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (viewMode === "mes") {
        d.setMonth(d.getMonth() - 1);
      } else if (viewMode === "semana") {
        d.setDate(d.getDate() - 7);
      } else if (viewMode === "dia") {
        d.setDate(d.getDate() - 1);
      } else {
        d.setDate(d.getDate() - 7);
      }
      return d;
    });
  };

  const handleNext = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (viewMode === "mes") {
        d.setMonth(d.getMonth() + 1);
      } else if (viewMode === "semana") {
        d.setDate(d.getDate() + 7);
      } else if (viewMode === "dia") {
        d.setDate(d.getDate() + 1);
      } else {
        d.setDate(d.getDate() + 7);
      }
      return d;
    });
  };

  const handleToday = () => {
    setCurrentDate(new Date());
    if (viewMode === "lista") {
      setFiltroApenasHojeLista(true);
    }
  };

  // Cálculo da Semana Atual (Segunda a Domingo)
  const diasDaSemana = useMemo(() => {
    const d = new Date(currentDate);
    const day = d.getDay();
    // Ajuste para segunda-feira como primeiro dia (0 = domingo -> -6, outros -> 1 - day)
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const segunda = new Date(d.getFullYear(), d.getMonth(), diff);

    const dias: { dataStr: string; dateObj: Date; diaSemanaNome: string; diaNumero: number; isHoje: boolean }[] = [];
    const nomesDias = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

    for (let i = 0; i < 7; i++) {
      const current = new Date(segunda.getFullYear(), segunda.getMonth(), segunda.getDate() + i);
      const dataStr = formatarDataIso(current);
      const isHoje =
        current.getDate() === hoje.getDate() &&
        current.getMonth() === hoje.getMonth() &&
        current.getFullYear() === hoje.getFullYear();

      dias.push({
        dataStr,
        dateObj: current,
        diaSemanaNome: nomesDias[i],
        diaNumero: current.getDate(),
        isHoje,
      });
    }
    return dias;
  }, [currentDate, hoje]);

  // Indicadores Mensais
  const mesAtualKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;

  const agendamentosDoMes = useMemo(() => {
    return agendamentos.filter((a) => a.data && a.data.startsWith(mesAtualKey));
  }, [agendamentos, mesAtualKey]);

  const metricasMensais = useMemo(() => {
    const total = agendamentosDoMes.length;
    const realizadas = agendamentosDoMes.filter((a) => a.status === "realizada").length;
    const faltasCobradas = agendamentosDoMes.filter((a) => a.status === "falta_cobrada").length;
    const agendadas = agendamentosDoMes.filter((a) => a.status === "agendada").length;
    const remarcadas = agendamentosDoMes.filter((a) => a.status === "remarcada").length;
    const canceladas = agendamentosDoMes.filter((a) => a.status === "cancelada").length;
    const fixos = agendamentosDoMes.filter((a) => a.isHorarioFixo).length;

    const taxaComparecimento =
      total > 0
        ? Math.round((realizadas / (realizadas + faltasCobradas + canceladas || 1)) * 100)
        : 100;

    return {
      total,
      realizadas,
      faltasCobradas,
      agendadas,
      remarcadas,
      canceladas,
      fixos,
      taxaComparecimento,
    };
  }, [agendamentosDoMes]);

  // Filtragem dos Agendamentos
  const agendamentosFiltrados = useMemo(() => {
    const hojeIso = formatarDataIso(hoje);
    return agendamentos
      .filter((a) => {
        // No modo lista, se o filtro "Hoje" estiver ativado, exibe somente os atendimentos de hoje
        if (viewMode === "lista" && filtroApenasHojeLista) {
          if (a.data !== hojeIso) return false;
        }
        if (statusFilter !== "todos" && a.status !== statusFilter) return false;
        if (modalidadeFilter !== "todas" && a.modalidade !== modalidadeFilter) return false;
        if (apenasFixos && !a.isHorarioFixo) return false;
        if (searchTerm) {
          const lower = searchTerm.toLowerCase();
          const matchNome = a.pacienteNome?.toLowerCase().includes(lower);
          const matchObs = a.observacoes?.toLowerCase().includes(lower);
          if (!matchNome && !matchObs) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const dataA = `${a.data} ${a.horario || "00:00"}`;
        const dataB = `${b.data} ${b.horario || "00:00"}`;
        return dataA.localeCompare(dataB);
      });
  }, [agendamentos, statusFilter, modalidadeFilter, apenasFixos, searchTerm, viewMode, filtroApenasHojeLista, hoje]);

  // Agrupar agendamentos por data para visão de semana e calendário
  const agendamentosPorData = useMemo(() => {
    const map = new Map<string, AgendamentoSessao[]>();
    agendamentosFiltrados.forEach((item) => {
      const list = map.get(item.data) || [];
      list.push(item);
      map.set(item.data, list);
    });
    return map;
  }, [agendamentosFiltrados]);

  // Abertura do formulário de criação
  const handleOpenNovoAgendamento = (dataPrevia?: string, horaPrevia?: string) => {
    setSelectedAgendamentoParaEditar(null);
    setFormErroValidacao("");
    setFormPacienteId("");
    setFormPacienteNome("");
    setFormPacienteTelefone("");
    setFormPacienteEmail("");
    setPacienteSearchQuery("");
    setFormData(dataPrevia || formatarDataIso(new Date()));
    setFormHorario(horaPrevia || "14:00");
    setFormDuracao(50);
    setFormModalidade("online");
    setFormLinkAtendimento("");
    setFormLocalEndereco("");
    setFormStatus("agendada");
    setFormValor("100");
    setFormFrequenciaFixa("nenhuma");
    setFormMesesFixar(1);
    setFormObservacoes("");
    setShowNovoModal(true);
  };

  // Abertura para edição
  const handleOpenEditarAgendamento = (agendamento: AgendamentoSessao) => {
    setSelectedAgendamentoParaEditar(agendamento);
    setFormErroValidacao("");
    setFormPacienteId(agendamento.pacienteId);
    setFormPacienteNome(agendamento.pacienteNome);
    setFormPacienteTelefone(agendamento.pacienteTelefone || "");
    setFormPacienteEmail(agendamento.pacienteEmail || "");
    setFormData(agendamento.data);
    setFormHorario(agendamento.horario);
    setFormDuracao(agendamento.duracaoMinutos || 50);
    setFormModalidade(agendamento.modalidade || "online");
    setFormLinkAtendimento(agendamento.linkAtendimento || "");
    setFormLocalEndereco(agendamento.localEndereco || "");
    setFormStatus(agendamento.status);
    setFormValor(String(agendamento.valor || "100"));
    const freqSalva: FrequenciaFixaAgenda = agendamento.isHorarioFixo
      ? agendamento.frequencia === "quinzenal" || agendamento.frequencia === "mensal"
        ? agendamento.frequencia
        : agendamento.frequenciaRecorrencia === "quinzenal" || agendamento.frequenciaRecorrencia === "mensal"
          ? agendamento.frequenciaRecorrencia
          : "semanal"
      : "nenhuma";
    setFormFrequenciaFixa(freqSalva);
    setFormMesesFixar(1);
    setFormObservacoes(agendamento.observacoes || "");
    setShowNovoModal(true);
  };

  // Seleção de um paciente no dropdown
  const handleSelectPaciente = (paciente: any) => {
    const nome = formatProfessionalName(
      paciente.nomeCivil || paciente.nome || paciente.nomeDesejado || "Paciente"
    );
    setFormPacienteId(paciente.id);
    setFormPacienteNome(nome);
    setFormPacienteTelefone(paciente.telefone || "");
    setFormPacienteEmail(paciente.email || "");
    if (paciente.valorSessao) {
      setFormValor(String(paciente.valorSessao));
    }
    setIsPacienteDropdownOpen(false);
  };

  // Abertura automática quando redirecionado de "Agendar Sessão" na Ficha ou Kanban Corporativo
  useEffect(() => {
    if (!initialPacienteId) return;
    const found = todosPacientesElegiveis.find((p) => p.id === initialPacienteId);
    if (found) {
      handleOpenNovoAgendamento();
      handleSelectPaciente(found);
      if (onClearInitialPacienteId) {
        onClearInitialPacienteId();
      }
    }
  }, [initialPacienteId, todosPacientesElegiveis]);

  // Cadastro Rápido de Paciente Externo no Firestore
  const handleCadastrarNovoPacienteExterno = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoPacienteNome.trim()) {
      alert("Por favor, informe o nome do paciente.");
      return;
    }
    if (!novoPacienteTelefone.trim()) {
      alert("Por favor, informe o telefone/WhatsApp do paciente.");
      return;
    }

    setIsSalvandoPacienteExterno(true);
    try {
      const valorNum = parseFloat(novoPacienteValor.replace(",", ".")) || 100;
      const docData = {
        nome: novoPacienteNome.trim(),
        nomeCivil: novoPacienteNome.trim(),
        telefone: novoPacienteTelefone.trim(),
        email: novoPacienteEmail.trim(),
        cpf: novoPacienteCpf.trim(),
        dataNascimento: novoPacienteDataNasc || "",
        valorSessao: valorNum,
        observacoes: novoPacienteObs.trim(),
        tipo: "externo",
        profissionalId: profissionalUid,
        status: "ativo",
        viaAcesso: "Particular",
        origem: "agenda_clinica",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "pacientes"), docData);

      const novoPacienteCriado = {
        id: docRef.id,
        ...docData,
        isExterno: true,
      };

      // Auto-seleciona no agendamento em aberto
      setFormPacienteId(docRef.id);
      setFormPacienteNome(novoPacienteNome.trim());
      setFormPacienteTelefone(novoPacienteTelefone.trim());
      setFormPacienteEmail(novoPacienteEmail.trim());
      setFormValor(String(valorNum));
      setIsPacienteDropdownOpen(false);

      if (onNovoPacienteExternoCadastrado) {
        onNovoPacienteExternoCadastrado(novoPacienteCriado);
      }

      // Limpa os campos e fecha o modal
      setNovoPacienteNome("");
      setNovoPacienteTelefone("");
      setNovoPacienteEmail("");
      setNovoPacienteCpf("");
      setNovoPacienteDataNasc("");
      setNovoPacienteValor("120");
      setNovoPacienteObs("");
      setShowNovoPacienteExternoModal(false);
    } catch (err: any) {
      console.error("Erro ao cadastrar paciente externo:", err);
      handleFirestoreError(err, OperationType.CREATE, "pacientes");
      alert("Erro ao salvar paciente: " + (err.message || "Tente novamente."));
    } finally {
      setIsSalvandoPacienteExterno(false);
    }
  };

  // Sincronização automática com a ficha do paciente (acolhimentos ou pacientes)
  const sincronizarComFichaPaciente = async (
    pacienteId: string,
    sessaoItem: {
      id: string;
      data: string;
      horario: string;
      modalidade: "online" | "presencial";
      statusAtendimento:
        | "agendada"
        | "realizada"
        | "falta_cobrada"
        | "desmarcada_antecedencia"
        | "cancelada_sem_cobranca"
        | "falta_sem_aviso";
      valor: number;
      observacoes?: string;
    }
  ) => {
    if (!pacienteId || pacienteId === "avulso") return;

    try {
      let targetRef = doc(db, "acolhimentos", pacienteId);
      let docSnap = await getDoc(targetRef);

      if (!docSnap.exists()) {
        const pacRef = doc(db, "pacientes", pacienteId);
        const pacSnap = await getDoc(pacRef);
        if (pacSnap.exists()) {
          targetRef = pacRef;
          docSnap = pacSnap;
        }
      }

      if (!docSnap.exists()) {
        const corpRef = doc(db, "triagem_corporativa", pacienteId);
        const corpSnap = await getDoc(corpRef);
        if (corpSnap.exists()) {
          targetRef = corpRef;
          docSnap = corpSnap;
        }
      }

      if (docSnap.exists()) {
        const acolhimentoData = docSnap.data();
        const historicoExistente = Array.isArray(acolhimentoData.historicoSessoes)
          ? [...acolhimentoData.historicoSessoes]
          : [];

        const indexExistente = historicoExistente.findIndex((s: any) => s.id === sessaoItem.id);

        if (indexExistente >= 0) {
          historicoExistente[indexExistente] = {
            ...historicoExistente[indexExistente],
            ...sessaoItem,
          };
        } else {
          historicoExistente.push({
            ...sessaoItem,
            numeroSessao: historicoExistente.length + 1,
            statusPagamento: "pendente",
          });
        }

        await updateDoc(targetRef, {
          historicoSessoes: historicoExistente,
          updatedAt: serverTimestamp(),
        });
        return;
      }

      // Verifica se é uma Empresa Cliente B2B (prestação de serviços corporativos)
      const empRef = doc(db, "empresas_profissional", pacienteId);
      const empSnap = await getDoc(empRef);
      if (empSnap.exists()) {
        const empData = empSnap.data();
        const servicosExistentes = Array.isArray(empData.historicoServicos)
          ? [...empData.historicoServicos]
          : [];
        const agExistente = agendamentos.find((a) => a.id === sessaoItem.id);
        const servicoKey = agExistente?.servicoB2BId || sessaoItem.id;
        const idxSrv = servicosExistentes.findIndex((s: any) => s.id === servicoKey);
        const statusExecucaoMap: Record<string, "agendado" | "realizado" | "cancelado"> = {
          agendada: "agendado",
          realizada: "realizado",
          falta_cobrada: "realizado",
          desmarcada_antecedencia: "cancelado",
          cancelada_sem_cobranca: "cancelado",
          falta_sem_aviso: "cancelado",
        };
        const statusExec = statusExecucaoMap[sessaoItem.statusAtendimento] || "agendado";

        if (idxSrv >= 0) {
          servicosExistentes[idxSrv] = {
            ...servicosExistentes[idxSrv],
            data: sessaoItem.data,
            horario: sessaoItem.horario,
            modalidade: sessaoItem.modalidade,
            statusExecucao: statusExec,
            valor: sessaoItem.valor,
          };
        } else {
          servicosExistentes.push({
            id: servicoKey,
            numeroItem: servicosExistentes.length + 1,
            data: sessaoItem.data,
            horario: sessaoItem.horario,
            duracaoMinutos: 60,
            descricaoServico: sessaoItem.observacoes || "Atendimento / Intervenção Corporativa",
            modalidade: sessaoItem.modalidade,
            statusExecucao: statusExec,
            valor: sessaoItem.valor,
            statusNotaFiscal: "pendente",
            statusPagamento: "pendente",
            formaPagamento: "Pix",
            observacoes: sessaoItem.observacoes || "",
          });
        }

        await updateDoc(empRef, {
          historicoServicos: servicosExistentes,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.warn("Aviso ao sincronizar sessão com ficha do paciente/empresa:", err);
    }
  };

  // Submissão do agendamento (criação ou edição)
  const handleSubmitAgendamento = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErroValidacao("");

    if (!formPacienteNome.trim()) {
      setFormErroValidacao("Por favor, selecione ou informe o paciente.");
      return;
    }
    if (!formData || !formHorario) {
      setFormErroValidacao("Por favor, selecione a data e o horário da sessão.");
      return;
    }

    // Regra rígida: Bloqueio absoluto de sobreposição de horário
    if (conflitoHorarioAtual) {
      setFormErroValidacao(
        `Impossível agendar: Já existe um atendimento para ${conflitoHorarioAtual.pacienteNome} neste mesmo dia e horário (${conflitoHorarioAtual.horario}).`
      );
      return;
    }

    if (conflitosHorarioRecorrente.length > 0) {
      const primeiro = conflitosHorarioRecorrente[0];
      const dataBr = primeiro.data.split("-").reverse().join("/");
      setFormErroValidacao(
        `Impossível fixar este horário: Há conflito em data futura (${dataBr} às ${primeiro.horario}) com o atendimento de ${primeiro.pacienteNome}.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const valorNum = parseFloat(formValor.replace(",", ".")) || 100;
      const isFixoSelecionado = formFrequenciaFixa !== "nenhuma";
      const partesData = formData.split("-").map(Number);
      const diaSemanaCalculado =
        partesData.length === 3
          ? new Date(partesData[0], partesData[1] - 1, partesData[2], 12, 0, 0).getDay()
          : undefined;

      // Regra de segurança: Sempre que criar (ou passar a fixar) um evento/sessão fixo na agenda,
      // categorizar exclusivamente como "agendada" para nunca replicar outro status em sessões futuras.
      const statusEfetivo: AgendamentoSessao["status"] =
        vaiGerarSerieFixa && isFixoSelecionado ? "agendada" : formStatus;

      // Traduz status para o modelo de historicoSessoes da ficha
      const statusAtendimentoMap: Record<string, any> = {
        agendada: "agendada",
        realizada: "realizada",
        falta_cobrada: "falta_cobrada",
        remarcada: "desmarcada_antecedencia",
        cancelada: "cancelada_sem_cobranca",
      };

      if (selectedAgendamentoParaEditar) {
        // Atualizar existente
        const agendamentoRef = doc(db, "agendamentos", selectedAgendamentoParaEditar.id);
        const updatePayload: Record<string, any> = {
          pacienteId: formPacienteId,
          pacienteNome: formPacienteNome,
          pacienteTelefone: formPacienteTelefone,
          pacienteEmail: formPacienteEmail,
          data: formData,
          horario: formHorario,
          duracaoMinutos: Number(formDuracao),
          modalidade: formModalidade,
          linkAtendimento: formLinkAtendimento,
          localEndereco: formLocalEndereco,
          status: statusEfetivo,
          valor: valorNum,
          isHorarioFixo: isFixoSelecionado,
          frequencia: formFrequenciaFixa,
          frequenciaRecorrencia: isFixoSelecionado ? formFrequenciaFixa : null,
          diaSemanaFixo: isFixoSelecionado && diaSemanaCalculado !== undefined ? diaSemanaCalculado : null,
          observacoes: formObservacoes,
          updatedAt: serverTimestamp(),
        };

        await updateDoc(agendamentoRef, updatePayload);

        // Sincroniza na ficha do paciente
        if (formPacienteId) {
          await sincronizarComFichaPaciente(formPacienteId, {
            id: selectedAgendamentoParaEditar.id,
            data: formData,
            horario: formHorario,
            modalidade: formModalidade,
            statusAtendimento: statusAtendimentoMap[statusEfetivo] || "agendada",
            valor: valorNum,
            observacoes: formObservacoes,
          });
        }

        // Se era avulso e o profissional ativou "Fixar na agenda" agora, cria as ocorrências futuras como "agendada"
        if (vaiGerarSerieFixa && datasSerieFixa.length > 1) {
          for (const proximaDataStr of datasSerieFixa.slice(1)) {
            const recDoc: Record<string, any> = {
              profissionalId: profissionalUid,
              pacienteId: formPacienteId || "avulso",
              pacienteNome: formPacienteNome,
              pacienteTelefone: formPacienteTelefone,
              pacienteEmail: formPacienteEmail,
              data: proximaDataStr,
              horario: formHorario,
              duracaoMinutos: Number(formDuracao),
              modalidade: formModalidade,
              linkAtendimento: formLinkAtendimento,
              localEndereco: formLocalEndereco,
              status: "agendada",
              valor: valorNum,
              isHorarioFixo: true,
              frequencia: formFrequenciaFixa,
              frequenciaRecorrencia: formFrequenciaFixa,
              ...(diaSemanaCalculado !== undefined ? { diaSemanaFixo: diaSemanaCalculado } : {}),
              observacoes: formObservacoes,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };

            const recDocRef = await addDoc(collection(db, "agendamentos"), recDoc);
            if (formPacienteId) {
              await sincronizarComFichaPaciente(formPacienteId, {
                id: recDocRef.id,
                data: proximaDataStr,
                horario: formHorario,
                modalidade: formModalidade,
                statusAtendimento: "agendada",
                valor: valorNum,
                observacoes: formObservacoes,
              });
            }
          }
        }
      } else {
        // Criar novo agendamento
        const baseDoc: Record<string, any> = {
          profissionalId: profissionalUid,
          pacienteId: formPacienteId || "avulso",
          pacienteNome: formPacienteNome,
          pacienteTelefone: formPacienteTelefone,
          pacienteEmail: formPacienteEmail,
          data: formData,
          horario: formHorario,
          duracaoMinutos: Number(formDuracao),
          modalidade: formModalidade,
          linkAtendimento: formLinkAtendimento,
          localEndereco: formLocalEndereco,
          status: statusEfetivo,
          valor: valorNum,
          isHorarioFixo: isFixoSelecionado,
          frequencia: formFrequenciaFixa,
          ...(isFixoSelecionado
            ? {
                frequenciaRecorrencia: formFrequenciaFixa,
                ...(diaSemanaCalculado !== undefined ? { diaSemanaFixo: diaSemanaCalculado } : {}),
              }
            : {}),
          observacoes: formObservacoes,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        const newDocRef = await addDoc(collection(db, "agendamentos"), baseDoc);

        // Sincroniza na ficha do paciente
        if (formPacienteId) {
          await sincronizarComFichaPaciente(formPacienteId, {
            id: newDocRef.id,
            data: formData,
            horario: formHorario,
            modalidade: formModalidade,
            statusAtendimento: statusAtendimentoMap[statusEfetivo] || "agendada",
            valor: valorNum,
            observacoes: formObservacoes,
          });
        }

        // Se for Horário Fixo, gera todas as ocorrências futuras respeitando Semanal, Quinzenal ou Mensal
        // e sempre categorizadas como "agendada"
        if (isFixoSelecionado && datasSerieFixa.length > 1) {
          for (const proximaDataStr of datasSerieFixa.slice(1)) {
            const recDoc: Record<string, any> = {
              ...baseDoc,
              data: proximaDataStr,
              status: "agendada",
              observacoes: formObservacoes,
            };

            const recDocRef = await addDoc(collection(db, "agendamentos"), recDoc);
            if (formPacienteId) {
              await sincronizarComFichaPaciente(formPacienteId, {
                id: recDocRef.id,
                data: proximaDataStr,
                horario: formHorario,
                modalidade: formModalidade,
                statusAtendimento: "agendada",
                valor: valorNum,
                observacoes: formObservacoes,
              });
            }
          }
        }
      }

      setShowNovoModal(false);
    } catch (err: any) {
      console.error("Erro ao salvar agendamento:", err);
      handleFirestoreError(err, OperationType.WRITE, "agendamentos");
      setFormErroValidacao("Não foi possível salvar o agendamento. Verifique sua conexão e tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mudança rápida de status diretamente pelo card da sessão
  const handleUpdateStatusRapido = async (
    agendamento: AgendamentoSessao,
    novoStatus: "agendada" | "realizada" | "falta_cobrada" | "remarcada" | "cancelada"
  ) => {
    try {
      const agendamentoRef = doc(db, "agendamentos", agendamento.id);
      await updateDoc(agendamentoRef, {
        status: novoStatus,
        updatedAt: serverTimestamp(),
      });

      // Atualiza também na ficha do paciente
      const statusAtendimentoMap: Record<string, any> = {
        agendada: "agendada",
        realizada: "realizada",
        falta_cobrada: "falta_cobrada",
        remarcada: "desmarcada_antecedencia",
        cancelada: "cancelada_sem_cobranca",
      };

      if (agendamento.pacienteId) {
        await sincronizarComFichaPaciente(agendamento.pacienteId, {
          id: agendamento.id,
          data: agendamento.data,
          horario: agendamento.horario,
          modalidade: agendamento.modalidade,
          statusAtendimento: statusAtendimentoMap[novoStatus] || "agendada",
          valor: agendamento.valor || 100,
          observacoes: agendamento.observacoes,
        });
      }
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
      alert("Não foi possível atualizar o status.");
    }
  };

  // Exclusão de agendamento (apenas este ou todos dali pra frente)
  const handleConfirmarExclusao = async (modo: "apenas_este" | "todos_dali_pra_frente") => {
    if (!agendamentoParaExcluir) return;
    try {
      const agId = agendamentoParaExcluir.id;
      const pacId = agendamentoParaExcluir.pacienteId;
      const dataAlvo = agendamentoParaExcluir.data;

      if (modo === "apenas_este") {
        await deleteDoc(doc(db, "agendamentos", agId));

        if (pacId && pacId !== "avulso") {
          try {
            let targetRef = doc(db, "acolhimentos", pacId);
            let docSnap = await getDoc(targetRef);
            if (!docSnap.exists()) {
              const pacRef = doc(db, "pacientes", pacId);
              const pacSnap = await getDoc(pacRef);
              if (pacSnap.exists()) {
                targetRef = pacRef;
                docSnap = pacSnap;
              }
            }
            if (!docSnap.exists()) {
              const corpRef = doc(db, "triagem_corporativa", pacId);
              const corpSnap = await getDoc(corpRef);
              if (corpSnap.exists()) {
                targetRef = corpRef;
                docSnap = corpSnap;
              }
            }
            if (docSnap.exists()) {
              const data = docSnap.data();
              if (Array.isArray(data.historicoSessoes)) {
                const filtrado = data.historicoSessoes
                  .filter((s: any) => s.id !== agId)
                  .map((s: any, idx: number) => ({ ...s, numeroSessao: idx + 1 }));
                await updateDoc(targetRef, {
                  historicoSessoes: filtrado,
                  updatedAt: serverTimestamp(),
                });
              }
            } else {
              const empRef = doc(db, "empresas_profissional", pacId);
              const empSnap = await getDoc(empRef);
              if (empSnap.exists()) {
                const empData = empSnap.data();
                const srvId = agendamentoParaExcluir.servicoB2BId || agId;
                if (Array.isArray(empData.historicoServicos)) {
                  const atualizadoB2B = empData.historicoServicos.map((s: any) =>
                    s.id === srvId ? { ...s, horario: "" } : s
                  );
                  await updateDoc(empRef, {
                    historicoServicos: atualizadoB2B,
                    updatedAt: serverTimestamp(),
                  });
                }
              }
            }
          } catch (syncErr) {
            console.warn("Aviso ao remover sessão do histórico da ficha:", syncErr);
          }
        }
      } else {
        // Todos dali pra frente
        const qFuture = query(
          collection(db, "agendamentos"),
          where("profissionalId", "==", profissionalUid || auth.currentUser?.uid),
        );
        const snapFuture = await getDocs(qFuture);
        const batchDeletes: Promise<void>[] = [];
        const deletedIds = new Set<string>();
        snapFuture.forEach((docSnap) => {
          const dataAg = docSnap.data();
          const isSamePatient =
            (pacId && pacId !== "avulso" && dataAg.pacienteId === pacId) ||
            ((!pacId || pacId === "avulso") &&
              (dataAg.pacienteNome === agendamentoParaExcluir.pacienteNome ||
                dataAg.paciente === agendamentoParaExcluir.pacienteNome));
          if (isSamePatient && dataAg.data && dataAg.data >= dataAlvo) {
            deletedIds.add(docSnap.id);
            batchDeletes.push(deleteDoc(doc(db, "agendamentos", docSnap.id)));
          }
        });
        await Promise.all(batchDeletes);

        if (pacId && pacId !== "avulso" && deletedIds.size > 0) {
          try {
            let targetRef = doc(db, "acolhimentos", pacId);
            let docSnap = await getDoc(targetRef);
            if (!docSnap.exists()) {
              const pacRef = doc(db, "pacientes", pacId);
              const pacSnap = await getDoc(pacRef);
              if (pacSnap.exists()) {
                targetRef = pacRef;
                docSnap = pacSnap;
              }
            }
            if (!docSnap.exists()) {
              const corpRef = doc(db, "triagem_corporativa", pacId);
              const corpSnap = await getDoc(corpRef);
              if (corpSnap.exists()) {
                targetRef = corpRef;
                docSnap = corpSnap;
              }
            }
            if (docSnap.exists()) {
              const data = docSnap.data();
              if (Array.isArray(data.historicoSessoes)) {
                const filtrado = data.historicoSessoes
                  .filter((s: any) => !deletedIds.has(s.id))
                  .map((s: any, idx: number) => ({ ...s, numeroSessao: idx + 1 }));
                await updateDoc(targetRef, {
                  historicoSessoes: filtrado,
                  updatedAt: serverTimestamp(),
                });
              }
            }
          } catch (syncErr) {
            console.warn("Aviso ao sincronizar exclusão em série na ficha:", syncErr);
          }
        }
      }

      setAgendamentoParaExcluir(null);
    } catch (err) {
      console.error("Erro ao excluir agendamento:", err);
      alert("Erro ao excluir o agendamento.");
    }
  };

  // Helper de remanejamento rápido (arrastar e soltar na grade de semana ou dia)
  const handleExecutarRemanejamento = async (
    agendamento: AgendamentoSessao,
    novaData: string,
    novoHorario: string,
    escopo: "apenas_este" | "serie_toda" = "apenas_este"
  ) => {
    // Verificação preventiva de conflito (mesmo horário + mesmo dia)
    const conflitoExistente = agendamentos.find((a) => {
      if (a.id === agendamento.id) return false;
      if (a.data !== novaData) return false;
      if (a.status === "cancelada") return false;
      return a.horario === novoHorario;
    });

    if (conflitoExistente) {
      alert(
        `Impossível mover: Já existe atendimento marcado para ${conflitoExistente.pacienteNome} nesta data às ${conflitoExistente.horario}.`
      );
      return false;
    }

    setIsSubmitting(true);
    try {
      const partes = novaData.split("-").map(Number);
      const novoDiaSemana =
        partes.length === 3 ? new Date(partes[0], partes[1] - 1, partes[2], 12, 0, 0).getDay() : undefined;

      const statusAtendimentoMap: Record<string, any> = {
        agendada: "agendada",
        realizada: "realizada",
        falta_cobrada: "falta_cobrada",
        remarcada: "desmarcada_antecedencia",
        cancelada: "cancelada_sem_cobranca",
      };

      if (escopo === "apenas_este" || !agendamento.isHorarioFixo) {
        // Atualiza apenas este agendamento
        const agRef = doc(db, "agendamentos", agendamento.id);
        const patch: Record<string, any> = {
          data: novaData,
          horario: novoHorario,
          updatedAt: serverTimestamp(),
        };
        if (novoDiaSemana !== undefined && agendamento.isHorarioFixo) {
          patch.diaSemanaFixo = novoDiaSemana;
        }
        await updateDoc(agRef, patch);

        if (agendamento.pacienteId) {
          await sincronizarComFichaPaciente(agendamento.pacienteId, {
            id: agendamento.id,
            data: novaData,
            horario: novoHorario,
            modalidade: agendamento.modalidade,
            statusAtendimento: statusAtendimentoMap[agendamento.status] || "agendada",
            valor: agendamento.valor || 100,
            observacoes: agendamento.observacoes,
          });
        }
      } else {
        // Remaneja este e todos dali pra frente (série fixa)
        const dataAlvoAntiga = agendamento.data;
        const qFuture = query(
          collection(db, "agendamentos"),
          where("profissionalId", "==", profissionalUid || auth.currentUser?.uid)
        );
        const snapFuture = await getDocs(qFuture);
        const batchUpdates: Promise<void>[] = [];
        const updatedSessoesFicha: { id: string; data: string; horario: string }[] = [];

        const dAntiga = new Date(agendamento.data + "T12:00:00");
        const dNova = new Date(novaData + "T12:00:00");
        const diffMs = dNova.getTime() - dAntiga.getTime();
        const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));

        snapFuture.forEach((docSnap) => {
          const dAg = docSnap.data();
          const isSamePatient =
            (agendamento.pacienteId && agendamento.pacienteId !== "avulso" && dAg.pacienteId === agendamento.pacienteId) ||
            ((!agendamento.pacienteId || agendamento.pacienteId === "avulso") &&
              (dAg.pacienteNome === agendamento.pacienteNome || dAg.paciente === agendamento.pacienteNome));

          if (isSamePatient && dAg.data && dAg.data >= dataAlvoAntiga) {
            const itemDate = new Date(dAg.data + "T12:00:00");
            itemDate.setDate(itemDate.getDate() + diffDias);
            const itemNovaDataStr = formatarDataIso(itemDate);
            const itemDiaSemana = itemDate.getDay();

            batchUpdates.push(
              updateDoc(doc(db, "agendamentos", docSnap.id), {
                data: itemNovaDataStr,
                horario: novoHorario,
                diaSemanaFixo: itemDiaSemana,
                updatedAt: serverTimestamp(),
              })
            );
            updatedSessoesFicha.push({
              id: docSnap.id,
              data: itemNovaDataStr,
              horario: novoHorario,
            });
          }
        });

        await Promise.all(batchUpdates);

        if (agendamento.pacienteId && agendamento.pacienteId !== "avulso" && updatedSessoesFicha.length > 0) {
          try {
            const mapUpdates = new Map(updatedSessoesFicha.map((u) => [u.id, u]));
            let targetRef = doc(db, "acolhimentos", agendamento.pacienteId);
            let docSnap = await getDoc(targetRef);
            if (!docSnap.exists()) {
              const pacRef = doc(db, "pacientes", agendamento.pacienteId);
              const pacSnap = await getDoc(pacRef);
              if (pacSnap.exists()) {
                targetRef = pacRef;
                docSnap = pacSnap;
              }
            }
            if (!docSnap.exists()) {
              const corpRef = doc(db, "triagem_corporativa", agendamento.pacienteId);
              const corpSnap = await getDoc(corpRef);
              if (corpSnap.exists()) {
                targetRef = corpRef;
                docSnap = corpSnap;
              }
            }
            if (docSnap.exists()) {
              const data = docSnap.data();
              if (Array.isArray(data.historicoSessoes)) {
                const atualizado = data.historicoSessoes.map((s: any) => {
                  const up = mapUpdates.get(s.id);
                  return up ? { ...s, data: up.data, horario: up.horario } : s;
                });
                await updateDoc(targetRef, {
                  historicoSessoes: atualizado,
                  updatedAt: serverTimestamp(),
                });
              }
            }
          } catch (syncErr) {
            console.warn("Aviso ao sincronizar remanejamento de série na ficha:", syncErr);
          }
        }
      }

      showToast(`Atendimento remanejado com sucesso para ${novaData.split("-").reverse().join("/")} às ${novoHorario}!`);
      return true;
    } catch (err) {
      console.error("Erro ao remanejar agendamento:", err);
      alert("Não foi possível remanejar o atendimento.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Drop no Modo Dia: remaneja para o horário da linha (ou abre confirmação se fixo)
  const handleDropDia = (horaDestino: string) => {
    if (!draggedAgendamento) return;
    const dataAlvo = formatarDataIso(currentDate);

    // Se soltou no mesmo dia e mesma hora de início, cancela
    if (draggedAgendamento.data === dataAlvo && draggedAgendamento.horario === horaDestino) {
      setDragOverHora(null);
      setDraggedAgendamento(null);
      return;
    }

    if (draggedAgendamento.isHorarioFixo) {
      // Agendamento fixo: solicita confirmação rápida do escopo
      setRemanejamentoModal({
        isOpen: true,
        agendamento: draggedAgendamento,
        targetData: dataAlvo,
        targetHorario: horaDestino,
        escopoSerie: "apenas_este",
        modoOrigem: "dia",
      });
    } else {
      // Agendamento avulso: verificar se há conflito de horário no destino (mesmo horário + mesmo dia)
      const conflitoExistente = agendamentos.find((a) => {
        if (a.id === draggedAgendamento.id) return false;
        if (a.data !== dataAlvo) return false;
        if (a.status === "cancelada") return false;
        return a.horario === horaDestino;
      });

      if (conflitoExistente) {
        // Havendo conflito, abre o mini modal com o aviso de horário indisponível
        setRemanejamentoModal({
          isOpen: true,
          agendamento: draggedAgendamento,
          targetData: dataAlvo,
          targetHorario: horaDestino,
          escopoSerie: "apenas_este",
          modoOrigem: "dia",
        });
      } else {
        // Sem conflito: move diretamente com feedback imediato
        handleExecutarRemanejamento(draggedAgendamento, dataAlvo, horaDestino, "apenas_este");
      }
    }

    setDragOverHora(null);
    setDraggedAgendamento(null);
  };

  // Drop no Modo Semana: abre o mini modal solicitando apenas o horário
  const handleDropSemana = (dataDestino: string) => {
    if (!draggedAgendamento) return;

    setRemanejamentoModal({
      isOpen: true,
      agendamento: draggedAgendamento,
      targetData: dataDestino,
      targetHorario: draggedAgendamento.horario,
      escopoSerie: "apenas_este",
      modoOrigem: "semana",
    });

    setDragOverDia(null);
    setDraggedAgendamento(null);
  };

  // Helper de link para o WhatsApp
  const handleOpenWhatsApp = (agendamento: AgendamentoSessao) => {
    const rawTel = agendamento.pacienteTelefone?.replace(/\D/g, "");
    if (!rawTel) {
      alert("Este paciente não possui telefone cadastrado.");
      return;
    }
    const cleanTel = rawTel.length <= 11 ? `55${rawTel}` : rawTel;
    const dataBr = agendamento.data.split("-").reverse().join("/");
    const msg = encodeURIComponent(
      `Olá, ${agendamento.pacienteNome.split(" ")[0]}! Aqui é ${profissionalNome}. Confirmando nossa sessão de psicoterapia agendada para ${dataBr} às ${agendamento.horario}. Qualquer dúvida, estou à disposição!`
    );
    window.open(`https://wa.me/${cleanTel}?text=${msg}`, "_blank");
  };

  // Cores e estilos de badge de status
  const getStatusBadge = (status: string, compact = false) => {
    const baseClasses = compact
      ? "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] leading-tight font-bold max-w-full"
      : "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap";

    switch (status) {
      case "realizada":
        return (
          <span
            className={`${baseClasses} bg-emerald-100 text-emerald-800 border border-emerald-200`}
            title="Realizada"
          >
            <CheckCircle2 className={`${compact ? "w-2.5 h-2.5" : "w-3 h-3"} text-emerald-600 shrink-0`} />
            <span className={compact ? "truncate" : ""}>Realizada</span>
          </span>
        );
      case "falta_cobrada":
        return (
          <span
            className={`${baseClasses} bg-orange-100 text-orange-900 border border-orange-300`}
            title="Falta cobrada — contabilizada no faturamento do paciente"
          >
            <UserX className={`${compact ? "w-2.5 h-2.5" : "w-3 h-3"} text-orange-700 shrink-0`} />
            <DollarSign className={`${compact ? "w-2 h-2" : "w-2.5 h-2.5"} -ml-1 text-orange-700 shrink-0`} />
            <span className={compact ? "truncate" : ""}>Falta Cobrada</span>
          </span>
        );
      case "remarcada":
        return (
          <span
            className={`${baseClasses} bg-amber-100 text-amber-800 border border-amber-200`}
            title="Remarcada"
          >
            <RotateCcw className={`${compact ? "w-2.5 h-2.5" : "w-3 h-3"} text-amber-600 shrink-0`} />
            <span className={compact ? "truncate" : ""}>Remarcada</span>
          </span>
        );
      case "cancelada":
        return (
          <span
            className={`${baseClasses} bg-rose-100 text-rose-800 border border-rose-200`}
            title="Cancelada"
          >
            <XCircle className={`${compact ? "w-2.5 h-2.5" : "w-3 h-3"} text-rose-600 shrink-0`} />
            <span className={compact ? "truncate" : ""}>Cancelada</span>
          </span>
        );
      default:
        return (
          <span
            className={`${baseClasses} bg-sky-100 text-sky-800 border border-sky-200`}
            title="Agendada"
          >
            <Clock className={`${compact ? "w-2.5 h-2.5" : "w-3 h-3"} text-sky-600 shrink-0`} />
            <span className={compact ? "truncate" : ""}>Agendada</span>
          </span>
        );
    }
  };

  return (
    <div className="flex-1 min-h-0 w-full bg-warm overflow-y-auto overflow-x-hidden overscroll-y-contain [-webkit-overflow-scrolling:touch]">
      <div className="flex flex-col gap-3.5 sm:gap-4 p-3 sm:p-5 md:p-6 pb-28 sm:pb-36">
      {/* 1. TOPO DA AGENDA: TÍTULO COMPACTO E BOTÃO DE NOVO AGENDAMENTO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-xl border border-soft shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-forest/10 flex items-center justify-center text-forest shrink-0">
              <CalendarIcon className="w-4 h-4 text-forest" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold font-serif text-forest">Agenda Clínica</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-forest/10 text-forest">
                  {agendamentosDoMes.length} este mês
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-forest/70">
                Organize suas sessões, acompanhe assiduidade e sincronize diretamente com prontuários.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Botão de Novo Agendamento */}
          <button
            type="button"
            onClick={() => handleOpenNovoAgendamento()}
            className="w-full sm:w-auto px-3.5 py-1.5 rounded-lg bg-forest hover:bg-forest/90 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer hover:shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Agendamento</span>
          </button>
        </div>
      </div>

      {/* 2. CARDS DE INDICADORES MENSAIS EM TEMPO REAL - INTERATIVOS E OTIMIZADOS VERTICALMENTE */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {/* Total do Mês */}
        <button
          type="button"
          onClick={() => setStatusFilter("todos")}
          title="Ver todos os status"
          className={`bg-white px-2.5 py-1.5 rounded-xl border shadow-2xs flex items-center justify-between gap-1.5 text-left cursor-pointer transition-all hover:border-forest/40 ${
            statusFilter === "todos"
              ? "border-forest/50 ring-2 ring-forest/20 bg-forest/[0.02]"
              : "border-soft"
          }`}
        >
          <div className="min-w-0">
            <span className="text-[9px] sm:text-[10px] font-semibold text-forest/60 uppercase tracking-wider block truncate">
              Total Mês
            </span>
            <span className="text-sm sm:text-base font-bold text-forest leading-tight block tabular-nums">
              {metricasMensais.total}
            </span>
          </div>
          <div className="w-6 h-6 rounded-lg bg-forest/5 flex items-center justify-center shrink-0">
            <CalendarDays className="w-3 h-3 text-forest/50" />
          </div>
        </button>

        {/* Agendadas */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === "agendada" ? "todos" : "agendada")}
          title="Filtrar por Agendadas"
          className={`bg-white px-2.5 py-1.5 rounded-xl border shadow-2xs flex items-center justify-between gap-1.5 text-left cursor-pointer transition-all hover:border-sky-400 ${
            statusFilter === "agendada"
              ? "border-sky-500 ring-2 ring-sky-300 bg-sky-50/50"
              : "border-soft"
          }`}
        >
          <div className="min-w-0">
            <span className="text-[9px] sm:text-[10px] font-semibold text-sky-700 uppercase tracking-wider block truncate">
              Agendadas
            </span>
            <span className="text-sm sm:text-base font-bold text-sky-700 leading-tight block tabular-nums">
              {metricasMensais.agendadas}
            </span>
          </div>
          <div className="w-6 h-6 rounded-lg bg-sky-50 flex items-center justify-center shrink-0">
            <Clock className="w-3 h-3 text-sky-600" />
          </div>
        </button>

        {/* Realizadas */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === "realizada" ? "todos" : "realizada")}
          title="Filtrar por Realizadas"
          className={`bg-white px-2.5 py-1.5 rounded-xl border shadow-2xs flex items-center justify-between gap-1.5 text-left cursor-pointer transition-all hover:border-emerald-400 ${
            statusFilter === "realizada"
              ? "border-emerald-500 ring-2 ring-emerald-300 bg-emerald-50/50"
              : "border-soft"
          }`}
        >
          <div className="min-w-0">
            <span className="text-[9px] sm:text-[10px] font-semibold text-emerald-700 uppercase tracking-wider block truncate">
              Realizadas
            </span>
            <span className="text-sm sm:text-base font-bold text-emerald-700 leading-tight block tabular-nums">
              {metricasMensais.realizadas}
            </span>
          </div>
          <div className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          </div>
        </button>

        {/* Faltas Cobradas */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === "falta_cobrada" ? "todos" : "falta_cobrada")}
          title="Filtrar por Faltas Cobradas"
          className={`bg-white px-2.5 py-1.5 rounded-xl border shadow-2xs flex items-center justify-between gap-1.5 text-left cursor-pointer transition-all hover:border-orange-400 ${
            statusFilter === "falta_cobrada"
              ? "border-orange-500 ring-2 ring-orange-300 bg-orange-50/50"
              : "border-soft"
          }`}
        >
          <div className="min-w-0">
            <span className="text-[9px] sm:text-[10px] font-semibold text-orange-800 uppercase tracking-wider block truncate">
              Faltas Cobradas
            </span>
            <span className="text-sm sm:text-base font-bold text-orange-800 leading-tight block tabular-nums">
              {metricasMensais.faltasCobradas}
            </span>
          </div>
          <div className="w-6 h-6 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
            <UserX className="w-3 h-3 text-orange-700" />
            <DollarSign className="w-2.5 h-2.5 -ml-0.5 text-orange-700" />
          </div>
        </button>

        {/* Remarcadas */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === "remarcada" ? "todos" : "remarcada")}
          title="Filtrar por Remarcadas"
          className={`bg-white px-2.5 py-1.5 rounded-xl border shadow-2xs flex items-center justify-between gap-1.5 text-left cursor-pointer transition-all hover:border-amber-400 ${
            statusFilter === "remarcada"
              ? "border-amber-500 ring-2 ring-amber-300 bg-amber-50/50"
              : "border-soft"
          }`}
        >
          <div className="min-w-0">
            <span className="text-[9px] sm:text-[10px] font-semibold text-amber-700 uppercase tracking-wider block truncate">
              Remarcadas
            </span>
            <span className="text-sm sm:text-base font-bold text-amber-700 leading-tight block tabular-nums">
              {metricasMensais.remarcadas}
            </span>
          </div>
          <div className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
            <RotateCcw className="w-3 h-3 text-amber-600" />
          </div>
        </button>

        {/* Canceladas */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === "cancelada" ? "todos" : "cancelada")}
          title="Filtrar por Canceladas"
          className={`bg-white px-2.5 py-1.5 rounded-xl border shadow-2xs flex items-center justify-between gap-1.5 text-left cursor-pointer transition-all hover:border-rose-400 ${
            statusFilter === "cancelada"
              ? "border-rose-500 ring-2 ring-rose-300 bg-rose-50/50"
              : "border-soft"
          }`}
        >
          <div className="min-w-0">
            <span className="text-[9px] sm:text-[10px] font-semibold text-rose-700 uppercase tracking-wider block truncate">
              Canceladas
            </span>
            <span className="text-sm sm:text-base font-bold text-rose-700 leading-tight block tabular-nums">
              {metricasMensais.canceladas}
            </span>
          </div>
          <div className="w-6 h-6 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
            <XCircle className="w-3 h-3 text-rose-600" />
          </div>
        </button>
      </div>

      {/* 3. BARRA DE CONTROLE: NAVEGAÇÃO DE DATAS, VISUALIZAÇÃO E FILTROS */}
      <div className="md:sticky md:top-0 z-20 bg-white/95 backdrop-blur-md p-2.5 sm:p-3 rounded-2xl border border-soft shadow-sm flex flex-wrap items-center justify-between gap-2">
        {/* Navegação de Data */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-warm rounded-xl border border-soft p-0.5">
            <button
              type="button"
              onClick={handlePrev}
              title="Período anterior"
              className="p-1.5 hover:bg-white rounded-lg text-forest/70 hover:text-forest transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleToday}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                (viewMode === "dia" && formatarDataIso(currentDate) === formatarDataIso(hoje)) ||
                (viewMode === "lista" && filtroApenasHojeLista)
                  ? "bg-forest text-white shadow-2xs"
                  : "text-forest hover:bg-white"
              }`}
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={handleNext}
              title="Próximo período"
              className="p-1.5 hover:bg-white rounded-lg text-forest/70 hover:text-forest transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="text-xs sm:text-sm font-bold text-forest flex items-center gap-1.5 ml-1">
            <CalendarIcon className="w-4 h-4 text-forest/60" />
            <span className="capitalize">
              {viewMode === "dia"
                ? currentDate.toLocaleDateString("pt-BR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : viewMode === "lista" && filtroApenasHojeLista
                ? `Hoje, ${hoje.toLocaleDateString("pt-BR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}`
                : currentDate.toLocaleDateString("pt-BR", {
                    month: "long",
                    year: "numeric",
                  })}
            </span>
            {((viewMode === "dia" && formatarDataIso(currentDate) === formatarDataIso(hoje)) ||
              (viewMode === "lista" && filtroApenasHojeLista)) && (
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-forest text-white">
                Hoje
              </span>
            )}
          </div>
        </div>

        {/* Modos de Visualização (Dia, Semana, Mês, Lista) - Responsivo e sempre visível em qualquer orientação */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center p-1 bg-warm rounded-xl border border-soft text-xs font-semibold shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("dia")}
              className={`p-2 rounded-lg transition-all flex items-center justify-center cursor-pointer ${
                viewMode === "dia"
                  ? "bg-white text-forest shadow-xs font-bold"
                  : "text-forest/70 hover:text-forest"
              }`}
            >
              <Clock className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("semana")}
              className={`p-2 rounded-lg transition-all flex items-center justify-center cursor-pointer ${
                viewMode === "semana"
                  ? "bg-white text-forest shadow-xs font-bold"
                  : "text-forest/70 hover:text-forest"
              }`}
            >
              <CalendarDays className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("mes")}
              className={`p-2 rounded-lg transition-all flex items-center justify-center cursor-pointer ${
                viewMode === "mes"
                  ? "bg-white text-forest shadow-xs font-bold"
                  : "text-forest/70 hover:text-forest"
              }`}
            >
              <CalendarIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("lista")}
              className={`p-2 rounded-lg transition-all flex items-center justify-center cursor-pointer ${
                viewMode === "lista"
                  ? "bg-white text-forest shadow-xs font-bold"
                  : "text-forest/70 hover:text-forest"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. FILTROS RÁPIDOS E BUSCA DE PACIENTE */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-soft shadow-xs text-xs">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-forest/40" />
          <input
            type="text"
            placeholder="Buscar por paciente ou anotações..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-warm/60 border border-soft rounded-lg text-forest focus:outline-none focus:ring-1 focus:ring-forest text-xs"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-forest/40 hover:text-forest"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-2.5 py-1.5 bg-warm/60 border border-soft rounded-lg font-medium text-forest focus:outline-none cursor-pointer"
          >
            <option value="todos">Todos os status</option>
            <option value="agendada">Apenas Agendadas</option>
            <option value="realizada">Apenas Realizadas</option>
            <option value="falta_cobrada">Apenas Faltas Cobradas</option>
            <option value="remarcada">Apenas Remarcadas</option>
            <option value="cancelada">Apenas Canceladas</option>
          </select>

          {/* Modalidade Filter */}
          <select
            value={modalidadeFilter}
            onChange={(e) => setModalidadeFilter(e.target.value as any)}
            className="px-2.5 py-1.5 bg-warm/60 border border-soft rounded-lg font-medium text-forest focus:outline-none cursor-pointer"
          >
            <option value="todas">Online & Presencial</option>
            <option value="online">Online</option>
            <option value="presencial">Presencial</option>
          </select>

          {/* Toggle Apenas Hoje na Lista */}
          {viewMode === "lista" && (
            <button
              type="button"
              onClick={() => setFiltroApenasHojeLista(!filtroApenasHojeLista)}
              title="Filtrar agendamentos de hoje na lista"
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                filtroApenasHojeLista
                  ? "bg-forest text-white font-bold shadow-xs"
                  : "bg-warm/60 text-forest/70 border border-soft hover:text-forest"
              }`}
            >
              <CalendarIcon className="w-3 h-3" />
              <span>Hoje {filtroApenasHojeLista ? "✓" : ""}</span>
            </button>
          )}

          {/* Toggle Horário Fixo */}
          <button
            type="button"
            onClick={() => setApenasFixos(!apenasFixos)}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              apenasFixos
                ? "bg-purple-100 text-purple-800 border border-purple-200 font-bold"
                : "bg-warm/60 text-forest/70 border border-soft hover:text-forest"
            }`}
          >
            <Pin className="w-3 h-3 text-purple-600" />
            <span>Fixos 📌</span>
          </button>
        </div>
      </div>

      {/* 5. ÁREA DE VISUALIZAÇÃO: DIA / SEMANA / MÊS / LISTA */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-soft">
          <div className="animate-spin w-8 h-8 border-3 border-forest border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-xs sm:text-sm text-forest/70 font-medium">Carregando sua agenda clínica...</p>
        </div>
      ) : viewMode === "dia" ? (
        /* VISÃO DIÁRIA DETALHADA */
        <div className="flex flex-col gap-4">
          {/* Cabeçalho do Dia */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-soft shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-forest/10 flex flex-col items-center justify-center text-forest shrink-0">
                <span className="text-[10px] font-bold uppercase leading-none">
                  {currentDate.toLocaleDateString("pt-BR", { month: "short" })}
                </span>
                <span className="text-xl font-bold leading-none mt-1">
                  {currentDate.getDate()}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-forest capitalize">
                    {currentDate.toLocaleDateString("pt-BR", { weekday: "long" })},{" "}
                    {currentDate.getDate()} de{" "}
                    {currentDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                  </h2>
                  {formatarDataIso(currentDate) === formatarDataIso(hoje) && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-forest text-white">
                      Hoje
                    </span>
                  )}
                </div>
                {(() => {
                  const dataStr = formatarDataIso(currentDate);
                  const sessoesDoDia = agendamentosPorData.get(dataStr) || [];
                  const realizadas = sessoesDoDia.filter((s) => s.status === "realizada").length;
                  const pendentes = sessoesDoDia.filter((s) => s.status === "agendada").length;
                  return (
                    <p className="text-xs text-forest/70 mt-0.5">
                      {sessoesDoDia.length === 0
                        ? "Nenhum atendimento agendado para este dia."
                        : `${sessoesDoDia.length} atendimento(s) programado(s) • ${realizadas} realizada(s), ${pendentes} pendente(s)`}
                    </p>
                  );
                })()}
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleOpenNovoAgendamento(formatarDataIso(currentDate))}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-forest hover:bg-forest/90 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agendar neste Dia</span>
            </button>
          </div>

          {/* Grade Horária do Dia com Suporte a Rolagem Vertical Fluida */}
          <div className="bg-white rounded-2xl border border-soft shadow-xs p-3 sm:p-5 flex flex-col gap-3">
            <div className="w-full">
              <div className="w-full">
                {(() => {
                  const dataStr = formatarDataIso(currentDate);
                  const sessoesDoDia = (agendamentosPorData.get(dataStr) || []).sort((a, b) =>
                    (a.horario || "").localeCompare(b.horario || "")
                  );

                  // Grade horária com quebra de 30 minutos (07:00, 07:30, ..., 21:30)
                  // Expandida dinamicamente caso haja sessões antes das 07:00 ou após as 21:30
                  const baseMin = 7 * 60; // 07:00
                  const baseMax = 21 * 60 + 30; // 21:30

                  let minMinutos = baseMin;
                  let maxMinutos = baseMax;

                  sessoesDoDia.forEach((s) => {
                    if (s.horario) {
                      const m = horaParaMinutos(s.horario);
                      if (m < minMinutos) minMinutos = Math.floor(m / 60) * 60;
                      if (m > maxMinutos) maxMinutos = Math.ceil(m / 30) * 30;
                    }
                  });

                  const SLOTS_GRADE_DIA: string[] = [];
                  for (let m = minMinutos; m <= maxMinutos; m += 30) {
                    SLOTS_GRADE_DIA.push(minutosParaHora(m));
                  }

                  return (
                    <div className="flex flex-col">
                      {SLOTS_GRADE_DIA.map((hora) => {
                        const slotMin = horaParaMinutos(hora);
                        // Atendimentos marcados exatamente neste horário
                        const sessoesNesteHorario = sessoesDoDia.filter((s) => {
                          if (!s.horario) return false;
                          if (s.horario === hora) return true;
                          const sMin = horaParaMinutos(s.horario);
                          return sMin >= slotMin && sMin < slotMin + 30;
                        });
                        const isDragOverNestaHora = dragOverHora === hora;
                        const isHoraCheia = hora.endsWith(":00");

                        return (
                          <div
                            key={hora}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = "move";
                              if (dragOverHora !== hora) setDragOverHora(hora);
                            }}
                            onDragLeave={(e) => {
                              if (e.currentTarget === e.target) setDragOverHora(null);
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              handleDropDia(hora);
                            }}
                            className={`py-2 sm:py-2.5 flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 group rounded-xl px-2 transition-all ${
                              isHoraCheia ? "border-t border-soft/90" : "border-t border-dashed border-soft/50"
                            } ${
                              isDragOverNestaHora
                                ? "bg-forest/10 ring-2 ring-forest/50 border-forest/30"
                                : "hover:bg-warm/30"
                            }`}
                          >
                            {/* Marcador de Hora */}
                            <div className="w-16 shrink-0 flex items-center gap-1.5 text-xs pt-1">
                              {isHoraCheia ? (
                                <>
                                  <Clock className="w-3.5 h-3.5 text-forest/60" />
                                  <span className="font-bold text-forest">{hora}</span>
                                </>
                              ) : (
                                <>
                                  <span className="w-3.5 inline-flex justify-center text-[10px] text-forest/30 font-bold">•</span>
                                  <span className="font-semibold text-forest/60">{hora}</span>
                                </>
                              )}
                            </div>

                            {/* Conteúdo da Hora */}
                            <div className="flex-1 flex flex-col gap-2">
                              {isDragOverNestaHora && (
                                <div className="py-1 px-3 rounded-lg border border-dashed border-forest/60 bg-white/95 text-forest text-xs font-bold flex items-center justify-center gap-1.5 animate-pulse shadow-xs">
                                  <Clock className="w-3.5 h-3.5 text-forest" />
                                  <span>Solte para mover para as {hora}</span>
                                </div>
                              )}
                              {sessoesNesteHorario.length > 0 ? (
                                sessoesNesteHorario.map((sessao) => (
                                  <div
                                    key={sessao.id}
                                    draggable={true}
                                    onDragStart={(e) => {
                                      e.dataTransfer.setData("text/plain", sessao.id);
                                      e.dataTransfer.effectAllowed = "move";
                                      setDraggedAgendamento(sessao);
                                    }}
                                    onDragEnd={() => {
                                      setDraggedAgendamento(null);
                                      setDragOverHora(null);
                                      setDragOverDia(null);
                                    }}
                                    className={`p-3 sm:p-4 rounded-xl border text-xs shadow-2xs transition-all hover:shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 min-w-0 overflow-hidden cursor-grab active:cursor-grabbing ${
                                      draggedAgendamento?.id === sessao.id
                                        ? "opacity-50 ring-2 ring-forest/40 scale-[0.99]"
                                        : sessao.status === "realizada"
                                        ? "bg-emerald-50/70 border-emerald-200"
                                        : sessao.status === "falta_cobrada"
                                        ? "bg-orange-50/75 border-orange-300"
                                        : sessao.status === "remarcada"
                                        ? "bg-amber-50/70 border-amber-200"
                                        : sessao.status === "cancelada"
                                        ? "bg-rose-50/50 border-rose-200 opacity-70"
                                        : "bg-white border-soft hover:border-forest/40"
                                    }`}
                                  >
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <div
                                          className="flex items-center gap-1 text-forest/40 hover:text-forest"
                                          title="Arraste para remanejar horário"
                                        >
                                          <GripVertical className="w-3.5 h-3.5 shrink-0" />
                                        </div>
                                        <span
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (sessao.pacienteId && onOpenPacienteDetalhes) {
                                              onOpenPacienteDetalhes(sessao.pacienteId);
                                            }
                                          }}
                                          className="text-sm font-bold text-forest hover:underline cursor-pointer"
                                          title="Clique para ver ficha do paciente"
                                        >
                                          {sessao.pacienteNome}
                                        </span>
                                        {getStatusBadge(sessao.status)}
                                        {sessao.isHorarioFixo && (
                                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 flex items-center gap-0.5">
                                            <Pin className="w-2.5 h-2.5" /> {getFrequenciaFixaLabel(sessao)}
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex flex-wrap items-center gap-3 text-xs text-forest/70 mt-1.5">
                                        <span className="flex items-center gap-1 font-semibold text-forest">
                                          <Clock className="w-3.5 h-3.5 text-forest/50" />
                                          {sessao.horario} ({sessao.duracaoMinutos || 50} min)
                                        </span>
                                        <span className="flex items-center gap-1">
                                          {sessao.modalidade === "online" ? (
                                            <Video className="w-3.5 h-3.5 text-sky-600" />
                                          ) : (
                                            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                                          )}
                                          <span className="capitalize">{sessao.modalidade}</span>
                                        </span>
                                        {sessao.valor !== undefined && sessao.valor !== null && (
                                          <span className="flex items-center gap-1 font-medium text-emerald-700">
                                            <DollarSign className="w-3.5 h-3.5" />
                                            R$ {Number(sessao.valor || 0).toFixed(2)}
                                          </span>
                                        )}
                                    {sessao.linkAtendimento && sessao.modalidade === "online" && (
                                      <a
                                        href={sessao.linkAtendimento}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-sky-700 font-bold hover:underline"
                                      >
                                        <ExternalLink className="w-3 h-3" />
                                        <span>Link da Sala</span>
                                      </a>
                                    )}
                                    {sessao.localEndereco && sessao.modalidade === "presencial" && (
                                      <span className="text-forest/60">
                                        Local: {sessao.localEndereco}
                                      </span>
                                    )}
                                  </div>

                                  {sessao.observacoes && (
                                    <p className="text-xs text-forest/70 mt-1 italic bg-white/70 p-1.5 rounded-lg border border-soft/60">
                                      Obs: {sessao.observacoes}
                                    </p>
                                  )}
                                </div>

                                {/* Ações Rápidas */}
                                <div className="flex flex-wrap items-center gap-1.5 max-w-full self-start md:self-center">
                                  {/* Mudança de status rápida */}
                                  <div className="flex flex-wrap items-center gap-1 bg-white p-1 rounded-xl border border-soft shadow-2xs">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateStatusRapido(sessao, "agendada")}
                                      title="Marcar como Agendada"
                                      className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap ${
                                        sessao.status === "agendada"
                                          ? "bg-sky-600 text-white"
                                          : "text-sky-700 hover:bg-sky-50"
                                      }`}
                                    >
                                      <Clock className="w-3 h-3 shrink-0" />
                                      <span>Agendada</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateStatusRapido(sessao, "realizada")}
                                      title="Marcar Realizada (entra no faturamento)"
                                      className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap ${
                                        sessao.status === "realizada"
                                          ? "bg-emerald-600 text-white"
                                          : "text-emerald-700 hover:bg-emerald-50"
                                      }`}
                                    >
                                      <Check className="w-3 h-3 shrink-0" />
                                      <span>Realizada</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateStatusRapido(sessao, "falta_cobrada")}
                                      title="Marcar Falta Cobrada (não compareceu — entra no faturamento)"
                                      className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap ${
                                        sessao.status === "falta_cobrada"
                                          ? "bg-orange-600 text-white"
                                          : "text-orange-800 hover:bg-orange-50"
                                      }`}
                                    >
                                      <UserX className="w-3 h-3 shrink-0" />
                                      <DollarSign className="w-2.5 h-2.5 -ml-1 shrink-0" />
                                      <span>Falta Cobrada</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setRemanejamentoModal({
                                          isOpen: true,
                                          agendamento: sessao,
                                          targetData: sessao.data,
                                          targetHorario: sessao.horario,
                                          escopoSerie: "apenas_este",
                                          modoOrigem: "manual",
                                        });
                                      }}
                                      title="Remarcar data e horário deste atendimento"
                                      className="px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap text-amber-700 hover:bg-amber-50"
                                    >
                                      <RotateCcw className="w-3 h-3 shrink-0" />
                                      <span>Remarcar</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateStatusRapido(sessao, "cancelada")}
                                      title="Marcar Cancelada (sem cobrança)"
                                      className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap ${
                                        sessao.status === "cancelada"
                                          ? "bg-rose-600 text-white"
                                          : "text-rose-700 hover:bg-rose-50"
                                      }`}
                                    >
                                      <X className="w-3 h-3 shrink-0" />
                                      <span>Cancelar</span>
                                    </button>
                                  </div>

                                  {/* WhatsApp */}
                                  {sessao.pacienteTelefone && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenWhatsApp(sessao)}
                                      title="Confirmar via WhatsApp"
                                      className="p-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors cursor-pointer"
                                    >
                                      <MessageSquare className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  {/* Abrir Ficha */}
                                  {sessao.pacienteId && onOpenPacienteDetalhes && (
                                    <button
                                      type="button"
                                      onClick={() => onOpenPacienteDetalhes(sessao.pacienteId)}
                                      title="Abrir prontuário do paciente"
                                      className="px-2.5 py-1.5 rounded-xl border border-soft bg-white hover:bg-warm text-forest text-xs font-medium flex items-center gap-1 transition-all cursor-pointer"
                                    >
                                      <FileText className="w-3.5 h-3.5 text-forest/70" />
                                      <span>Ficha</span>
                                    </button>
                                  )}

                                  {/* Editar */}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditarAgendamento(sessao)}
                                    title="Editar"
                                    className="p-1.5 rounded-xl border border-soft hover:bg-warm text-forest/70 hover:text-forest transition-colors cursor-pointer"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Excluir */}
                                  <button
                                    type="button"
                                    onClick={() => setAgendamentoParaExcluir(sessao)}
                                    title="Excluir"
                                    className="p-1.5 rounded-xl border border-soft hover:bg-rose-50 text-rose-600 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            /* Slot Livre com intervalo de 30 min */
                            <button
                              type="button"
                              onClick={() => handleOpenNovoAgendamento(dataStr, hora)}
                              className="w-full py-1.5 px-3 rounded-lg border border-dashed border-soft/70 hover:border-forest/40 hover:bg-forest/[0.03] text-left text-[11px] text-forest/45 hover:text-forest transition-all flex items-center justify-between gap-2 cursor-pointer group"
                            >
                              <span className="flex items-center gap-1.5 min-w-0">
                                <Plus className="w-3 h-3 text-forest/40 group-hover:text-forest transition-colors shrink-0" />
                                <span className="truncate">Livre às {hora} • Clique para agendar</span>
                              </span>
                              <span className="text-[10px] font-semibold text-forest/40 group-hover:text-forest bg-warm px-1.5 py-0.5 rounded shrink-0">
                                30 min
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
              </div>
            </div>
          </div>
        </div>
      ) : viewMode === "semana" ? (
        /* VISÃO SEMANAL DETALHADA (Mesmo padrão e rolagem do Modo Dia) */
        <div className="flex flex-col gap-4">
          {/* Cabeçalho da Semana (Idêntico ao padrão do Modo Dia) */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-soft shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-forest/10 flex flex-col items-center justify-center text-forest shrink-0">
                <CalendarDays className="w-5 h-5 text-forest" />
                <span className="text-[10px] font-bold uppercase leading-none mt-1">Sem</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-forest capitalize">
                    Semana de {diasDaSemana[0]?.diaNumero}/{diasDaSemana[0]?.dateObj.getMonth() + 1} a {diasDaSemana[6]?.diaNumero}/{diasDaSemana[6]?.dateObj.getMonth() + 1} de {currentDate.getFullYear()}
                  </h2>
                  {diasDaSemana.some((d) => d.isHoje) && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-forest text-white">
                      Semana Atual
                    </span>
                  )}
                </div>
                {(() => {
                  const sessoesDaSemana = diasDaSemana.flatMap((d) => agendamentosPorData.get(d.dataStr) || []);
                  const realizadas = sessoesDaSemana.filter((s) => s.status === "realizada").length;
                  const pendentes = sessoesDaSemana.filter((s) => s.status === "agendada").length;
                  return (
                    <p className="text-xs text-forest/70 mt-0.5">
                      {sessoesDaSemana.length === 0
                        ? "Nenhum atendimento agendado para esta semana."
                        : `${sessoesDaSemana.length} atendimento(s) nesta semana • ${realizadas} realizada(s), ${pendentes} pendente(s)`}
                    </p>
                  );
                })()}
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleOpenNovoAgendamento()}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-forest hover:bg-forest/90 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agendar na Semana</span>
            </button>
          </div>

          {/* Grade Semanal */}
          <div className="bg-white rounded-2xl border border-soft shadow-xs">
            <div className="overflow-x-auto overflow-y-hidden min-w-full">
              <div className="min-w-[780px] xl:min-w-0 pb-3">
                {/* Header dos 7 dias */}
                <div className="grid grid-cols-7 border-b border-soft bg-warm/40 text-center">
                  {diasDaSemana.map((dia) => (
                    <div
                      key={dia.dataStr}
                      className={`py-3 px-1 border-r last:border-r-0 border-soft ${
                        dia.isHoje ? "bg-forest/5 font-bold" : ""
                      }`}
                    >
                      <span className="block text-[11px] font-semibold text-forest/60 uppercase">
                        {dia.diaSemanaNome}
                      </span>
                      <span
                        className={`inline-block mt-0.5 text-sm sm:text-base font-bold ${
                          dia.isHoje
                            ? "w-7 h-7 leading-7 rounded-full bg-forest text-white"
                            : "text-forest"
                        }`}
                      >
                        {dia.diaNumero}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Colunas de Sessões de cada dia */}
                <div className="grid grid-cols-7 min-h-[480px] divide-x divide-soft">
                  {diasDaSemana.map((dia) => {
                    const sessoesDoDia = agendamentosPorData.get(dia.dataStr) || [];
                    const isDragOverNesteDia = dragOverDia === dia.dataStr;

                    return (
                      <div
                        key={dia.dataStr}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                          if (dragOverDia !== dia.dataStr) setDragOverDia(dia.dataStr);
                        }}
                        onDragLeave={(e) => {
                          if (e.currentTarget === e.target) setDragOverDia(null);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          handleDropSemana(dia.dataStr);
                        }}
                        className={`p-1.5 sm:p-2 flex flex-col gap-2 relative min-w-0 transition-all ${
                          isDragOverNesteDia
                            ? "bg-forest/10 ring-2 ring-forest/40"
                            : dia.isHoje
                            ? "bg-forest/[0.02]"
                            : ""
                        }`}
                      >
                        {/* Indicador de Drop Zone ao arrastar */}
                        {isDragOverNesteDia && (
                          <div className="p-1 rounded-lg border border-dashed border-forest/60 bg-white/90 text-[10px] text-forest font-bold text-center animate-pulse">
                            Solte para remanejar para cá
                          </div>
                        )}

                        {/* Botão rápido para adicionar no dia */}
                        <button
                          type="button"
                          onClick={() => handleOpenNovoAgendamento(dia.dataStr)}
                          className="w-full py-1 text-[11px] text-forest/40 hover:text-forest hover:bg-forest/5 rounded border border-dashed border-soft transition-all flex items-center justify-center gap-1 cursor-pointer"
                          title={`Agendar para ${dia.diaNumero}/${dia.dateObj.getMonth() + 1}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Agendar</span>
                        </button>

                        {/* Lista de sessões do dia */}
                        {sessoesDoDia.length === 0 ? (
                          <div className="flex-1 flex items-center justify-center text-center p-2">
                            <span className="text-[11px] text-forest/30 italic">Livre</span>
                          </div>
                        ) : (
                          sessoesDoDia.map((sessao) => (
                            <div
                              key={sessao.id}
                              draggable={true}
                              onDragStart={(e) => {
                                e.dataTransfer.setData("text/plain", sessao.id);
                                e.dataTransfer.effectAllowed = "move";
                                setDraggedAgendamento(sessao);
                              }}
                              onDragEnd={() => {
                                setDraggedAgendamento(null);
                                setDragOverDia(null);
                                setDragOverHora(null);
                              }}
                              className={`w-full min-w-0 overflow-hidden p-2 rounded-xl border text-xs shadow-2xs transition-all hover:shadow-xs group cursor-grab active:cursor-grabbing ${
                                draggedAgendamento?.id === sessao.id
                                  ? "opacity-50 ring-2 ring-forest/40 scale-[0.98]"
                                  : sessao.status === "realizada"
                                  ? "bg-emerald-50/70 border-emerald-200"
                                  : sessao.status === "falta_cobrada"
                                  ? "bg-orange-50/75 border-orange-300"
                                  : sessao.status === "remarcada"
                                  ? "bg-amber-50/70 border-amber-200"
                                  : sessao.status === "cancelada"
                                  ? "bg-rose-50/50 border-rose-200 opacity-70"
                                  : "bg-white border-soft hover:border-forest/40"
                              }`}
                            >
                              <div className="flex items-stretch justify-between gap-1.5 min-w-0">
                                {/* Coluna Esquerda: Dados da Sessão contidos dentro do quadrado */}
                                <div className="flex-1 min-w-0 flex flex-col justify-between gap-1.5">
                                  <div className="min-w-0">
                                    {/* Horário e Fixado */}
                                    <div className="flex flex-wrap items-center gap-1 mb-1">
                                      <GripVertical className="w-3 h-3 text-forest/30 group-hover:text-forest/60 shrink-0" />
                                      <span className="font-bold text-forest inline-flex items-center gap-1 text-[11px] tabular-nums shrink-0">
                                        <Clock className="w-3 h-3 text-forest/60 shrink-0" />
                                        {sessao.horario}
                                      </span>
                                      {sessao.isHorarioFixo && (
                                        <span
                                          className="text-purple-700 font-bold text-[9px] bg-purple-100 px-1 py-0.5 rounded inline-flex items-center gap-0.5 leading-none shrink-0"
                                          title={getFrequenciaFixaLabel(sessao)}
                                        >
                                          <Pin className="w-2.5 h-2.5 shrink-0" />
                                          Fixo
                                        </span>
                                      )}
                                    </div>

                                    {/* Nome do Paciente */}
                                    <p
                                      className="font-bold text-forest text-[11px] sm:text-xs leading-snug line-clamp-3 break-words cursor-pointer hover:text-forest/80 hover:underline"
                                      title={sessao.pacienteNome}
                                      onClick={() => {
                                        if (sessao.pacienteId && onOpenPacienteDetalhes) {
                                          onOpenPacienteDetalhes(sessao.pacienteId);
                                        }
                                      }}
                                    >
                                      {sessao.pacienteNome}
                                    </p>
                                  </div>

                                  {/* Modalidade & Status empilhados para nunca vazarem lateralmente */}
                                  <div className="mt-1 flex flex-col items-start gap-1 text-[10px] min-w-0">
                                    <span className="text-forest/70 inline-flex items-center gap-1 max-w-full min-w-0">
                                      {sessao.modalidade === "online" ? (
                                        <Video className="w-2.5 h-2.5 text-sky-600 shrink-0" />
                                      ) : (
                                        <MapPin className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                      )}
                                      <span className="capitalize truncate">{sessao.modalidade}</span>
                                    </span>
                                    <div className="max-w-full min-w-0">
                                      {getStatusBadge(sessao.status, true)}
                                    </div>
                                  </div>
                                </div>

                                {/* Coluna Direita: Ícones de Comando em Linha Vertical dentro do quadrado */}
                                <div className="shrink-0 pl-1.5 border-l border-soft/70 flex flex-col items-center justify-start gap-0.5">
                                  {sessao.status !== "agendada" && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUpdateStatusRapido(sessao, "agendada");
                                      }}
                                      title="Marcar como Agendada"
                                      aria-label="Marcar como Agendada"
                                      className="w-6 h-6 flex items-center justify-center hover:bg-sky-100 text-sky-700 rounded-md transition-colors cursor-pointer"
                                    >
                                      <Clock className="w-3.5 h-3.5 shrink-0" />
                                    </button>
                                  )}
                                  {sessao.status !== "realizada" && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUpdateStatusRapido(sessao, "realizada");
                                      }}
                                      title="Marcar como Realizada (entra no faturamento)"
                                      aria-label="Marcar como Realizada"
                                      className="w-6 h-6 flex items-center justify-center hover:bg-emerald-100 text-emerald-700 rounded-md transition-colors cursor-pointer"
                                    >
                                      <Check className="w-3.5 h-3.5 shrink-0" />
                                    </button>
                                  )}
                                  {sessao.status !== "falta_cobrada" && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUpdateStatusRapido(sessao, "falta_cobrada");
                                      }}
                                      title="Marcar como Falta Cobrada (entra no faturamento)"
                                      aria-label="Marcar como Falta Cobrada"
                                      className="w-6 h-6 flex items-center justify-center hover:bg-orange-100 text-orange-700 rounded-md transition-colors cursor-pointer"
                                    >
                                      <UserX className="w-3 h-3 shrink-0" />
                                      <DollarSign className="w-2.5 h-2.5 -ml-1 shrink-0" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setRemanejamentoModal({
                                        isOpen: true,
                                        agendamento: sessao,
                                        targetData: sessao.data,
                                        targetHorario: sessao.horario,
                                        escopoSerie: "apenas_este",
                                        modoOrigem: "manual",
                                      });
                                    }}
                                    title="Remarcar"
                                    aria-label="Remarcar"
                                    className="w-6 h-6 flex items-center justify-center hover:bg-amber-100 text-amber-700 rounded-md transition-colors cursor-pointer"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                                  </button>
                                  {sessao.status !== "cancelada" && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUpdateStatusRapido(sessao, "cancelada");
                                      }}
                                      title="Marcar como Cancelada (sem cobrança)"
                                      aria-label="Marcar como Cancelada"
                                      className="w-6 h-6 flex items-center justify-center hover:bg-rose-100 text-rose-700 rounded-md transition-colors cursor-pointer"
                                    >
                                      <X className="w-3.5 h-3.5 shrink-0" />
                                    </button>
                                  )}

                                  <div className="w-4 h-px bg-soft/80 my-0.5" aria-hidden="true" />

                                  {/* WhatsApp */}
                                  {sessao.pacienteTelefone && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenWhatsApp(sessao);
                                      }}
                                      title="Abrir WhatsApp para confirmar sessão"
                                      aria-label="Confirmar via WhatsApp"
                                      className="w-6 h-6 flex items-center justify-center hover:bg-emerald-100 text-emerald-600 rounded-md transition-colors cursor-pointer"
                                    >
                                      <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                                    </button>
                                  )}

                                  {/* Editar */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenEditarAgendamento(sessao);
                                    }}
                                    title="Editar agendamento"
                                    aria-label="Editar agendamento"
                                    className="w-6 h-6 flex items-center justify-center hover:bg-forest/10 text-forest/70 hover:text-forest rounded-md transition-colors cursor-pointer"
                                  >
                                    <Edit2 className="w-3.5 h-3.5 shrink-0" />
                                  </button>

                                  {/* Excluir */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setAgendamentoParaExcluir(sessao);
                                    }}
                                    title="Excluir agendamento"
                                    aria-label="Excluir agendamento"
                                    className="w-6 h-6 flex items-center justify-center hover:bg-rose-100 text-rose-600 rounded-md transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : viewMode === "mes" ? (
        /* VISÃO MENSAL COM ROLAGEM HORIZONTAL E VERTICAL */
        <div className="bg-white rounded-2xl border border-soft shadow-xs p-3 sm:p-4">
          <div className="overflow-x-auto overflow-y-hidden min-w-full">
            <div className="min-w-[720px] xl:min-w-0 pb-2">
              <div className="grid grid-cols-7 text-center font-bold text-xs text-forest/60 mb-2 border-b border-soft pb-2">
                <span>Dom</span>
                <span>Seg</span>
                <span>Ter</span>
                <span>Qua</span>
                <span>Qui</span>
                <span>Sex</span>
                <span>Sáb</span>
              </div>

              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {(() => {
                  const ano = currentDate.getFullYear();
                  const mes = currentDate.getMonth();
                  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
                  const totalDiasMes = new Date(ano, mes + 1, 0).getDate();

                  const diasMes = [];
                  // Dias vazios do mês anterior
                  for (let i = 0; i < primeiroDiaSemana; i++) {
                    diasMes.push(<div key={`empty-${i}`} className="min-h-[70px] sm:min-h-[90px] bg-warm/20 rounded-xl" />);
                  }

                  // Dias do mês
                  for (let dia = 1; dia <= totalDiasMes; dia++) {
                    const dataStr = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
                    const sessoesDoDia = agendamentosPorData.get(dataStr) || [];
                    const isHoje =
                      dia === hoje.getDate() &&
                      mes === hoje.getMonth() &&
                      ano === hoje.getFullYear();

                    diasMes.push(
                      <div
                        key={dataStr}
                        onClick={() => handleOpenNovoAgendamento(dataStr)}
                        className={`min-h-[70px] sm:min-h-[90px] p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between hover:border-forest/40 ${
                          isHoje
                            ? "bg-forest/5 border-forest/40 font-bold"
                            : "bg-white border-soft hover:bg-warm/30"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-bold ${
                              isHoje
                                ? "w-5 h-5 leading-5 rounded-full bg-forest text-white text-center"
                                : "text-forest"
                            }`}
                          >
                            {dia}
                          </span>
                          {sessoesDoDia.length > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-forest/10 text-forest">
                              {sessoesDoDia.length}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col gap-0.5 mt-1 overflow-hidden">
                          {sessoesDoDia.slice(0, 2).map((s) => (
                            <div
                              key={s.id}
                              className={`text-[10px] truncate px-1 py-0.5 rounded leading-tight font-medium ${
                                s.status === "realizada"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : s.status === "falta_cobrada"
                                  ? "bg-orange-100 text-orange-900 font-bold"
                                  : s.status === "remarcada"
                                  ? "bg-amber-100 text-amber-800"
                                  : s.status === "cancelada"
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-sky-100 text-sky-800"
                              }`}
                              title={
                                s.status === "falta_cobrada"
                                  ? `${s.horario} - ${s.pacienteNome} (Falta Cobrada)`
                                  : `${s.horario} - ${s.pacienteNome}`
                              }
                            >
                              {s.status === "falta_cobrada" ? "$ " : ""}
                              {s.horario} - {s.pacienteNome.split(" ")[0]}
                            </div>
                          ))}
                          {sessoesDoDia.length > 2 && (
                            <span className="text-[9px] text-forest/60 font-medium pl-1">
                              +{sessoesDoDia.length - 2} mais
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return diasMes;
                })()}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* VISÃO EM LISTA CRONOLÓGICA COM ROLAGEM HORIZONTAL E VERTICAL */
        <div className="bg-white rounded-2xl border border-soft shadow-xs overflow-hidden">
          {/* Banner de filtro ativo de Hoje no modo lista */}
          {filtroApenasHojeLista && (
            <div className="p-3 bg-forest/5 border-b border-soft flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-forest">
                <span className="w-2 h-2 rounded-full bg-forest animate-pulse" />
                <span>
                  Exibindo somente agendamentos de <strong>Hoje ({hoje.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })})</strong>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-forest/10 font-bold text-[10px]">
                  {agendamentosFiltrados.length} {agendamentosFiltrados.length === 1 ? "atendimento" : "atendimentos"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setFiltroApenasHojeLista(false)}
                className="text-xs font-bold text-forest hover:underline cursor-pointer flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                <span>Ver todos os agendamentos</span>
              </button>
            </div>
          )}

          {agendamentosFiltrados.length === 0 ? (
            <div className="p-12 text-center">
              <CalendarIcon className="w-12 h-12 text-forest/20 mx-auto mb-3" />
              <h3 className="text-base font-bold text-forest">Nenhum agendamento encontrado</h3>
              <p className="text-xs sm:text-sm text-forest/60 max-w-md mx-auto mt-1">
                {filtroApenasHojeLista
                  ? `Você não possui atendimentos agendados para hoje${statusFilter !== "todos" ? ` com status "${statusFilter}"` : ""}.`
                  : searchTerm || statusFilter !== "todos" || apenasFixos
                  ? "Tente ajustar os filtros de busca para encontrar suas sessões."
                  : "Você ainda não possui agendamentos cadastrados. Clique em '+ Novo Agendamento' para iniciar!"}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                {filtroApenasHojeLista && (
                  <button
                    type="button"
                    onClick={() => setFiltroApenasHojeLista(false)}
                    className="px-4 py-2 rounded-xl bg-warm border border-soft text-forest font-semibold text-xs inline-flex items-center gap-1.5 shadow-xs cursor-pointer hover:bg-warm/80"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Ver Todos os Agendamentos</span>
                  </button>
                )}
                {statusFilter !== "todos" && (
                  <button
                    type="button"
                    onClick={() => setStatusFilter("todos")}
                    className="px-4 py-2 rounded-xl bg-warm border border-soft text-forest font-semibold text-xs inline-flex items-center gap-1.5 shadow-xs cursor-pointer hover:bg-warm/80"
                  >
                    <span>Limpar Filtro de Status</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleOpenNovoAgendamento()}
                  className="px-4 py-2 rounded-xl bg-forest text-white font-semibold text-xs inline-flex items-center gap-1.5 shadow-xs cursor-pointer hover:bg-forest/90"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agendar Atendimento</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full">
              <div className="w-full divide-y divide-soft">
                {agendamentosFiltrados.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 sm:p-4 hover:bg-warm/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 min-w-0 overflow-hidden"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-forest/10 flex flex-col items-center justify-center text-forest shrink-0">
                        <span className="text-[10px] font-bold uppercase leading-none">
                          {item.data
                            ? new Date(item.data + "T12:00:00").toLocaleDateString("pt-BR", { month: "short" })
                            : "--"}
                        </span>
                        <span className="text-base font-bold leading-none mt-0.5">
                          {item.data && item.data.includes("-")
                            ? item.data.split("-")[2]
                            : item.data || "--"}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-forest">
                            {item.pacienteNome}
                          </span>
                          {getStatusBadge(item.status)}
                          {item.isHorarioFixo && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 flex items-center gap-0.5">
                              <Pin className="w-2.5 h-2.5" /> {getFrequenciaFixaLabel(item)}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-forest/70 mt-1">
                          <span className="flex items-center gap-1 font-medium">
                            <Clock className="w-3.5 h-3.5 text-forest/50" />
                            {item.horario} ({item.duracaoMinutos || 50} min)
                          </span>
                          <span className="flex items-center gap-1">
                            {item.modalidade === "online" ? (
                              <Video className="w-3.5 h-3.5 text-sky-600" />
                            ) : (
                              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                            )}
                            <span className="capitalize">{item.modalidade}</span>
                          </span>
                          {item.valor !== undefined && item.valor !== null && (
                            <span className="flex items-center gap-1 font-medium text-emerald-700">
                              <DollarSign className="w-3.5 h-3.5" />
                              R$ {Number(item.valor || 0).toFixed(2)}
                            </span>
                          )}
                          {item.pacienteTelefone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5 text-forest/40" />
                              {item.pacienteTelefone}
                            </span>
                          )}
                        </div>

                        {item.observacoes && (
                          <p className="text-xs text-forest/60 mt-1.5 italic bg-warm/50 p-1.5 rounded-lg border border-soft inline-block">
                            Obs: {item.observacoes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Botões de Ação na Linha */}
                    <div className="flex flex-wrap items-center gap-2 max-w-full self-start md:self-center">
                      {/* Mudança rápida de status */}
                      <div className="flex flex-wrap items-center gap-1 bg-warm p-1 rounded-xl border border-soft">
                        <button
                          type="button"
                          onClick={() => handleUpdateStatusRapido(item, "agendada")}
                          title="Marcar como Agendada"
                          className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap ${
                            item.status === "agendada"
                              ? "bg-sky-600 text-white shadow-2xs"
                              : "text-sky-700 hover:bg-sky-100"
                          }`}
                        >
                          <Clock className="w-3 h-3 shrink-0" />
                          <span className="hidden sm:inline">Agendada</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleUpdateStatusRapido(item, "realizada")}
                          title="Marcar Realizada (entra no faturamento)"
                          className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap ${
                            item.status === "realizada"
                              ? "bg-emerald-600 text-white shadow-2xs"
                              : "text-emerald-700 hover:bg-emerald-100"
                          }`}
                        >
                          <Check className="w-3 h-3 shrink-0" />
                          <span className="hidden sm:inline">Realizada</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleUpdateStatusRapido(item, "falta_cobrada")}
                          title="Marcar Falta Cobrada (entra no faturamento)"
                          className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap ${
                            item.status === "falta_cobrada"
                              ? "bg-orange-600 text-white shadow-2xs"
                              : "text-orange-800 hover:bg-orange-100"
                          }`}
                        >
                          <UserX className="w-3 h-3 shrink-0" />
                          <DollarSign className="w-2.5 h-2.5 -ml-1 shrink-0" />
                          <span className="hidden sm:inline">Falta Cobrada</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setRemanejamentoModal({
                              isOpen: true,
                              agendamento: item,
                              targetData: item.data,
                              targetHorario: item.horario,
                              escopoSerie: "apenas_este",
                              modoOrigem: "manual",
                            });
                          }}
                          title="Remarcar data e horário"
                          className="px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap text-amber-700 hover:bg-amber-100"
                        >
                          <RotateCcw className="w-3 h-3 shrink-0" />
                          <span className="hidden sm:inline">Remarcar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleUpdateStatusRapido(item, "cancelada")}
                          title="Marcar Cancelada (sem cobrança)"
                          className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap ${
                            item.status === "cancelada"
                              ? "bg-rose-600 text-white shadow-2xs"
                              : "text-rose-700 hover:bg-rose-100"
                          }`}
                        >
                          <X className="w-3 h-3 shrink-0" />
                          <span className="hidden sm:inline">Cancelar</span>
                        </button>
                      </div>

                      {/* Abrir Ficha do Paciente */}
                      {item.pacienteId && onOpenPacienteDetalhes && (
                        <button
                          type="button"
                          onClick={() => onOpenPacienteDetalhes(item.pacienteId)}
                          title="Ver prontuário e ficha completa do paciente"
                          className="px-3 py-1.5 rounded-xl border border-soft bg-white hover:bg-warm text-forest text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-forest/70" />
                          <span>Ficha</span>
                        </button>
                      )}

                      {/* WhatsApp */}
                      {item.pacienteTelefone && (
                        <button
                          type="button"
                          onClick={() => handleOpenWhatsApp(item)}
                          title="Confirmar via WhatsApp"
                          className="p-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Editar */}
                      <button
                        type="button"
                        onClick={() => handleOpenEditarAgendamento(item)}
                        title="Editar agendamento"
                        className="p-2 rounded-xl border border-soft bg-white hover:bg-warm text-forest/70 hover:text-forest transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Excluir */}
                      <button
                        type="button"
                        onClick={() => setAgendamentoParaExcluir(item)}
                        title="Excluir agendamento"
                        className="p-2 rounded-xl border border-soft bg-white hover:bg-rose-50 text-rose-600 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. MODAL: NOVO / EDITAR AGENDAMENTO */}
      {showNovoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-soft overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-warm border-b border-soft flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-forest/10 flex items-center justify-center text-forest">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold font-serif text-forest text-base sm:text-lg">
                    {selectedAgendamentoParaEditar ? "Editar Agendamento" : "Novo Agendamento Clínico"}
                  </h3>
                  <p className="text-xs text-forest/60">
                    A sessão sincroniza automaticamente na ficha e faturamento do paciente.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNovoModal(false)}
                className="w-8 h-8 rounded-full hover:bg-soft/50 flex items-center justify-center text-forest/60 hover:text-forest transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitAgendamento} className="p-6 overflow-y-auto flex flex-col gap-4 text-xs sm:text-sm">
              {/* CAMPO DE PACIENTE COM AUTOCOMPLETE INTELIGENTE */}
              <div className="relative" ref={dropdownRef}>
                <label className="block text-xs font-bold text-forest mb-1">
                  Paciente <span className="text-red-500">*</span>
                </label>

                {formPacienteNome ? (
                  <div className="flex items-center justify-between p-2.5 bg-warm/60 border border-soft rounded-xl">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-forest/70" />
                      <div>
                        <span className="font-bold text-forest block">{formPacienteNome}</span>
                        {formPacienteTelefone && (
                          <span className="text-[11px] text-forest/60 block">{formPacienteTelefone}</span>
                        )}
                      </div>
                    </div>
                    {!selectedAgendamentoParaEditar && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormPacienteId("");
                          setFormPacienteNome("");
                          setFormPacienteTelefone("");
                          setFormPacienteEmail("");
                          setPacienteSearchQuery("");
                        }}
                        className="px-2 py-1 text-xs text-forest/60 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        Trocar
                      </button>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-forest/40" />
                      <input
                        type="text"
                        placeholder="Digite as primeiras letras do paciente..."
                        value={pacienteSearchQuery}
                        onFocus={() => setIsPacienteDropdownOpen(true)}
                        onChange={(e) => {
                          setPacienteSearchQuery(e.target.value);
                          setIsPacienteDropdownOpen(true);
                        }}
                        className="w-full pl-9 pr-3 py-2.5 bg-warm/30 border border-soft rounded-xl text-forest focus:outline-none focus:ring-2 focus:ring-forest/30"
                      />
                    </div>

                    {/* DROPDOWN DE SUGESTÕES & OPÇÃO PRO NOVO PACIENTE */}
                    {isPacienteDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-soft rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto divide-y divide-soft">
                        {sugestoesPacientes.length > 0 ? (
                          sugestoesPacientes.map((p) => {
                            const nome = formatProfessionalName(
                              p.nomeCivil || p.nome || p.nomeDesejado || "Paciente"
                            );
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => handleSelectPaciente(p)}
                                className="w-full p-2.5 text-left hover:bg-warm/60 transition-colors flex items-center justify-between gap-2 cursor-pointer"
                              >
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-forest block text-xs">{nome}</span>
                                    {(p as any).isExterno && (
                                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
                                        Carteira Externa
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-forest/60">
                                    {p.telefone || "Sem telefone"} • {p.status || "Ativo"}
                                  </span>
                                </div>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-forest/10 text-forest font-semibold">
                                  {p.viaAcesso || ((p as any).isExterno ? "Particular" : "AcolheMente")}
                                </span>
                              </button>
                            );
                          })
                        ) : (
                          <div className="p-3 text-center text-xs text-forest/60">
                            Nenhum paciente cadastrado encontrado com este nome.
                          </div>
                        )}

                        {/* OPÇÃO DE NOVO PACIENTE EXTERNO - LIBERADO NO PLANO AVANÇADO */}
                        <div className="p-2 bg-gradient-to-r from-emerald-50 to-amber-50/50">
                          <button
                            type="button"
                            onClick={() => {
                              setIsPacienteDropdownOpen(false);
                              if (isPlanoAvancado) {
                                setShowNovoPacienteExternoModal(true);
                              } else {
                                setShowPlanoAvancadoModal(true);
                              }
                            }}
                            className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 cursor-pointer shadow-2xs group ${
                              isPlanoAvancado
                                ? "border-emerald-300 bg-white hover:bg-emerald-50/80 ring-1 ring-emerald-400/20"
                                : "border-emerald-200/80 bg-white/80 hover:bg-white"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                                  isPlanoAvancado
                                    ? "bg-emerald-600 text-white"
                                    : "bg-emerald-100 text-emerald-800"
                                }`}
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <span className="font-bold text-forest block text-xs group-hover:text-emerald-800">
                                  Cadastrar Novo Paciente (Carteira Externa)
                                </span>
                                <span className="text-[10px] text-forest/60">
                                  {isPlanoAvancado
                                    ? "Cadastre um paciente particular para agendar imediatamente"
                                    : "Importe pacientes particulares fora da plataforma"}
                                </span>
                              </div>
                            </div>
                            {isPlanoAvancado ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shrink-0 shadow-2xs">
                                <Check className="w-2.5 h-2.5 text-emerald-600" />
                                Liberado
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1 shrink-0">
                                <Lock className="w-2.5 h-2.5 text-amber-600" />
                                PRO
                              </span>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* DATA E HORÁRIO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-forest mb-1">
                    Data da Sessão <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData}
                    onChange={(e) => setFormData(e.target.value)}
                    className="w-full px-3 py-2 bg-warm/30 border border-soft rounded-xl text-forest focus:outline-none focus:ring-2 focus:ring-forest/30 text-xs sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-forest mb-1">
                    Horário de Início <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={formHorario}
                    onChange={(e) => setFormHorario(e.target.value)}
                    className="w-full px-3 py-2 bg-warm/30 border border-soft rounded-xl text-forest focus:outline-none focus:ring-2 focus:ring-forest/30 text-xs sm:text-sm"
                  />
                </div>
              </div>

              {/* DURAÇÃO E MODALIDADE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-forest mb-1">Duração</label>
                  <select
                    value={formDuracao}
                    onChange={(e) => setFormDuracao(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-warm/30 border border-soft rounded-xl text-forest focus:outline-none text-xs sm:text-sm"
                  >
                    <option value={30}>30 minutos</option>
                    <option value={50}>50 minutos (Padrão)</option>
                    <option value={60}>60 minutos (1 hora)</option>
                    <option value={90}>90 minutos (1h30)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-forest mb-1">Modalidade</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormModalidade("online")}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        formModalidade === "online"
                          ? "bg-forest text-white border-forest shadow-xs"
                          : "bg-warm/40 text-forest/70 border-soft hover:text-forest"
                      }`}
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Online</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormModalidade("presencial")}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        formModalidade === "presencial"
                          ? "bg-forest text-white border-forest shadow-xs"
                          : "bg-warm/40 text-forest/70 border-soft hover:text-forest"
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Presencial</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* AVISOS DE CONFLITO DE HORÁRIO EM TEMPO REAL */}
              {conflitoHorarioAtual && (
                <div className="p-3.5 bg-rose-50 border-2 border-rose-300 rounded-2xl flex items-start gap-3 text-xs text-rose-900 animate-in fade-in">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700 shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <span className="font-bold text-rose-900 text-sm block">
                      Horário Indisponível • Conflito de Agenda
                    </span>
                    <p className="mt-0.5 text-rose-800 leading-relaxed">
                      Não é possível agendar dois pacientes no mesmo horário. O paciente{" "}
                      <strong>{conflitoHorarioAtual.pacienteNome}</strong> já possui atendimento marcado para{" "}
                      <strong>{formData.split("-").reverse().join("/")}</strong> às{" "}
                      <strong>{conflitoHorarioAtual.horario}</strong> ({conflitoHorarioAtual.duracaoMinutos || 50} min).
                    </p>
                    <span className="text-[11px] font-bold text-rose-700 block mt-1.5">
                      💡 Escolha outro horário vago ou ajuste o início para prosseguir.
                    </span>
                  </div>
                </div>
              )}

              {conflitosHorarioRecorrente.length > 0 && (
                <div className="p-3.5 bg-amber-50 border-2 border-amber-300 rounded-2xl flex items-start gap-3 text-xs text-amber-900 animate-in fade-in">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <span className="font-bold text-amber-900 text-sm block">
                      Conflito nas Datas Futuras do Horário Fixo
                    </span>
                    <p className="mt-0.5 text-amber-800 leading-relaxed">
                      Este horário coincide com atendimentos já marcados nas datas seguintes da recorrência:
                    </p>
                    <ul className="mt-1 space-y-0.5 font-semibold text-amber-900 text-[11px]">
                      {conflitosHorarioRecorrente.map((c) => (
                        <li key={c.data}>
                          • {c.data.split("-").reverse().join("/")} às {c.horario}: {c.pacienteNome}
                        </li>
                      ))}
                    </ul>
                    <span className="text-[11px] font-bold text-amber-700 block mt-1.5">
                      Escolha outro horário livre para todas as ocorrências ou selecione "Não fixar".
                    </span>
                  </div>
                </div>
              )}

              {/* LINK DA VIDEOCHAMADA OU LOCAL */}
              {formModalidade === "online" ? (
                <div>
                  <label className="block text-xs font-bold text-forest mb-1">
                    Link da Sala Virtual (Google Meet, Zoom, etc.)
                  </label>
                  <input
                    type="url"
                    placeholder="https://meet.google.com/..."
                    value={formLinkAtendimento}
                    onChange={(e) => setFormLinkAtendimento(e.target.value)}
                    className="w-full px-3 py-2 bg-warm/30 border border-soft rounded-xl text-forest focus:outline-none text-xs"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-forest mb-1">
                    Endereço / Sala de Atendimento
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Consultório 3 - Sala A"
                    value={formLocalEndereco}
                    onChange={(e) => setFormLocalEndereco(e.target.value)}
                    className="w-full px-3 py-2 bg-warm/30 border border-soft rounded-xl text-forest focus:outline-none text-xs"
                  />
                </div>
              )}

              {/* VALOR E STATUS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-forest mb-1">
                    Valor da Sessão (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-forest/40 text-xs font-bold">
                      R$
                    </span>
                    <input
                      type="text"
                      value={formValor}
                      onChange={(e) => setFormValor(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-warm/30 border border-soft rounded-xl text-forest focus:outline-none text-xs sm:text-sm font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-forest mb-1">Status da Sessão</label>
                  <select
                    value={vaiGerarSerieFixa ? "agendada" : formStatus}
                    disabled={vaiGerarSerieFixa}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className={`w-full px-3 py-2 border rounded-xl text-xs sm:text-sm font-medium focus:outline-none ${
                      vaiGerarSerieFixa
                        ? "bg-sky-50/70 border-sky-200 text-sky-900 font-semibold cursor-not-allowed"
                        : "bg-warm/30 border-soft text-forest"
                    }`}
                  >
                    <option value="agendada">Agendada</option>
                    {!vaiGerarSerieFixa && (
                      <>
                        <option value="realizada">Realizada (Cobrada)</option>
                        <option value="falta_cobrada">Falta Cobrada (Cobrar sessão)</option>
                        <option value="remarcada">Remarcada (Sem cobrança)</option>
                        <option value="cancelada">Cancelada (Sem cobrança)</option>
                      </>
                    )}
                  </select>
                  {vaiGerarSerieFixa && (
                    <span className="block text-[11px] text-sky-800 mt-1 leading-snug">
                      Ao fixar na agenda, todas as sessões são criadas como <strong>Agendada</strong>.
                    </span>
                  )}
                </div>
              </div>

              {/* RECURSO DE FIXAR HORÁRIO */}
              <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-2xl flex flex-col gap-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor="select-frequencia-fixa"
                    className="font-bold text-purple-900 text-xs sm:text-sm flex items-center gap-1.5"
                  >
                    <Pin className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                    <span>Fixar na agenda:</span>
                  </label>
                  <select
                    id="select-frequencia-fixa"
                    value={formFrequenciaFixa}
                    onChange={(e) => {
                      const novaFreq = e.target.value as FrequenciaFixaAgenda;
                      setFormFrequenciaFixa(novaFreq);
                      if (novaFreq !== "nenhuma") {
                        setFormStatus("agendada");
                      }
                    }}
                    className="px-3 py-1.5 bg-white border border-purple-300 rounded-lg text-purple-900 text-xs font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="nenhuma">Não fixar</option>
                    <option value="semanal">Semanal</option>
                    <option value="quinzenal">Quinzenal</option>
                    <option value="mensal">Mensal</option>
                  </select>
                </div>

                {vaiGerarSerieFixa && (
                  <div className="pt-2.5 border-t border-purple-200 flex flex-col gap-2 text-xs text-purple-900">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label htmlFor="select-meses-fixar" className="font-medium">
                        Fixar pelos próximos:
                      </label>
                      <select
                        id="select-meses-fixar"
                        value={formMesesFixar}
                        onChange={(e) =>
                          setFormMesesFixar(Number(e.target.value) as MesesFixacaoAgenda)
                        }
                        className="px-3 py-1.5 bg-white border border-purple-300 rounded-lg text-purple-900 font-bold focus:outline-none cursor-pointer"
                      >
                        <option value={1}>1 mês</option>
                        <option value={2}>2 meses</option>
                        <option value={3}>3 meses</option>
                      </select>
                    </div>

                    {datasSerieFixa.length > 0 && (
                      <div className="text-[11px] text-purple-800/90 bg-white/80 border border-purple-200/80 rounded-xl px-3 py-2 leading-relaxed">
                        <span className="font-semibold">
                          {formFrequenciaFixa === "semanal" &&
                            "1x por semana no mesmo dia da semana e horário"}
                          {formFrequenciaFixa === "quinzenal" &&
                            "A cada 2 semanas no mesmo dia da semana e horário"}
                          {formFrequenciaFixa === "mensal" &&
                            "1x por mês no mesmo dia da semana e horário"}
                        </span>
                        <span aria-hidden="true"> · </span>
                        <span>
                          {datasSerieFixa.length} sessões (
                          {datasSerieFixa
                            .map((d) => {
                              const [, m, dia] = d.split("-");
                              return `${dia}/${m}`;
                            })
                            .join(", ")}
                          )
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* OBSERVAÇÕES CLÍNICAS */}
              <div>
                <label className="block text-xs font-bold text-forest mb-1">
                  Observações / Pauta da Sessão
                </label>
                <textarea
                  rows={2}
                  placeholder="Anotações prévias ou lembretes para este atendimento..."
                  value={formObservacoes}
                  onChange={(e) => setFormObservacoes(e.target.value)}
                  className="w-full px-3 py-2 bg-warm/30 border border-soft rounded-xl text-forest focus:outline-none text-xs"
                />
              </div>

              {formErroValidacao && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800 font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formErroValidacao}</span>
                </div>
              )}

              {/* MODAL FOOTER */}
              <div className="pt-3 border-t border-soft flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNovoModal(false)}
                  className="px-4 py-2 rounded-xl border border-soft text-forest/70 hover:text-forest text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || Boolean(conflitoHorarioAtual || conflitosHorarioRecorrente.length > 0)}
                  className="px-5 py-2 rounded-xl bg-forest hover:bg-forest/90 text-white text-xs font-semibold transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : conflitoHorarioAtual || conflitosHorarioRecorrente.length > 0 ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {conflitoHorarioAtual || conflitosHorarioRecorrente.length > 0
                      ? "Horário Indisponível (Conflito)"
                      : selectedAgendamentoParaEditar
                      ? "Salvar Alterações"
                      : "Confirmar Agendamento"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6.5. MODAL DE CADASTRO RÁPIDO DE PACIENTE EXTERNO (PLANO AVANÇADO) */}
      {showNovoPacienteExternoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-emerald-200 overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-gradient-to-r from-forest to-emerald-900 text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-emerald-300">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold font-serif text-white">
                      Novo Paciente Particular
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 font-bold border border-emerald-300/30">
                      Carteira Externa
                    </span>
                  </div>
                  <p className="text-xs text-emerald-100/70">
                    O paciente será salvo na sua carteira e vinculado automaticamente a este agendamento.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNovoPacienteExternoModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCadastrarNovoPacienteExterno} className="p-6 overflow-y-auto flex flex-col gap-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-forest mb-1">
                  Nome Completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João da Silva Santos"
                  value={novoPacienteNome}
                  onChange={(e) => setNovoPacienteNome(e.target.value)}
                  className="w-full px-3 py-2 bg-warm/30 border border-soft rounded-xl text-forest focus:outline-none focus:ring-2 focus:ring-forest/30"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-forest mb-1">
                    WhatsApp / Telefone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="(11) 99999-9999"
                    value={novoPacienteTelefone}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
                      if (digits.length <= 2) setNovoPacienteTelefone(digits);
                      else if (digits.length <= 7) setNovoPacienteTelefone(`(${digits.slice(0, 2)}) ${digits.slice(2)}`);
                      else setNovoPacienteTelefone(`(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`);
                    }}
                    className="w-full px-3 py-2 bg-warm/30 border border-soft rounded-xl text-forest focus:outline-none focus:ring-2 focus:ring-forest/30 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-forest mb-1">
                    E-mail (opcional)
                  </label>
                  <input
                    type="email"
                    placeholder="paciente@email.com"
                    value={novoPacienteEmail}
                    onChange={(e) => setNovoPacienteEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-warm/30 border border-soft rounded-xl text-forest focus:outline-none focus:ring-2 focus:ring-forest/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-forest mb-1">
                    CPF (opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    value={novoPacienteCpf}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
                      if (digits.length <= 3) setNovoPacienteCpf(digits);
                      else if (digits.length <= 6) setNovoPacienteCpf(`${digits.slice(0, 3)}.${digits.slice(3)}`);
                      else if (digits.length <= 9) setNovoPacienteCpf(`${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`);
                      else setNovoPacienteCpf(`${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`);
                    }}
                    className="w-full px-3 py-2 bg-warm/30 border border-soft rounded-xl text-forest focus:outline-none focus:ring-2 focus:ring-forest/30 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-forest mb-1">
                    Data Nasc. (opcional)
                  </label>
                  <input
                    type="date"
                    value={novoPacienteDataNasc}
                    onChange={(e) => setNovoPacienteDataNasc(e.target.value)}
                    className="w-full px-3 py-2 bg-warm/30 border border-soft rounded-xl text-forest focus:outline-none focus:ring-2 focus:ring-forest/30 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-forest mb-1">
                    Valor Sessão (R$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={novoPacienteValor}
                    onChange={(e) => setNovoPacienteValor(e.target.value)}
                    className="w-full px-3 py-2 bg-warm/30 border border-soft rounded-xl text-forest focus:outline-none focus:ring-2 focus:ring-forest/30 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-forest mb-1">
                  Queixa Inicial / Observações Clínicas (opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Demanda trazida, contexto do acompanhamento..."
                  value={novoPacienteObs}
                  onChange={(e) => setNovoPacienteObs(e.target.value)}
                  className="w-full px-3 py-2 bg-warm/30 border border-soft rounded-xl text-forest focus:outline-none focus:ring-2 focus:ring-forest/30 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-soft mt-2">
                <button
                  type="button"
                  onClick={() => setShowNovoPacienteExternoModal(false)}
                  className="px-4 py-2 rounded-xl border border-soft text-forest/70 hover:text-forest hover:bg-warm text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSalvandoPacienteExterno}
                  className="px-5 py-2 rounded-xl bg-forest hover:bg-forest/90 text-white text-xs font-semibold transition-all shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {isSalvandoPacienteExterno ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Salvar e Selecionar no Agendamento</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL DE UPSELL / APRESENTAÇÃO DO PLANO AVANÇADO (CARTEIRA EXTERNA) */}
      {showPlanoAvancadoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-emerald-200 overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header com Gradiente Premium */}
            <div className="bg-gradient-to-br from-forest via-emerald-800 to-teal-900 text-white p-6 relative">
              <button
                type="button"
                onClick={() => setShowPlanoAvancadoModal(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-200 text-xs font-bold mb-3">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Recurso do Plano Integrar</span>
              </div>

              <h3 className="text-xl font-bold font-serif text-white leading-tight">
                Carteira Particular de Pacientes Externos
              </h3>
              <p className="text-xs text-emerald-100/80 mt-1">
                Centralize 100% da sua clínica particular e convênios em um único lugar.
              </p>
            </div>

            {/* Conteúdo Explicativo */}
            <div className="p-6 flex flex-col gap-4 text-xs sm:text-sm text-forest/80">
              <p className="leading-relaxed">
                Com o <strong>Plano Integrar</strong>, você cadastra e acompanha seus pacientes particulares externos diretamente na agenda clínica da plataforma:
              </p>

              <div className="bg-emerald-50/70 border border-emerald-100 p-4 rounded-2xl flex flex-col gap-2.5">
                <span className="font-bold text-forest text-xs uppercase tracking-wider">
                  O que está incluído no Plano Integrar:
                </span>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Carteira Externa & B2B Próprio:</strong> Gestão de pacientes particulares externos e empresas clientes próprias.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Página White-Label Independente:</strong> Cartão virtual com sua marca, mapa presencial e QR Code.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Faturamento PF/PJ Expandido:</strong> Recibos e controle consolidado da rede + consultório próprio.</span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Disponível mediante liberação da Gestão Master e contratação em <strong>Status / Plano</strong>.
                </span>
              </div>

              {/* Botões */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPlanoAvancadoModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-soft text-forest/70 hover:text-forest font-semibold text-xs transition-all cursor-pointer"
                >
                  Fechar
                </button>
                {onGoToPlanos && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowPlanoAvancadoModal(false);
                      onGoToPlanos();
                    }}
                    className="px-5 py-2.5 rounded-xl bg-forest hover:bg-forest/90 text-white font-semibold text-xs transition-all shadow-xs cursor-pointer"
                  >
                    Ver em Status / Plano
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {agendamentoParaExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-soft p-5 sm:p-6 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-forest text-sm sm:text-base">Excluir Agendamento</h4>
                <p className="text-xs text-forest/70 mt-0.5">
                  Paciente: <strong>{agendamentoParaExcluir.pacienteNome}</strong> ({agendamentoParaExcluir.data.split("-").reverse().join("/")} às {agendamentoParaExcluir.horario})
                </p>
              </div>
            </div>

            <p className="text-xs text-forest/80 bg-warm/50 p-3 rounded-xl border border-soft">
              Como deseja proceder com a exclusão deste agendamento?
            </p>

            <div className="flex flex-col gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => handleConfirmarExclusao("apenas_este")}
                className="w-full px-4 py-2.5 rounded-xl bg-white hover:bg-warm border border-soft text-forest text-xs font-bold transition-all cursor-pointer flex items-center justify-between shadow-2xs"
              >
                <span>Excluir apenas este agendamento</span>
                <span className="text-[10px] text-forest/50 font-normal">Apenas esta data</span>
              </button>
              <button
                type="button"
                onClick={() => handleConfirmarExclusao("todos_dali_pra_frente")}
                className="w-full px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 text-xs font-bold transition-all cursor-pointer flex items-center justify-between shadow-2xs"
              >
                <span>Excluir este e todos dali pra frente</span>
                <span className="text-[10px] text-rose-700 font-bold">Série futura</span>
              </button>
            </div>

            <div className="mt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setAgendamentoParaExcluir(null)}
                className="px-4 py-2 rounded-xl border border-soft text-forest/70 hover:text-forest text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. MINI MODAL: REMANEJAMENTO RÁPIDO VIA ARRASTAR E SOLTAR */}
      {remanejamentoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-soft p-5 sm:p-6 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between border-b border-soft pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-forest/10 flex items-center justify-center text-forest shrink-0">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-forest text-sm sm:text-base">Remanejar Atendimento</h4>
                  <p className="text-[11px] text-forest/70">
                    Defina o horário para confirmar o remanejamento.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRemanejamentoModal(null)}
                className="w-7 h-7 rounded-lg hover:bg-soft/60 flex items-center justify-center text-forest/60 hover:text-forest transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Resumo do Atendimento */}
            <div className="p-3 bg-warm/50 border border-soft rounded-xl space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-forest/70 font-medium">Paciente:</span>
                <span className="font-bold text-forest">{remanejamentoModal.agendamento.pacienteNome}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-forest/70 font-medium">De:</span>
                <span className="font-mono text-forest/80">
                  {remanejamentoModal.agendamento.data.split("-").reverse().join("/")} às{" "}
                  {remanejamentoModal.agendamento.horario}
                </span>
              </div>
            </div>

            {/* Campos de Nova Data e Horário */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="input-nova-data-remanejamento" className="block text-xs font-bold text-forest mb-1">
                  Nova Data <span className="text-red-500">*</span>
                </label>
                <input
                  id="input-nova-data-remanejamento"
                  type="date"
                  required
                  value={remanejamentoModal.targetData}
                  onChange={(e) =>
                    setRemanejamentoModal((prev) =>
                      prev ? { ...prev, targetData: e.target.value } : prev
                    )
                  }
                  className="w-full px-3 py-2 bg-warm/30 border border-soft rounded-xl text-forest font-bold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-forest/30"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="input-novo-horario-remanejamento" className="block text-xs font-bold text-forest">
                    Novo Horário <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const h = (remanejamentoModal.targetHorario || "14:00").split(":")[0] || "14";
                        setRemanejamentoModal((prev) => (prev ? { ...prev, targetHorario: `${h}:00` } : prev));
                      }}
                      className={`px-1.5 py-0.5 rounded font-mono text-[10px] border cursor-pointer ${
                        remanejamentoModal.targetHorario?.endsWith(":00")
                          ? "bg-forest text-white border-forest font-bold"
                          : "bg-white text-forest/70 border-soft"
                      }`}
                    >
                      :00
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const h = (remanejamentoModal.targetHorario || "14:00").split(":")[0] || "14";
                        setRemanejamentoModal((prev) => (prev ? { ...prev, targetHorario: `${h}:30` } : prev));
                      }}
                      className={`px-1.5 py-0.5 rounded font-mono text-[10px] border cursor-pointer ${
                        remanejamentoModal.targetHorario?.endsWith(":30")
                          ? "bg-forest text-white border-forest font-bold"
                          : "bg-white text-forest/70 border-soft"
                      }`}
                    >
                      :30
                    </button>
                  </div>
                </div>
                <input
                  id="input-novo-horario-remanejamento"
                  type="time"
                  step="1800"
                  required
                  value={remanejamentoModal.targetHorario}
                  onChange={(e) =>
                    setRemanejamentoModal((prev) =>
                      prev ? { ...prev, targetHorario: e.target.value } : prev
                    )
                  }
                  className="w-full px-3 py-2 bg-warm/30 border border-soft rounded-xl text-forest font-bold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-forest/30"
                />
              </div>
            </div>

            {/* Escopo de Série se for Horário Fixo */}
            {remanejamentoModal.agendamento.isHorarioFixo && (
              <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2 text-xs">
                <span className="font-bold text-purple-900 block">
                  Este atendimento é um {getFrequenciaFixaLabel(remanejamentoModal.agendamento)}:
                </span>
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-purple-950">
                    <input
                      type="radio"
                      name="escopoRemanejamento"
                      checked={remanejamentoModal.escopoSerie === "apenas_este"}
                      onChange={() =>
                        setRemanejamentoModal((prev) =>
                          prev ? { ...prev, escopoSerie: "apenas_este" } : prev
                        )
                      }
                      className="text-forest focus:ring-forest"
                    />
                    <span>Mover apenas esta sessão</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-purple-950">
                    <input
                      type="radio"
                      name="escopoRemanejamento"
                      checked={remanejamentoModal.escopoSerie === "serie_toda"}
                      onChange={() =>
                        setRemanejamentoModal((prev) =>
                          prev ? { ...prev, escopoSerie: "serie_toda" } : prev
                        )
                      }
                      className="text-forest focus:ring-forest"
                    />
                    <span>Mover esta e todas as próximas da série</span>
                  </label>
                </div>
              </div>
            )}

            {/* Aviso de conflito se horário bater com outro paciente */}
            {conflitoRemanejamento && (
              <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl flex items-start gap-2.5 text-xs text-rose-900 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Horário Indisponível</span>
                  <span>
                    Já existe atendimento para <strong>{conflitoRemanejamento.pacienteNome}</strong> às{" "}
                    <strong>{conflitoRemanejamento.horario}</strong> nesta data. Escolha outro horário para confirmar.
                  </span>
                </div>
              </div>
            )}

            {/* Botões do Rodapé */}
            <div className="pt-2 border-t border-soft flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRemanejamentoModal(null)}
                className="px-4 py-2 rounded-xl border border-soft text-forest/70 hover:text-forest text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSubmitting || Boolean(conflitoRemanejamento)}
                onClick={async () => {
                  const ok = await handleExecutarRemanejamento(
                    remanejamentoModal.agendamento,
                    remanejamentoModal.targetData,
                    remanejamentoModal.targetHorario,
                    remanejamentoModal.escopoSerie
                  );
                  if (ok) {
                    setRemanejamentoModal(null);
                  }
                }}
                className="px-5 py-2 rounded-xl bg-forest hover:bg-forest/90 text-white text-xs font-semibold transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Confirmar Horário e Mover</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. TOAST FLUTUANTE DE FEEDBACK */}
      {toastMensagem && (
        <div className="fixed bottom-6 right-6 z-50 bg-forest text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 border border-emerald-400/30 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMensagem}</span>
        </div>
      )}
      </div>
    </div>
  );
}
