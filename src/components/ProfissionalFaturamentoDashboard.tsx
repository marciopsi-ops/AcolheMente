import React, { useState, useMemo } from "react";
import {
  Calendar,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Clock,
  Building2,
  Briefcase,
  User,
  Globe,
  Search,
  ExternalLink,
  MessageCircle,
  FileSpreadsheet,
  Download,
  ArrowUpDown,
  Banknote,
  Wallet,
  TrendingDown,
  Layers,
} from "lucide-react";
import { SessaoFaturamentoItem, DadosPessoaJuridica } from "./PacienteFaturamentoSpreadsheet";
import { EmpresaClienteB2B } from "../types/empresaB2B";
import {
  PerfilFaturamentoItem,
  normalizePerfisFaturamento,
  resolvePerfilFaturamentoAtivo,
  shouldDeclararIrForItem,
  formatPerfilCurtoLabel,
} from "../types/faturamento";
import {
  ExpenseItem,
  resolveStoredExpenses,
  filterExpensesByCriteria,
  resolveExpenseSector,
} from "./ProfissionalDespesasDashboard";

export interface ItemPacienteFinanceiro {
  id: string;
  nome: string;
  cpf?: string;
  email?: string;
  telefone?: string;
  origemTipo: "particular" | "corporativo" | "externo" | "empresa_b2b";
  origemNome: string;
  perfilFaturamento: "PF" | "PJ";
  perfilFaturamentoId?: string;
  valorSessaoPadrao: number;
  sessoes: SessaoFaturamentoItem[];
  rawObject: any;
}

interface ProfissionalFaturamentoDashboardProps {
  pacientesParticulares: any[];
  fichasCorporativas: any[];
  pacientesExternos?: any[];
  empresasB2B?: EmpresaClienteB2B[];
  isPlanoAvancado?: boolean;
  dadosPJ?: DadosPessoaJuridica;
  companyData?: any;
  faturamentoPadrao?: "PF" | "PJ";
  perfisFaturamento?: PerfilFaturamentoItem[];
  profissionalNome?: string;
  profissionalCpf?: string;
  chavePix?: string;
  profissionalId?: string;
  despesasProfissionais?: ExpenseItem[];
  onIrParaDespesas?: () => void;
  onSelecionarPacienteParticular?: (paciente: any) => void;
  onSelecionarFichaCorporativa?: (ficha: any) => void;
  onSelecionarPacienteExterno?: (paciente: any) => void;
  onSelecionarEmpresaB2B?: (empresa: EmpresaClienteB2B) => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
  onReceitaBrutaChange?: (val: number) => void;
}

