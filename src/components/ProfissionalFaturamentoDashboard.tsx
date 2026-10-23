import React, { useState, useMemo } from "react";
import {
  Calendar,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Clock,
  Building2,
  User,
  Globe,
  Filter,
  Search,
  ExternalLink,
  MessageCircle,
  FileSpreadsheet,
  Download,
  ArrowUpDown,
  FileText,
  CreditCard,
  Layers,
  ChevronDown,
} from "lucide-react";
import { SessaoFaturamentoItem, DadosPessoaJuridica } from "./PacienteFaturamentoSpreadsheet";

export interface ItemPacienteFinanceiro {
  id: string;
  nome: string;
  cpf?: string;
  email?: string;
  telefone?: string;
  origemTipo: "particular" | "corporativo" | "externo";
  origemNome: string; // "Triagem Acessível", nome da Empresa ou "Carteira Externa"
  perfilFaturamento: "PF" | "PJ";
  valorSessaoPadrao: number;
  sessoes: SessaoFaturamentoItem[];
  rawObject: any;
}

interface ProfissionalFaturamentoDashboardProps {
  pacientesParticulares: any[];
  fichasCorporativas: any[];
  pacientesExternos?: any[];
  isPlanoAvancado?: boolean;
  dadosPJ?: DadosPessoaJuridica;
  profissionalNome?: string;
  chavePix?: string;
  onSelecionarPacienteParticular?: (paciente: any) => void;
  onSelecionarFichaCorporativa?: (ficha: any) => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export function ProfissionalFaturamentoDashboard({
  pacientesParticulares,
  fichasCorporativas,
  pacientesExternos,
  isPlanoAvancado,
  dadosPJ,
  profissionalNome,
  chavePix,
  onSelecionarPacienteParticular,
  onSelecionarFichaCorporativa,
  showToast,
}: ProfissionalFaturamentoDashboardProps) {
  // 1. Data atual para filtros padrão
  const hoje = new Date();
  const mesAtualStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;

  // 2. Filtros de Competência e Escopo
  const [competenciaSelecionada, setCompetenciaSelecionada] = useState<string>(mesAtualStr);
  const [filtroOrigem, setFiltroOrigem] = useState<"todas" | "particular" | "corporativo" | "externo">("todas");
  const [filtroPerfilEmissao, setFiltroPerfilEmissao] = useState<"todos" | "PF" | "PJ">("todos");
  const [filtroStatusPagamento, setFiltroStatusPagamento] = useState<"todos" | "pendente" | "quitado">("todos");
  const [buscaPaciente, setBuscaPaciente] = useState<string>("");
  const [ordemColuna, setOrdemColuna] = useState<"nome" | "total" | "pendente" | "sessoes">("total");
  const [ordemDirecao, setOrdemDirecao] = useState<"asc" | "desc">("desc");

  // 3. Normalização de todos os pacientes atendidos pelo profissional
  const todosItensPacientes = useMemo<ItemPacienteFinanceiro[]>(() => {
    const lista: ItemPacienteFinanceiro[] = [];

    // Pacientes Particulares (Triagem Acessível)
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
        perfilFaturamento: (p.perfilFaturamento as "PF" | "PJ") || "PF",
        valorSessaoPadrao: Number(p.valorSessao || 100),
        sessoes,
        rawObject: p,
      });
    });

    // Colaboradores Corporativos
    (fichasCorporativas || []).forEach((f) => {
      const sessoes: SessaoFaturamentoItem[] = Array.isArray(f.historicoSessoes)
        ? f.historicoSessoes
        : [];

      const pNome =
        f.pacienteNomeCompleto ||
        f.dadosContrato?.pacienteNome ||
        (f.beneficiarioTipo === "dependente" && f.dependenteInfo ? f.dependenteInfo : f.colaboradorNome) ||
        f.colaboradorNome ||
        "Colaborador Corporativo";

      lista.push({
        id: f.id,
        nome: pNome,
        cpf: f.pacienteCpf || f.cpf || f.dadosContrato?.pacienteCpf || "",
        email: f.pacienteEmail || f.colaboradorEmail || "",
        telefone: f.pacienteTelefone || f.colaboradorTelefone || f.colaboradorWhatsapp || "",
        origemTipo: "corporativo",
        origemNome: f.empresaNome || "Empresa Conveniada",
        perfilFaturamento: (f.perfilFaturamento as "PF" | "PJ") || "PF",
        valorSessaoPadrao: Number(f.valorSessao || 80),
        sessoes,
        rawObject: f,
      });
    });

    // Pacientes Externos (Carteira Externa - Plano Avançado)
    if (isPlanoAvancado && pacientesExternos) {
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
          perfilFaturamento: (p.perfilFaturamento as "PF" | "PJ") || "PF",
          valorSessaoPadrao: Number(p.valorSessao || 100),
          sessoes,
          rawObject: p,
        });
      });
    }

    return lista;
  }, [pacientesParticulares, fichasCorporativas, pacientesExternos, isPlanoAvancado]);

  // 4. Lista de Meses / Competências disponíveis a partir das sessões existentes
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

    return Array.from(setMeses).sort().reverse();
  }, [todosItensPacientes, mesAtualStr]);

  // Formatador de Mês por extenso (ex: 2026-10 -> Outubro/2026)
  const fmtMesExtenso = (strAnoMes: string) => {
    if (!strAnoMes || strAnoMes === "todas") return "Todas as Competências";
    const [ano, mes] = strAnoMes.split("-");
    const meses = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    const idx = parseInt(mes, 10) - 1;
    return `${meses[idx] || mes} de ${ano}`;
  };

  const fmtMoeda = (val: number) =>
    `R$ ${Number(val || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // 5. Filtragem e agregação por paciente no período selecionado
  const dadosConsolidados = useMemo(() => {
    let totalGeralFaturado = 0;
    let totalGeralPago = 0;
    let totalGeralPendente = 0;
    let totalSessoesGeral = 0;

    let totalPfFaturado = 0;
    let totalPjFaturado = 0;

    const linhas = todosItensPacientes.map((paciente) => {
      // Filtra sessões da competência selecionada
      const sessoesPeriodo = paciente.sessoes.filter((s) => {
        if (competenciaSelecionada === "todas") return true;
        return s.data && s.data.startsWith(competenciaSelecionada);
      });

      // Apenas sessões realizadas (ou agendadas se faturáveis)
      const sessoesValidas = sessoesPeriodo.filter(
        (s) => s.statusAtendimento === "realizada" || (s.statusPagamento === "pago" && s.statusAtendimento !== "desmarcada_antecedencia")
      );

      const totalFaturadoPaciente = sessoesValidas.reduce((sum, s) => sum + (Number(s.valor) || 0), 0);
      const totalPagoPaciente = sessoesValidas
        .filter((s) => s.statusPagamento === "pago")
        .reduce((sum, s) => sum + (Number(s.valor) || 0), 0);
      const totalPendentePaciente = Math.max(0, totalFaturadoPaciente - totalPagoPaciente);

      totalGeralFaturado += totalFaturadoPaciente;
      totalGeralPago += totalPagoPaciente;
      totalGeralPendente += totalPendentePaciente;
      totalSessoesGeral += sessoesValidas.length;

      if (paciente.perfilFaturamento === "PJ") {
        totalPjFaturado += totalFaturadoPaciente;
      } else {
        totalPfFaturado += totalFaturadoPaciente;
      }

      return {
        ...paciente,
        qtdSessoesPeriodo: sessoesValidas.length,
        sessoesValidas,
        totalFaturado: totalFaturadoPaciente,
        totalPago: totalPagoPaciente,
        totalPendente: totalPendentePaciente,
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

    // Aplicar filtros de tabela
    const linhasFiltradas = linhas.filter((item) => {
      // Filtro de busca
      if (buscaPaciente.trim()) {
        const termo = buscaPaciente.toLowerCase();
        const bateNome = item.nome.toLowerCase().includes(termo);
        const bateCpf = (item.cpf || "").includes(termo);
        const bateOrigem = item.origemNome.toLowerCase().includes(termo);
        if (!bateNome && !bateCpf && !bateOrigem) return false;
      }

      // Filtro de Origem
      if (filtroOrigem !== "todas" && item.origemTipo !== filtroOrigem) {
        return false;
      }

      // Filtro de Perfil de Emissão (PF vs PJ)
      if (filtroPerfilEmissao !== "todos" && item.perfilFaturamento !== filtroPerfilEmissao) {
        return false;
      }

      // Filtro de Status de Pagamento
      if (filtroStatusPagamento === "pendente" && item.totalPendente <= 0) {
        return false;
      }
      if (filtroStatusPagamento === "quitado" && (item.totalPendente > 0 || item.totalFaturado === 0)) {
        return false;
      }

      return true;
    });

    // Ordenação da tabela
    linhasFiltradas.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      if (ordemColuna === "nome") {
        valA = a.nome.toLowerCase();
        valB = b.nome.toLowerCase();
        return ordemDirecao === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
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

    const ticketMedio = totalSessoesGeral > 0 ? totalGeralFaturado / totalSessoesGeral : 0;

    return {
      totalGeralFaturado,
      totalGeralPago,
      totalGeralPendente,
      totalSessoesGeral,
      ticketMedio,
      totalPfFaturado,
      totalPjFaturado,
      linhas: linhasFiltradas,
      totalPacientesComSessoes: linhas.filter((l) => l.qtdSessoesPeriodo > 0).length,
    };
  }, [
    todosItensPacientes,
    competenciaSelecionada,
    filtroOrigem,
    filtroPerfilEmissao,
    filtroStatusPagamento,
    buscaPaciente,
    ordemColuna,
    ordemDirecao,
  ]);

  // Disparar cobrança amigável via WhatsApp
  const handleDispararCobrancaWhatsApp = (paciente: any) => {
    const telClean = (paciente.telefone || "").replace(/\D/g, "");
    const primeiroNome = paciente.nome.split(" ")[0];
    const periodoTxt = competenciaSelecionada === "todas" ? "período geral" : fmtMesExtenso(competenciaSelecionada);

    let msg = `Olá, *${primeiroNome}*! Tudo bem? 🌿\n\n`;
    msg += `Passando para compartilhar o fechamento dos seus atendimentos clínicos (*${periodoTxt}*):\n\n`;
    msg += `• *Sessões Realizadas:* ${paciente.qtdSessoesPeriodo}\n`;
    msg += `• *Valor Total:* ${fmtMoeda(paciente.totalFaturado)}\n`;
    msg += `• *Status:* ${paciente.totalPendente <= 0 ? "✅ Totalmente Quitado" : `Pendente: ${fmtMoeda(paciente.totalPendente)}`}\n\n`;

    const pixFinal = paciente.perfilFaturamento === "PJ"
      ? (dadosPJ?.chavePixPJ || chavePix)
      : chavePix;

    if (pixFinal && paciente.totalPendente > 0) {
      msg += `💳 *Chave Pix para Regularização (${paciente.perfilFaturamento === "PJ" ? "Conta da Empresa" : "Conta Profissional"}):*\n${pixFinal}\n\n`;
    }

    msg += `Caso necessite de recibo para reembolso ou declaração, estou à disposição!\nAtenciosamente,\n*${profissionalNome || "Seu Psicólogo"}*`;

    const url = telClean
      ? `https://wa.me/55${telClean}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;

    window.open(url, "_blank");
    showToast("Mensagem de fechamento aberta no WhatsApp!", "success");
  };

  // Exportar dados para CSV (Excel)
  const handleExportarCsv = () => {
    if (dadosConsolidados.linhas.length === 0) {
      showToast("Nenhum dado para exportar.", "info");
      return;
    }

    const cabecalho = ["Paciente", "CPF", "Origem", "Perfil_Emissao", "Sessoes_Periodo", "Total_Faturado_RS", "Total_Pago_RS", "Total_Pendente_RS", "Status"];
    const linhasCsv = dadosConsolidados.linhas.map((l) => [
      `"${l.nome.replace(/"/g, '""')}"`,
      `"${l.cpf || ""}"`,
      `"${l.origemNome}"`,
      `"${l.perfilFaturamento}"`,
      l.qtdSessoesPeriodo,
      l.totalFaturado.toFixed(2),
      l.totalPago.toFixed(2),
      l.totalPendente.toFixed(2),
      `"${l.statusGeral}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [cabecalho.join(";"), ...linhasCsv.map((e) => e.join(";"))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `fechamento_faturamento_${competenciaSelecionada}.csv`);
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
      {/* 1. BARRA DE CONTROLE: SELETOR DE COMPETÊNCIA, FILTROS E AÇÕES (ALINHADOS & HARMONIZADOS) */}
      <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-soft shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Esquerda: Filtros de Competência, Origem e Emissão em Linha */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          {/* Seletor de Mês/Competência */}
          <div className="flex items-center gap-2 bg-warm/40 px-3 py-1.5 rounded-xl border border-soft text-xs h-9">
            <Calendar className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-forest/60 whitespace-nowrap">Competência:</span>
            <select
              value={competenciaSelecionada}
              onChange={(e) => setCompetenciaSelecionada(e.target.value)}
              className="bg-transparent font-bold text-xs text-forest outline-none cursor-pointer"
            >
              <option value="todas">Todas as Competências</option>
              {mesesDisponiveis.map((m) => (
                <option key={m} value={m}>
                  {fmtMesExtenso(m)} {m === mesAtualStr ? "• Atual" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro de Origem */}
          <div className="flex items-center gap-1.5 bg-warm/30 px-2.5 py-1.5 rounded-xl border border-soft text-xs h-9">
            <span className="text-[10px] font-bold text-forest/60 uppercase whitespace-nowrap">Origem:</span>
            <select
              value={filtroOrigem}
              onChange={(e) => setFiltroOrigem(e.target.value as any)}
              className="bg-transparent font-medium text-xs text-forest outline-none cursor-pointer"
            >
              <option value="todas">Todas as Origens</option>
              <option value="particular">Triagem Acessível</option>
              <option value="corporativo">Corporativo</option>
              {isPlanoAvancado && <option value="externo">Carteira externa</option>}
            </select>
          </div>

          {/* Filtro de Perfil Fiscal */}
          <div className="flex items-center gap-1.5 bg-warm/30 px-2.5 py-1.5 rounded-xl border border-soft text-xs h-9">
            <span className="text-[10px] font-bold text-forest/60 uppercase whitespace-nowrap">Emissão:</span>
            <select
              value={filtroPerfilEmissao}
              onChange={(e) => setFiltroPerfilEmissao(e.target.value as any)}
              className="bg-transparent font-medium text-xs text-forest outline-none cursor-pointer"
            >
              <option value="todos">Todos (PF + PJ)</option>
              <option value="PF">Pessoa Física (PF)</option>
              <option value="PJ">Pessoa Jurídica (PJ)</option>
            </select>
          </div>
        </div>

        {/* Direita: Busca & Exportar CSV Alinhados na mesma altura */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-forest/40 absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              value={buscaPaciente}
              onChange={(e) => setBuscaPaciente(e.target.value)}
              placeholder="Buscar por nome ou CPF..."
              className="pl-8 pr-3 py-1.5 bg-warm/30 border border-soft rounded-xl text-xs text-forest outline-none focus:border-forest/40 w-44 sm:w-56 h-9 transition-all"
            />
          </div>

          <button
            type="button"
            onClick={handleExportarCsv}
            className="px-3 py-1.5 bg-warm hover:bg-forest hover:text-white text-forest text-xs font-semibold rounded-xl border border-soft transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer h-9 shrink-0 whitespace-nowrap"
            title="Exportar planilha consolidada deste mês para o Excel (.csv)"
          >
            <Download className="w-3.5 h-3.5 text-emerald-700" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* 2. CARDS RESUMO / MÉTRICAS CONSOLIDADAS DO MÊS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {/* Card 1: Total Faturado */}
        <div className="bg-white p-4 rounded-2xl border border-soft shadow-2xs flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-forest/60">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Faturado</span>
            <DollarSign className="w-4 h-4 text-emerald-700" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-extrabold text-forest font-serif">
              {fmtMoeda(dadosConsolidados.totalGeralFaturado)}
            </div>
            <span className="text-[11px] text-forest/60 block mt-0.5">
              {dadosConsolidados.totalSessoesGeral} sessão(ões) no período
            </span>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-soft/60 text-[10px] text-forest/60 font-medium">
            <span>PF: <strong>{fmtMoeda(dadosConsolidados.totalPfFaturado)}</strong></span>
            <span>•</span>
            <span>PJ: <strong>{fmtMoeda(dadosConsolidados.totalPjFaturado)}</strong></span>
          </div>
        </div>

        {/* Card 2: Total Quitado */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 shadow-2xs flex flex-col justify-between gap-2 bg-gradient-to-br from-emerald-50/40 to-white">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Já Recebido</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 font-serif">
              {fmtMoeda(dadosConsolidados.totalGeralPago)}
            </div>
            <span className="text-[11px] text-emerald-800/80 block mt-0.5">
              {dadosConsolidados.totalGeralFaturado > 0
                ? `${Math.round((dadosConsolidados.totalGeralPago / dadosConsolidados.totalGeralFaturado) * 100)}% do faturamento quitado`
                : "Sem pendências"}
            </span>
          </div>
          <div className="pt-2 border-t border-emerald-100 text-[10px] text-emerald-800 font-semibold">
            Saldo regularizado em conta
          </div>
        </div>

        {/* Card 3: Total Pendente */}
        <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-2xs flex flex-col justify-between gap-2 bg-gradient-to-br from-amber-50/40 to-white">
          <div className="flex items-center justify-between text-amber-900">
            <span className="text-[10px] font-bold uppercase tracking-wider">Pendente Recebimento</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <div className={`text-xl sm:text-2xl font-extrabold font-serif ${dadosConsolidados.totalGeralPendente > 0 ? "text-amber-800" : "text-forest/40"}`}>
              {fmtMoeda(dadosConsolidados.totalGeralPendente)}
            </div>
            <span className="text-[11px] text-amber-900/80 block mt-0.5">
              {dadosConsolidados.totalGeralPendente > 0 ? "Aguardando pagamento" : "Nenhum valor em atraso"}
            </span>
          </div>
          <div className="pt-2 border-t border-amber-100 text-[10px] text-amber-900 font-semibold">
            {dadosConsolidados.totalGeralPendente > 0 ? "Envie cobrança no WhatsApp" : "Todos os pacientes em dia"}
          </div>
        </div>

        {/* Card 4: Médias e Vidas */}
        <div className="bg-white p-4 rounded-2xl border border-soft shadow-2xs flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-forest/60">
            <span className="text-[10px] font-bold uppercase tracking-wider">Ticket Médio / Sessão</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-extrabold text-blue-950 font-serif">
              {fmtMoeda(dadosConsolidados.ticketMedio)}
            </div>
            <span className="text-[11px] text-forest/60 block mt-0.5">
              Por atendimento realizado
            </span>
          </div>
          <div className="pt-2 border-t border-soft/60 text-[10px] text-forest/60">
            <strong>{dadosConsolidados.totalPacientesComSessoes}</strong> paciente(s) com atendimentos
          </div>
        </div>
      </div>

      {/* 3. TABELA / GRID ESTILO EXCEL COMPACTA */}
      <div className="bg-white rounded-3xl border border-soft shadow-sm overflow-hidden">
        {/* Barra Superior da Planilha */}
        <div className="px-4 py-3 bg-gradient-to-r from-stone-50 via-warm/20 to-stone-50 border-b border-soft flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-forest">
              Planilha de Fechamento por Paciente ({dadosConsolidados.linhas.length})
            </h3>
          </div>
          <span className="text-[11px] text-forest/60 hidden sm:inline">
            Clique no cabeçalho para ordenar • Clique no paciente para abrir a ficha completa
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
                    <span>Paciente / Tomador</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th className="py-2.5 px-3 min-w-[110px]">Origem</th>
                <th className="py-2.5 px-2.5 min-w-[70px] text-center">Emissão</th>
                <th
                  onClick={() => alternarOrdem("sessoes")}
                  className="py-2.5 px-3 text-center cursor-pointer hover:bg-warm/70 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Sessões</span>
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
                      <p className="text-xs font-semibold">Nenhum paciente ou sessão localizada com os filtros selecionados.</p>
                      <p className="text-[11px] text-forest/40">Tente alterar a competência ou limpar o campo de busca.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                dadosConsolidados.linhas.map((item, idx) => {
                  const isPar = idx % 2 === 0;
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-emerald-50/40 transition-colors text-xs ${
                        isPar ? "bg-white" : "bg-[#FAF8F5]/40"
                      }`}
                    >
                      {/* Paciente e CPF */}
                      <td className="py-2.5 px-3.5">
                        <div className="flex flex-col">
                          <button
                            type="button"
                            onClick={() => {
                              if (item.origemTipo === "particular" && onSelecionarPacienteParticular) {
                                onSelecionarPacienteParticular(item.rawObject);
                              } else if (item.origemTipo === "corporativo" && onSelecionarFichaCorporativa) {
                                onSelecionarFichaCorporativa(item.rawObject);
                              }
                            }}
                            className="font-bold text-forest text-left hover:text-emerald-700 hover:underline cursor-pointer truncate max-w-[200px] sm:max-w-xs"
                            title={item.nome}
                          >
                            {item.nome}
                          </button>
                          <span className="text-[10px] font-mono text-forest/50">
                            {item.cpf ? item.cpf : <span className="text-amber-600 font-sans">CPF pendente</span>}
                          </span>
                        </div>
                      </td>

                      {/* Origem */}
                      <td className="py-2.5 px-3">
                        {item.origemTipo === "corporativo" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-900 bg-blue-50 border border-blue-200/70 px-2 py-0.5 rounded-md truncate max-w-[130px]" title={item.origemNome}>
                            <Building2 className="w-2.5 h-2.5 shrink-0 text-blue-700" />
                            <span className="truncate">{item.origemNome}</span>
                          </span>
                        ) : item.origemTipo === "externo" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-900 bg-purple-50 border border-purple-200/70 px-2 py-0.5 rounded-md" title="Carteira Externa">
                            <Globe className="w-2.5 h-2.5 shrink-0 text-purple-700" />
                            <span className="hidden sm:inline">Carteira Externa</span>
                            <span className="inline sm:hidden">Externo</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-900 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-md" title="Triagem Acessível">
                            <User className="w-2.5 h-2.5 shrink-0 text-emerald-700" />
                            <span className="hidden sm:inline">Triagem Acessível</span>
                            <span className="inline sm:hidden">Acessível</span>
                          </span>
                        )}
                      </td>

                      {/* Emissão (PF vs PJ) */}
                      <td className="py-2.5 px-2.5 text-center">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                            item.perfilFaturamento === "PJ"
                              ? "bg-blue-100 text-blue-800 border border-blue-200"
                              : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          }`}
                        >
                          {item.perfilFaturamento}
                        </span>
                      </td>

                      {/* Quantidade de Sessões */}
                      <td className="py-2.5 px-3 text-center">
                        <span className="font-semibold text-forest">
                          {item.qtdSessoesPeriodo}
                        </span>
                      </td>

                      {/* Total Faturado */}
                      <td className="py-2.5 px-3 text-right">
                        <span className="font-bold text-forest font-mono">
                          {fmtMoeda(item.totalFaturado)}
                        </span>
                      </td>

                      {/* Total Quitado */}
                      <td className="py-2.5 px-3 text-right">
                        <span className="font-semibold text-emerald-700 font-mono">
                          {fmtMoeda(item.totalPago)}
                        </span>
                      </td>

                      {/* Total Pendente */}
                      <td className="py-2.5 px-3 text-right">
                        {item.totalPendente > 0 ? (
                          <span className="font-bold text-amber-700 font-mono bg-amber-50 px-1.5 py-0.5 rounded">
                            {fmtMoeda(item.totalPendente)}
                          </span>
                        ) : (
                          <span className="text-forest/30 font-mono">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 text-center">
                        {item.statusGeral === "quitado" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                            Quitado
                          </span>
                        ) : item.statusGeral === "parcial" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <Clock className="w-2.5 h-2.5 text-amber-600" />
                            Parcial
                          </span>
                        ) : item.statusGeral === "pendente" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            Pendente
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] text-forest/50 bg-stone-100">
                            Sem sessão
                          </span>
                        )}
                      </td>

                      {/* Ações na mesma linha */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Abrir Ficha/Planilha */}
                          <button
                            type="button"
                            onClick={() => {
                              if (item.origemTipo === "particular" && onSelecionarPacienteParticular) {
                                onSelecionarPacienteParticular(item.rawObject);
                              } else if (item.origemTipo === "corporativo" && onSelecionarFichaCorporativa) {
                                onSelecionarFichaCorporativa(item.rawObject);
                              }
                            }}
                            className="p-1.5 text-forest/70 hover:text-forest hover:bg-warm rounded-lg transition-colors cursor-pointer border border-soft/60"
                            title="Abrir planilha detalhada e sessões deste paciente"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>

                          {/* WhatsApp Fechamento / Cobrança */}
                          <button
                            type="button"
                            onClick={() => handleDispararCobrancaWhatsApp(item)}
                            className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer border border-emerald-200/60"
                            title="Disparar resumo de fechamento e chave Pix no WhatsApp"
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

            {/* Linha de Totais da Planilha Estilo Excel */}
            {dadosConsolidados.linhas.length > 0 && (
              <tfoot>
                <tr className="bg-warm/70 font-bold text-xs text-forest border-t-2 border-forest/20">
                  <td className="py-3 px-3.5" colSpan={3}>
                    <div className="flex items-center gap-2">
                      <span className="uppercase tracking-wider text-[11px]">Total Geral ({fmtMesExtenso(competenciaSelecionada)}):</span>
                      <span className="text-[10px] text-forest/60 font-normal">
                        ({dadosConsolidados.linhas.length} pacientes listados)
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center font-bold">
                    {dadosConsolidados.totalSessoesGeral}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-extrabold text-forest">
                    {fmtMoeda(dadosConsolidados.totalGeralFaturado)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-extrabold text-emerald-700">
                    {fmtMoeda(dadosConsolidados.totalGeralPago)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-extrabold text-amber-700">
                    {fmtMoeda(dadosConsolidados.totalGeralPendente)}
                  </td>
                  <td colSpan={2} className="py-3 px-3 text-right text-[11px] text-forest/60 font-normal">
                    {dadosConsolidados.totalGeralPendente <= 0
                      ? "✅ Fechamento 100% quitado"
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
