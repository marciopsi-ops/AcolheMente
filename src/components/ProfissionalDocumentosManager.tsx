import React, { useState, useEffect } from "react";
import {
  FileText,
  Plus,
  Printer,
  Download,
  Share2,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  User,
  Building2,
  Check,
  Lock,
  Sparkles,
} from "lucide-react";
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { DocumentoPsicologicoItem, TipoDocumentoPsicologico } from "../types/documentos";

interface ProfissionalDocumentosManagerProps {
  profissionalProfile: Record<string, any>;
  meusPacientes: Array<Record<string, any>>;
  pacientesExternos: Array<Record<string, any>>;
  showToast: (msg: string, type?: "success" | "info" | "error") => void;
  preselectedPaciente?: Record<string, any> | null;
}

const MODELOS_PADRAO: Record<TipoDocumentoPsicologico, { titulo: string; template: string }> = {
  declaracao: {
    titulo: "Declaração de Comparecimento / Acompanhamento",
    template: "Declaro para os devidos fins de direito que o(a) Sr.(a) [NOME_PACIENTE], portador(a) do CPF [CPF_PACIENTE], esteve sob meus cuidados profissionais de atendimento psicológico nesta data / período, tendo comparecido à sessão agendada.",
  },
  atestado: {
    titulo: "Atestado Psicológico",
    template: "Atesto para os devidos fins que o(a) Sr.(a) [NOME_PACIENTE], portador(a) do CPF [CPF_PACIENTE], necessita de afastamento de suas atividades laborais / escolares pelo período de [DIAS] dias, a contar desta data, por motivos de tratamento de saúde mental (CID-11 sob avaliação clínica).",
  },
  relatorio: {
    titulo: "Relatório Psicológico",
    template: "O presente relatório psicológico tem por finalidade descrever o processo de atendimento psicoterapêutico prestado ao(à) paciente [NOME_PACIENTE]. Durante os atendimentos realizados, observou-se evolução no manejo emocional, adesão ao processo terapêutico e elaboração das demandas apresentadas.",
  },
  laudo: {
    titulo: "Laudo Psicológico",
    template: "O presente laudo psicológico apresenta a avaliação diagnóstica e funcional do(a) paciente [NOME_PACIENTE], portador(a) do CPF [CPF_PACIENTE]. A avaliação foi conduzida com base em entrevistas clínicas e observação comportamental, concluindo pela presença de indicadores de [DIAGNOSTICO_OU_SINTOMAS], recomendando continuidade do acompanhamento.",
  },
  parecer: {
    titulo: "Parecer Psicológico",
    template: "Este parecer psicológico é emitido em resposta à solicitação de avaliação técnica sobre [ASSUNTO_SOLICITADO] referente ao(à) paciente [NOME_PACIENTE]. Do ponto de vista técnico-científico da psicologia, conclui-se que [PARECER_TECNICO].",
  },
};

