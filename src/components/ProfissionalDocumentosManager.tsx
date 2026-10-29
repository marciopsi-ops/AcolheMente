import React, { useState, useEffect, useRef } from "react";
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
  Layers,
  FileSignature,
  Upload,
  Copy,
  ExternalLink,
  ChevronUp,
  ChevronDown,
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
import {
  DocumentoPsicologicoItem,
  TipoDocumentoPsicologico,
  SecaoDocumento,
  PerfilProfissionalEmissao,
  AssinaturaDocumento,
} from "../types/documentos";

interface ProfissionalDocumentosManagerProps {
  profissionalProfile: Record<string, any>;
  meusPacientes: Array<Record<string, any>>;
  pacientesExternos: Array<Record<string, any>>;
  showToast: (msg: string, type?: "success" | "info" | "error") => void;
  preselectedPaciente?: Record<string, any> | null;
}

const MODELOS_PADRAO: Record<TipoDocumentoPsicologico, { titulo: string; secoes: SecaoDocumento[] }> = {
  declaracao: {
    titulo: "Declaração de Comparecimento / Acompanhamento",
    secoes: [
      {
        id: "1",
        titulo: "Declaração de Atendimento",
        conteudo: "Declaro para os devidos fins de direito que o(a) paciente esteve sob meus cuidados profissionais de atendimento psicológico nesta data / período, tendo comparecido à sessão agendada.",
      },
    ],
  },
  atestado: {
    titulo: "Atestado Psicológico",
    secoes: [
      {
        id: "1",
        titulo: "Atestado de Necessidade de Afastamento",
        conteudo: "Atesto para os devidos fins que o(a) paciente necessita de afastamento de suas atividades laborais / escolares pelo período de dias especificado, a contar desta data, por motivos de tratamento de saúde mental (CID sob avaliação clínica).",
      },
    ],
  },
  relatorio: {
    titulo: "Relatório Psicológico",
    secoes: [
      {
        id: "1",
        titulo: "1. Identificação",
        conteudo: "Descrição detalhada do processo de atendimento psicoterapêutico prestado.",
      },
      {
        id: "2",
        titulo: "2. Histórico e Demanda",
        conteudo: "Motivo da busca pelo atendimento e principais queixas apresentadas.",
      },
      {
        id: "3",
        titulo: "3. Análise do Processo",
        conteudo: "Evolução no manejo emocional, adesão ao processo terapêutico e elaboração das demandas.",
      },
      {
        id: "4",
        titulo: "4. Conclusão",
        conteudo: "Considerações finais sobre o acompanhamento realizado.",
      },
    ],
  },
  laudo: {
    titulo: "Laudo Psicológico",
    secoes: [
      {
        id: "1",
        titulo: "1. Identificação e Finalidade",
        conteudo: "Finalidade da avaliação psicológica solicitada.",
      },
      {
        id: "2",
        titulo: "2. Procedimentos Metodológicos",
        conteudo: "Entrevistas clínicas, observação comportamental e instrumentos utilizados.",
      },
      {
        id: "3",
        titulo: "4. Análise e Discussão",
        conteudo: "Avaliação diagnóstica e funcional detalhada.",
      },
      {
        id: "4",
        titulo: "5. Conclusão e Recomendações",
        conteudo: "Conclusões técnicas e recomendações de encaminhamento ou intervenção.",
      },
    ],
  },
  parecer: {
    titulo: "Parecer Psicológico",
    secoes: [
      {
        id: "1",
        titulo: "1. Objetivo e Quesitos",
        conteudo: "Solicitação de avaliação técnica sobre o assunto em questão.",
      },
      {
        id: "2",
        titulo: "2. Análise Técnica",
        conteudo: "Fundamentação técnico-científica da psicologia sobre o tema.",
      },
      {
        id: "3",
        titulo: "3. Conclusão / Parecer",
        conteudo: "Resposta técnica conclusiva aos quesitos apresentados.",
      },
    ],
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
  const [finalidadeDoc, setFinalidadeDoc] = useState("Apresentação em empresa / instituição / processo");
  const [secoesDoc, setSecoesDoc] = useState<SecaoDocumento[]>(MODELOS_PADRAO.declaracao.secoes);
  
  // Opções Avançadas
  const [dadosPacienteIncluidos, setDadosPacienteIncluidos] = useState<string[]>([
    "nome",
    "nascimento",
    "cpf",
    "endereco",
  ]);
  const [configuracaoPaginas, setConfiguracaoPaginas] = useState<number>(1);
  const [senhaAcesso, setSenhaAcesso] = useState("");

  // Perfil Profissional de Emissão
  const [perfilEmissao, setPerfilEmissao] = useState<PerfilProfissionalEmissao>({
    nome: profissionalProfile?.name || profissionalProfile?.nome || "Profissional",
    profissao: "Psicólogo(a) Clínico(a)",
    crp: profissionalProfile?.crp || "00/00000",
    contato: profissionalProfile?.telefone || profissionalProfile?.email || "",
    cnpj: profissionalProfile?.cnpj || "",
    nomeEmpresa: profissionalProfile?.nomeEmpresa || "",
    enderecoProfissional: profissionalProfile?.enderecoProfissional || "",
  });

  // Assinatura
  const [assinaturaTipo, setAssinaturaTipo] = useState<"desenhada" | "imagem">("desenhada");
  const [assinaturaImagemData, setAssinaturaImagemData] = useState<string>("");
  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [assinaturaDesenhadaData, setAssinaturaDesenhadaData] = useState<string>("");

  const [isSalvando, setIsSalvando] = useState(false);
  const [documentoVisualizar, setDocumentoVisualizar] = useState<DocumentoPsicologicoItem | null>(null);
  const [linkGeradoModal, setLinkGeradoModal] = useState<string | null>(null);

  const profissionalId = profissionalProfile?.uid || profissionalProfile?.id;

  // Todos os pacientes disponíveis
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

  // Se houver paciente pré-selecionado
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
    setSecoesDoc(JSON.parse(JSON.stringify(MODELOS_PADRAO[novoTipo].secoes)));
  };

  // Canvas Drawing Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if ("touches" in e) {
      e.preventDefault();
    }
    setIsDrawing(true);
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    if ("touches" in e) {
      e.preventDefault();
    }
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#1b3022";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = signatureCanvasRef.current;
    if (canvas) {
      setAssinaturaDesenhadaData(canvas.toDataURL("image/png"));
    }
  };

  const clearCanvas = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setAssinaturaDesenhadaData("");
  };

  // Image Upload Handler (Transparent PNG support)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setAssinaturaImagemData(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Section handlers
  const handleAdicionarSecao = () => {
    setSecoesDoc((prev) => [
      ...prev,
      { id: Date.now().toString(), titulo: "Nova Seção", conteudo: "Digite o texto da seção aqui..." },
    ]);
  };

  const handleRemoverSecao = (id: string) => {
    if (secoesDoc.length <= 1) {
      showToast("O documento deve ter pelo menos uma seção.", "error");
      return;
    }
    setSecoesDoc((prev) => prev.filter((s) => s.id !== id));
  };

  const handleAtualizarSecao = (id: string, campo: "titulo" | "conteudo", valor: string) => {
    setSecoesDoc((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [campo]: valor } : s))
    );
  };

  const handleMoverSecao = (index: number, direcao: "cima" | "baixo") => {
    const novoIndex = direcao === "cima" ? index - 1 : index + 1;
    if (novoIndex < 0 || novoIndex >= secoesDoc.length) return;
    const copia = [...secoesDoc];
    const temp = copia[index];
    copia[index] = copia[novoIndex];
    copia[novoIndex] = temp;
    setSecoesDoc(copia);
  };

  // Salvar Documento
  const handleSalvarDocumento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pacienteSelecionadoId) {
      showToast("Por favor, selecione o paciente destinatário.", "error");
      return;
    }
    if (secoesDoc.some((s) => !s.conteudo.trim())) {
      showToast("Todas as seções devem conter texto preenchido.", "error");
      return;
    }

    setIsSalvando(true);
    try {
      const pacObj = todosPacientes.find((p) => (p.id || p.uid) === pacienteSelecionadoId);
      const nomePac = pacObj?.nome || pacObj?.nomeCivil || pacObj?.nomeDesejado || "Paciente";
      const agoraStr = new Date().toISOString();
      const numEmissao = `DOC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      // Substituir variáveis no conteúdo
      const secoesProcessadas = secoesDoc.map((s) => ({
        ...s,
        conteudo: s.conteudo
          .replace(/\[NOME_PACIENTE\]/g, nomePac)
          .replace(/\[CPF_PACIENTE\]/g, pacObj?.cpf || pacObj?.CPF || "Não informado"),
      }));

      const conteudoResumo = secoesProcessadas.map((s) => `${s.titulo}\n${s.conteudo}`).join("\n\n");
      const assinaturaFinal: AssinaturaDocumento = {
        tipo: assinaturaTipo,
        dados: assinaturaTipo === "desenhada" ? assinaturaDesenhadaData : assinaturaImagemData,
      };

      const docPayload = {
        profissionalId,
        pacienteId: pacienteSelecionadoId,
        pacienteNome: nomePac,
        tipo: tipoDoc,
        titulo: tituloDoc,
        conteudo: conteudoResumo,
        secoes: secoesProcessadas,
        dadosPacienteIncluidos,
        perfilProfissionalUsado: perfilEmissao,
        assinatura: assinaturaFinal,
        configuracaoPaginas,
        codigoAcesso: numEmissao,
        senhaAcesso: senhaAcesso.trim() || null,
        finalidade: finalidadeDoc,
        dataEmissao: agoraStr,
        numeroEmissao: numEmissao,
        whiteLabelEnabled: profissionalProfile?.whiteLabelEnabled || false,
        whiteLabelConfig: profissionalProfile?.whiteLabelConfig || null,
        companyData: profissionalProfile?.companyData || null,
        status: "emitido",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, "documentos_psicologicos"), docPayload);

      showToast("Documento emitido com sucesso!", "success");
      setShowModalCriar(false);
      setSenhaAcesso("");
    } catch (err: any) {
      console.error("Erro ao emitir documento:", err);
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

  const gerarLinkPublico = (docItem: DocumentoPsicologicoItem) => {
    const url = `${window.location.origin}/?documento=${docItem.id}&codigo=${docItem.numeroEmissao}`;
    navigator.clipboard.writeText(url);
    setLinkGeradoModal(url);
    showToast("Link de verificação segura copiado para a área de transferência!", "success");
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
              Plano Integrar & Degustação Acolher
            </span>
            <span className="text-xs text-forest/60 font-medium">Resolução CFP 06/2019</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-serif text-forest">
            Gerador de Documentos Psicológicos
          </h2>
          <p className="text-xs text-forest/70 mt-0.5 max-w-xl">
            Emita declarações, atestados, relatórios, laudos e pareceres com seções dinâmicas, perfis de emissão, assinatura manuscrita ou imagem PNG e formatação A4.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setTipoDoc("declaracao");
            setTituloDoc(MODELOS_PADRAO.declaracao.titulo);
            setSecoesDoc(JSON.parse(JSON.stringify(MODELOS_PADRAO.declaracao.secoes)));
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
        <div className="space-y-2.5">
          {docsFiltrados.map((docItem) => {
            const dataFmt = new Date(docItem.dataEmissao || docItem.createdAt?.toDate?.() || Date.now()).toLocaleDateString("pt-BR");
            return (
              <div
                key={docItem.id}
                className="bg-white px-4 py-3 rounded-2xl border border-soft shadow-2xs hover:border-emerald-300 hover:shadow-xs transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-forest/10 text-forest font-bold flex items-center justify-center text-xs shrink-0 font-serif">
                    {docItem.pacienteNome?.charAt(0) || "P"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-forest text-xs sm:text-sm truncate">
                        {docItem.pacienteNome}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 uppercase tracking-wide border border-emerald-200 shrink-0">
                        {docItem.tipo}
                      </span>
                      <span className="text-[11px] font-mono tabular-nums text-forest/50">
                        {docItem.numeroEmissao} · {dataFmt}
                      </span>
                    </div>
                    <p className="text-xs text-forest/80 font-medium truncate mt-0.5">
                      {docItem.titulo}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => gerarLinkPublico(docItem)}
                    className="p-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                    title="Copiar Link Seguro com Código de Acesso"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setDocumentoVisualizar(docItem)}
                    className="px-3 py-1.5 bg-forest text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 hover:bg-forest/90 transition-all cursor-pointer shadow-2xs"
                    title="Visualizar Page A4"
                  >
                    <FileText className="w-3.5 h-3.5 text-sun" />
                    <span>Visualizar / A4</span>
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
            );
          })}
        </div>
      )}

      {/* MODAL DE CRIAÇÃO AVANÇADA DE DOCUMENTO */}
      {showModalCriar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-emerald-200 overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[94vh]">
            <div className="bg-gradient-to-r from-forest to-emerald-900 text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-emerald-300">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold font-serif text-white">
                    Emitir Novo Documento Psicológico (Avançado)
                  </h3>
                  <p className="text-xs text-emerald-100/70">
                    Seções dinâmicas, dados personalizados, perfis e assinatura
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

            <form onSubmit={handleSalvarDocumento} className="p-6 overflow-y-auto flex flex-col gap-6 text-xs sm:text-sm">
              {/* Seção 1: Tipo e Paciente */}
              <div className="bg-warm/40 p-4 rounded-2xl border border-soft space-y-4">
                <h4 className="font-serif font-bold text-forest text-sm flex items-center gap-2">
                  <User className="w-4 h-4 text-forest" />
                  <span>1. Identificação do Paciente & Tipo</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-forest mb-1">
                      Tipo de Documento <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={tipoDoc}
                      onChange={(e) => handleTipoChange(e.target.value as TipoDocumentoPsicologico)}
                      className="w-full px-3 py-2.5 bg-white border border-soft rounded-xl text-forest font-semibold focus:outline-none focus:border-forest cursor-pointer text-xs"
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
                      className="w-full px-3 py-2.5 bg-white border border-soft rounded-xl text-forest font-semibold focus:outline-none focus:border-forest cursor-pointer text-xs"
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
                    Dados do Paciente a Exibir no Cabeçalho
                  </label>
                  <div className="flex flex-wrap gap-3 mt-1.5">
                    {[
                      { id: "nome", label: "Nome Completo (Obrigatório)" },
                      { id: "nascimento", label: "Data de Nascimento (Obrigatório)" },
                      { id: "cpf", label: "CPF" },
                      { id: "rg", label: "RG" },
                      { id: "endereco", label: "Endereço Residencial" },
                      { id: "telefone", label: "Telefone / Contato" },
                    ].map((item) => (
                      <label key={item.id} className="flex items-center gap-1.5 text-xs text-forest font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={dadosPacienteIncluidos.includes(item.id)}
                          disabled={item.id === "nome" || item.id === "nascimento"}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setDadosPacienteIncluidos([...dadosPacienteIncluidos, item.id]);
                            } else {
                              setDadosPacienteIncluidos(dadosPacienteIncluidos.filter((i) => i !== item.id));
                            }
                          }}
                          className="rounded text-forest focus:ring-forest cursor-pointer"
                        />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-forest mb-1">
                      Título do Documento <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={tituloDoc}
                      onChange={(e) => setTituloDoc(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 bg-white border border-soft rounded-xl text-forest font-bold focus:outline-none focus:border-forest text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-forest mb-1">
                      Finalidade (Ex: Apresentação em Empresa, Escola, Processo)
                    </label>
                    <input
                      type="text"
                      value={finalidadeDoc}
                      onChange={(e) => setFinalidadeDoc(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-soft rounded-xl text-forest focus:outline-none focus:border-forest text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 2: Construtor de Seções Dinâmicas */}
              <div className="bg-warm/40 p-4 rounded-2xl border border-soft space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif font-bold text-forest text-sm flex items-center gap-2">
                    <Layers className="w-4 h-4 text-forest" />
                    <span>2. Seções Dinâmicas do Documento (Laudos & Relatórios)</span>
                  </h4>
                  <button
                    type="button"
                    onClick={handleAdicionarSecao}
                    className="px-3 py-1.5 bg-forest text-white rounded-xl text-xs font-semibold flex items-center gap-1 hover:bg-forest/90 transition-all cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5 text-sun" />
                    <span>Adicionar Seção</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {secoesDoc.map((secao, index) => (
                    <div key={secao.id} className="bg-white p-4 rounded-2xl border border-soft shadow-2xs space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="w-6 h-6 rounded-full bg-forest text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                            {index + 1}
                          </span>
                          <input
                            type="text"
                            value={secao.titulo}
                            onChange={(e) => handleAtualizarSecao(secao.id, "titulo", e.target.value)}
                            placeholder="Título da Seção..."
                            className="w-full px-3 py-1.5 bg-warm/30 border border-soft rounded-xl font-bold text-xs text-forest focus:outline-none focus:border-forest"
                          />
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMoverSecao(index, "cima")}
                            disabled={index === 0}
                            className="p-1 text-forest/60 hover:text-forest disabled:opacity-30 cursor-pointer"
                            title="Mover para cima"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoverSecao(index, "baixo")}
                            disabled={index === secoesDoc.length - 1}
                            className="p-1 text-forest/60 hover:text-forest disabled:opacity-30 cursor-pointer"
                            title="Mover para baixo"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoverSecao(secao.id)}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                            title="Remover Seção"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <textarea
                        rows={4}
                        value={secao.conteudo}
                        onChange={(e) => handleAtualizarSecao(secao.id, "conteudo", e.target.value)}
                        placeholder="Texto detalhado da seção... Use [NOME_PACIENTE] ou [CPF_PACIENTE] se desejar."
                        className="w-full p-3 bg-warm/20 border border-soft rounded-xl text-xs text-forest focus:outline-none focus:border-forest leading-relaxed font-sans"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Seção 3: Perfil Profissional de Emissão & Paginação */}
              <div className="bg-warm/40 p-4 rounded-2xl border border-soft space-y-4">
                <h4 className="font-serif font-bold text-forest text-sm flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-forest" />
                  <span>3. Perfil de Emissão & Formatação A4</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-forest mb-1">Nome Profissional</label>
                    <input
                      type="text"
                      value={perfilEmissao.nome}
                      onChange={(e) => setPerfilEmissao({ ...perfilEmissao, nome: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-soft rounded-xl text-xs text-forest"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-forest mb-1">Profissão / Especialidade</label>
                    <input
                      type="text"
                      value={perfilEmissao.profissao}
                      onChange={(e) => setPerfilEmissao({ ...perfilEmissao, profissao: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-soft rounded-xl text-xs text-forest"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-forest mb-1">CRP</label>
                    <input
                      type="text"
                      value={perfilEmissao.crp}
                      onChange={(e) => setPerfilEmissao({ ...perfilEmissao, crp: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-soft rounded-xl text-xs text-forest"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-forest mb-1">Contato / E-mail / Tel</label>
                    <input
                      type="text"
                      value={perfilEmissao.contato}
                      onChange={(e) => setPerfilEmissao({ ...perfilEmissao, contato: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-soft rounded-xl text-xs text-forest"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-forest mb-1">Nome da Empresa / Consultório (Opcional)</label>
                    <input
                      type="text"
                      value={perfilEmissao.nomeEmpresa}
                      onChange={(e) => setPerfilEmissao({ ...perfilEmissao, nomeEmpresa: e.target.value })}
                      placeholder="Ex: Clínica Mente Saudável"
                      className="w-full px-3 py-2 bg-white border border-soft rounded-xl text-xs text-forest"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-forest mb-1">CNPJ (Opcional)</label>
                    <input
                      type="text"
                      value={perfilEmissao.cnpj}
                      onChange={(e) => setPerfilEmissao({ ...perfilEmissao, cnpj: e.target.value })}
                      placeholder="00.000.000/0001-00"
                      className="w-full px-3 py-2 bg-white border border-soft rounded-xl text-xs text-forest"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-soft/60">
                  <div>
                    <label className="block text-xs font-bold text-forest mb-1">
                      Quantidade Estimada de Páginas (A4 Enquadramento)
                    </label>
                    <select
                      value={configuracaoPaginas}
                      onChange={(e) => setConfiguracaoPaginas(parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-soft rounded-xl text-xs text-forest font-semibold cursor-pointer"
                    >
                      <option value={1}>1 Página (Padrão)</option>
                      <option value={2}>2 Páginas (Documentos Extensos)</option>
                      <option value={3}>3 Páginas (Laudos Complexos)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-forest mb-1">
                      Senha de Acesso para Link Público (Opcional)
                    </label>
                    <input
                      type="text"
                      value={senhaAcesso}
                      onChange={(e) => setSenhaAcesso(e.target.value)}
                      placeholder="Deixe em branco para acesso livre com o código"
                      className="w-full px-3 py-2 bg-white border border-soft rounded-xl text-xs text-forest"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 4: Opções de Assinatura (Manuscrita ou Imagem PNG Transparente) */}
              <div className="bg-warm/40 p-4 rounded-2xl border border-soft space-y-4">
                <h4 className="font-serif font-bold text-forest text-sm flex items-center gap-2">
                  <FileSignature className="w-4 h-4 text-forest" />
                  <span>4. Assinatura Digital do Profissional</span>
                </h4>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs font-bold text-forest cursor-pointer">
                    <input
                      type="radio"
                      name="assinaturaTipo"
                      checked={assinaturaTipo === "desenhada"}
                      onChange={() => setAssinaturaTipo("desenhada")}
                      className="text-forest cursor-pointer"
                    />
                    <span>Desenhar em Tela</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-forest cursor-pointer">
                    <input
                      type="radio"
                      name="assinaturaTipo"
                      checked={assinaturaTipo === "imagem"}
                      onChange={() => setAssinaturaTipo("imagem")}
                      className="text-forest cursor-pointer"
                    />
                    <span>Subir Imagem PNG (Fundo Transparente)</span>
                  </label>
                </div>

                {assinaturaTipo === "desenhada" ? (
                  <div className="space-y-2">
                    <div className="border-2 border-dashed border-forest/30 bg-white rounded-2xl p-2 flex flex-col items-center">
                      <canvas
                        ref={signatureCanvasRef}
                        width={500}
                        height={130}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className="w-full max-w-[500px] h-[130px] cursor-crosshair bg-warm/20 rounded-xl border border-soft touch-none"
                      />
                      <div className="flex items-center justify-between w-full max-w-[500px] mt-2 px-1">
                        <span className="text-[10px] text-forest/60">Desenhe sua assinatura com o mouse ou dedo.</span>
                        <button
                          type="button"
                          onClick={clearCanvas}
                          className="px-2 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          Limpar Assinatura
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="border-2 border-dashed border-forest/30 bg-white rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-warm/30 transition-all">
                      <Upload className="w-8 h-8 text-forest/50 mb-2" />
                      <span className="text-xs font-bold text-forest">Clique para enviar imagem PNG da assinatura</span>
                      <span className="text-[10px] text-forest/60 mt-1">Recomendado fundo transparente (PNG)</span>
                      <input type="file" accept="image/png, image/jpeg" onChange={handleImageUpload} className="hidden" />
                    </label>
                    {assinaturaImagemData && (
                      <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-soft">
                        <img src={assinaturaImagemData} alt="Prévia Assinatura" className="h-12 object-contain" />
                        <span className="text-xs text-emerald-700 font-bold">Assinatura carregada com sucesso!</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-soft">
                <button
                  type="button"
                  onClick={() => setShowModalCriar(false)}
                  className="px-4 py-2.5 rounded-xl border border-soft text-forest/70 hover:text-forest hover:bg-warm text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSalvando}
                  className="px-6 py-2.5 rounded-xl bg-forest hover:bg-forest/90 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {isSalvando ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 text-sun" />
                  )}
                  <span>Emitir Documento Oficial</span>
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
            <div className="bg-forest text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-sun" />
                <span className="font-bold font-serif text-sm sm:text-base">Visualização de Impressão (Padrão A4 Multi-página)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => gerarLinkPublico(documentoVisualizar)}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Copiar Link Seguro</span>
                </button>
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

            {/* A4 Sheet Container */}
            <div className="p-4 sm:p-8 overflow-y-auto bg-slate-100 flex justify-center flex-1">
              <div 
                className="w-full max-w-[210mm] min-h-[297mm] bg-white p-8 sm:p-14 shadow-xl rounded-xl border border-slate-200 flex flex-col justify-between text-slate-900 print:shadow-none print:border-none print:p-0"
                style={{
                  backgroundColor: documentoVisualizar.whiteLabelEnabled || profissionalProfile?.whiteLabelEnabled
                    ? (documentoVisualizar.whiteLabelConfig?.backgroundColor || profissionalProfile?.whiteLabelConfig?.backgroundColor || "#FFFFFF")
                    : "#FFFFFF"
                }}
              >
                <div>
                  {/* Timbrado Header */}
                  <div 
                    className="flex items-center justify-between pb-6 border-b-2 mb-8"
                    style={{ 
                      borderColor: documentoVisualizar.whiteLabelEnabled || profissionalProfile?.whiteLabelEnabled
                        ? (documentoVisualizar.whiteLabelConfig?.primaryColor || profissionalProfile?.whiteLabelConfig?.primaryColor || "#1b3022") + "33"
                        : "#1b302233" 
                    }}
                  >
                    <div className="flex items-center gap-3.5">
                      {documentoVisualizar.companyData?.logoEmpresaUrl || profissionalProfile?.companyData?.logoEmpresaUrl ? (
                        <img
                          src={documentoVisualizar.companyData?.logoEmpresaUrl || profissionalProfile?.companyData?.logoEmpresaUrl}
                          alt="Logo da Empresa"
                          className="w-12 h-12 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div 
                          className="w-12 h-12 rounded-full text-white font-bold flex items-center justify-center text-lg shrink-0"
                          style={{
                            backgroundColor: documentoVisualizar.whiteLabelEnabled || profissionalProfile?.whiteLabelEnabled
                              ? (documentoVisualizar.whiteLabelConfig?.primaryColor || profissionalProfile?.whiteLabelConfig?.primaryColor || "#1b3022")
                              : "#1b3022"
                          }}
                        >
                          {(documentoVisualizar.perfilProfissionalUsado?.nome || "P").charAt(0)}
                        </div>
                      )}
                      <div>
                        <h1 
                          className="font-serif font-bold text-base sm:text-lg"
                          style={{
                            color: documentoVisualizar.whiteLabelEnabled || profissionalProfile?.whiteLabelEnabled
                              ? (documentoVisualizar.whiteLabelConfig?.primaryColor || profissionalProfile?.whiteLabelConfig?.primaryColor || "#1b3022")
                              : "#1b3022"
                          }}
                        >
                          {documentoVisualizar.companyData?.razaoSocial || documentoVisualizar.perfilProfissionalUsado?.nome || "Profissional de Saúde"}
                        </h1>
                        <p className="text-xs text-slate-600 font-mono">
                          CRP {documentoVisualizar.perfilProfissionalUsado?.crp || "00/00000"} · {documentoVisualizar.perfilProfissionalUsado?.profissao || "Psicólogo(a)"}
                        </p>
                        {(documentoVisualizar.companyData?.razaoSocial || documentoVisualizar.perfilProfissionalUsado?.nomeEmpresa) && (
                          <p className="text-[11px] text-slate-500">
                            {documentoVisualizar.companyData?.razaoSocial || documentoVisualizar.perfilProfissionalUsado.nomeEmpresa} {documentoVisualizar.perfilProfissionalUsado?.cnpj || documentoVisualizar.companyData?.cnpj ? `(CNPJ: ${documentoVisualizar.companyData?.cnpj || documentoVisualizar.perfilProfissionalUsado.cnpj})` : ""}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right text-[11px] text-slate-500 font-mono">
                      <p 
                        className="font-bold"
                        style={{
                          color: documentoVisualizar.whiteLabelEnabled || profissionalProfile?.whiteLabelEnabled
                            ? (documentoVisualizar.whiteLabelConfig?.primaryColor || profissionalProfile?.whiteLabelConfig?.primaryColor || "#1b3022")
                            : "#1b3022"
                        }}
                      >
                        {documentoVisualizar.numeroEmissao}
                      </p>
                      <p>{new Date(documentoVisualizar.dataEmissao).toLocaleDateString("pt-BR")}</p>
                    </div>
                  </div>

                  {/* Título */}
                  <div className="text-center my-8">
                    <h2 
                      className="text-lg sm:text-xl font-bold font-serif uppercase tracking-wider underline decoration-2 underline-offset-8"
                      style={{
                        color: documentoVisualizar.whiteLabelEnabled || profissionalProfile?.whiteLabelEnabled
                          ? (documentoVisualizar.whiteLabelConfig?.primaryColor || profissionalProfile?.whiteLabelConfig?.primaryColor || "#1b3022")
                          : "#1b3022",
                        textDecorationColor: documentoVisualizar.whiteLabelEnabled || profissionalProfile?.whiteLabelEnabled
                          ? (documentoVisualizar.whiteLabelConfig?.secondaryColor || profissionalProfile?.whiteLabelConfig?.secondaryColor || "#f59e0b")
                          : "#f59e0b"
                      }}
                    >
                      {documentoVisualizar.titulo}
                    </h2>
                    <p className="text-xs text-slate-500 mt-2">
                      Finalidade: {documentoVisualizar.finalidade}
                    </p>
                  </div>

                  {/* Paciente Destinatário */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 text-xs text-slate-700 space-y-1">
                    <p 
                      className="font-bold mb-1 uppercase text-[10px] tracking-wider"
                      style={{
                        color: documentoVisualizar.whiteLabelEnabled || profissionalProfile?.whiteLabelEnabled
                          ? (documentoVisualizar.whiteLabelConfig?.primaryColor || profissionalProfile?.whiteLabelConfig?.primaryColor || "#1b3022")
                          : "#1b3022"
                      }}
                    >
                      Destinatário(a) / Paciente:
                    </p>
                    <p className="font-bold text-sm text-slate-900">{documentoVisualizar.pacienteNome}</p>
                  </div>

                  {/* Seções ou Conteúdo */}
                  {documentoVisualizar.secoes && documentoVisualizar.secoes.length > 0 ? (
                    <div className="space-y-6 my-6">
                      {documentoVisualizar.secoes.map((secao, idx) => (
                        <div key={secao.id || idx} className="space-y-2">
                          <h3 className="font-serif font-bold text-sm text-forest uppercase tracking-wide border-b border-slate-200 pb-1">
                            {idx + 1}. {secao.titulo}
                          </h3>
                          <p className="text-sm leading-relaxed text-slate-800 text-justify whitespace-pre-line pl-2">
                            {secao.conteudo}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm sm:text-base leading-relaxed text-slate-800 font-sans text-justify whitespace-pre-line my-6 px-2">
                      {documentoVisualizar.conteudo}
                    </div>
                  )}
                </div>

                {/* Rodapé & Assinatura */}
                <div className="pt-12 mt-auto border-t border-slate-200">
                  <div className="flex flex-col items-center justify-center mb-8">
                    {documentoVisualizar.assinatura?.dados ? (
                      <div className="mb-2 h-20 flex items-center justify-center">
                        <img
                          src={documentoVisualizar.assinatura.dados}
                          alt="Assinatura"
                          className="max-h-20 max-w-[240px] object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-64 border-b border-slate-400 mb-2 h-12"></div>
                    )}
                    <p className="font-bold text-sm text-slate-900">
                      {documentoVisualizar.perfilProfissionalUsado?.nome || "Profissional"}
                    </p>
                    <p className="text-xs text-slate-600 font-mono">
                      CRP {documentoVisualizar.perfilProfissionalUsado?.crp || "00/00000"}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono border-t border-slate-100 pt-4">
                    <span>Documento oficial emitido via plataforma AcolheMente · Nº {documentoVisualizar.numeroEmissao}</span>
                    <span>Página 1 de {documentoVisualizar.configuracaoPaginas || 1}</span>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Link Gerado */}
      {linkGeradoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white max-w-lg w-full p-6 rounded-3xl shadow-2xl border border-soft space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold font-serif text-forest">Link Seguro Gerado com Sucesso!</h3>
            <p className="text-xs text-forest/70">
              Qualquer destinatário (empresas, escolas, tribunais) poderá acessar o documento de forma segura através do link abaixo:
            </p>
            <div className="p-3 bg-warm/50 border border-soft rounded-xl text-xs font-mono text-forest break-all select-all">
              {linkGeradoModal}
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setLinkGeradoModal(null)}
                className="w-full py-2.5 bg-forest text-white rounded-xl text-xs font-bold hover:bg-forest/90 transition-all cursor-pointer"
              >
                Concluído
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
