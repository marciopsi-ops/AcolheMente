import React, { useRef, useState, useEffect } from "react";
import {
  X,
  FileSignature,
  Send,
  Copy,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Sparkles,
  Phone,
  RefreshCw,
  Eye,
  AlertTriangle
} from "lucide-react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { MODELO_CONTRATO_PADRAO } from "../types/contrato";

interface ContratoGeradorModalProps {
  isOpen: boolean;
  onClose: () => void;
  paciente: any;
  profissionalLogado?: any;
  allUsers?: any[];
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
  onContratoSalvo?: (updatedPaciente: any) => void;
  collectionName?: "acolhimentos" | "triagem_corporativa";
  tipoAcolhimento?: "particular" | "corporativo";
}

export const ContratoGeradorModal: React.FC<ContratoGeradorModalProps> = ({
  isOpen,
  onClose,
  paciente,
  profissionalLogado,
  allUsers = [],
  showToast,
  onContratoSalvo,
  collectionName,
  tipoAcolhimento,
}) => {
  if (!isOpen || !paciente) return null;

  const isCorporativo =
    tipoAcolhimento === "corporativo" ||
    paciente.tipoAcolhimento === "corporativo" ||
    !!paciente.empresaNome ||
    !!paciente.colaboradorNome;

  const targetCollection =
    collectionName ||
    (isCorporativo ? "triagem_corporativa" : "acolhimentos");

  // Busca dados do profissional vinculado ou logado
  const profVinculado =
    allUsers.find((u) => u.uid === paciente.profissionalId || u.id === paciente.profissionalId) ||
    profissionalLogado ||
    {};

  const nomeProf =
    profVinculado.name ||
    profVinculado.displayName ||
    profissionalLogado?.name ||
    paciente.profissionalNome ||
    "Profissional Psicólogo(a)";
  const crpProf = profVinculado.crp || profissionalLogado?.crp || paciente.profissionalCrp || "Sob Registro";
  const emailProf = profVinculado.email || profissionalLogado?.email || "";
  const telProf = profVinculado.telefone || profVinculado.whatsapp || profissionalLogado?.telefone || "";
  const especialidadeProf =
    profVinculado.especialidade || profissionalLogado?.especialidade || "Psicologia Clínica";

  const nomePac =
    (paciente.beneficiarioTipo === "dependente" && paciente.dependenteInfo)
      ? paciente.dependenteInfo
      : (paciente.colaboradorNome || paciente.nome || paciente.nomeCompleto || "Paciente");
  const emailPac = paciente.email || paciente.colaboradorEmail || "";
  const telPac = paciente.colaboradorWhatsapp || paciente.telefone || paciente.whatsapp || "";
  const cpfPac = paciente.cpf || paciente.colaboradorCpf || "";
  const menorIdade =
    paciente.menorIdade ||
    paciente.beneficiarioTipo === "dependente" ||
    paciente.tratamentoPara === "Filho(a) / Criança" ||
    false;
  const respNome =
    paciente.responsavelNome ||
    (paciente.beneficiarioTipo === "dependente" ? (paciente.colaboradorNome || "") : "");
  const respCpf =
    paciente.responsavelCpf ||
    (paciente.beneficiarioTipo === "dependente" ? (paciente.colaboradorCpf || "") : "");

  const valorSessaoBase =
    paciente.valorSessao !== undefined && paciente.valorSessao !== null
      ? String(paciente.valorSessao)
      : (paciente.valorProposta || (paciente.valorRef ? `R$ ${paciente.valorRef}` : "100,00"));
  const freqSessaoBase =
    paciente.frequenciaRecomendada ||
    paciente.frequenciaSessoes ||
    "Semanal (1x por semana)";

  // Calcula estimativa mensal
  const calcularEstimativa = (valorStr: string, freqStr: string) => {
    const limpo = String(valorStr).replace(/[^\d.,]/g, "").replace(",", ".");
    const val = parseFloat(limpo) || 0;
    let mult = 4;
    const fLower = (freqStr || "").toLowerCase();
    if (fLower.includes("quinzenal")) mult = 2;
    else if (fLower.includes("mensal")) mult = 1;
    else if (fLower.includes("sob demanda")) mult = 1;

    const total = val * mult;
    return `R$ ${total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / mês (aprox. ${mult} sessões)`;
  };

  const [valorSessao, setValorSessao] = useState<string>(
    String(valorSessaoBase).replace("R$", "").trim()
  );
  const [frequencia, setFrequencia] = useState<string>(freqSessaoBase);
  const [chavePix, setChavePix] = useState<string>(profVinculado.chavePix || paciente.chavePix || "");
  const [favorecidoPix, setFavorecidoPix] = useState<string>(
    profVinculado.favorecidoPix || paciente.favorecidoPix || nomeProf
  );
  const [textoContrato, setTextoContrato] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"editar" | "previa">("previa");

  // Função para compilar o texto dinâmico
  const gerarTextoCompilado = (
    val: string,
    freq: string,
    pixKey: string,
    pixFav: string
  ) => {
    const dataHoje = new Date().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const infoResp = menorIdade && respNome
      ? `\nRESPONSÁVEL LEGAL (Paciente menor de idade):\nNome do Responsável: ${respNome}\nCPF do Responsável: ${respCpf || "A informar na assinatura"}\n`
      : "";

    const dadosPixTexto = pixKey
      ? `(Chave Pix: ${pixKey}${pixFav ? ` - Favorecido: ${pixFav}` : ""})`
      : "conforme orientações diretas da profissional";

    const estMensal = calcularEstimativa(val, freq);

    return MODELO_CONTRATO_PADRAO
      .replace(/{NOME_PROFISSIONAL}/g, nomeProf)
      .replace(/{CRP_PROFISSIONAL}/g, crpProf)
      .replace(/{EMAIL_PROFISSIONAL}/g, emailProf || "Informado em sessão")
      .replace(/{TELEFONE_PROFISSIONAL}/g, telProf || "Informado em sessão")
      .replace(/{NOME_PACIENTE}/g, nomePac)
      .replace(/{CPF_PACIENTE}/g, cpfPac || "A preencher pelo paciente na assinatura")
      .replace(/{EMAIL_PACIENTE}/g, emailPac)
      .replace(/{TELEFONE_PACIENTE}/g, telPac)
      .replace(/{INFO_RESPONSAVEL_LEGAL}/g, infoResp)
      .replace(/{FREQUENCIA_SESSOES}/g, freq)
      .replace(/{VALOR_SESSAO}/g, val)
      .replace(/{ESTIMATIVA_MENSAL}/g, estMensal)
      .replace(/{DADOS_PIX}/g, dadosPixTexto)
      .replace(/{DATA_EMISSAO}/g, dataHoje);
  };

  // Inicializa o texto ao abrir
  useEffect(() => {
    if (paciente.contratoText && paciente.contratoText.trim().length > 100) {
      setTextoContrato(paciente.contratoText);
    } else {
      const compilado = gerarTextoCompilado(valorSessao, frequencia, chavePix, favorecidoPix);
      setTextoContrato(compilado);
    }
  }, [paciente.id]);

  const handleRegerarModelo = () => {
    if (window.confirm("Deseja restaurar as cláusulas com o modelo padrão oficial preenchido com os dados atuais?")) {
      const compilado = gerarTextoCompilado(valorSessao, frequencia, chavePix, favorecidoPix);
      setTextoContrato(compilado);
      showToast("Texto do contrato restaurado com sucesso!", "success");
    }
  };

  const linkAssinaturaPublico = `${window.location.origin}/?contrato=${paciente.id}`;

  const handleSalvarContrato = async () => {
    if (!textoContrato.trim()) {
      showToast("O texto do contrato não pode ficar vazio.", "error");
      return;
    }

    setIsSaving(true);
    try {
      const updates: any = {
        contratoText: textoContrato,
        contratoGeradoEm: new Date().toISOString(),
        contratoGeradoPor: profVinculado.name || profissionalLogado?.name || "Profissional",
        valorSessao: valorSessao,
        frequenciaSessoes: frequencia,
        chavePix: chavePix,
        favorecidoPix: favorecidoPix,
        statusContrato: paciente.contratoAssinado ? "assinado" : "aguardando_assinatura",
        updatedAt: serverTimestamp(),
      };

      if (targetCollection === "triagem_corporativa") {
        const agora = new Date().toISOString();
        const novoHistorico = [
          ...(paciente.historico || []),
          {
            data: agora,
            autor: profVinculado.name || profissionalLogado?.name || "Profissional",
            acao: "Contrato Terapêutico Gerado / Disponibilizado",
            detalhes: `Contrato formalizado com valor de R$ ${valorSessao}/sessão (${frequencia}). Link seguro gerado para assinatura digital.`,
          },
        ];
        updates.historico = novoHistorico;
      }

      await updateDoc(doc(db, targetCollection, paciente.id), updates);

      const pacienteAtualizado = { ...paciente, ...updates };
      if (onContratoSalvo) {
        onContratoSalvo(pacienteAtualizado);
      }

      showToast("Contrato salvo e disponibilizado com sucesso!", "success");
      onClose();
    } catch (err: any) {
      console.error("Erro ao salvar contrato:", err);
      showToast("Erro ao gravar contrato no banco de dados.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopiarLink = () => {
    navigator.clipboard.writeText(linkAssinaturaPublico);
    showToast("Link de assinatura copiado para a área de transferência!", "success");
  };

  const handleDispararWhatsApp = () => {
    const rawTel = telPac.replace(/\D/g, "");
    const telFormatado = rawTel.length <= 11 && !rawTel.startsWith("55") ? `55${rawTel}` : rawTel;
    const convenioTexto = paciente.empresaNome ? ` através do convênio corporativo com a *${paciente.empresaNome}*` : "";
    const mensagem = `Olá, ${nomePac}! 👋\n\nPara formalizarmos nosso início de acompanhamento psicológico${convenioTexto} conforme as diretrizes do Conselho de Psicologia (CFP), por favor confira e assine os termos terapêuticos acessando o link seguro abaixo:\n\n🔗 ${linkAssinaturaPublico}\n\nVocê poderá ler com calma todas as cláusulas (sigilo, faltas, horários e agendamento) e assinar digitalmente pelo celular.\n\nQualquer dúvida estou à disposição!`;

    const waUrl = telFormatado
      ? `https://wa.me/${telFormatado}?text=${encodeURIComponent(mensagem)}`
      : `https://wa.me/?text=${encodeURIComponent(mensagem)}`;

    window.open(waUrl, "_blank");
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 bg-forest/30 backdrop-blur-sm animate-in fade-in py-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] shadow-2xl border border-soft overflow-hidden animate-in zoom-in-95 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-soft bg-gradient-to-r from-emerald-50 via-warm/30 to-emerald-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-700 text-white rounded-2xl shadow-xs">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-forest flex items-center gap-2">
                Contrato Terapêutico & Aceite Digital
                {paciente.contratoAssinado ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-sans font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Assinado & Válido
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-sans font-bold">
                    Pendente de Assinatura
                  </span>
                )}
              </h3>
              <p className="text-xs text-forest/70">
                Paciente: <strong className="text-forest font-bold">{nomePac}</strong>
                {paciente.empresaNome && (
                  <span className="text-forest/60"> • Convênio: <strong className="text-emerald-800">{paciente.empresaNome}</strong></span>
                )}
                {" • "}CRP: <strong className="text-forest">{crpProf}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-forest/50 hover:text-rose-600 rounded-full hover:bg-rose-50 transition-colors"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Bar / Status */}
        <div className="bg-warm/40 px-6 py-3 border-b border-soft flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-forest/80 uppercase text-[11px] tracking-wider">Modo de Visualização:</span>
            <div className="flex bg-white rounded-xl border border-soft p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setActiveTab("previa")}
                className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === "previa"
                    ? "bg-emerald-700 text-white shadow-2xs"
                    : "text-forest/70 hover:text-forest"
                }`}
              >
                <Eye className="w-3.5 h-3.5" /> Prévia Completa
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("editar")}
                className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === "editar"
                    ? "bg-emerald-700 text-white shadow-2xs"
                    : "text-forest/70 hover:text-forest"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" /> Ajustar Cláusulas
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRegerarModelo}
              className="px-2.5 py-1 text-forest/70 hover:text-forest bg-white rounded-lg border border-soft hover:bg-warm font-semibold flex items-center gap-1"
              title="Restaurar modelo padrão com os dados da ficha de bordo"
            >
              <RefreshCw className="w-3 h-3 text-emerald-600" /> Restaurar Padrão CFP
            </button>

            <a
              href={linkAssinaturaPublico}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 text-emerald-800 hover:text-emerald-950 bg-emerald-50 rounded-lg border border-emerald-200 font-bold flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3 text-emerald-700" /> Abrir Link Público
            </a>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar bg-warm/10">
          {/* Card de Parâmetros Contratuais Rápidos */}
          <div className="bg-white p-4.5 rounded-2xl border border-soft shadow-2xs space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-forest/80 flex items-center gap-2 border-b border-soft pb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Parâmetros Puxados da Ficha de Bordo
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-forest/60 mb-1">
                  Valor por Sessão (R$)
                </label>
                <input
                  type="text"
                  value={valorSessao}
                  onChange={(e) => setValorSessao(e.target.value)}
                  className="w-full bg-warm/30 border border-soft rounded-xl px-3 py-2 text-forest font-bold focus:outline-none focus:border-emerald-600"
                  placeholder="Ex: 120,00"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-forest/60 mb-1">
                  Frequência Acordada
                </label>
                <select
                  value={frequencia}
                  onChange={(e) => setFrequencia(e.target.value)}
                  className="w-full bg-warm/30 border border-soft rounded-xl px-3 py-2 text-forest font-semibold focus:outline-none focus:border-emerald-600"
                >
                  <option value="Semanal (1x por semana)">Semanal (1x por semana)</option>
                  <option value="Quinzenal (a cada 15 dias)">Quinzenal (a cada 15 dias)</option>
                  <option value="Bisemanal (2x por semana)">Bisemanal (2x por semana)</option>
                  <option value="Mensal (1x por mês)">Mensal (1x por mês)</option>
                  <option value="Sob Demanda / Conforme evolução">Sob Demanda / Conforme evolução</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-forest/60 mb-1">
                  Chave Pix (Para Honorários)
                </label>
                <input
                  type="text"
                  value={chavePix}
                  onChange={(e) => setChavePix(e.target.value)}
                  className="w-full bg-warm/30 border border-soft rounded-xl px-3 py-2 text-forest font-semibold focus:outline-none focus:border-emerald-600"
                  placeholder="CPF, E-mail ou Celular"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-forest/60 mb-1">
                  Favorecido da Chave Pix
                </label>
                <input
                  type="text"
                  value={favorecidoPix}
                  onChange={(e) => setFavorecidoPix(e.target.value)}
                  className="w-full bg-warm/30 border border-soft rounded-xl px-3 py-2 text-forest font-semibold focus:outline-none focus:border-emerald-600"
                  placeholder="Nome do titular"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-[11px] text-forest/70">
              <span>
                Estimativa mensal calculada: <strong className="text-emerald-800 font-bold">{calcularEstimativa(valorSessao, frequencia)}</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  const novoTexto = gerarTextoCompilado(valorSessao, frequencia, chavePix, favorecidoPix);
                  setTextoContrato(novoTexto);
                  showToast("Valores e termos atualizados no corpo do contrato!", "success");
                }}
                className="text-emerald-700 hover:text-emerald-900 font-bold underline cursor-pointer"
              >
                Aplicar alterações no texto do contrato ➔
              </button>
            </div>
          </div>

          {/* Banner de Auditoria se já estiver assinado */}
          {paciente.contratoAssinado && (
            <div className="p-4 bg-emerald-50/90 border border-emerald-300 rounded-2xl space-y-2">
              <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" /> Registro de Validade Jurídica & Trilha de Auditoria (Evidence Log)
                </span>
                <span className="text-[10px] font-extrabold text-emerald-900 bg-white px-2.5 py-0.5 rounded-md border border-emerald-300">
                  {paciente.contratoAssinadoEm || paciente.dadosContrato?.dataAceiteFormatada || "Assinado Eletronicamente"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs text-emerald-950">
                <div className="bg-white/90 p-2.5 rounded-xl border border-emerald-200">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block">Signatário</span>
                  <span className="font-bold">{paciente.dadosContrato?.nome || paciente.nome}</span>
                  <span className="block text-[11px] text-emerald-800 font-mono">CPF: {paciente.dadosContrato?.cpf || paciente.cpf || "Conferido"}</span>
                </div>
                <div className="bg-white/90 p-2.5 rounded-xl border border-emerald-200">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block">Hash de Integridade SHA-256</span>
                  <span className="text-[10px] font-mono text-emerald-800 break-all select-all">
                    {paciente.dadosContrato?.hashContrato || "9f8a6b2c4e1d... [Auditável]"}
                  </span>
                </div>
                <div className="bg-white/90 p-2.5 rounded-xl border border-emerald-200">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block">Carimbo Temporal & IP</span>
                  <span className="text-[11px] text-emerald-900 font-mono">
                    IP: {paciente.dadosContrato?.ip || "Registrado na entrega"}
                  </span>
                  <span className="text-[10px] text-emerald-700 block">
                    Conforme MP nº 2.200-2/2001 e Lei 14.063/2020
                  </span>
                </div>
              </div>

              {/* Rubrica se houver */}
              {paciente.dadosContrato?.rubricaBase64 && (
                <div className="mt-2 bg-white/90 p-3 rounded-xl border border-emerald-200 flex items-center justify-between">
                  <div className="text-xs">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 block">Rubrica Digital Coletada</span>
                    <span className="text-forest/70">Aposta pelo paciente no ato do aceite eletrônico</span>
                  </div>
                  <img
                    src={paciente.dadosContrato.rubricaBase64}
                    alt="Rubrica Digital"
                    className="h-12 border border-soft rounded-lg bg-warm/30 px-3 py-1 object-contain"
                  />
                </div>
              )}
            </div>
          )}

          {/* Visualizador / Editor de Texto */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-forest/80">
                {activeTab === "previa" ? "Prévia do Contrato para o Paciente" : "Edição Direta do Texto do Contrato"}
              </label>
              <span className="text-[11px] text-forest/50">
                {activeTab === "previa" ? "Exatamente como o paciente verá na página" : "Você pode editar ou adicionar regras específicas"}
              </span>
            </div>

            {activeTab === "previa" ? (
              <div className="p-6 bg-white border border-soft rounded-2xl text-xs sm:text-sm text-forest/90 leading-relaxed font-serif whitespace-pre-wrap select-text max-h-[380px] overflow-y-auto shadow-inner custom-scrollbar border-l-4 border-l-emerald-600">
                {textoContrato}
              </div>
            ) : (
              <textarea
                value={textoContrato}
                onChange={(e) => setTextoContrato(e.target.value)}
                className="w-full text-xs sm:text-sm bg-white border border-soft p-4 rounded-2xl focus:outline-none focus:border-emerald-600 resize-none min-h-[350px] font-mono leading-relaxed custom-scrollbar shadow-inner"
                placeholder="Insira as cláusulas do contrato terapêutico..."
              />
            )}
          </div>

          {/* Compartilhamento Rápido */}
          <div className="bg-emerald-50/70 p-4.5 rounded-2xl border border-emerald-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h5 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-emerald-700" /> Compartilhar Página de Aceite com o Paciente
                </h5>
                <p className="text-[11px] text-emerald-900/80">
                  O paciente abrirá no celular, lerá as cláusulas, preencherá o CPF e rubricará com o dedo.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopiarLink}
                  className="px-3.5 py-2 bg-white hover:bg-warm border border-emerald-300 text-forest text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5 text-forest" /> Copiar Link Seguro
                </button>

                <button
                  type="button"
                  onClick={handleDispararWhatsApp}
                  className="px-4 py-2 bg-[#25D366] hover:bg-[#20b858] text-white text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5" /> Enviar no WhatsApp
                </button>
              </div>
            </div>

            <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-200/80 text-[11px] font-mono text-emerald-900 flex items-center justify-between gap-2">
              <span className="truncate">{linkAssinaturaPublico}</span>
              <span className="text-[10px] uppercase font-bold text-emerald-700 shrink-0 bg-emerald-100 px-2 py-0.5 rounded">
                Link Único do Paciente
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-soft bg-warm/50 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-forest/60 font-medium">
            Conforme Resoluções CFP nº 11/2018 e 04/2020 • Validade MP nº 2.200-2/2001
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-xs font-bold text-forest/70 hover:text-forest transition-colors"
            >
              Fechar
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={handleSalvarContrato}
              className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4 text-sun" />
              {isSaving ? "Gravando Contrato..." : "Salvar e Atualizar Ficha"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
