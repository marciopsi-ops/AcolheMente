import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  DollarSign,
  Plus,
  Copy,
  Trash2,
  FileText,
  FileSpreadsheet,
  FileSignature,
  Printer,
  Send,
  Edit3,
  Check,
  X,
  Phone,
  Mail,
  MapPin,
  User,
  Banknote,
  Settings,
  ClipboardList,
  AlertCircle,
  Layers,
  MessageCircle,
} from "lucide-react";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { PainelReajusteAnualContrato } from "./PainelReajusteAnualContrato";
import {
  EmpresaClienteB2B,
  ServicoB2BFaturamentoItem,
  RegistroBordoEmpresaB2B,
  StatusEmpresaB2B,
  STATUS_EMPRESA_B2B_LABELS,
  TIPOS_SERVICO_B2B_SUGESTOES,
} from "../types/empresaB2B";
import {
  PerfilFaturamentoItem,
  normalizePerfisFaturamento,
  resolvePerfilFaturamentoAtivo,
  formatPerfilCurtoLabel,
  formatPerfilSelectOption,
  getPerfilDocumentoCurto,
  getPerfilChavePixEfetiva,
  extractLegacySyncFields,
} from "../types/faturamento";
import { PerfisFaturamentoManagerModal } from "./PerfisFaturamentoManagerModal";
import { formatCnpj, isValidCnpj, getCnpjValidationError } from "../utils/formatters";

interface FichaEmpresaProfissionalModalProps {
  empresa: EmpresaClienteB2B;
  onClose: () => void;
  onUpdateEmpresa: (updated: EmpresaClienteB2B) => void;
  profile: any;
  user: any;
  onUpdateProfileLocal?: (patch: Record<string, any>) => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export const FichaEmpresaProfissionalModal: React.FC<FichaEmpresaProfissionalModalProps> = ({
  empresa,
  onClose,
  onUpdateEmpresa,
  profile,
  user,
  onUpdateProfileLocal,
  showToast,
}) => {
  const [currentEmpresa, setCurrentEmpresa] = useState<EmpresaClienteB2B>(empresa);
  const latestRef = useRef<EmpresaClienteB2B>(empresa);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Sincroniza quando o documento muda no Firestore
  useEffect(() => {
    setCurrentEmpresa(empresa);
    latestRef.current = empresa;
  }, [empresa]);

  // Perfis de Faturamento do Profissional
  const perfisFaturamento = useMemo(
    () => normalizePerfisFaturamento(profile),
    [profile]
  );

  // Perfil padrão fixado para esta empresa (geralmente PJ, mas permite PF)
  const perfilEmpresaAtivo = useMemo(
    () =>
      resolvePerfilFaturamentoAtivo(
        perfisFaturamento,
        currentEmpresa.perfilFaturamentoId,
        currentEmpresa.perfilFaturamento || "PJ"
      ),
    [perfisFaturamento, currentEmpresa.perfilFaturamentoId, currentEmpresa.perfilFaturamento]
  );

  const [showGerenciarPerfisModal, setShowGerenciarPerfisModal] = useState(false);

  // Filtro de competência na planilha de serviços B2B
  const currentMonthStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const [filtroPeriodo, setFiltroPeriodo] = useState<string>("todas");
  const [ presetServicoNovo, setPresetServicoNovo ] = useState<string>(
    TIPOS_SERVICO_B2B_SUGESTOES[0]
  );

  // Modais secundários da planilha e ficha
  const [servicoParaExcluir, setServicoParaExcluir] =
    useState<ServicoB2BFaturamentoItem | null>(null);
  const [modalNfB2B, setModalNfB2B] = useState<boolean>(false);
  const [modalDemonstrativo, setModalDemonstrativo] = useState<{
    isOpen: boolean;
    servico?: ServicoB2BFaturamentoItem;
    isConsolidado?: boolean;
  }>({ isOpen: false });
  const [modalContratoPreview, setModalContratoPreview] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Diário de Bordo / Entregáveis
  const [novoRegistroForm, setNovoRegistroForm] = useState<{
    isOpen: boolean;
    tipo: RegistroBordoEmpresaB2B["tipo"];
    data: string;
    titulo: string;
    conteudo: string;
    servicoVinculadoId: string;
  }>({
    isOpen: false,
    tipo: "reuniao_rh",
    data: new Date().toISOString().split("T")[0],
    titulo: "",
    conteudo: "",
    servicoVinculadoId: "",
  });

  const profNome =
    profile?.name || profile?.nome || currentEmpresa.profissionalNome || "Profissional";
  const profCrp = profile?.crp || "";
  const profProfissao = profile?.profissao || "Psicólogo(a) / Terapeuta";

  const servicos: ServicoB2BFaturamentoItem[] = useMemo(
    () =>
      Array.isArray(currentEmpresa.historicoServicos)
        ? currentEmpresa.historicoServicos
        : [],
    [currentEmpresa.historicoServicos]
  );

  const registrosBordo: RegistroBordoEmpresaB2B[] = useMemo(
    () =>
      Array.isArray(currentEmpresa.registrosBordo)
        ? currentEmpresa.registrosBordo
        : [],
    [currentEmpresa.registrosBordo]
  );

  const mesesDisponiveis = useMemo(() => {
    const setMeses = new Set<string>();
    setMeses.add(currentMonthStr);
    servicos.forEach((s) => {
      if (s.data && s.data.length >= 7) {
        setMeses.add(s.data.substring(0, 7));
      }
    });
    return Array.from(setMeses).sort().reverse();
  }, [servicos, currentMonthStr]);

  const servicosFiltrados = useMemo(() => {
    return servicos
      .filter((s) => {
        if (filtroPeriodo === "todas") return true;
        return s.data && s.data.startsWith(filtroPeriodo);
      })
      .sort((a, b) => (a.data > b.data ? 1 : -1));
  }, [servicos, filtroPeriodo]);

  const metricas = useMemo(() => {
    let entregues = 0;
    let agendados = 0;
    let totalPago = 0;
    let totalPendente = 0;
    let totalGeral = 0;
    let nfsPendentes = 0;

    servicosFiltrados.forEach((s) => {
      if (s.statusExecucao === "cancelado") return;
      const v = Number(s.valor) || 0;
      totalGeral += v;
      if (s.statusExecucao === "realizado") entregues++;
      else agendados++;

      if (s.statusPagamento === "pago") totalPago += v;
      else totalPendente += v;

      if (s.statusNotaFiscal === "pendente") nfsPendentes++;
    });

    return {
      entregues,
      agendados,
      totalPago,
      totalPendente,
      totalGeral,
      nfsPendentes,
      qtdAtivos: servicosFiltrados.filter((s) => s.statusExecucao !== "cancelado").length,
    };
  }, [servicosFiltrados]);

  const fmtMoeda = (val: number) =>
    `R$ ${Number(val || 0).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const fmtDataBr = (strDate?: string) => {
    if (!strDate) return "-";
    const parts = strDate.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return strDate;
  };

  const fmtMesExtenso = (strAnoMes: string) => {
    if (!strAnoMes || strAnoMes === "todas") return "Período Geral";
    const [ano, mes] = strAnoMes.split("-");
    const meses = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
    ];
    const idx = parseInt(mes, 10) - 1;
    return `${meses[idx] || mes} de ${ano}`;
  };

  // Persistência segura no Firestore
  const handlePatchFields = async (
    patch: Partial<EmpresaClienteB2B>,
    silent = false
  ) => {
    const nextObj: EmpresaClienteB2B = {
      ...latestRef.current,
      ...patch,
    };
    latestRef.current = nextObj;
    setCurrentEmpresa(nextObj);
    onUpdateEmpresa(nextObj);

    const stripUndefinedDeep = (val: any): any => {
      if (Array.isArray(val)) return val.map(stripUndefinedDeep);
      if (val && typeof val === "object" && val.constructor === Object) {
        return Object.fromEntries(
          Object.entries(val)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, stripUndefinedDeep(v)])
        );
      }
      return val;
    };

    try {
      setSaving(true);
      const cleanPatch = stripUndefinedDeep(patch);
      await updateDoc(doc(db, "empresas_profissional", currentEmpresa.id), {
        ...cleanPatch,
        updatedAt: serverTimestamp(),
      });
      if (!silent) {
        showToast("Ficha da empresa salva com sucesso!", "success");
      }
    } catch (err) {
      console.error("Erro ao atualizar empresa B2B:", err);
      try {
        handleFirestoreError(
          err,
          OperationType.UPDATE,
          `empresas_profissional/${currentEmpresa.id}`
        );
      } catch {}
      showToast("Erro ao salvar dados da empresa.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Sincronização opcional de serviços B2B com a Agenda quando houver data + horário preenchidos
  const syncServicosToAgendamentos = async (listaServicos: ServicoB2BFaturamentoItem[]) => {
    const profId = profile?.uid || user?.uid || currentEmpresa.profissionalId;
    if (!profId || !currentEmpresa.id) return;

    try {
      const qAg = query(
        collection(db, "agendamentos"),
        where("profissionalId", "==", profId),
        where("pacienteId", "==", currentEmpresa.id)
      );
      const snap = await getDocs(qAg);
      const existentesPorServicoId = new Map<string, { docId: string; data: any }>();

      snap.forEach((d) => {
        const dt = d.data();
        const key = dt.servicoB2BId || dt.sessaoFaturamentoId || "";
        if (key) {
          existentesPorServicoId.set(key, { docId: d.id, data: dt });
        }
      });

      const idsComHorarioAtivos = new Set<string>();
      const nomeAgenda = `[B2B] ${currentEmpresa.nomeFantasia || currentEmpresa.razaoSocial}`;

      for (const item of listaServicos) {
        const temHorarioValido = Boolean(item.data && item.horario && item.horario.trim());
        if (!temHorarioValido) continue;

        idsComHorarioAtivos.add(item.id);
        const statusAgenda: "agendada" | "realizada" | "cancelada" =
          item.statusExecucao === "realizado"
            ? "realizada"
            : item.statusExecucao === "cancelado"
            ? "cancelada"
            : "agendada";

        const existente = existentesPorServicoId.get(item.id);
        const payload = {
          profissionalId: profId,
          pacienteId: currentEmpresa.id,
          pacienteNome: `${nomeAgenda} · ${item.descricaoServico || "Serviço"}`,
          pacienteTelefone: currentEmpresa.contatoTelefone || "",
          pacienteEmail: currentEmpresa.contatoEmail || "",
          data: item.data,
          horario: item.horario!.trim(),
          duracaoMinutos: Number(item.duracaoMinutos) || 60,
          modalidade: item.modalidade || "online",
          status: statusAgenda,
          valor: Number(item.valor) || 0,
          observacoes: item.observacoes || `Serviço B2B: ${item.descricaoServico}`,
          origemTipo: "empresa_b2b",
          servicoB2BId: item.id,
          updatedAt: serverTimestamp(),
        };

        if (existente) {
          await updateDoc(doc(db, "agendamentos", existente.docId), payload);
        } else {
          await addDoc(collection(db, "agendamentos"), {
            ...payload,
            createdAt: serverTimestamp(),
          });
        }
      }

      // Remove agendamentos órfãos (quando horário foi apagado ou linha excluída)
      for (const [servicoId, ag] of existentesPorServicoId.entries()) {
        if (!idsComHorarioAtivos.has(servicoId)) {
          await deleteDoc(doc(db, "agendamentos", ag.docId));
        }
      }
    } catch (err) {
      console.warn("Aviso ao sincronizar serviço B2B com a Agenda:", err);
    }
  };

  // Salvar Perfis de Faturamento no documento do profissional
  const handleSavePerfisNoPerfil = async (novosPerfis: PerfilFaturamentoItem[]) => {
    const profId = profile?.uid || user?.uid;
    if (!profId) return;
    const syncPayload = extractLegacySyncFields(
      novosPerfis,
      profile?.cpf,
      profile?.chavePix || profile?.pixKey
    );
    try {
      await updateDoc(doc(db, "users", profId), {
        ...syncPayload,
        updatedAt: serverTimestamp(),
      });
      if (onUpdateProfileLocal) {
        onUpdateProfileLocal(syncPayload);
      }
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, `users/${profId}`);
      } catch {}
      throw err;
    }
  };

  // Adicionar novo serviço B2B na planilha
  const handleAdicionarServico = async () => {
    const hojeStr = new Date().toISOString().split("T")[0];
    const novoNum =
      servicos.length > 0
        ? Math.max(...servicos.map((s) => s.numeroItem || 0)) + 1
        : 1;

    const novoServico: ServicoB2BFaturamentoItem = {
      id: `srv-b2b-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      numeroItem: novoNum,
      data: hojeStr,
      horario: "",
      duracaoMinutos: 60,
      descricaoServico: presetServicoNovo || "Palestra Corporativa",
      modalidade: "online",
      statusExecucao: "realizado",
      valor: Number(
        currentEmpresa.valorServicoPadrao ||
          currentEmpresa.propostaContrato?.valorAcordadoPadrao ||
          1500
      ),
      perfilFaturamentoId: perfilEmpresaAtivo.id,
      viaFaturamento: perfilEmpresaAtivo.via,
      statusNotaFiscal: perfilEmpresaAtivo.via === "PJ" ? "pendente" : "dispensada",
      statusPagamento: "pendente",
      formaPagamento: "Pix",
      observacoes: "",
    };