export const ProfissionalDocumentosManager: React.FC<ProfissionalDocumentosManagerProps> = ({
  profissionalProfile,
  meusPacientes,
  pacientesExternos,
  showToast,
  preselectedPaciente,
}) => {
  const [documentos, setDocumentos] = useState<DocumentoPsicologicoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");

  // Modal de Criação / Edição
  const [showModalCriar, setShowModalCriar] = useState(false);
  const [tipoDoc, setTipoDoc] = useState<TipoDocumentoPsicologico>("declaracao");
  const [pacienteSelecionadoId, setPacienteSelecionadoId] = useState("");
  const [tituloDoc, setTituloDoc] = useState(MODELOS_PADRAO.declaracao.titulo);
  const [conteudoDoc, setConteudoDoc] = useState(MODELOS_PADRAO.declaracao.template);
  const [finalidadeDoc, setFinalidadeDoc] = useState("Apresentação em empresa / instituição");
  const [isSalvando, setIsSalvando] = useState(false);

  // Modal de Visualização (Page A4)
  const [documentoVisualizar, setDocumentoVisualizar] = useState<DocumentoPsicologicoItem | null>(null);

  const profissionalId = profissionalProfile?.uid || profissionalProfile?.id;

  // Todos os pacientes disponíveis (acessíveis + externos)
  const todosPacientes = React.useMemo(() => {
    const map = new Map();
    [...(meusPacientes || []), ...(pacientesExternos || [])].forEach((p) => {
      const id = p.id || p.uid;
      if (id) map.set(id, p);
    });
    return Array.from(map.values());
  }, [meusPacientes, pacientesExternos]);

  // Carregar documentos do Firestore
  useEffect(() => {
    if (!profissionalId) return;
    setLoading(true);
    const q = query(
      collection(db, "documentos_psicologicos"),
      where("profissionalId", "==", profissionalId),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: DocumentoPsicologicoItem[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as DocumentoPsicologicoItem);
        });
        setDocumentos(list);
        setLoading(false);
      },
      (err) => {
        console.error("Erro ao carregar documentos:", err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [profissionalId]);

  // Se houver paciente pré-selecionado ao abrir
  useEffect(() => {
    if (preselectedPaciente) {
      setPacienteSelecionadoId(preselectedPaciente.id || preselectedPaciente.uid || "");
      setShowModalCriar(true);
    }
  }, [preselectedPaciente]);

  // Atualizar template quando o tipo mudar
  const handleTipoChange = (novoTipo: TipoDocumentoPsicologico) => {
    setTipoDoc(novoTipo);
    setTituloDoc(MODELOS_PADRAO[novoTipo].titulo);
    setConteudoDoc(MODELOS_PADRAO[novoTipo].template);
  };

  const handleSalvarDocumento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pacienteSelecionadoId) {
      showToast("Por favor, selecione o paciente destinatário do documento.", "error");
      return;
    }
    if (!conteudoDoc.trim()) {
      showToast("O conteúdo do documento não pode estar vazio.", "error");
      return;
    }

    setIsSalvando(true);
    try {
      const pacObj = todosPacientes.find((p) => (p.id || p.uid) === pacienteSelecionadoId);
      const nomePac = pacObj?.nome || pacObj?.nomeCivil || pacObj?.nomeDesejado || "Paciente";
      const agoraStr = new Date().toISOString();
      const numEmissao = `DOC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      // Substituir variáveis automáticas básicas no texto se houver
      let textoFinal = conteudoDoc
        .replace(/\[NOME_PACIENTE\]/g, nomePac)
        .replace(/\[CPF_PACIENTE\]/g, pacObj?.CPF || pacObj?.cpf || "Não informado");

      await addDoc(collection(db, "documentos_psicologicos"), {
        profissionalId,
        pacienteId: pacienteSelecionadoId,
        pacienteNome: nomePac,
        tipo: tipoDoc,
        titulo: tituloDoc,
        conteudo: textoFinal,
        finalidade: finalidadeDoc,
        dataEmissao: agoraStr,
        numeroEmissao: numEmissao,
        status: "emitido",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      showToast("Documento emitido com sucesso!", "success");
      setShowModalCriar(false);
      setConteudoDoc(MODELOS_PADRAO.declaracao.template);
      setPacienteSelecionadoId("");
    } catch (err: any) {
      console.error("Erro ao salvar documento:", err);
      showToast("Erro ao emitir documento: " + (err.message || "Tente novamente"), "error");
    } finally {
      setIsSalvando(false);
    }
  };

  const handleExcluirDocumento = async (docId: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este documento emitido?")) return;
    try {
      await deleteDoc(doc(db, "documentos_psicologicos", docId));
      showToast("Documento excluído com sucesso.", "success");
    } catch (err) {
      console.error("Erro ao excluir documento:", err);
      showToast("Erro ao excluir documento.", "error");
    }
  };

  // Filtragem
  const docsFiltrados = documentos.filter((d) => {
    if (filtroTipo !== "todos" && d.tipo !== filtroTipo) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      d.pacienteNome?.toLowerCase().includes(term) ||
      d.titulo?.toLowerCase().includes(term) ||
      d.numeroEmissao?.toLowerCase().includes(term) ||
      d.conteudo?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="max-w-6xl w-full mx-auto flex flex-col gap-5 p-3 sm:p-6 animate-in fade-in">
      {/* Header & Ações */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-soft shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Plano Integrar
            </span>
            <span className="text-xs text-forest/60 font-medium">Resolução CFP 06/2019</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-serif text-forest">
            Gerador de Documentos Psicológicos
          </h2>
          <p className="text-xs text-forest/70 mt-0.5 max-w-xl">
            Emita declarações, atestados, relatórios, laudos e pareceres formatados em padrão A4 com o seu timbrado profissional.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setTipoDoc("declaracao");
            setTituloDoc(MODELOS_PADRAO.declaracao.titulo);
            setConteudoDoc(MODELOS_PADRAO.declaracao.template);
            setShowModalCriar(true);
          }}
          className="px-4 py-2.5 bg-forest hover:bg-forest/90 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4 text-sun" />
          <span>Novo Documento</span>
        </button>
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-soft shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-forest/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por paciente, título ou número..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-warm/50 border border-soft rounded-xl text-xs text-forest focus:outline-none focus:border-forest/50 focus:bg-white"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-forest/40 hover:text-forest text-xs cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar">
          {[
            { id: "todos", label: "Todos" },
            { id: "declaracao", label: "Declaração" },
            { id: "atestado", label: "Atestado" },
            { id: "relatorio", label: "Relatório" },
            { id: "laudo", label: "Laudo" },
            { id: "parecer", label: "Parecer" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFiltroTipo(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                filtroTipo === tab.id
                  ? "bg-forest text-white shadow-2xs"
                  : "bg-warm text-forest/70 hover:bg-forest/10 hover:text-forest border border-soft"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Documentos Emitidos */}
      {loading ? (
        <div className="py-20 text-center text-xs text-forest/60">Carregando documentos...</div>
      ) : docsFiltrados.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-soft space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 mx-auto flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <h4 className="font-serif font-bold text-forest text-base">Nenhum documento emitido</h4>
          <p className="text-xs text-forest/60 max-w-sm mx-auto">
            {searchTerm || filtroTipo !== "todos"
              ? "Nenhum resultado para os filtros aplicados."
              : "Clique em 'Novo Documento' acima para emitir seu primeiro atestado, laudo ou declaração."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {docsFiltrados.map((docItem) => {
            const dataFmt = new Date(docItem.dataEmissao || docItem.createdAt?.toDate?.() || Date.now()).toLocaleDateString("pt-BR");
            return (
              <div
                key={docItem.id}
                className="bg-white p-4 rounded-2xl border border-soft shadow-2xs hover:border-emerald-300 hover:shadow-xs transition-all flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 uppercase tracking-wide border border-emerald-200">
                      {docItem.tipo}
                    </span>
                    <span className="text-[11px] font-mono tabular-nums text-forest/55">
                      {docItem.numeroEmissao} · {dataFmt}
                    </span>
                  </div>
                  <h3 className="font-serif font-bold text-forest text-sm sm:text-base">
                    {docItem.titulo}
                  </h3>
                  <p className="text-xs font-semibold text-forest/80 mt-1">
                    Paciente: <span className="font-normal text-forest">{docItem.pacienteNome}</span>
                  </p>
                  <p className="text-[11px] text-forest/60 mt-1 line-clamp-2 bg-warm/40 p-2 rounded-xl border border-soft/60">
                    {docItem.conteudo}
                  </p>
                </div>

                <div className="pt-2 border-t border-soft/80 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-forest/50 truncate max-w-[180px]">
                    Finalidade: {docItem.finalidade}
                  </span>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setDocumentoVisualizar(docItem)}
                      className="px-2.5 py-1 bg-forest text-white rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-forest/90 transition-all cursor-pointer shadow-2xs"
                      title="Visualizar Page A4"
                    >
                      <FileText className="w-3.5 h-3.5 text-sun" />
                      <span>Visualizar Page</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleExcluirDocumento(docItem.id)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Excluir documento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE CRIAÇÃO DE DOCUMENTO */}
      {showModalCriar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-emerald-200 overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[92vh]">
            <div className="bg-gradient-to-r from-forest to-emerald-900 text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-emerald-300">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold font-serif text-white">
                    Emitir Novo Documento Psicológico
                  </h3>
                  <p className="text-xs text-emerald-100/70">
                    Em conformidade com a Resolução CFP 06/2019
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModalCriar(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSalvarDocumento} className="p-6 overflow-y-auto flex flex-col gap-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-forest mb-1">
                    Tipo de Documento <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={tipoDoc}
                    onChange={(e) => handleTipoChange(e.target.value as TipoDocumentoPsicologico)}
                    className="w-full px-3 py-2 bg-warm/40 border border-soft rounded-xl text-forest font-semibold focus:outline-none focus:border-forest cursor-pointer text-xs"
                  >
                    <option value="declaracao">Declaração</option>
                    <option value="atestado">Atestado Psicológico</option>
                    <option value="relatorio">Relatório Psicológico</option>
                    <option value="laudo">Laudo Psicológico</option>
                    <option value="parecer">Parecer Psicológico</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-forest mb-1">
                    Paciente Destinatário <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={pacienteSelecionadoId}
                    onChange={(e) => setPacienteSelecionadoId(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-warm/40 border border-soft rounded-xl text-forest font-semibold focus:outline-none focus:border-forest cursor-pointer text-xs"
                  >
                    <option value="">Selecione o paciente...</option>
                    {todosPacientes.map((p) => {
                      const id = p.id || p.uid;
                      const nome = p.nome || p.nomeCivil || p.nomeDesejado || "Paciente";
                      return (
                        <option key={id} value={id}>
                          {nome} {p.cpf ? `(CPF: ${p.cpf})` : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-forest mb-1">
                  Título do Documento <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={tituloDoc}
                  onChange={(e) => setTituloDoc(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-warm/30 border border-soft rounded-xl text-forest font-bold focus:outline-none focus:border-forest text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-forest mb-1">
                  Finalidade (Ex: Apresentação em empresa, escola, processo jurídico)
                </label>
                <input
                  type="text"
                  value={finalidadeDoc}
                  onChange={(e) => setFinalidadeDoc(e.target.value)}
                  className="w-full px-3 py-2 bg-warm/30 border border-soft rounded-xl text-forest focus:outline-none focus:border-forest text-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-forest">
                    Texto / Conteúdo Técnico <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-forest/60">
                    Variáveis [NOME_PACIENTE] e [CPF_PACIENTE] são preenchidas automaticamente.
                  </span>
                </div>
                <textarea
                  rows={8}
                  value={conteudoDoc}
                  onChange={(e) => setConteudoDoc(e.target.value)}
                  required
                  className="w-full p-3 bg-warm/30 border border-soft rounded-xl text-forest focus:outline-none focus:border-forest text-xs sm:text-sm leading-relaxed resize-y font-sans"
                />
              </div>

              {/* Checklist CFP informativo */}
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Conformidade Resolução CFP 06/2019:</span>
                </div>
                <p className="text-[11px] text-emerald-800/80 pl-5">
                  Este documento incluirá automaticamente sua identificação profissional (Nome, CRP), data atual, número de emissão e espaço para assinatura.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-soft mt-2">
                <button
                  type="button"
                  onClick={() => setShowModalCriar(false)}
                  className="px-4 py-2 rounded-xl border border-soft text-forest/70 hover:text-forest hover:bg-warm text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSalvando}
                  className="px-5 py-2 rounded-xl bg-forest hover:bg-forest/90 text-white text-xs font-semibold transition-all shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {isSalvando ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5 text-sun" />
                  )}
                  <span>Emitir Documento</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE VISUALIZAÇÃO DA PAGE A4 */}
      {documentoVisualizar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-soft overflow-hidden flex flex-col max-h-[96vh]">
            {/* Barra de Ações do Modal (Não sai na impressão) */}
            <div className="bg-forest text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-sun" />
                <span className="font-bold font-serif text-sm sm:text-base">Visualização de Impressão (Padrão A4)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-sun text-forest rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-sun/90 transition-colors cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir / Salvar PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDocumentoVisualizar(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* A4 Page Container (Área que simula a folha timbrada) */}
            <div className="p-4 sm:p-8 overflow-y-auto bg-slate-100 flex justify-center flex-1">
              <div className="w-full max-w-[210mm] min-h-[297mm] bg-white p-8 sm:p-12 shadow-xl rounded-xl border border-slate-200 flex flex-col justify-between text-slate-900 print:shadow-none print:border-none print:p-0">
                
                {/* TIMBRADO / CABEÇALHO */}
                <div>
                  <div className="flex items-center justify-between pb-6 border-b-2 border-forest/20 mb-8">
                    <div className="flex items-center gap-3">
                      {profissionalProfile?.photoURL ? (
                        <img
                          src={profissionalProfile.photoURL}
                          alt={profissionalProfile.name}
                          className="w-12 h-12 rounded-full object-cover border border-soft"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-forest text-white font-bold flex items-center justify-center text-lg">
                          {(profissionalProfile?.name || profissionalProfile?.nome || "P").charAt(0)}
                        </div>
                      )}
                      <div>
                        <h1 className="font-serif font-bold text-base sm:text-lg text-forest">
                          {profissionalProfile?.name || profissionalProfile?.nome || "Profissional de Saúde"}
                        </h1>
                        <p className="text-xs text-slate-600 font-mono">
                          CRP {profissionalProfile?.crp || "00/00000"} · Psicólogo(a) Clínico(a)
                        </p>
                      </div>
                    </div>

                    <div className="text-right text-[11px] text-slate-500 font-mono hidden sm:block">
                      <p>Emissão: {documentoVisualizar.numeroEmissao}</p>
                      <p>{new Date(documentoVisualizar.dataEmissao).toLocaleDateString("pt-BR")}</p>
                    </div>
                  </div>

                  {/* TÍTULO DO DOCUMENTO */}
                  <div className="text-center my-8">
                    <h2 className="text-lg sm:text-xl font-bold font-serif uppercase tracking-wider text-forest underline decoration-sun decoration-2 underline-offset-8">
                      {documentoVisualizar.titulo}
                    </h2>
                    <p className="text-xs text-slate-500 mt-2">
                      Finalidade: {documentoVisualizar.finalidade}
                    </p>
                  </div>

                  {/* CORPO DO TEXTO */}
                  <div className="text-sm sm:text-base leading-relaxed text-slate-800 font-sans text-justify whitespace-pre-line my-6 px-2 sm:px-6">
                    {documentoVisualizar.conteudo}
                  </div>
                </div>

                {/* RODAPÉ & ASSINATURA */}
                <div className="pt-12 mt-auto border-t border-slate-200">
                  <div className="flex flex-col items-center justify-center mb-8">
                    <div className="w-64 border-b border-slate-400 mb-2"></div>
                    <p className="font-bold text-sm text-slate-800">
                      {profissionalProfile?.name || profissionalProfile?.nome}
                    </p>
                    <p className="text-xs text-slate-600 font-mono">
                      CRP {profissionalProfile?.crp || "00/00000"}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono border-t border-slate-100 pt-4">
                    <span>Documento emitido digitalmente via plataforma AcolheMente</span>
                    <span>Nº Registro: {documentoVisualizar.numeroEmissao}</span>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