export function ProfissionalFaturamentoDashboard({
  pacientesParticulares,
  fichasCorporativas,
  pacientesExternos,
  empresasB2B,
  isPlanoAvancado,
  dadosPJ,
  companyData,
  faturamentoPadrao,
  perfisFaturamento,
  profissionalNome,
  profissionalCpf,
  chavePix,
  profissionalId,
  despesasProfissionais,
  onIrParaDespesas,
  onSelecionarPacienteParticular,
  onSelecionarFichaCorporativa,
  onSelecionarPacienteExterno,
  onSelecionarEmpresaB2B,
  showToast,
  onReceitaBrutaChange,
}: ProfissionalFaturamentoDashboardProps) {
  const hoje = new Date();
  const mesAtualStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;

  const [competenciaSelecionada, setCompetenciaSelecionada] = useState<string>(mesAtualStr);
  const [filtroOrigem, setFiltroOrigem] = useState<
    | "todas"
    | "setor_clinico"
    | "empresa_b2b"
    | "particular"
    | "corporativo"
    | "externo"
  >("todas");
  const [filtroPerfilEmissao, setFiltroPerfilEmissao] = useState<string>("todos");
  const [filtroStatusPagamento, setFiltroStatusPagamento] = useState<
    "todos" | "pendente" | "quitado"
  >("todos");
  const [buscaPaciente, setBuscaPaciente] = useState<string>("");
  const [ordemColuna, setOrdemColuna] = useState<"nome" | "total" | "pendente" | "sessoes">(
    "total"
  );
  const [ordemDirecao, setOrdemDirecao] = useState<"asc" | "desc">("desc");

  const padraoViaClinica: "PF" | "PJ" = faturamentoPadrao === "PJ" ? "PJ" : "PF";

  const listaPerfis = useMemo(
    () =>
      normalizePerfisFaturamento({
        perfisFaturamento,
        dadosPJ,
        companyData,
        faturamentoPadrao: padraoViaClinica,
        cpf: profissionalCpf,
        chavePix,
        name: profissionalNome,
      }),
    [perfisFaturamento, dadosPJ, companyData, padraoViaClinica, profissionalCpf, chavePix, profissionalNome]
  );

  // Normalização unificada: Triagem Acessível + Convênio Corporativo + Carteira Externa + Empresas B2B
  const todosItensPacientes = useMemo<ItemPacienteFinanceiro[]>(() => {
    const lista: ItemPacienteFinanceiro[] = [];

    (pacientesParticulares || []).forEach((p) => {
      const sessoes: SessaoFaturamentoItem[] = Array.isArray(p.historicoSessoes)
        ? p.historicoSessoes
        : [];

      lista.push({
        id: p.id,
        nome: p.nome || p.nomeCompleto || "Paciente Particular",
        cpf: p.cpf || p.pacienteCpf || "",
        email: p.email || p.pacienteEmail || "",
        telefone: p.telefone || p.whatsapp || "",
        origemTipo: "particular",
        origemNome: "Triagem Acessível",
        perfilFaturamento: (p.perfilFaturamento as "PF" | "PJ") || padraoViaClinica,
        perfilFaturamentoId: p.perfilFaturamentoId,
        valorSessaoPadrao: Number(p.valorSessao || 100),
        sessoes,
        rawObject: p,
      });
    });

    (fichasCorporativas || []).forEach((f) => {
      const sessoes: SessaoFaturamentoItem[] = Array.isArray(f.historicoSessoes)
        ? f.historicoSessoes
        : [];

      const pNome =
        f.nomeCivil ||
        f.pacienteNomeCompleto ||
        f.dadosContrato?.pacienteNome ||
        (f.beneficiarioTipo === "dependente" && f.dependenteInfo
          ? f.dependenteInfo
          : f.colaboradorNome) ||
        f.colaboradorNome ||
        f.nome ||
        "Paciente Corporativo";

      lista.push({
        id: f.id,
        nome: pNome,
        cpf: f.cpf || f.pacienteCpf || f.dadosContrato?.pacienteCpf || "",
        email: f.email || f.pacienteEmail || f.colaboradorEmail || "",
        telefone:
          f.telefone ||
          f.pacienteTelefone ||
          f.colaboradorTelefone ||
          f.colaboradorWhatsapp ||
          "",
        origemTipo: "corporativo",
        origemNome: "Convênio Corporativo",
        perfilFaturamento: (f.perfilFaturamento as "PF" | "PJ") || padraoViaClinica,
        perfilFaturamentoId: f.perfilFaturamentoId,
        valorSessaoPadrao: Number(f.valorSessao || 80),
        sessoes,
        rawObject: f,
      });
    });

    if (
      pacientesExternos &&
      (isPlanoAvancado || pacientesExternos.length > 0)
    ) {
      pacientesExternos.forEach((p) => {
        const sessoes: SessaoFaturamentoItem[] = Array.isArray(p.historicoSessoes)
          ? p.historicoSessoes
          : [];

        lista.push({
          id: p.id,
          nome: p.nome || p.nomeCompleto || "Paciente Externo",
          cpf: p.cpf || p.pacienteCpf || "",
          email: p.email || p.pacienteEmail || "",
          telefone: p.telefone || p.whatsapp || "",
          origemTipo: "externo",
          origemNome: "Carteira Externa",
          perfilFaturamento: (p.perfilFaturamento as "PF" | "PJ") || padraoViaClinica,
          perfilFaturamentoId: p.perfilFaturamentoId,
          valorSessaoPadrao: Number(p.valorSessao || 100),
          sessoes,
          rawObject: p,
        });
      });
    }

    if (empresasB2B && (isPlanoAvancado || empresasB2B.length > 0)) {
      empresasB2B.forEach((emp) => {
        const servicosRaw = Array.isArray(emp.historicoServicos)
          ? emp.historicoServicos
          : [];

        const sessoesMapeadas: SessaoFaturamentoItem[] = servicosRaw.map((srv) => ({
          id: srv.id,
          numeroSessao: srv.numeroItem || 1,
          data: srv.data || "",
          horario: srv.horario,
          modalidade: srv.modalidade || "online",
          statusAtendimento:
            srv.statusExecucao === "cancelado"
              ? "desmarcada_antecedencia"
              : "realizada",
          valor: Number(srv.valor || 0),
          statusPagamento: srv.statusPagamento || "pendente",
          dataPagamento: srv.dataPagamento,
          formaPagamento:
            srv.formaPagamento === "Pix" ||
            srv.formaPagamento === "Cartão" ||
            srv.formaPagamento === "Dinheiro"
              ? srv.formaPagamento
              : srv.formaPagamento === "TED / Transferência"
              ? "Transferência"
              : "Outro",
          observacoes: srv.descricaoServico,
          perfilFaturamentoId: srv.perfilFaturamentoId || emp.perfilFaturamentoId,
          declararIrOverride: srv.declararIrOverride,
        }));

        lista.push({
          id: emp.id,
          nome: emp.nomeFantasia || emp.razaoSocial || "Empresa Cliente",
          cpf: emp.cnpj || "",
          email: emp.emailFinanceiroNf || emp.contatoEmail || "",
          telefone: emp.contatoTelefone || "",
          origemTipo: "empresa_b2b",
          origemNome: "Empresas (B2B)",
          perfilFaturamento: emp.perfilFaturamento || "PJ",
          perfilFaturamentoId: emp.perfilFaturamentoId,
          valorSessaoPadrao: Number(emp.valorServicoPadrao || 0),
          sessoes: sessoesMapeadas,
          rawObject: emp,
        });
      });
    }

    return lista;
  }, [
    pacientesParticulares,
    fichasCorporativas,
    pacientesExternos,
    empresasB2B,
    isPlanoAvancado,
  ]);

  const todasDespesas = useMemo(
    () =>
      resolveStoredExpenses(
        profissionalId || "prof_default",
        despesasProfissionais
      ),
    [profissionalId, despesasProfissionais]
  );

  const mesesDisponiveis = useMemo(() => {
    const setMeses = new Set<string>();
    setMeses.add(mesAtualStr);

    todosItensPacientes.forEach((p) => {
      p.sessoes.forEach((s) => {
        if (s.data && s.data.length >= 7) {
          const anoMes = s.data.substring(0, 7);
          setMeses.add(anoMes);
        }
      });
    });

    todasDespesas.forEach((d) => {
      if (d.date && d.date.length >= 7) {
        setMeses.add(d.date.substring(0, 7));
      }
    });

    return Array.from(setMeses).sort().reverse();
  }, [todosItensPacientes, todasDespesas, mesAtualStr]);

  const fmtMesExtenso = (strAnoMes: string) => {
    if (!strAnoMes || strAnoMes === "todas") return "Todas as Competências";
    const [ano, mes] = strAnoMes.split("-");
    const meses = [
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
    const idx = parseInt(mes, 10) - 1;
    return `${meses[idx] || mes} de ${ano}`;
  };

  const fmtMoeda = (val: number) =>
    `R$ ${Number(val || 0).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const dadosConsolidados = useMemo(() => {
    const linhas = todosItensPacientes.map((paciente) => {
      const perfilPadraoFicha = resolvePerfilFaturamentoAtivo(
        listaPerfis,
        paciente.perfilFaturamentoId,
        paciente.perfilFaturamento
      );

      const sessoesPeriodo = paciente.sessoes.filter((s) => {
        if (competenciaSelecionada === "todas") return true;
        return s.data && s.data.startsWith(competenciaSelecionada);
      });

      const sessoesValidasBrutas = sessoesPeriodo.filter(
        (s) =>
          s.statusAtendimento === "realizada" ||
          (s.statusPagamento === "pago" &&
            s.statusAtendimento !== "desmarcada_antecedencia")
      );

      // Filtra as sessões da linha quando um filtro de Emissão/Perfil específico está ativo
      const sessoesValidas = sessoesValidasBrutas.filter((s) => {
        if (filtroPerfilEmissao === "todos") return true;
        const pSessao = resolvePerfilFaturamentoAtivo(
          listaPerfis,
          s.perfilFaturamentoId || paciente.perfilFaturamentoId,
          paciente.perfilFaturamento
        );
        const declaraIr = shouldDeclararIrForItem(s, pSessao);

        if (filtroPerfilEmissao === "PF") return pSessao.via === "PF";
        if (filtroPerfilEmissao === "PF_IR") return pSessao.via === "PF" && declaraIr;
        if (filtroPerfilEmissao === "PF_SEM_IR") return pSessao.via === "PF" && !declaraIr;
        if (filtroPerfilEmissao === "PJ") return pSessao.via === "PJ";
        if (filtroPerfilEmissao.startsWith("perfil:")) {
          const targetId = filtroPerfilEmissao.replace("perfil:", "");
          return pSessao.id === targetId;
        }
        return true;
      });

      let totalFaturadoPaciente = 0;
      let totalPagoPaciente = 0;
      let subtotalPfTributavel = 0;
      let subtotalPfSemIr = 0;
      let subtotalPj = 0;

      sessoesValidas.forEach((s) => {
        const val = Number(s.valor) || 0;
        totalFaturadoPaciente += val;
        if (s.statusPagamento === "pago") {
          totalPagoPaciente += val;
        }

        const pSessao = resolvePerfilFaturamentoAtivo(
          listaPerfis,
          s.perfilFaturamentoId || paciente.perfilFaturamentoId,
          paciente.perfilFaturamento
        );
        if (pSessao.via === "PJ") {
          subtotalPj += val;
        } else if (shouldDeclararIrForItem(s, pSessao)) {
          subtotalPfTributavel += val;
        } else {
          subtotalPfSemIr += val;
        }
      });

      const totalPendentePaciente = Math.max(0, totalFaturadoPaciente - totalPagoPaciente);

      return {
        ...paciente,
        perfilResolvido: perfilPadraoFicha,
        qtdSessoesPeriodo: sessoesValidas.length,
        sessoesValidas,
        totalFaturado: totalFaturadoPaciente,
        totalPago: totalPagoPaciente,
        totalPendente: totalPendentePaciente,
        subtotalPfTributavel,
        subtotalPfSemIr,
        subtotalPj,
        statusGeral:
          sessoesValidas.length === 0
            ? "sem_sessao"
            : totalPendentePaciente === 0
            ? "quitado"
            : totalPagoPaciente > 0
            ? "parcial"
            : "pendente",
      };
    });

    const linhasFiltradas = linhas.filter((item) => {
      if (buscaPaciente.trim()) {
        const termo = buscaPaciente.toLowerCase();
        const bateNome = item.nome.toLowerCase().includes(termo);
        const bateCpf = (item.cpf || "").toLowerCase().includes(termo);
        const bateOrigem = item.origemNome.toLowerCase().includes(termo);
        const batePerfil = formatPerfilCurtoLabel(item.perfilResolvido)
          .toLowerCase()
          .includes(termo);
        if (!bateNome && !bateCpf && !bateOrigem && !batePerfil) return false;
      }

      if (filtroOrigem === "setor_clinico" && item.origemTipo === "empresa_b2b") {
        return false;
      } else if (
        filtroOrigem !== "todas" &&
        filtroOrigem !== "setor_clinico" &&
        item.origemTipo !== filtroOrigem
      ) {
        return false;
      }

      if (filtroPerfilEmissao !== "todos") {
        // Se tem sessões no período após o filtro, mantém; se não tem sessões no período, verifica se o perfil padrão da ficha bate
        if (item.qtdSessoesPeriodo === 0) {
          const p = item.perfilResolvido;
          if (filtroPerfilEmissao === "PF" && p.via !== "PF") return false;
          if (filtroPerfilEmissao === "PF_IR" && (p.via !== "PF" || !p.declararIr))
            return false;
          if (filtroPerfilEmissao === "PF_SEM_IR" && (p.via !== "PF" || p.declararIr))
            return false;
          if (filtroPerfilEmissao === "PJ" && p.via !== "PJ") return false;
          if (
            filtroPerfilEmissao.startsWith("perfil:") &&
            p.id !== filtroPerfilEmissao.replace("perfil:", "")
          ) {
            return false;
          }
        }
      }

      if (filtroStatusPagamento === "pendente" && item.totalPendente <= 0) {
        return false;
      }
      if (
        filtroStatusPagamento === "quitado" &&
        (item.totalPendente > 0 || item.totalFaturado === 0)
      ) {
        return false;
      }

      return true;
    });

    let totalGeralFaturado = 0;
    let totalGeralPago = 0;
    let totalGeralPendente = 0;
    let totalSessoesGeral = 0;
    let totalPfTributavel = 0;
    let totalPfSemIr = 0;
    let totalPjFaturado = 0;
    let subtotalSetorClinico = 0;
    let subtotalSetorB2B = 0;

    linhasFiltradas.forEach((item) => {
      totalGeralFaturado += item.totalFaturado;
      totalGeralPago += item.totalPago;
      totalGeralPendente += item.totalPendente;
      totalSessoesGeral += item.qtdSessoesPeriodo;
      totalPfTributavel += item.subtotalPfTributavel;
      totalPfSemIr += item.subtotalPfSemIr;
      totalPjFaturado += item.subtotalPj;
      if (item.origemTipo === "empresa_b2b") {
        subtotalSetorB2B += item.totalFaturado;
      } else {
        subtotalSetorClinico += item.totalFaturado;
      }
    });

    // Conciliação de despesas conforme a competência e a visão setorial ativa
    const despesasDoPeriodoTodas = filterExpensesByCriteria(todasDespesas, {
      competencia: competenciaSelecionada,
      setor: "todos",
    });

    let despesasClinicasPeriodo = 0;
    let despesasB2BGeralPeriodo = 0;
    let despesasB2BEspecificoPeriodo = 0;
    const custosB2BPorEmpresa = new Map<string, number>();

    despesasDoPeriodoTodas.forEach((d) => {
      const val = Number(d.amount) || 0;
      if (resolveExpenseSector(d) === "empresa_b2b") {
        if (d.centroCustoTipo === "especifico" && d.empresaB2BId) {
          despesasB2BEspecificoPeriodo += val;
          custosB2BPorEmpresa.set(
            d.empresaB2BId,
            (custosB2BPorEmpresa.get(d.empresaB2BId) || 0) + val
          );
        } else {
          despesasB2BGeralPeriodo += val;
        }
      } else {
        despesasClinicasPeriodo += val;
      }
    });

    const despesasB2BTotalPeriodo =
      despesasB2BGeralPeriodo + despesasB2BEspecificoPeriodo;

    const totalDespesasEscopo =
      filtroOrigem === "todas"
        ? despesasClinicasPeriodo + despesasB2BTotalPeriodo
        : filtroOrigem === "empresa_b2b"
        ? despesasB2BTotalPeriodo
        : despesasClinicasPeriodo;

    const resultadoLiquidoEscopo = totalGeralFaturado - totalDespesasEscopo;
    const margemLiquidaEscopo =
      totalGeralFaturado > 0
        ? (resultadoLiquidoEscopo / totalGeralFaturado) * 100
        : 0;

    linhasFiltradas.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      if (ordemColuna === "nome") {
        valA = a.nome.toLowerCase();
        valB = b.nome.toLowerCase();
        return ordemDirecao === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else if (ordemColuna === "total") {
        valA = a.totalFaturado;
        valB = b.totalFaturado;
      } else if (ordemColuna === "pendente") {
        valA = a.totalPendente;
        valB = b.totalPendente;
      } else if (ordemColuna === "sessoes") {
        valA = a.qtdSessoesPeriodo;
        valB = b.qtdSessoesPeriodo;
      }

      return ordemDirecao === "asc" ? valA - valB : valB - valA;
    });

    const ticketMedio =
      totalSessoesGeral > 0 ? totalGeralFaturado / totalSessoesGeral : 0;

    return {
      totalGeralFaturado,
      totalGeralPago,
      totalGeralPendente,
      totalSessoesGeral,
      ticketMedio,
      totalPfTributavel,
      totalPfSemIr,
      totalPjFaturado,
      subtotalSetorClinico,
      subtotalSetorB2B,
      despesasClinicasPeriodo,
      despesasB2BGeralPeriodo,
      despesasB2BEspecificoPeriodo,
      despesasB2BTotalPeriodo,
      totalDespesasEscopo,
      resultadoLiquidoEscopo,
      margemLiquidaEscopo,
      custosB2BPorEmpresa,
      linhas: linhasFiltradas,
      totalPacientesComSessoes: linhasFiltradas.filter((l) => l.qtdSessoesPeriodo > 0)
        .length,
    };
  }, [
    todosItensPacientes,
    todasDespesas,
    listaPerfis,
    competenciaSelecionada,
    filtroOrigem,
    filtroPerfilEmissao,
    filtroStatusPagamento,
    buscaPaciente,
    ordemColuna,
    ordemDirecao,
  ]);

  React.useEffect(() => {
    if (onReceitaBrutaChange) {
      onReceitaBrutaChange(dadosConsolidados.totalGeralFaturado);
    }
  }, [dadosConsolidados.totalGeralFaturado, onReceitaBrutaChange]);

  const handleAbrirFichaItem = (item: any) => {
    if (item.origemTipo === "particular" && onSelecionarPacienteParticular) {
      onSelecionarPacienteParticular(item.rawObject);
    } else if (item.origemTipo === "corporativo" && onSelecionarFichaCorporativa) {
      onSelecionarFichaCorporativa(item.rawObject);
    } else if (item.origemTipo === "externo" && onSelecionarPacienteExterno) {
      onSelecionarPacienteExterno(item.rawObject);
    } else if (item.origemTipo === "empresa_b2b" && onSelecionarEmpresaB2B) {
      onSelecionarEmpresaB2B(item.rawObject);
    }
  };

  const handleDispararCobrancaWhatsApp = (item: any) => {
    const telClean = (item.telefone || "").replace(/\D/g, "");
    const isEmpresa = item.origemTipo === "empresa_b2b";
    const destinatario = isEmpresa ? item.nome : item.nome.split(" ")[0];
    const periodoTxt =
      competenciaSelecionada === "todas"
        ? "período geral"
        : fmtMesExtenso(competenciaSelecionada);

    const pAtivo: PerfilFaturamentoItem = item.perfilResolvido;
    const pixFinal =
      pAtivo?.via === "PJ"
        ? pAtivo.chavePixPJ || dadosPJ?.chavePixPJ || chavePix
        : pAtivo?.subtipo === "dinheiro_fisico"
        ? pAtivo.chavePix || ""
        : pAtivo?.chavePix || chavePix;

    let msg = `Olá, *${destinatario}*! Tudo bem?\n\n`;
    msg += isEmpresa
      ? `Segue o demonstrativo dos serviços corporativos prestados (*${periodoTxt}*):\n\n`
      : `Passando para compartilhar o fechamento dos seus atendimentos clínicos (*${periodoTxt}*):\n\n`;
    msg += `• *${isEmpresa ? "Serviços / Entregas" : "Sessões Realizadas"}:* ${
      item.qtdSessoesPeriodo
    }\n`;
    msg += `• *Valor Total:* ${fmtMoeda(item.totalFaturado)}\n`;
    msg += `• *Status:* ${
      item.totalPendente <= 0
        ? "Totalmente Quitado"
        : `Pendente: ${fmtMoeda(item.totalPendente)}`
    }\n\n`;

    if (pixFinal && item.totalPendente > 0) {
      msg += `*Chave Pix para Regularização (${formatPerfilCurtoLabel(pAtivo)}):*\n${pixFinal}\n\n`;
    }

    msg += isEmpresa
      ? `Fico à disposição para envio da NFS-e / recibo correspondente.\nAtenciosamente,\n*${
          profissionalNome || "Profissional Responsável"
        }*`
      : `Caso necessite de recibo para reembolso ou declaração, estou à disposição!\nAtenciosamente,\n*${
          profissionalNome || "Seu Profissional"
        }*`;

    const url = telClean
      ? `https://wa.me/55${telClean}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;

    window.open(url, "_blank");
    showToast("Mensagem de fechamento aberta no WhatsApp!", "success");
  };

  const handleExportarCsv = () => {
    if (dadosConsolidados.linhas.length === 0) {
      showToast("Nenhum dado para exportar.", "info");
      return;
    }

    const cabecalho = [
      "Tomador_Paciente_Empresa",
      "CPF_CNPJ",
      "Origem",
      "Via_Emissao",
      "Perfil_Conta",
      "Sessoes_Servicos_Periodo",
      "PF_Tributavel_IR_RS",
      "Caixa_Sem_IR_RS",
      "PJ_CNPJ_RS",
      "Total_Faturado_RS",
      "Total_Pago_RS",
      "Total_Pendente_RS",
      "Status",
    ];
    const linhasCsv = dadosConsolidados.linhas.map((l) => [
      `"${l.nome.replace(/"/g, '""')}"`,
      `"${l.cpf || ""}"`,
      `"${l.origemNome}"`,
      `"${l.perfilResolvido.via}"`,
      `"${formatPerfilCurtoLabel(l.perfilResolvido).replace(/"/g, '""')}"`,
      l.qtdSessoesPeriodo,
      l.subtotalPfTributavel.toFixed(2),
      l.subtotalPfSemIr.toFixed(2),
      l.subtotalPj.toFixed(2),
      l.totalFaturado.toFixed(2),
      l.totalPago.toFixed(2),
      l.totalPendente.toFixed(2),
      `"${l.statusGeral}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [cabecalho.join(";"), ...linhasCsv.map((e) => e.join(";"))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `fechamento_faturamento_${competenciaSelecionada}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("Planilha CSV exportada com sucesso!", "success");
  };

  const alternarOrdem = (coluna: "nome" | "total" | "pendente" | "sessoes") => {
    if (ordemColuna === coluna) {
      setOrdemDirecao((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setOrdemColuna(coluna);
      setOrdemDirecao("desc");
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. BARRA DE CONTROLE: VISÃO SETORIAL + COMPETÊNCIA, ORIGEM, EMISSÃO, STATUS E BUSCA */}
      <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-soft shadow-xs flex flex-col gap-3">
        {/* Linha Superior: Seletor Rápido de Visão Setorial (Consolidado vs Clínico vs Empresas B2B) */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-soft/70">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-forest/65 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-forest/70" />
              <span>Visão Setorial:</span>
            </span>
            <div className="inline-flex items-center gap-1 p-1 bg-warm/60 rounded-xl border border-soft overflow-x-auto max-w-full">
              <button
                type="button"
                onClick={() => setFiltroOrigem("todas")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  filtroOrigem === "todas"
                    ? "bg-white text-forest shadow-2xs font-bold"
                    : "text-forest/65 hover:text-forest"
                }`}
              >
                Consolidado · Tudo Somado
              </button>
              <button
                type="button"
                onClick={() => setFiltroOrigem("setor_clinico")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  filtroOrigem === "setor_clinico" ||
                  filtroOrigem === "particular" ||
                  filtroOrigem === "corporativo" ||
                  filtroOrigem === "externo"
                    ? "bg-white text-emerald-900 shadow-2xs font-bold"
                    : "text-forest/65 hover:text-forest"
                }`}
              >
                Setor Clínico / Consultório
              </button>
              {(isPlanoAvancado || (empresasB2B && empresasB2B.length > 0)) && (
                <button
                  type="button"
                  onClick={() => setFiltroOrigem("empresa_b2b")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    filtroOrigem === "empresa_b2b"
                      ? "bg-white text-amber-900 shadow-2xs font-bold"
                      : "text-forest/65 hover:text-forest"
                  }`}
                >
                  Setor Empresas (B2B)
                </button>
              )}
            </div>
          </div>

          <div className="text-[11px] text-forest/60 tabular-nums">
            {filtroOrigem === "todas"
              ? "Exibindo todas as receitas e despesas somadas (Clínico + Empresas B2B)"
              : filtroOrigem === "empresa_b2b"
              ? "Visão isolada do Setor Empresas (B2B) e seus centros de custo"
              : "Visão isolada do Setor Clínico / Consultório"}
          </div>
        </div>

        {/* Linha Inferior: Filtros Detalhados */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            <div className="flex items-center gap-2 bg-warm/40 px-3 py-1.5 rounded-xl border border-soft text-xs h-9">
              <Calendar className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-forest/60 whitespace-nowrap">
                Competência:
              </span>
              <select
                value={competenciaSelecionada}
                onChange={(e) => setCompetenciaSelecionada(e.target.value)}
                className="bg-transparent font-bold text-xs text-forest outline-none cursor-pointer"
              >
                <option value="todas">Todas as Competências</option>
                {mesesDisponiveis.map((m) => (
                  <option key={m} value={m}>
                    {fmtMesExtenso(m)} {m === mesAtualStr ? "· Atual" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-warm/30 px-2.5 py-1.5 rounded-xl border border-soft text-xs h-9">
              <span className="text-[10px] font-bold text-forest/60 uppercase whitespace-nowrap">
                Setor / Origem:
              </span>
              <select
                value={filtroOrigem}
                onChange={(e) => setFiltroOrigem(e.target.value as any)}
                className="bg-transparent font-medium text-xs text-forest outline-none cursor-pointer max-w-[195px]"
              >
                <optgroup label="Visão Setorial">
                  <option value="todas">Consolidado (Todos os Setores)</option>
                  <option value="setor_clinico">Setor Clínico (Todos os Pacientes)</option>
                  {(isPlanoAvancado || (empresasB2B && empresasB2B.length > 0)) && (
                    <option value="empresa_b2b">Setor Empresas (B2B)</option>
                  )}
                </optgroup>
                <optgroup label="Sub-origens do Setor Clínico">
                  <option value="particular">Triagem Acessível</option>
                  <option value="corporativo">Convênio Corporativo</option>
                  {(isPlanoAvancado ||
                    (pacientesExternos && pacientesExternos.length > 0)) && (
                    <option value="externo">Carteira Externa</option>
                  )}
                </optgroup>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-warm/30 px-2.5 py-1.5 rounded-xl border border-soft text-xs h-9">
              <span className="text-[10px] font-bold text-forest/60 uppercase whitespace-nowrap">
                Emissão:
              </span>
              <select
                value={filtroPerfilEmissao}
                onChange={(e) => setFiltroPerfilEmissao(e.target.value)}
                className="bg-transparent font-medium text-xs text-forest outline-none cursor-pointer max-w-[180px]"
              >
                <option value="todos">Todos (PF + Caixa + PJ)</option>
                <option value="PF_IR">PF Tributável (c/ IR)</option>
                <option value="PF_SEM_IR">Caixa Físico / Sem IR</option>
                <option value="PF">Toda Via PF (c/ e s/ IR)</option>
                <option value="PJ">Toda Via PJ (CNPJ)</option>
                {listaPerfis.length > 1 && (
                  <optgroup label="Por Conta / Empresa Específica">
                    {listaPerfis.map((p) => (
                      <option key={p.id} value={`perfil:${p.id}`}>
                        [{p.via}] {formatPerfilCurtoLabel(p)}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-warm/30 px-2.5 py-1.5 rounded-xl border border-soft text-xs h-9">
              <span className="text-[10px] font-bold text-forest/60 uppercase whitespace-nowrap">
                Status:
              </span>
              <select
                value={filtroStatusPagamento}
                onChange={(e) => setFiltroStatusPagamento(e.target.value as any)}
                className="bg-transparent font-medium text-xs text-forest outline-none cursor-pointer"
              >
                <option value="todos">Todos</option>
                <option value="pendente">Com Pendência</option>
                <option value="quitado">Quitados</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-forest/40 absolute left-2.5 pointer-events-none" />
              <input
                type="text"
                value={buscaPaciente}
                onChange={(e) => setBuscaPaciente(e.target.value)}
                placeholder="Buscar paciente, empresa, CPF/CNPJ..."
                className="pl-8 pr-3 py-1.5 bg-warm/30 border border-soft rounded-xl text-xs text-forest outline-none focus:border-forest/40 w-48 sm:w-56 h-9 transition-all"
              />
            </div>

            <button
              type="button"
              onClick={handleExportarCsv}
              className="px-3 py-1.5 bg-warm hover:bg-forest hover:text-white text-forest text-xs font-semibold rounded-xl border border-soft transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer h-9 shrink-0 whitespace-nowrap"
              title="Exportar planilha consolidada deste período para o Excel (.csv)"
            >
              <Download className="w-3.5 h-3.5 text-emerald-700" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. CARDS RESUMO / MÉTRICAS CONSOLIDADAS DO MÊS (RECEITA + DESPESAS + RESULTADO) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
        {/* Card 1: Receita Bruta */}
        <div className="bg-white p-4 rounded-2xl border border-soft shadow-2xs flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-forest/60">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {filtroOrigem === "todas"
                ? "Receita Consolidada"
                : filtroOrigem === "empresa_b2b"
                ? "Receita Setor B2B"
                : "Receita Setor Clínico"}
            </span>
            <DollarSign className="w-4 h-4 text-emerald-700" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-forest font-mono tabular-nums">
              {fmtMoeda(dadosConsolidados.totalGeralFaturado)}
            </div>
            <span className="text-[11px] text-forest/60 block mt-0.5 tabular-nums">
              {dadosConsolidados.totalSessoesGeral} lançamento(s) · Ticket{" "}
              {fmtMoeda(dadosConsolidados.ticketMedio)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 pt-2 border-t border-soft/60 text-[10px] text-forest/65 font-medium tabular-nums">
            {filtroOrigem === "todas" ? (
              <>
                <span>
                  Clínico: <strong>{fmtMoeda(dadosConsolidados.subtotalSetorClinico)}</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  B2B: <strong>{fmtMoeda(dadosConsolidados.subtotalSetorB2B)}</strong>
                </span>
              </>
            ) : (
              <>
                <span>
                  PF: <strong>{fmtMoeda(dadosConsolidados.totalPfTributavel + dadosConsolidados.totalPfSemIr)}</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  PJ: <strong>{fmtMoeda(dadosConsolidados.totalPjFaturado)}</strong>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Card 2: Total Já Recebido */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 shadow-2xs flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Total Já Recebido
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-emerald-700 font-mono tabular-nums">
              {fmtMoeda(dadosConsolidados.totalGeralPago)}
            </div>
            <span className="text-[11px] text-emerald-800/80 block mt-0.5 tabular-nums">
              {dadosConsolidados.totalGeralFaturado > 0
                ? `${Math.round(
                    (dadosConsolidados.totalGeralPago /
                      dadosConsolidados.totalGeralFaturado) *
                      100
                  )}% do faturamento quitado`
                : "Sem pendências"}
            </span>
          </div>
          <div className="pt-2 border-t border-emerald-100 text-[10px] text-emerald-800 font-semibold tabular-nums">
            PF c/ IR: {fmtMoeda(dadosConsolidados.totalPfTributavel)} · PJ:{" "}
            {fmtMoeda(dadosConsolidados.totalPjFaturado)}
          </div>
        </div>

        {/* Card 3: Pendente Recebimento */}
        <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-2xs flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-amber-900">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              A Receber
            </span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <div
              className={`text-xl font-extrabold font-mono tabular-nums ${
                dadosConsolidados.totalGeralPendente > 0
                  ? "text-amber-800"
                  : "text-forest/40"
              }`}
            >
              {fmtMoeda(dadosConsolidados.totalGeralPendente)}
            </div>
            <span className="text-[11px] text-amber-900/80 block mt-0.5">
              {dadosConsolidados.totalGeralPendente > 0
                ? "Aguardando pagamento"
                : "Nenhum valor em atraso"}
            </span>
          </div>
          <div className="pt-2 border-t border-amber-100 text-[10px] text-amber-900 font-semibold tabular-nums">
            {dadosConsolidados.totalPacientesComSessoes} ficha(s) ativa(s) no período
          </div>
        </div>

        {/* Card 4: Despesas do Período (Clínico + B2B Somadas ou Setorial) */}
        <div className="bg-white p-4 rounded-2xl border border-rose-200/80 shadow-2xs flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-rose-900">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {filtroOrigem === "todas"
                ? "Despesas Somadas"
                : filtroOrigem === "empresa_b2b"
                ? "Despesas B2B"
                : "Despesas Clínicas"}
            </span>
            <TrendingDown className="w-4 h-4 text-rose-700" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-rose-700 font-mono tabular-nums">
              {fmtMoeda(dadosConsolidados.totalDespesasEscopo)}
            </div>
            <span className="text-[11px] text-forest/60 block mt-0.5 tabular-nums">
              {filtroOrigem === "todas"
                ? `Clín.: ${fmtMoeda(dadosConsolidados.despesasClinicasPeriodo)} · B2B: ${fmtMoeda(dadosConsolidados.despesasB2BTotalPeriodo)}`
                : filtroOrigem === "empresa_b2b"
                ? `Centros: ${fmtMoeda(dadosConsolidados.despesasB2BEspecificoPeriodo)} · Geral: ${fmtMoeda(dadosConsolidados.despesasB2BGeralPeriodo)}`
                : "Custos operacionais clínicos"}
            </span>
          </div>
          <div className="pt-2 border-t border-rose-100 flex items-center justify-between text-[10px]">
            <span className="text-rose-900/75 font-medium">Custos do período</span>
            {onIrParaDespesas && (
              <button
                type="button"
                onClick={onIrParaDespesas}
                className="font-bold text-forest hover:underline cursor-pointer"
              >
                Abrir Despesas →
              </button>
            )}
          </div>
        </div>

        {/* Card 5: Resultado Líquido (Receita - Despesas) */}
        <div
          className={`p-4 rounded-2xl border shadow-2xs flex flex-col justify-between gap-2 ${
            dadosConsolidados.resultadoLiquidoEscopo >= 0
              ? "bg-forest text-white border-forest"
              : "bg-rose-950 text-white border-rose-900"
          }`}
        >
          <div className="flex items-center justify-between text-white/80">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Resultado Líquido
            </span>
            <Wallet className="w-4 h-4 text-sun" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-white font-mono tabular-nums">
              {fmtMoeda(dadosConsolidados.resultadoLiquidoEscopo)}
            </div>
            <span className="text-[11px] text-white/80 block mt-0.5 tabular-nums">
              Margem Líquida: <strong>{dadosConsolidados.margemLiquidaEscopo.toFixed(1)}%</strong>
            </span>
          </div>
          <div className="pt-2 border-t border-white/15 text-[10px] text-white/80">
            Receita Bruta menos Despesas
          </div>
        </div>
      </div>

      {/* 3. TABELA CONSOLIDADA DE FECHAMENTO (PACIENTES + EMPRESAS B2B) */}
      <div className="bg-white rounded-3xl border border-soft shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-gradient-to-r from-stone-50 via-warm/20 to-stone-50 border-b border-soft flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-forest">
              Planilha Consolidada por Paciente / Empresa ({dadosConsolidados.linhas.length})
            </h3>
          </div>
          <span className="text-[11px] text-forest/60 hidden sm:inline">
            Clique no nome para abrir a Ficha de Bordo completa
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-warm/40 text-[10px] font-bold uppercase tracking-wider text-forest/70 border-b border-soft select-none">
                <th
                  onClick={() => alternarOrdem("nome")}
                  className="py-2.5 px-3.5 cursor-pointer hover:bg-warm/70 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Paciente / Empresa Tomadora</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th className="py-2.5 px-3 min-w-[120px]">Origem</th>
                <th className="py-2.5 px-2.5 min-w-[115px]">Conta / Emissão</th>
                <th
                  onClick={() => alternarOrdem("sessoes")}
                  className="py-2.5 px-3 text-center cursor-pointer hover:bg-warm/70 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Itens</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => alternarOrdem("total")}
                  className="py-2.5 px-3 text-right cursor-pointer hover:bg-warm/70 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Total Período</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th className="py-2.5 px-3 text-right">Quitado</th>
                <th
                  onClick={() => alternarOrdem("pendente")}
                  className="py-2.5 px-3 text-right cursor-pointer hover:bg-warm/70 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Pendente</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th className="py-2.5 px-3 text-center min-w-[95px]">Status</th>
                <th className="py-2.5 px-3 text-right min-w-[100px]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-soft/60">
              {dadosConsolidados.linhas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-forest/50">
                    <div className="flex flex-col items-center gap-2">
                      <Calendar className="w-8 h-8 text-forest/20" />
                      <p className="text-xs font-semibold">
                        Nenhum paciente ou empresa localizada com os filtros selecionados.
                      </p>
                      <p className="text-[11px] text-forest/40">
                        Tente alterar a competência, a origem ou limpar o campo de busca.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                dadosConsolidados.linhas.map((item, idx) => {
                  const isPar = idx % 2 === 0;
                  const pAtivo = item.perfilResolvido;
                  const isEmpresaB2B = item.origemTipo === "empresa_b2b";

                  return (
                    <tr
                      key={`${item.origemTipo}-${item.id}`}
                      className={`hover:bg-emerald-50/40 transition-colors text-xs ${
                        isPar ? "bg-white" : "bg-[#FAF8F5]/40"
                      }`}
                    >
                      <td className="py-2.5 px-3.5">
                        <div className="flex flex-col">
                          <button
                            type="button"
                            onClick={() => handleAbrirFichaItem(item)}
                            className="font-bold text-forest text-left hover:text-emerald-700 hover:underline cursor-pointer truncate max-w-[200px] sm:max-w-xs"
                            title={item.nome}
                          >
                            {item.nome}
                          </button>
                          <span className="text-[10px] font-mono tabular-nums text-forest/50">
                            {item.cpf ? (
                              item.cpf
                            ) : (
                              <span className="text-amber-600 font-sans">
                                {isEmpresaB2B ? "CNPJ pendente" : "CPF pendente"}
                              </span>
                            )}
                          </span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        {item.origemTipo === "empresa_b2b" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-900">
                            <Briefcase className="w-3 h-3 shrink-0 text-amber-700" />
                            <span>Empresas (B2B)</span>
                          </span>
                        ) : item.origemTipo === "corporativo" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-900">
                            <Building2 className="w-3 h-3 shrink-0 text-blue-700" />
                            <span>Convênio Corp.</span>
                          </span>
                        ) : item.origemTipo === "externo" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-900">
                            <Globe className="w-3 h-3 shrink-0 text-purple-700" />
                            <span>Carteira Externa</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-900">
                            <User className="w-3 h-3 shrink-0 text-emerald-700" />
                            <span>Triagem Acessível</span>
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-2.5">
                        <div className="flex items-center gap-1.5">
                          {pAtivo.via === "PJ" ? (
                            <Building2 className="w-3 h-3 text-blue-700 shrink-0" />
                          ) : pAtivo.subtipo === "dinheiro_fisico" ? (
                            <Banknote className="w-3 h-3 text-amber-700 shrink-0" />
                          ) : (
                            <User className="w-3 h-3 text-emerald-700 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <span className="font-semibold text-[11px] text-forest truncate block max-w-[120px]">
                              {formatPerfilCurtoLabel(pAtivo)}
                            </span>
                            <span className="text-[10px] text-forest/50 font-mono">
                              {pAtivo.via === "PJ"
                                ? "CNPJ"
                                : pAtivo.declararIr && item.subtotalPfSemIr === 0
                                ? "PF c/ IR"
                                : item.subtotalPfTributavel > 0 && item.subtotalPfSemIr > 0
                                ? "Misto (c/ e s/ IR)"
                                : "Caixa s/ IR"}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <span className="font-semibold text-forest font-mono tabular-nums">
                          {item.qtdSessoesPeriodo}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <span className="font-bold text-forest font-mono tabular-nums block">
                          {fmtMoeda(item.totalFaturado)}
                        </span>
                        {isEmpresaB2B &&
                          (dadosConsolidados.custosB2BPorEmpresa.get(item.id) || 0) > 0 && (
                            <span className="text-[10px] font-mono tabular-nums text-rose-700 block">
                              Custos: -{fmtMoeda(dadosConsolidados.custosB2BPorEmpresa.get(item.id) || 0)}
                            </span>
                          )}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <span className="font-semibold text-emerald-700 font-mono tabular-nums">
                          {fmtMoeda(item.totalPago)}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        {item.totalPendente > 0 ? (
                          <span className="font-bold text-amber-700 font-mono tabular-nums">
                            {fmtMoeda(item.totalPendente)}
                          </span>
                        ) : (
                          <span className="text-forest/30 font-mono">—</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        {item.statusGeral === "quitado" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Quitado
                          </span>
                        ) : item.statusGeral === "parcial" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Parcial
                          </span>
                        ) : item.statusGeral === "pendente" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800">
                            Pendente
                          </span>
                        ) : (
                          <span className="text-[11px] text-forest/45">Sem item</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleAbrirFichaItem(item)}
                            className="p-1.5 text-forest/70 hover:text-forest hover:bg-warm rounded-lg transition-colors cursor-pointer border border-soft/60"
                            title="Abrir Ficha de Bordo detalhada"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDispararCobrancaWhatsApp(item)}
                            className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer border border-emerald-200/60"
                            title="Enviar fechamento e dados de pagamento no WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {dadosConsolidados.linhas.length > 0 && (
              <tfoot>
                <tr className="bg-warm/70 font-bold text-xs text-forest border-t-2 border-forest/20">
                  <td className="py-3 px-3.5" colSpan={3}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="uppercase tracking-wider text-[11px]">
                        Total Consolidado ({fmtMesExtenso(competenciaSelecionada)}):
                      </span>
                      <span className="text-[10px] text-forest/60 font-normal tabular-nums">
                        ({dadosConsolidados.linhas.length} registros listados)
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center font-mono tabular-nums font-bold">
                    {dadosConsolidados.totalSessoesGeral}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums font-extrabold text-forest">
                    {fmtMoeda(dadosConsolidados.totalGeralFaturado)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums font-extrabold text-emerald-700">
                    {fmtMoeda(dadosConsolidados.totalGeralPago)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums font-extrabold text-amber-700">
                    {fmtMoeda(dadosConsolidados.totalGeralPendente)}
                  </td>
                  <td
                    colSpan={2}
                    className="py-3 px-3 text-right text-[11px] text-forest/60 font-normal tabular-nums"
                  >
                    {dadosConsolidados.totalGeralPendente <= 0
                      ? "Fechamento 100% quitado"
                      : `A receber: ${fmtMoeda(dadosConsolidados.totalGeralPendente)}`}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