    const novaLista = [...servicos, novoServico];
    await handlePatchFields({ historicoServicos: novaLista }, true);
    await syncServicosToAgendamentos(novaLista);
    showToast(`Serviço #${novoNum} adicionado à planilha!`, "success");
  };

  // Duplicar serviço existente (+30 dias para recorrência mensal)
  const handleDuplicarServico = async (origem: ServicoB2BFaturamentoItem) => {
    let novaData = origem.data;
    try {
      if (origem.data) {
        const [ano, mes, dia] = origem.data.split("-").map(Number);
        const dObj = new Date(ano, mes - 1, dia);
        dObj.setMonth(dObj.getMonth() + 1);
        novaData = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(
          2,
          "0"
        )}-${String(dObj.getDate()).padStart(2, "0")}`;
      }
    } catch {
      novaData = new Date().toISOString().split("T")[0];
    }

    const novoNum =
      servicos.length > 0
        ? Math.max(...servicos.map((s) => s.numeroItem || 0)) + 1
        : 1;

    const copia: ServicoB2BFaturamentoItem = {
      ...origem,
      id: `srv-b2b-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      numeroItem: novoNum,
      data: novaData,
      statusExecucao: "agendado",
      statusNotaFiscal:
        (origem.viaFaturamento || perfilEmpresaAtivo.via) === "PJ"
          ? "pendente"
          : "dispensada",
      numeroNotaFiscal: "",
      statusPagamento: "pendente",
      dataPagamento: "",
    };

    const novaLista = [...servicos, copia];
    await handlePatchFields({ historicoServicos: novaLista }, true);
    await syncServicosToAgendamentos(novaLista);
    showToast(
      `Serviço duplicado para ${fmtDataBr(novaData)} (recorrência mensal)!`,
      "success"
    );
  };

  const handleUpdateServicoItem = async (
    id: string,
    patch: Partial<ServicoB2BFaturamentoItem>
  ) => {
    const novaLista = servicos.map((s) => {
      if (s.id !== id) return s;
      const updated = { ...s, ...patch };
      if (patch.statusPagamento === "pago" && !updated.dataPagamento) {
        updated.dataPagamento = new Date().toISOString().split("T")[0];
      }
      return updated;
    });

    await handlePatchFields({ historicoServicos: novaLista }, true);
    if ("data" in patch || "horario" in patch || "statusExecucao" in patch || "descricaoServico" in patch) {
      await syncServicosToAgendamentos(novaLista);
    }
  };

  const handleConfirmarExclusaoServico = async () => {
    if (!servicoParaExcluir) return;
    const novaLista = servicos.filter((s) => s.id !== servicoParaExcluir.id);
    await handlePatchFields({ historicoServicos: novaLista }, true);
    await syncServicosToAgendamentos(novaLista);
    showToast(`Serviço #${servicoParaExcluir.numeroItem} removido.`, "info");
    setServicoParaExcluir(null);
  };

  const handleSalvarRegistroBordo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoRegistroForm.titulo.trim() && !novoRegistroForm.conteudo.trim()) {
      showToast("Preencha o título ou resumo da ata/entregável.", "info");
      return;
    }

    const novoReg: RegistroBordoEmpresaB2B = {
      id: `reg-b2b-${Date.now()}`,
      data: novoRegistroForm.data,
      tipo: novoRegistroForm.tipo,
      titulo: novoRegistroForm.titulo.trim() || "Registro Corporativo",
      conteudo: novoRegistroForm.conteudo.trim(),
      ...(novoRegistroForm.servicoVinculadoId
        ? { servicoVinculadoId: novoRegistroForm.servicoVinculadoId }
        : {}),
      createdAtIso: new Date().toISOString(),
    };

    const atualizados = [novoReg, ...registrosBordo];
    await handlePatchFields({ registrosBordo: atualizados }, true);
    setNovoRegistroForm({
      isOpen: false,
      tipo: "reuniao_rh",
      data: new Date().toISOString().split("T")[0],
      titulo: "",
      conteudo: "",
      servicoVinculadoId: "",
    });
    showToast("Registro adicionado ao Diário de Bordo da Empresa!", "success");
  };

  const handleCopyText = (text: string, key: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast(`${label} copiado!`, "success");
    setTimeout(() => setCopiedKey(null), 2200);
  };

  const openWhatsApp = (texto?: string) => {
    const raw = (currentEmpresa.contatoTelefone || "").replace(/\D/g, "");
    const phone = raw ? (raw.startsWith("55") ? raw : `55${raw}`) : "";
    const url = phone
      ? `https://wa.me/${phone}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`
      : `https://wa.me/?text=${encodeURIComponent(texto || "")}`;
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  const gerarTextoFechamentoWhatsAppB2B = () => {
    const periodoTxt = fmtMesExtenso(filtroPeriodo);
    const itensValidos = servicosFiltrados.filter((s) => s.statusExecucao !== "cancelado");
    const resumoLinhas = itensValidos
      .map(
        (s) =>
          `• ${fmtDataBr(s.data)} — ${s.descricaoServico} (${fmtMoeda(s.valor)}) [${
            s.statusPagamento === "pago" ? "Quitado" : "Em aberto"
          }]`
      )
      .join("\n");

    const pixEmissor =
      perfilEmpresaAtivo.via === "PJ"
        ? perfilEmpresaAtivo.chavePixPJ
        : perfilEmpresaAtivo.chavePix;
    const titularEmissor =
      perfilEmpresaAtivo.via === "PJ"
        ? perfilEmpresaAtivo.razaoSocial || perfilEmpresaAtivo.apelido
        : perfilEmpresaAtivo.titularNome || profNome;

    let msg = `Olá, *${currentEmpresa.contatoNome || "Equipe RH / Financeiro"}* (${
      currentEmpresa.nomeFantasia || currentEmpresa.razaoSocial
    })! Tudo bem?\n\n`;
    msg += `Compartilho o demonstrativo de serviços prestados (*${periodoTxt}*):\n\n`;
    if (resumoLinhas) msg += `${resumoLinhas}\n\n`;
    msg += `• *Total Faturado:* ${fmtMoeda(metricas.totalGeral)}\n`;
    msg += `• *Total Recebido:* ${fmtMoeda(metricas.totalPago)}\n`;
    msg += `• *Saldo em Aberto:* ${fmtMoeda(metricas.totalPendente)}\n`;
    if (currentEmpresa.condicaoPagamentoPadrao) {
      msg += `• *Condição Acordada:* ${currentEmpresa.condicaoPagamentoPadrao}\n`;
    }
    if (pixEmissor && metricas.totalPendente > 0) {
      msg += `\n*Dados para Pagamento (${
        perfilEmpresaAtivo.via === "PJ" ? "PJ" : "PF"
      }):*\nFavorecido: ${titularEmissor}\nChave Pix: ${pixEmissor}\n`;
      if (perfilEmpresaAtivo.bancoNome) {
        msg += `Banco: ${perfilEmpresaAtivo.bancoNome}${
          perfilEmpresaAtivo.bancoAgencia ? ` · Ag ${perfilEmpresaAtivo.bancoAgencia}` : ""
        }${perfilEmpresaAtivo.bancoConta ? ` · Cc ${perfilEmpresaAtivo.bancoConta}` : ""}\n`;
      }
    }
    msg += `\nPermaneço à disposição para envio da Nota Fiscal / recibo correspondente.\nAtenciosamente,\n*${profNome}*`;
    return msg;
  };

  const gerarDiscriminacaoNfB2B = () => {
    const itens = servicosFiltrados.filter((s) => s.statusExecucao !== "cancelado");
    const descItens = itens
      .map(
        (s) =>
          `${s.descricaoServico} (${
            s.modalidade === "presencial" ? "presencial" : "online"
          } em ${fmtDataBr(s.data)} - ${fmtMoeda(s.valor)})`
      )
      .join("; ");

    let txt = `Prestação de serviços especializados corporativos em saúde mental e desenvolvimento humano: ${
      descItens || "conforme proposta comercial aprovada"
    }. `;
    txt += `Empresa Tomadora: ${currentEmpresa.razaoSocial || currentEmpresa.nomeFantasia} (CNPJ: ${
      currentEmpresa.cnpj || "Não informado"
    }). `;
    if (perfilEmpresaAtivo.via === "PJ") {
      txt += `Empresa Prestadora: ${
        perfilEmpresaAtivo.razaoSocial || perfilEmpresaAtivo.apelido
      } (CNPJ: ${perfilEmpresaAtivo.cnpj || "Não informado"}). `;
    }
    txt += `Responsável Técnico: ${profNome}${profCrp ? ` (CRP: ${profCrp})` : ""}. `;
    if (currentEmpresa.condicaoPagamentoPadrao) {
      txt += `Condição de pagamento: ${currentEmpresa.condicaoPagamentoPadrao}. `;
    }
    if (perfilEmpresaAtivo.via === "PJ" && perfilEmpresaAtivo.chavePixPJ) {
      txt += `Dados p/ pagamento Pix PJ: ${perfilEmpresaAtivo.chavePixPJ}.`;
    }
    return txt;
  };

  const gerarMinutaContratoB2B = () => {
    if (currentEmpresa.propostaContrato?.minutaPersonalizada?.trim()) {
      return currentEmpresa.propostaContrato.minutaPersonalizada;
    }
    const contratadaTxt =
      perfilEmpresaAtivo.via === "PJ"
        ? `${perfilEmpresaAtivo.razaoSocial || perfilEmpresaAtivo.apelido}, inscrita no CNPJ sob nº ${
            perfilEmpresaAtivo.cnpj || "00.000.000/0001-00"
          }, sediada em ${
            perfilEmpresaAtivo.enderecoPJ || "endereço comercial cadastrado"
          }, neste ato representada tecnicamente por ${profNome}${
            profCrp ? ` (CRP ${profCrp})` : ""
          }`
        : `${profNome}, ${profProfissao}${profCrp ? `, CRP ${profCrp}` : ""}, inscrito(a) no CPF sob nº ${
            perfilEmpresaAtivo.cpf || profile?.cpf || "000.000.000-00"
          }`;

    const contratanteTxt = `${
      currentEmpresa.razaoSocial || currentEmpresa.nomeFantasia
    }, inscrita no CNPJ sob nº ${currentEmpresa.cnpj || "00.000.000/0001-00"}, localizada em ${
      currentEmpresa.enderecoCompleto ||
      [currentEmpresa.cidade, currentEmpresa.uf].filter(Boolean).join("/") ||
      "endereço comercial"
    }, representada por ${currentEmpresa.contatoNome || "seu representante legal"}${
      currentEmpresa.contatoCargo ? ` (${currentEmpresa.contatoCargo})` : ""
    }`;

    const escopo =
      currentEmpresa.propostaContrato?.escopoContratado ||
      "Prestação de serviços corporativos em saúde mental, palestras, treinamentos, rodas de conversa e/ou consultoria organizacional, conforme cronograma acordado entre as partes.";
    const valorBase = fmtMoeda(
      currentEmpresa.propostaContrato?.valorAcordadoPadrao ||
        currentEmpresa.valorServicoPadrao ||
        metricas.totalGeral ||
        1500
    );
    const condPag =
      currentEmpresa.propostaContrato?.condicaoPagamento ||
      currentEmpresa.condicaoPagamentoPadrao ||
      "Até 15 (quinze) dias após a realização/emissão da Nota Fiscal";

    return `CONTRATO E PROPOSTA DE PRESTAÇÃO DE SERVIÇOS CORPORATIVOS (B2B)

1. DAS PARTES
CONTRATANTE: ${contratanteTxt}.
CONTRATADA: ${contratadaTxt}.

2. DO OBJETO E ESCOPO TÉCNICO
2.1. O presente instrumento tem por objeto: ${escopo}
2.2. Periodicidade / Formato: ${
      currentEmpresa.propostaContrato?.periodicidade || "Conforme demanda agendada"
    }.

3. DO INVESTIMENTO E CONDIÇÕES DE FATURAMENTO
3.1. Pelos serviços descritos, a CONTRATANTE pagará à CONTRATADA o valor de referência de ${valorBase} (${
      currentEmpresa.propostaContrato?.periodicidade || "por entrega/competência"
    }), conforme registros efetivos de execução.
3.2. Forma e Prazo de Pagamento: ${condPag}${
      currentEmpresa.emailFinanceiroNf
        ? `, mediante envio da Nota Fiscal / Demonstrativo ao e-mail financeiro ${currentEmpresa.emailFinanceiroNf}`
        : ""
    }.

4. DO SIGILO, ÉTICA E LGPD
4.1. As atividades observarão rigorosamente o Código de Ética Profissional aplicável e a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), preservando a confidencialidade de eventuais relatos individuais colhidos em ações de escuta.

5. DA VIGÊNCIA E REAGENDAMENTO
5.1. Vigência: ${
      currentEmpresa.propostaContrato?.vigenciaInicio
        ? fmtDataBr(currentEmpresa.propostaContrato.vigenciaInicio)
        : "Data de assinatura"
    } ${
      currentEmpresa.propostaContrato?.vigenciaFim
        ? `até ${fmtDataBr(currentEmpresa.propostaContrato.vigenciaFim)}`
        : "(prazo indeterminado / por escopo)"
    }.
5.2. Eventuais reagendamentos de ações síncronas deverão ser comunicados com antecedência mínima de 48 (quarenta e oito) horas úteis.

Local e Data: ${
      [profile?.cidade, profile?.uf].filter(Boolean).join("/") || "Brasil"
    }, ${new Date().toLocaleDateString("pt-BR")}.

_____________________________________________
${currentEmpresa.razaoSocial || currentEmpresa.nomeFantasia} (CONTRATANTE)

_____________________________________________
${
      perfilEmpresaAtivo.via === "PJ"
        ? perfilEmpresaAtivo.razaoSocial || perfilEmpresaAtivo.apelido
        : profNome
    } (CONTRATADA)`;
  };

  const scrollToSec = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="fixed inset-0 z-50 bg-forest/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-[#FAF8F5] w-full max-w-5xl rounded-3xl shadow-2xl border border-soft flex flex-col max-h-[94vh] overflow-hidden">
        {/* CABEÇALHO INSTITUCIONAL (MESMA IDENTIDADE DA FICHA DE BORDO DE PACIENTES) */}
        <div className="bg-forest text-white px-4 sm:px-6 py-4 shrink-0 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center font-serif font-bold text-lg text-sun shrink-0">
                {(currentEmpresa.nomeFantasia || currentEmpresa.razaoSocial || "E")
                  .charAt(0)
                  .toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-serif font-bold text-base sm:text-lg text-white truncate">
                    {currentEmpresa.nomeFantasia || currentEmpresa.razaoSocial}
                  </h3>
                  <select
                    value={currentEmpresa.statusComercial || "ativa_recorrente"}
                    onChange={(e) =>
                      handlePatchFields({
                        statusComercial: e.target.value as StatusEmpresaB2B,
                      })
                    }
                    className="bg-white/15 hover:bg-white/25 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg border border-white/20 outline-none cursor-pointer"
                  >
                    {Object.entries(STATUS_EMPRESA_B2B_LABELS).map(([k, lbl]) => (
                      <option key={k} value={k} className="text-forest bg-white">
                        {lbl}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="text-xs text-white/75 flex items-center gap-2 flex-wrap mt-0.5 tabular-nums">
                  <span>Ficha de Bordo B2B</span>
                  {currentEmpresa.cnpj && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">CNPJ {currentEmpresa.cnpj}</span>
                    </>
                  )}
                  {currentEmpresa.contatoNome && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>Contato: {currentEmpresa.contatoNome}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Ações Superiores da Ficha */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <button
                type="button"
                onClick={() => openWhatsApp()}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp RH</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (isEditing) {
                    if (currentEmpresa.cnpj?.trim()) {
                      const cnpjErr = getCnpjValidationError(currentEmpresa.cnpj, false);
                      if (cnpjErr) {
                        showToast(cnpjErr, "error");
                        return;
                      }
                    }
                    handlePatchFields({
                      nomeFantasia: currentEmpresa.nomeFantasia,
                      razaoSocial: currentEmpresa.razaoSocial,
                      cnpj: currentEmpresa.cnpj?.trim() ? formatCnpj(currentEmpresa.cnpj) : "",
                      inscricaoMunicipal: currentEmpresa.inscricaoMunicipal,
                      ramoAtividade: currentEmpresa.ramoAtividade,
                      enderecoCompleto: currentEmpresa.enderecoCompleto,
                      cidade: currentEmpresa.cidade,
                      uf: currentEmpresa.uf,
                      contatoNome: currentEmpresa.contatoNome,
                      contatoCargo: currentEmpresa.contatoCargo,
                      contatoTelefone: currentEmpresa.contatoTelefone,
                      contatoEmail: currentEmpresa.contatoEmail,
                      emailFinanceiroNf: currentEmpresa.emailFinanceiroNf,
                      condicaoPagamentoPadrao: currentEmpresa.condicaoPagamentoPadrao,
                      valorServicoPadrao: currentEmpresa.valorServicoPadrao,
                      perfilFaturamentoId:
                        currentEmpresa.perfilFaturamentoId || perfilEmpresaAtivo.id,
                      perfilFaturamento:
                        currentEmpresa.perfilFaturamento || perfilEmpresaAtivo.via,
                      observacoesGerais: currentEmpresa.observacoesGerais,
                    });
                    setIsEditing(false);
                  } else {
                    setIsEditing(true);
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  isEditing
                    ? "bg-sun text-forest"
                    : "bg-white/10 hover:bg-white/20 text-white border border-white/15"
                }`}
              >
                {isEditing ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>{saving ? "Salvando..." : "Salvar Edição"}</span>
                  </>
                ) : (
                  <>
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar Cadastro</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer shrink-0"
                title="Fechar Ficha"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Barra de Salto Rápido entre Seções (igual à Ficha de Pacientes) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-white/15 text-[11px]">
            <button
              type="button"
              onClick={() => scrollToSec("sec-b2b-1-cadastro")}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/90 font-semibold whitespace-nowrap shrink-0 cursor-pointer"
            >
              1. Empresa & Contatos
            </button>
            <button
              type="button"
              onClick={() => scrollToSec("sec-b2b-2-planilha")}
              className="px-2.5 py-1 rounded-lg bg-sun/20 hover:bg-sun/30 text-sun font-bold whitespace-nowrap shrink-0 cursor-pointer"
            >
              2. Serviços & Faturamento ({servicos.length})
            </button>
            <button
              type="button"
              onClick={() => scrollToSec("sec-b2b-3-contrato")}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/90 font-semibold whitespace-nowrap shrink-0 cursor-pointer"
            >
              3. Proposta & Contrato B2B
            </button>
            <button
              type="button"
              onClick={() => scrollToSec("sec-b2b-4-diario")}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/90 font-semibold whitespace-nowrap shrink-0 cursor-pointer"
            >
              4. Diário de Bordo & Atas ({registrosBordo.length})
            </button>
          </div>
        </div>

        {/* CORPO ROLÁVEL DA FICHA DE BORDO B2B */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* SEÇÃO 1: DADOS FISCAIS DA TOMADORA & CONTATOS RH / FINANCEIRO */}
          <div
            id="sec-b2b-1-cadastro"
            className="bg-white p-4 sm:p-5 rounded-2xl border border-soft space-y-4"
          >
            <div className="flex items-center justify-between border-b border-soft pb-2.5">
              <h4 className="text-xs sm:text-sm font-bold text-forest flex items-center gap-2">
                <Building2 className="w-4 h-4 text-forest/70" />
                <span>01. Dados Cadastrais, Fiscais & Contatos da Empresa Cliente</span>
              </h4>
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="text-xs font-semibold text-emerald-800 hover:underline cursor-pointer"
                >
                  Editar campos
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-forest/70 mb-1">
                    Nome Fantasia *
                  </label>
                  <input
                    type="text"
                    value={currentEmpresa.nomeFantasia || ""}
                    onChange={(e) =>
                      setCurrentEmpresa({ ...currentEmpresa, nomeFantasia: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-warm/30 border border-soft rounded-xl text-forest outline-none focus:border-forest"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-forest/70 mb-1">
                    Razão Social (Para NFS-e / Contrato) *
                  </label>
                  <input
                    type="text"
                    value={currentEmpresa.razaoSocial || ""}
                    onChange={(e) =>
                      setCurrentEmpresa({ ...currentEmpresa, razaoSocial: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-warm/30 border border-soft rounded-xl text-forest outline-none focus:border-forest"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-forest/70 mb-1">
                    CNPJ *
                  </label>
                  {(() => {
                    const rawCnpj = currentEmpresa.cnpj || "";
                    const digits = rawCnpj.replace(/\D/g, "");
                    const valid = isValidCnpj(rawCnpj);
                    const err = digits.length === 14 ? getCnpjValidationError(rawCnpj, false) : null;
                    return (
                      <>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={18}
                          placeholder="00.000.000/0001-00"
                          value={rawCnpj}
                          onChange={(e) =>
                            setCurrentEmpresa({ ...currentEmpresa, cnpj: formatCnpj(e.target.value) })
                          }
                          className={`w-full px-3 py-2 border rounded-xl text-forest font-mono tabular-nums outline-none transition-colors ${
                            err
                              ? "bg-rose-50/50 border-rose-400 focus:border-rose-500"
                              : valid
                              ? "bg-emerald-50/30 border-emerald-400 focus:border-emerald-600"
                              : "bg-warm/30 border-soft focus:border-forest"
                          }`}
                        />
                        {err ? (
                          <span className="text-[11px] text-rose-600 font-medium block mt-1">{err}</span>
                        ) : valid ? (
                          <span className="text-[11px] text-emerald-700 font-medium block mt-1">CNPJ válido</span>
                        ) : null}
                      </>
                    );
                  })()}
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-forest/70 mb-1">
                    Inscrição Municipal / Estadual
                  </label>
                  <input
                    type="text"
                    value={currentEmpresa.inscricaoMunicipal || ""}
                    onChange={(e) =>
                      setCurrentEmpresa({
                        ...currentEmpresa,
                        inscricaoMunicipal: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-warm/30 border border-soft rounded-xl text-forest font-mono tabular-nums outline-none focus:border-forest"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-forest/70 mb-1">
                    Ramo / Setor
                  </label>
                  <input
                    type="text"
                    value={currentEmpresa.ramoAtividade || ""}
                    onChange={(e) =>
                      setCurrentEmpresa({ ...currentEmpresa, ramoAtividade: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-warm/30 border border-soft rounded-xl text-forest outline-none focus:border-forest"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-forest/70 mb-1">
                    Endereço Fiscal Completo
                  </label>
                  <input
                    type="text"
                    value={currentEmpresa.enderecoCompleto || ""}
                    onChange={(e) =>
                      setCurrentEmpresa({
                        ...currentEmpresa,
                        enderecoCompleto: e.target.value,
                      })
                    }
                    placeholder="Rua, número, bairro, CEP..."
                    className="w-full px-3 py-2 bg-warm/30 border border-soft rounded-xl text-forest outline-none focus:border-forest"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-forest/70 mb-1">
                      Cidade
                    </label>
                    <input
                      type="text"
                      value={currentEmpresa.cidade || ""}
                      onChange={(e) =>
                        setCurrentEmpresa({ ...currentEmpresa, cidade: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-warm/30 border border-soft rounded-xl text-forest outline-none focus:border-forest"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-forest/70 mb-1">
                      UF
                    </label>
                    <input
                      type="text"
                      maxLength={2}
                      value={currentEmpresa.uf || ""}
                      onChange={(e) =>
                        setCurrentEmpresa({
                          ...currentEmpresa,
                          uf: e.target.value.toUpperCase(),
                        })
                      }
                      className="w-full px-3 py-2 bg-warm/30 border border-soft rounded-xl text-forest uppercase outline-none focus:border-forest"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-forest/70 mb-1">
                    Responsável (RH / Gestor)
                  </label>
                  <input
                    type="text"
                    value={currentEmpresa.contatoNome || ""}
                    onChange={(e) =>
                      setCurrentEmpresa({ ...currentEmpresa, contatoNome: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-warm/30 border border-soft rounded-xl text-forest outline-none focus:border-forest"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-forest/70 mb-1">
                    Cargo / Área
                  </label>
                  <input
                    type="text"
                    value={currentEmpresa.contatoCargo || ""}
                    onChange={(e) =>
                      setCurrentEmpresa({ ...currentEmpresa, contatoCargo: e.target.value })
                    }
                    placeholder="Ex: Gerente de RH, DHO, Compras"
                    className="w-full px-3 py-2 bg-warm/30 border border-soft rounded-xl text-forest outline-none focus:border-forest"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-forest/70 mb-1">
                    WhatsApp / Telefone
                  </label>
                  <input
                    type="text"
                    value={currentEmpresa.contatoTelefone || ""}
                    onChange={(e) =>
                      setCurrentEmpresa({
                        ...currentEmpresa,
                        contatoTelefone: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-warm/30 border border-soft rounded-xl text-forest font-mono tabular-nums outline-none focus:border-forest"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-forest/70 mb-1">
                    E-mail do Contato / RH
                  </label>
                  <input
                    type="email"
                    value={currentEmpresa.contatoEmail || ""}
                    onChange={(e) =>
                      setCurrentEmpresa({ ...currentEmpresa, contatoEmail: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-warm/30 border border-soft rounded-xl text-forest outline-none focus:border-forest"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-forest/70 mb-1">
                    E-mail Financeiro (Envio de NFS-e)
                  </label>
                  <input
                    type="email"
                    value={currentEmpresa.emailFinanceiroNf || ""}
                    onChange={(e) =>
                      setCurrentEmpresa({
                        ...currentEmpresa,
                        emailFinanceiroNf: e.target.value,
                      })
                    }
                    placeholder="financeiro@empresa.com.br"
                    className="w-full px-3 py-2 bg-warm/30 border border-soft rounded-xl text-forest outline-none focus:border-forest"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-forest/70 mb-1">
                    Valor Base de Referência (R$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={currentEmpresa.valorServicoPadrao || 0}
                    onChange={(e) =>
                      setCurrentEmpresa({
                        ...currentEmpresa,
                        valorServicoPadrao: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 bg-warm/30 border border-soft rounded-xl text-forest font-mono tabular-nums outline-none focus:border-forest"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-forest/70 mb-1">
                    Condição de Pagamento Padrão / Regras de Faturamento da Empresa
                  </label>
                  <input
                    type="text"
                    value={currentEmpresa.condicaoPagamentoPadrao || ""}
                    onChange={(e) =>
                      setCurrentEmpresa({
                        ...currentEmpresa,
                        condicaoPagamentoPadrao: e.target.value,
                      })
                    }
                    placeholder="Ex: Pagamento em 15 dias úteis após envio da NFS-e até o dia 25 de cada mês"
                    className="w-full px-3 py-2 bg-warm/30 border border-soft rounded-xl text-forest outline-none focus:border-forest"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <label className="block text-[11px] font-bold text-forest/70">
                      Perfil Emissor Vinculado (PF / PJ)
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowGerenciarPerfisModal(true)}
                      className="text-[11px] font-bold text-emerald-800 hover:underline cursor-pointer"
                    >
                      Gerenciar
                    </button>
                  </div>
                  <select
                    value={perfilEmpresaAtivo.id}
                    onChange={(e) => {
                      const escolhido = perfisFaturamento.find(
                        (p) => p.id === e.target.value
                      );
                      if (escolhido) {
                        setCurrentEmpresa({
                          ...currentEmpresa,
                          perfilFaturamentoId: escolhido.id,
                          perfilFaturamento: escolhido.via,
                        });
                      }
                    }}
                    className="w-full px-3 py-2 bg-warm/30 border border-soft rounded-xl text-forest font-semibold outline-none focus:border-forest cursor-pointer"
                  >
                    {perfisFaturamento.map((p) => (
                      <option key={p.id} value={p.id}>
                        {formatPerfilSelectOption(p)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-forest/50 block">
                    Razão Social & CNPJ
                  </span>
                  <p className="font-bold text-forest">
                    {currentEmpresa.razaoSocial || currentEmpresa.nomeFantasia}
                  </p>
                  <p className="font-mono text-forest/70 tabular-nums">
                    {currentEmpresa.cnpj || "CNPJ pendente"}
                    {currentEmpresa.inscricaoMunicipal
                      ? ` · IM ${currentEmpresa.inscricaoMunicipal}`
                      : ""}
                  </p>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-forest/50 block">
                    Responsável RH / Contratante
                  </span>
                  <p className="font-bold text-forest">
                    {currentEmpresa.contatoNome || "Não informado"}
                    {currentEmpresa.contatoCargo ? ` (${currentEmpresa.contatoCargo})` : ""}
                  </p>
                  <p className="text-forest/70 font-mono tabular-nums">
                    {currentEmpresa.contatoTelefone || "Sem telefone"}
                  </p>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-forest/50 block">
                    E-mail Financeiro / NFS-e
                  </span>
                  <p className="font-semibold text-forest truncate">
                    {currentEmpresa.emailFinanceiroNf ||
                      currentEmpresa.contatoEmail ||
                      "Não cadastrado"}
                  </p>
                  <p className="text-forest/65">
                    {currentEmpresa.condicaoPagamentoPadrao || "Condição à vista / a combinar"}
                  </p>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-forest/50 block">
                    Localização & Setor
                  </span>
                  <p className="font-semibold text-forest">
                    {[currentEmpresa.cidade, currentEmpresa.uf].filter(Boolean).join("/") ||
                      currentEmpresa.enderecoCompleto ||
                      "Local não informado"}
                  </p>
                    <p className="text-forest/65">
                      {currentEmpresa.ramoAtividade || "Empresa Cliente"} · Base{" "}
                      <span className="font-mono font-bold text-emerald-800 tabular-nums">
                        {fmtMoeda(currentEmpresa.valorServicoPadrao || 0)}
                      </span>
                    </p>
                  </div>

                  <div className="sm:col-span-2 lg:col-span-4 pt-3 border-t border-soft/70 flex flex-wrap items-center justify-between gap-2 text-xs text-forest/75">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-forest/55">
                        Perfil Emissor (Meu Perfil):
                      </span>
                      <strong className="text-forest">
                        [{perfilEmpresaAtivo.via}] {formatPerfilCurtoLabel(perfilEmpresaAtivo)}
                      </strong>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {getPerfilDocumentoCurto(perfilEmpresaAtivo)}
                      </span>
                      {getPerfilChavePixEfetiva(
                        perfilEmpresaAtivo,
                        profile?.chavePix || profile?.pixKey
                      ) && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono text-forest/70">
                            PIX:{" "}
                            {getPerfilChavePixEfetiva(
                              perfilEmpresaAtivo,
                              profile?.chavePix || profile?.pixKey
                            )}
                          </span>
                        </>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowGerenciarPerfisModal(true)}
                      className="text-[11px] font-bold text-emerald-800 hover:underline cursor-pointer"
                    >
                      Gerenciar Perfis PF/PJ
                    </button>
                  </div>
                </div>
              )}
          </div>

          {/* SEÇÃO 2: PLANILHA EM LINHAS DE SERVIÇOS VENDIDOS & FATURAMENTO B2B */}
          <div
            id="sec-b2b-2-planilha"
            className="bg-white rounded-2xl border border-emerald-200/90 overflow-hidden"
          >
            {/* Topo da Planilha B2B */}
            <div className="px-4 py-3 bg-warm/35 border-b border-soft flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="w-7 h-7 rounded-lg bg-forest text-white flex items-center justify-center shrink-0">
                  <DollarSign className="w-3.5 h-3.5 text-sun" />
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-forest">
                  02. Serviços Vendidos & Faturamento em Linhas
                </h4>

                {/* Seletor de Perfil Emissor Padrão desta Empresa */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-soft text-xs">
                  <span className="text-[10px] font-bold text-forest/55 uppercase">
                    Emissor Padrão:
                  </span>
                  <select
                    value={perfilEmpresaAtivo.id}
                    onChange={(e) => {
                      const escolhido = perfisFaturamento.find(
                        (p) => p.id === e.target.value
                      );
                      if (escolhido) {
                        handlePatchFields({
                          perfilFaturamentoId: escolhido.id,
                          perfilFaturamento: escolhido.via,
                        });
                      }
                    }}
                    className="bg-transparent font-bold text-forest outline-none cursor-pointer max-w-[200px] truncate"
                  >
                    {perfisFaturamento.map((p) => (
                      <option key={p.id} value={p.id}>
                        {formatPerfilSelectOption(p)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowGerenciarPerfisModal(true)}
                    className="text-[11px] font-bold text-blue-800 hover:underline flex items-center gap-0.5 cursor-pointer pl-1 border-l border-soft"
                    title="Cadastrar ou editar CPFs, Caixa Físico e CNPJs"
                  >
                    <Settings className="w-3 h-3" />
                    <span>Perfis</span>
                  </button>
                </div>
              </div>

              {/* Filtro de Competência + Adicionar Serviço */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-soft text-xs">
                  <Calendar className="w-3.5 h-3.5 text-forest/60 shrink-0" />
                  <select
                    value={filtroPeriodo}
                    onChange={(e) => setFiltroPeriodo(e.target.value)}
                    className="bg-transparent font-bold text-xs text-forest outline-none cursor-pointer"
                  >
                    <option value="todas">Todas as Competências ({servicos.length})</option>
                    {mesesDisponiveis.map((m) => (
                      <option key={m} value={m}>
                        {fmtMesExtenso(m)} {m === currentMonthStr ? "· Atual" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center bg-white rounded-xl border border-soft overflow-hidden">
                  <select
                    value={presetServicoNovo}
                    onChange={(e) => setPresetServicoNovo(e.target.value)}
                    className="px-2.5 py-1.5 text-xs text-forest bg-transparent outline-none max-w-[175px] truncate cursor-pointer"
                    title="Tipo de serviço rápido"
                  >
                    {TIPOS_SERVICO_B2B_SUGESTOES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAdicionarServico}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 text-sun" />
                    <span>+ Lançar Serviço</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Painel Dedicado de Reajuste Anual de Contrato B2B */}
            <PainelReajusteAnualContrato
              tipoCliente="empresa"
              clienteNome={
                currentEmpresa.nomeFantasia ||
                currentEmpresa.razaoSocial ||
                "Empresa Cliente"
              }
              contatoNome={currentEmpresa.contatoNome}
              contatoTelefone={currentEmpresa.contatoTelefone}
              valorAtual={
                Number(currentEmpresa.valorServicoPadrao) ||
                Number(currentEmpresa.propostaContrato?.valorAcordadoPadrao) ||
                0
              }
              apenasIndicesOficiais={false}
              origemContratoLabel="Contrato Corporativo B2B Direto"
              config={currentEmpresa.reajusteAnual}
              profissionalNome={profNome}
              profissionalCrp={profCrp}
              qtdLancamentosFuturos={
                servicos.filter(
                  (s) =>
                    s.statusExecucao === "agendado" &&
                    s.statusPagamento !== "pago"
                ).length
              }
              onSave={async (novaConfig, opcoesAplicacao) => {
                const patch: Partial<EmpresaClienteB2B> = {
                  reajusteAnual: novaConfig,
                };

                if (opcoesAplicacao?.novoValorBase !== undefined) {
                  const novoVal = opcoesAplicacao.novoValorBase;
                  patch.valorServicoPadrao = novoVal;
                  patch.propostaContrato = {
                    ...(currentEmpresa.propostaContrato || {}),
                    valorAcordadoPadrao: novoVal,
                  };

                  if (opcoesAplicacao.atualizarAgendadosFuturos) {
                    const hojeIso = new Date().toISOString().split("T")[0];
                    const vigMes = opcoesAplicacao.vigenciaAnoMes || "";
                    let alterouServicos = false;
                    const novosServicos = servicos.map((s) => {
                      const elegivelData =
                        !s.data ||
                        (vigMes && s.data.substring(0, 7) >= vigMes) ||
                        s.data >= hojeIso;
                      if (
                        s.statusExecucao === "agendado" &&
                        s.statusPagamento !== "pago" &&
                        elegivelData
                      ) {
                        alterouServicos = true;
                        return { ...s, valor: novoVal };
                      }
                      return s;
                    });
                    if (alterouServicos) {
                      patch.historicoServicos = novosServicos;
                      await handlePatchFields(patch, true);
                      await syncServicosToAgendamentos(novosServicos);
                      return;
                    }
                  }
                }

                await handlePatchFields(patch, true);
              }}
              showToast={showToast}
            />

            {/* KPIs do Período Selecionado */}
            <div className="px-4 py-3 bg-warm/15 border-b border-soft grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-3 rounded-xl border border-soft">
                <div className="flex items-center justify-between text-forest/60 mb-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Serviços Entregues
                  </span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="text-base sm:text-lg font-extrabold text-forest tabular-nums">
                  {metricas.entregues}{" "}
                  <span className="text-[11px] font-normal text-forest/60">
                    de {metricas.qtdAtivos} ativos
                  </span>
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-soft">
                <div className="flex items-center justify-between text-forest/60 mb-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Total Recebido
                  </span>
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="text-base sm:text-lg font-extrabold text-emerald-700 font-serif tabular-nums">
                  {fmtMoeda(metricas.totalPago)}
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-soft">
                <div className="flex items-center justify-between text-forest/60 mb-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Em Aberto / A Receber
                  </span>
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <div
                  className={`text-base sm:text-lg font-extrabold font-serif tabular-nums ${
                    metricas.totalPendente > 0 ? "text-amber-700" : "text-forest/50"
                  }`}
                >
                  {fmtMoeda(metricas.totalPendente)}
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-soft">
                <div className="flex items-center justify-between text-forest/60 mb-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Faturamento B2B
                  </span>
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div className="text-base sm:text-lg font-extrabold text-forest font-serif tabular-nums">
                  {fmtMoeda(metricas.totalGeral)}
                </div>
              </div>
            </div>

            {/* Barra de Ferramentas Fiscais & Fechamento Comercial */}
            <div className="px-4 py-2.5 bg-white border-b border-soft flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={servicosFiltrados.length === 0}
                  onClick={() =>
                    setModalDemonstrativo({ isOpen: true, isConsolidado: true })
                  }
                  className="px-3 py-1.5 bg-warm hover:bg-forest hover:text-white text-forest font-semibold rounded-xl border border-soft transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Demonstrativo / Recibo B2B ({servicosFiltrados.length})</span>
                </button>

                <button
                  type="button"
                  disabled={servicosFiltrados.length === 0}
                  onClick={() => setModalNfB2B(true)}
                  className="px-3 py-1.5 bg-warm hover:bg-blue-700 hover:text-white text-forest font-semibold rounded-xl border border-soft transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-blue-700" />
                  <span>Assistente NFS-e (Tomador PJ)</span>
                  {metricas.nfsPendentes > 0 && (
                    <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100 px-1.5 rounded">
                      {metricas.nfsPendentes} pend.
                    </span>
                  )}
                </button>
              </div>

              <button
                type="button"
                disabled={servicosFiltrados.length === 0}
                onClick={() => openWhatsApp(gerarTextoFechamentoWhatsAppB2B())}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Send className="w-3.5 h-3.5 text-sun" />
                <span>Enviar Fechamento ao Financeiro (WhatsApp)</span>
              </button>
            </div>

            {/* Grade / Planilha em Linhas */}
            <div className="overflow-x-auto">
              {servicosFiltrados.length === 0 ? (
                <div className="p-8 text-center text-forest/60 space-y-2">
                  <Building2 className="w-8 h-8 text-forest/25 mx-auto" />
                  <p className="text-sm font-semibold text-forest">
                    Nenhum serviço corporativo lançado neste período.
                  </p>
                  <p className="text-xs text-forest/55 max-w-md mx-auto">
                    Selecione o tipo de entrega acima (Palestra, Consultoria NR-1, Plantão, Workshop) e clique em <strong>+ Lançar Serviço</strong>. Se informar horário, o bloqueio sincroniza automaticamente com sua Agenda.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-warm/40 text-[10px] font-bold uppercase tracking-wider text-forest/70 border-b border-soft">
                      <th className="py-2.5 px-2.5 w-9 text-center">#</th>
                      <th className="py-2.5 px-2.5 min-w-[135px]">Data & Hora (Agenda)</th>
                      <th className="py-2.5 px-2.5 min-w-[200px]">Serviço / Escopo</th>
                      <th className="py-2.5 px-2.5 min-w-[115px]">Execução</th>
                      <th className="py-2.5 px-2.5 min-w-[100px]">Valor (R$)</th>
                      <th className="py-2.5 px-2.5 min-w-[135px]">Perfil Emissor</th>
                      <th className="py-2.5 px-2.5 min-w-[105px]">Nota Fiscal</th>
                      <th className="py-2.5 px-2.5 min-w-[125px]">Pagamento</th>
                      <th className="py-2.5 px-2.5 text-right min-w-[115px]">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-soft/60">
                    {servicosFiltrados.map((srv) => {
                      const perfilLinha = resolvePerfilFaturamentoAtivo(
                        perfisFaturamento,
                        srv.perfilFaturamentoId || currentEmpresa.perfilFaturamentoId,
                        srv.viaFaturamento || currentEmpresa.perfilFaturamento || "PJ"
                      );

                      return (
                        <tr key={srv.id} className="hover:bg-warm/25 transition-colors">
                          <td className="py-2 px-2.5 text-center font-mono font-bold text-forest/65 tabular-nums">
                            #{srv.numeroItem}
                          </td>

                          {/* Data + Hora opcional (sincroniza Agenda) */}
                          <td className="py-2 px-2.5">
                            <div className="flex flex-col gap-1">
                              <input
                                type="date"
                                value={srv.data || ""}
                                onChange={(e) =>
                                  handleUpdateServicoItem(srv.id, { data: e.target.value })
                                }
                                className="bg-transparent font-mono text-[11px] text-forest px-1 py-0.5 rounded border border-transparent hover:border-soft focus:border-forest focus:bg-white outline-none tabular-nums"
                              />
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-forest/40 shrink-0" />
                                <input
                                  type="time"
                                  value={srv.horario || ""}
                                  onChange={(e) =>
                                    handleUpdateServicoItem(srv.id, {
                                      horario: e.target.value,
                                    })
                                  }
                                  title="Opcional: preencha o horário para bloquear na Agenda Clínica"
                                  className="bg-transparent font-mono text-[11px] text-forest/75 px-1 py-0.5 rounded border border-transparent hover:border-soft focus:border-forest focus:bg-white outline-none tabular-nums w-20"
                                />
                                {srv.horario && (
                                  <span
                                    className="text-[9px] font-semibold text-emerald-700"
                                    title="Sincronizado com sua Agenda"
                                  >
                                    Agenda
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Descrição do Serviço + Modalidade */}
                          <td className="py-2 px-2.5">
                            <div className="flex flex-col gap-1">
                              <input
                                type="text"
                                value={srv.descricaoServico || ""}
                                onChange={(e) =>
                                  handleUpdateServicoItem(srv.id, {
                                    descricaoServico: e.target.value,
                                  })
                                }
                                placeholder="Ex: Palestra Outubro Rosa, Consultoria..."
                                className="bg-transparent font-semibold text-xs text-forest px-1.5 py-0.5 rounded border border-transparent hover:border-soft focus:border-forest focus:bg-white outline-none w-full"
                              />
                              <div className="flex items-center gap-1.5">
                                <select
                                  value={srv.modalidade || "online"}
                                  onChange={(e) =>
                                    handleUpdateServicoItem(srv.id, {
                                      modalidade: e.target.value as "online" | "presencial",
                                    })
                                  }
                                  className="text-[10px] font-medium text-forest/70 bg-warm/40 px-1.5 py-0.5 rounded border border-soft outline-none cursor-pointer"
                                >
                                  <option value="online">Online</option>
                                  <option value="presencial">In-Company / Presencial</option>
                                </select>
                              </div>
                            </div>
                          </td>

                          {/* Status Execução */}
                          <td className="py-2 px-2.5">
                            <select
                              value={srv.statusExecucao || "realizado"}
                              onChange={(e) =>
                                handleUpdateServicoItem(srv.id, {
                                  statusExecucao: e.target
                                    .value as ServicoB2BFaturamentoItem["statusExecucao"],
                                })
                              }
                              className="bg-white text-[11px] font-semibold text-forest px-2 py-1 rounded-lg border border-soft outline-none cursor-pointer w-full"
                            >
                              <option value="agendado">Agendado</option>
                              <option value="em_execucao">Em Execução</option>
                              <option value="realizado">Entregue / Realizado</option>
                              <option value="cancelado">Cancelado</option>
                            </select>
                          </td>

                          {/* Valor */}
                          <td className="py-2 px-2.5">
                            <div className="flex items-center">
                              <span className="text-[10px] text-forest/50 font-bold mr-1">
                                R$
                              </span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={srv.valor || 0}
                                onChange={(e) =>
                                  handleUpdateServicoItem(srv.id, {
                                    valor: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="bg-transparent font-mono font-bold text-xs text-forest px-1.5 py-0.5 rounded border border-transparent hover:border-soft focus:border-forest focus:bg-white outline-none w-24 tabular-nums"
                              />
                            </div>
                          </td>

                          {/* Perfil Emissor da Linha */}
                          <td className="py-2 px-2.5">
                            <select
                              value={perfilLinha.id}
                              onChange={(e) => {
                                const pSel = perfisFaturamento.find(
                                  (p) => p.id === e.target.value
                                );
                                if (pSel) {
                                  handleUpdateServicoItem(srv.id, {
                                    perfilFaturamentoId: pSel.id,
                                    viaFaturamento: pSel.via,
                                  });
                                }
                              }}
                              className={`text-[11px] font-semibold px-2 py-1 rounded-lg border outline-none cursor-pointer w-full truncate ${
                                perfilLinha.via === "PJ"
                                  ? "bg-blue-50/70 text-blue-900 border-blue-200"
                                  : perfilLinha.subtipo === "dinheiro_fisico"
                                  ? "bg-amber-50/70 text-amber-900 border-amber-200"
                                  : "bg-emerald-50/70 text-emerald-900 border-emerald-200"
                              }`}
                            >
                              {perfisFaturamento.map((p) => (
                                <option key={p.id} value={p.id}>
                                  [{p.via}] {formatPerfilCurtoLabel(p)}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Status Nota Fiscal */}
                          <td className="py-2 px-2.5">
                            <button
                              type="button"
                              onClick={() => {
                                const nextNf: ServicoB2BFaturamentoItem["statusNotaFiscal"] =
                                  srv.statusNotaFiscal === "emitida"
                                    ? "pendente"
                                    : srv.statusNotaFiscal === "pendente"
                                    ? "emitida"
                                    : "pendente";
                                handleUpdateServicoItem(srv.id, {
                                  statusNotaFiscal: nextNf,
                                });
                              }}
                              className={`text-[11px] font-bold px-2 py-1 rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                                srv.statusNotaFiscal === "emitida"
                                  ? "bg-blue-50 text-blue-800 border-blue-200"
                                  : srv.statusNotaFiscal === "dispensada"
                                  ? "bg-stone-100 text-forest/60 border-soft"
                                  : "bg-amber-50 text-amber-800 border-amber-200"
                              }`}
                              title="Clique para alternar entre NF Pendente e NF Emitida"
                            >
                              {srv.statusNotaFiscal === "emitida"
                                ? "NF Emitida"
                                : srv.statusNotaFiscal === "dispensada"
                                ? "Recibo / S/NF"
                                : "NF Pendente"}
                            </button>
                          </td>

                          {/* Pagamento + Forma */}
                          <td className="py-2 px-2.5">
                            <div className="flex flex-col gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateServicoItem(srv.id, {
                                    statusPagamento:
                                      srv.statusPagamento === "pago" ? "pendente" : "pago",
                                  })
                                }
                                className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border transition-colors cursor-pointer w-fit whitespace-nowrap ${
                                  srv.statusPagamento === "pago"
                                    ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                                    : "bg-amber-100 text-amber-900 border-amber-300"
                                }`}
                              >
                                {srv.statusPagamento === "pago" ? "Pago" : "Pendente"}
                              </button>
                              <select
                                value={srv.formaPagamento || "Pix"}
                                onChange={(e) =>
                                  handleUpdateServicoItem(srv.id, {
                                    formaPagamento: e.target
                                      .value as ServicoB2BFaturamentoItem["formaPagamento"],
                                  })
                                }
                                className="bg-transparent text-[10px] text-forest/75 outline-none cursor-pointer"
                              >
                                <option value="Pix">Pix</option>
                                <option value="TED / Transferência">TED / Bancário</option>
                                <option value="Boleto">Boleto</option>
                                <option value="Cartão">Cartão</option>
                                <option value="Dinheiro">Dinheiro</option>
                              </select>
                            </div>
                          </td>

                          {/* Ações por Linha */}
                          <td className="py-2 px-2.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setNovoRegistroForm({
                                    isOpen: true,
                                    tipo: "ata_entrega",
                                    data: srv.data || new Date().toISOString().split("T")[0],
                                    titulo: `Entrega #${srv.numeroItem} — ${srv.descricaoServico}`,
                                    conteudo: "",
                                    servicoVinculadoId: srv.id,
                                  });
                                  scrollToSec("sec-b2b-4-diario");
                                }}
                                className="p-1.5 text-forest/60 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                title="Vincular ata ou entregável a este serviço"
                              >
                                <ClipboardList className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDuplicarServico(srv)}
                                className="p-1.5 text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                title="Duplicar serviço para o próximo mês (+30 dias)"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setModalDemonstrativo({
                                    isOpen: true,
                                    servico: srv,
                                    isConsolidado: false,
                                  })
                                }
                                className="p-1.5 text-forest/70 hover:text-forest hover:bg-warm rounded-lg transition-colors cursor-pointer"
                                title="Emitir recibo / demonstrativo individual deste serviço"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => setServicoParaExcluir(srv)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Excluir este lançamento"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* SEÇÃO 3: PROPOSTA COMERCIAL & CONTRATO DE PRESTAÇÃO DE SERVIÇOS B2B */}
          <div
            id="sec-b2b-3-contrato"
            className="bg-white p-4 sm:p-5 rounded-2xl border border-soft space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-soft pb-3">
              <h4 className="text-xs sm:text-sm font-bold text-forest flex items-center gap-2">
                <FileSignature className="w-4 h-4 text-forest/70" />
                <span>03. Proposta Comercial & Contrato de Prestação de Serviços B2B</span>
              </h4>
              <button
                type="button"
                onClick={() => setModalContratoPreview(true)}
                className="px-3.5 py-1.5 bg-forest hover:bg-forest/90 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Printer className="w-3.5 h-3.5 text-sun" />
                <span>Gerar / Imprimir Minuta B2B</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-forest/70 mb-1">
                  Escopo Contratado / Objeto
                </label>
                <input
                  type="text"
                  value={currentEmpresa.propostaContrato?.escopoContratado || ""}
                  onChange={(e) =>
                    handlePatchFields(
                      {
                        propostaContrato: {
                          ...(currentEmpresa.propostaContrato || {}),
                          escopoContratado: e.target.value,
                        },
                      },
                      true
                    )
                  }
                  placeholder="Ex: Ciclo mensal de palestras, plantão psicológico e assessoria NR-1"
                  className="w-full px-3 py-2 bg-warm/30 border border-soft rounded-xl text-forest outline-none focus:border-forest"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-forest/70 mb-1">
                  Periodicidade / Formato
                </label>
                <select
                  value={
                    currentEmpresa.propostaContrato?.periodicidade || "Mensal Recorrente"
                  }
                  onChange={(e) =>
                    handlePatchFields(
                      {
                        propostaContrato: {
                          ...(currentEmpresa.propostaContrato || {}),
                          periodicidade: e.target.value,
                        },
                      },
                      true
                    )
                  }
                  className="w-full px-3 py-2 bg-warm/30 border border-soft rounded-xl text-forest outline-none focus:border-forest"
                >
                  <option value="Mensal Recorrente">Mensal Recorrente</option>
                  <option value="Quinzenal">Quinzenal</option>
                  <option value="Projeto Pontual / Evento">Projeto Pontual / Evento</option>
                  <option value="Pacote de Horas">Pacote de Horas</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-forest/70 mb-1">
                  Status do Contrato
                </label>
                <select
                  value={currentEmpresa.propostaContrato?.statusContrato || "rascunho"}
                  onChange={(e) =>
                    handlePatchFields(
                      {
                        propostaContrato: {
                          ...(currentEmpresa.propostaContrato || {}),
                          statusContrato: e.target.value as any,
                        },
                      },
                      true
                    )
                  }
                  className="w-full px-3 py-2 bg-warm/30 border border-soft rounded-xl text-forest font-semibold outline-none focus:border-forest"
                >
                  <option value="rascunho">Em Elaboração / Rascunho</option>
                  <option value="enviado">Proposta Enviada ao RH</option>
                  <option value="assinado">Contrato Vigente / Assinado</option>
                  <option value="encerrado">Encerrado</option>
                </select>
              </div>
            </div>
          </div>

          {/* SEÇÃO 4: DIÁRIO DE BORDO & ENTREGÁVEIS CORPORATIVOS */}
          <div
            id="sec-b2b-4-diario"
            className="bg-white p-4 sm:p-5 rounded-2xl border border-soft space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-soft pb-3">
              <h4 className="text-xs sm:text-sm font-bold text-forest flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-forest/70" />
                <span>04. Diário de Bordo, Reuniões com RH & Entregáveis Técnicos</span>
              </h4>
              <button
                type="button"
                onClick={() =>
                  setNovoRegistroForm((prev) => ({ ...prev, isOpen: !prev.isOpen }))
                }
                className="px-3 py-1.5 bg-warm hover:bg-forest hover:text-white text-forest text-xs font-bold rounded-xl border border-soft transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Novo Registro / Ata</span>
              </button>
            </div>

            {novoRegistroForm.isOpen && (
              <form
                onSubmit={handleSalvarRegistroBordo}
                className="p-4 bg-warm/35 rounded-2xl border border-soft space-y-3 text-xs"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-forest/70 mb-1">
                      Tipo de Registro
                    </label>
                    <select
                      value={novoRegistroForm.tipo}
                      onChange={(e) =>
                        setNovoRegistroForm({
                          ...novoRegistroForm,
                          tipo: e.target.value as RegistroBordoEmpresaB2B["tipo"],
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-soft rounded-xl text-forest outline-none"
                    >
                      <option value="reuniao_rh">Reunião de Alinhamento c/ RH</option>
                      <option value="ata_entrega">Ata de Palestra / Lista de Presença</option>
                      <option value="relatorio_tecnico">Relatório Técnico / Diagnóstico</option>
                      <option value="anotacao">Anotação Comercial</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-forest/70 mb-1">
                      Data
                    </label>
                    <input
                      type="date"
                      value={novoRegistroForm.data}
                      onChange={(e) =>
                        setNovoRegistroForm({ ...novoRegistroForm, data: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-white border border-soft rounded-xl text-forest font-mono tabular-nums outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-forest/70 mb-1">
                      Vincular a Serviço (opcional)
                    </label>
                    <select
                      value={novoRegistroForm.servicoVinculadoId}
                      onChange={(e) =>
                        setNovoRegistroForm({
                          ...novoRegistroForm,
                          servicoVinculadoId: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-soft rounded-xl text-forest outline-none"
                    >
                      <option value="">Sem vínculo específico</option>
                      {servicos.map((s) => (
                        <option key={s.id} value={s.id}>
                          #{s.numeroItem} · {fmtDataBr(s.data)} — {s.descricaoServico}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-forest/70 mb-1">
                    Título / Assunto
                  </label>
                  <input
                    type="text"
                    value={novoRegistroForm.titulo}
                    onChange={(e) =>
                      setNovoRegistroForm({ ...novoRegistroForm, titulo: e.target.value })
                    }
                    placeholder="Ex: Reunião de Briefing SIPAT / Entrega do Relatório Mensal"
                    className="w-full px-3 py-2 bg-white border border-soft rounded-xl text-forest outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-forest/70 mb-1">
                    Síntese, Participantes e Encaminhamentos
                  </label>
                  <textarea
                    rows={3}
                    value={novoRegistroForm.conteudo}
                    onChange={(e) =>
                      setNovoRegistroForm({
                        ...novoRegistroForm,
                        conteudo: e.target.value,
                      })
                    }
                    placeholder="Registre pautas alinhadas com a empresa, nº de participantes presentes ou links de materiais entregues..."
                    className="w-full p-3 bg-white border border-soft rounded-xl text-forest outline-none resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setNovoRegistroForm((prev) => ({ ...prev, isOpen: false }))
                    }
                    className="px-3.5 py-1.5 text-forest/70 hover:text-forest font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-forest text-white font-bold rounded-xl cursor-pointer"
                  >
                    Salvar Registro
                  </button>
                </div>
              </form>
            )}

            {registrosBordo.length === 0 ? (
              <p className="text-xs text-forest/55 py-2">
                Nenhuma ata, reunião de alinhamento ou entregável registrado ainda para esta empresa.
              </p>
            ) : (
              <div className="space-y-2.5">
                {registrosBordo.map((reg) => (
                  <div
                    key={reg.id}
                    className="p-3.5 bg-warm/25 rounded-xl border border-soft flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap text-[11px] text-forest/65 tabular-nums">
                        <span className="font-mono font-semibold text-forest">
                          {fmtDataBr(reg.data)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {reg.tipo === "reuniao_rh"
                            ? "Reunião RH"
                            : reg.tipo === "ata_entrega"
                            ? "Ata / Entrega"
                            : reg.tipo === "relatorio_tecnico"
                            ? "Relatório Técnico"
                            : "Anotação"}
                        </span>
                      </div>
                      <h5 className="font-bold text-forest">{reg.titulo}</h5>
                      {reg.conteudo && (
                        <p className="text-forest/75 whitespace-pre-line leading-relaxed">
                          {reg.conteudo}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const filtrados = registrosBordo.filter((r) => r.id !== reg.id);
                        handlePatchFields({ registrosBordo: filtrados }, true);
                        showToast("Registro removido.", "info");
                      }}
                      className="p-1.5 text-forest/40 hover:text-rose-600 rounded-lg cursor-pointer shrink-0"
                      title="Excluir registro"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RODAPÉ DA FICHA */}
        <div className="px-4 sm:px-6 py-3 bg-white border-t border-soft flex items-center justify-between shrink-0 text-xs">
          <span className="text-forest/60">
            Carteira B2B Privada do Profissional · Isolamento exclusivo na sua conta
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-forest hover:bg-forest/90 text-white font-bold rounded-xl cursor-pointer"
          >
            Fechar Ficha
          </button>
        </div>
      </div>

      {/* MODAL: ASSISTENTE NFS-E PJ TOMADOR */}
      {modalNfB2B && (
        <div className="fixed inset-0 z-[70] bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-soft shadow-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-soft">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-blue-700" />
                <h3 className="font-serif font-bold text-base text-forest">
                  Espelho para Nota Fiscal de Serviços (NFS-e B2B)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalNfB2B(false)}
                className="p-1 text-forest/50 hover:text-forest rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-blue-950">
                    Prestador Selecionado ({perfilEmpresaAtivo.via})
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyText(
                        perfilEmpresaAtivo.via === "PJ"
                          ? `${perfilEmpresaAtivo.razaoSocial || ""} - CNPJ: ${
                              perfilEmpresaAtivo.cnpj || ""
                            }`
                          : `${profNome} - CPF: ${perfilEmpresaAtivo.cpf || ""}`,
                        "prest_b2b",
                        "Dados do prestador"
                      )
                    }
                    className="text-[11px] font-bold text-blue-800 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === "prest_b2b" ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    Copiar
                  </button>
                </div>
                <p className="font-bold text-forest">
                  {perfilEmpresaAtivo.via === "PJ"
                    ? perfilEmpresaAtivo.razaoSocial || perfilEmpresaAtivo.apelido
                    : perfilEmpresaAtivo.titularNome || profNome}
                </p>
                <p className="font-mono text-forest/75 tabular-nums">
                  {perfilEmpresaAtivo.via === "PJ"
                    ? `CNPJ: ${perfilEmpresaAtivo.cnpj || "Não informado"} · CNAE: ${
                        perfilEmpresaAtivo.cnae || "8650-0/03"
                      }`
                    : `CPF: ${perfilEmpresaAtivo.cpf || "Não informado"}`}
                </p>
              </div>

              <div className="p-3 bg-warm/35 rounded-xl border border-soft space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-forest/60">
                    Tomador dos Serviços (Empresa Cliente PJ)
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyText(
                        currentEmpresa.cnpj?.replace(/\D/g, "") || "",
                        "cnpj_tomador",
                        "CNPJ da empresa tomadora"
                      )
                    }
                    className="text-[11px] font-bold text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === "cnpj_tomador" ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    Copiar CNPJ
                  </button>
                </div>
                <p className="font-bold text-forest">
                  {currentEmpresa.razaoSocial || currentEmpresa.nomeFantasia}
                </p>
                <p className="font-mono text-forest/75 tabular-nums">
                  CNPJ: {currentEmpresa.cnpj || "Não informado"}
                  {currentEmpresa.inscricaoMunicipal
                    ? ` · IM: ${currentEmpresa.inscricaoMunicipal}`
                    : ""}
                </p>
                {currentEmpresa.emailFinanceiroNf && (
                  <p className="text-forest/65">
                    E-mail NFe: {currentEmpresa.emailFinanceiroNf}
                  </p>
                )}
              </div>

              <div className="p-3 bg-warm/35 rounded-xl border border-soft space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-forest/60">
                    Discriminação Sugerida dos Serviços
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyText(
                        gerarDiscriminacaoNfB2B(),
                        "discrim_b2b",
                        "Discriminação da NFS-e"
                      )
                    }
                    className="text-[11px] font-bold text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === "discrim_b2b" ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    Copiar Texto
                  </button>
                </div>
                <p className="p-2.5 bg-white rounded-lg border border-soft font-mono text-[11px] text-forest/85 leading-relaxed select-all">
                  {gerarDiscriminacaoNfB2B()}
                </p>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-emerald-950 block">
                    Valor Total da Nota
                  </span>
                  <span className="text-base font-extrabold text-emerald-900 font-serif tabular-nums">
                    {fmtMoeda(metricas.totalGeral)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleCopyText(
                      metricas.totalGeral.toFixed(2).replace(".", ","),
                      "val_nf_b2b",
                      "Valor da nota"
                    )
                  }
                  className="px-3 py-1.5 bg-white text-emerald-900 font-bold rounded-lg border border-emerald-300 hover:bg-emerald-100 flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copiar Valor</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={() => setModalNfB2B(false)}
                className="px-4 py-2 bg-forest text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Concluído
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DEMONSTRATIVO / RECIBO COMERCIAL B2B */}
      {modalDemonstrativo.isOpen && (
        <div className="fixed inset-0 z-[70] bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-soft shadow-2xl max-w-xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-soft">
              <h3 className="font-serif font-bold text-base text-forest">
                {modalDemonstrativo.isConsolidado
                  ? "Demonstrativo / Recibo Comercial B2B"
                  : `Recibo Comercial — Serviço #${modalDemonstrativo.servico?.numeroItem}`}
              </h3>
              <button
                type="button"
                onClick={() => setModalDemonstrativo({ isOpen: false })}
                className="p-1 text-forest/50 hover:text-forest rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 bg-warm/20 rounded-2xl border border-soft space-y-4 text-xs text-forest leading-relaxed">
              <div className="text-center pb-3 border-b border-soft space-y-1">
                <h2 className="text-sm font-bold uppercase tracking-wider text-forest">
                  DEMONSTRATIVO E RECIBO DE PRESTAÇÃO DE SERVIÇOS CORPORATIVOS
                </h2>
                <p className="text-[11px] text-forest/70">
                  {modalDemonstrativo.isConsolidado
                    ? `Competência: ${fmtMesExtenso(filtroPeriodo)}`
                    : `Data da Entrega: ${fmtDataBr(modalDemonstrativo.servico?.data)}`}
                </p>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-soft space-y-1">
                <span className="text-[10px] font-bold uppercase text-forest/50 block">
                  Prestador Emitente ({perfilEmpresaAtivo.via})
                </span>
                <p className="font-bold text-sm text-forest">
                  {perfilEmpresaAtivo.via === "PJ"
                    ? perfilEmpresaAtivo.razaoSocial || perfilEmpresaAtivo.apelido
                    : perfilEmpresaAtivo.titularNome || profNome}
                </p>
                <p className="text-forest/70 font-mono tabular-nums">
                  {perfilEmpresaAtivo.via === "PJ"
                    ? `CNPJ: ${perfilEmpresaAtivo.cnpj || "Não informado"}`
                    : `CPF: ${perfilEmpresaAtivo.cpf || "Não informado"}`}{" "}
                  {profCrp ? `· Resp. Técnico: ${profNome} (CRP ${profCrp})` : ""}
                </p>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-soft space-y-1">
                <span className="text-[10px] font-bold uppercase text-forest/50 block">
                  Empresa Contratante / Tomadora
                </span>
                <p className="font-bold text-sm text-forest">
                  {currentEmpresa.razaoSocial || currentEmpresa.nomeFantasia}
                </p>
                <p className="text-forest/70 font-mono tabular-nums">
                  CNPJ: {currentEmpresa.cnpj || "Não informado"}
                </p>
              </div>

              <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-950">Valor Total:</span>
                  <span className="text-base font-extrabold text-emerald-900 font-serif tabular-nums">
                    {modalDemonstrativo.isConsolidado
                      ? fmtMoeda(metricas.totalGeral)
                      : fmtMoeda(modalDemonstrativo.servico?.valor || 0)}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-emerald-100 space-y-1">
                  {modalDemonstrativo.isConsolidado ? (
                    servicosFiltrados
                      .filter((s) => s.statusExecucao !== "cancelado")
                      .map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between text-[11px] tabular-nums"
                        >
                          <span>
                            {fmtDataBr(s.data)} — {s.descricaoServico}
                          </span>
                          <span className="font-mono font-semibold">
                            {fmtMoeda(s.valor)}
                          </span>
                        </div>
                      ))
                  ) : (
                    <p className="text-[11px]">
                      {modalDemonstrativo.servico?.descricaoServico} (
                      {modalDemonstrativo.servico?.modalidade === "presencial"
                        ? "In-Company / Presencial"
                        : "Online"}
                      )
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalDemonstrativo({ isOpen: false })}
                className="px-4 py-2 text-xs font-semibold text-forest/70 hover:text-forest cursor-pointer"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-forest text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir / Salvar PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MINUTA DE CONTRATO B2B */}
      {modalContratoPreview && (
        <div className="fixed inset-0 z-[70] bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-soft shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-soft shrink-0">
              <h3 className="font-serif font-bold text-base text-forest">
                Minuta de Contrato & Proposta Comercial B2B
              </h3>
              <button
                type="button"
                onClick={() => setModalContratoPreview(false)}
                className="p-1 text-forest/50 hover:text-forest rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <textarea
              rows={16}
              value={gerarMinutaContratoB2B()}
              onChange={(e) =>
                handlePatchFields(
                  {
                    propostaContrato: {
                      ...(currentEmpresa.propostaContrato || {}),
                      minutaPersonalizada: e.target.value,
                    },
                  },
                  true
                )
              }
              className="w-full flex-1 p-4 bg-warm/25 border border-soft rounded-2xl text-xs text-forest font-mono leading-relaxed outline-none focus:border-forest overflow-y-auto"
            />

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 shrink-0">
              <button
                type="button"
                onClick={() =>
                  handleCopyText(gerarMinutaContratoB2B(), "minuta_b2b", "Minuta do contrato")
                }
                className="px-3.5 py-2 bg-warm hover:bg-soft text-forest text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Texto</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalContratoPreview(false)}
                  className="px-4 py-2 text-xs font-semibold text-forest/70 hover:text-forest cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-forest text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir / Salvar PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL IN-APP DE EXCLUSÃO DE SERVIÇO */}
      {servicoParaExcluir && (
        <div className="fixed inset-0 z-[80] bg-forest/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-soft shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-serif font-bold text-base text-forest">
                  Excluir Serviço #{servicoParaExcluir.numeroItem}?
                </h4>
                <p className="text-xs text-forest/70 mt-1">
                  O lançamento "{servicoParaExcluir.descricaoServico}" ({fmtMoeda(
                    servicoParaExcluir.valor
                  )}) será removido da planilha e da consolidação financeira.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-soft">
              <button
                type="button"
                onClick={() => setServicoParaExcluir(null)}
                className="px-4 py-2 text-xs font-semibold text-forest/70 hover:text-forest rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarExclusaoServico}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GERENCIADOR DE MÚLTIPLOS PERFIS DE FATURAMENTO */}
      <PerfisFaturamentoManagerModal
        isOpen={showGerenciarPerfisModal}
        onClose={() => setShowGerenciarPerfisModal(false)}
        perfis={perfisFaturamento}
        onSavePerfis={handleSavePerfisNoPerfil}
        profissionalNomePadrao={profNome}
        showToast={showToast}
      />
    </div>
  );
};
