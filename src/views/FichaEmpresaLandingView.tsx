import React, { useState, useEffect } from "react";
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  Building2,
  CheckCircle2,
  CreditCard,
  Users,
  FileText,
  Mail,
  Phone,
  ShieldCheck,
  Save,
  Copy,
  ExternalLink,
  AlertCircle,
  Briefcase,
  UserCheck,
  Sparkles,
  ArrowLeft,
  Lock,
  Unlock,
  Eye,
  EyeOff,
} from "lucide-react";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { EmpresaColaboradoresSpreadsheet, ColaboradorEmpresa } from "../components/EmpresaColaboradoresSpreadsheet";
import { CategoriaEmpresa, getEmpresaCategorias, hasEmpresaCategoria, getEmpresaPin } from "../types/corporativo";

interface FichaEmpresaLandingViewProps {
  empresaId: string;
  onBack: () => void;
  onGoHome?: () => void;
}

const PRODUTOS_SUGESTOES = [
  "Acolhimento Psicológico Online (Sessões Individuais)",
  "Plantão de Apoio Emocional & Escuta Ativa",
  "Palestras, Treinamentos & Workshops (NR-1)",
  "Diagnóstico de Clima Psicossocial",
  "Canal Confidencial de Ouvidoria e Suporte",
  "Rodas de Conversa & Dinâmicas de Grupo",
];

const FORMAS_PAGAMENTO_OPCOES = [
  "Boleto Bancário Mensal",
  "Faturamento via Nota Fiscal (30 dias)",
  "PIX Corporativo (PJ)",
  "Cartão de Crédito Corporativo",
  "Transferência Bancária (TED/DOC)",
  "Personalizado / Negociação em Contrato",
];

export function FichaEmpresaLandingView({
  empresaId,
  onBack,
  onGoHome,
}: FichaEmpresaLandingViewProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [createdEmpresaId, setCreatedEmpresaId] = useState<string | null>(null);
  const [createdPin, setCreatedPin] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeTab, setActiveTab] = useState<"empresa" | "colaboradores">("empresa");
  const [colaboradoresList, setColaboradoresList] = useState<ColaboradorEmpresa[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Parâmetros de URL para onboarding / novo vínculo com Canal Parceiro
  const isNovaEmpresa = empresaId === "nova" || empresaId === "novo";
  const urlParams = new URLSearchParams(window.location.search);
  const parceiroIdParam = urlParams.get("parceiro_id") || urlParams.get("parceiro") || urlParams.get("canal_id");

  // Proteção LGPD por Senha Numérica (PIN de 4 dígitos)
  const [empresaDoc, setEmpresaDoc] = useState<any>(null);
  const [parceiroDoc, setParceiroDoc] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (empresaId === "nova" || empresaId === "novo") return true;
    return sessionStorage.getItem(`ficha_empresa_auth_${empresaId}`) === "true";
  });
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [showPin, setShowPin] = useState(false);

  const [formData, setFormData] = useState({
    razaoSocial: "",
    cnpj: "",
    cpfResponsavel: "",
    nomeResponsavel: "",
    email: "",
    telefone: "",
    quantidadeVidas: "",
    produtosContratados: "",
    valoresDefinidos: "",
    formaPagamento: "",
    observacoesGerais: "",
  });

  const [nomeEmpresaExibicao, setNomeEmpresaExibicao] = useState("");
  const [empresaCategorias, setEmpresaCategorias] = useState<CategoriaEmpresa[]>(["empresa_direta"]);
  const [empresaPaiNome, setEmpresaPaiNome] = useState<string | undefined>(undefined);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  useEffect(() => {
    const fetchEmpresa = async () => {
      try {
        setLoading(true);

        if (isNovaEmpresa) {
          setIsAuthenticated(true);
          if (parceiroIdParam) {
            try {
              const pSnap = await getDoc(doc(db, "empresa_leads", parceiroIdParam));
              if (pSnap.exists()) {
                const pd = pSnap.data();
                setParceiroDoc({ id: pSnap.id, ...pd });
                setEmpresaPaiNome(pd.nomeEmpresa || pd.razaoSocial || "Canal Parceiro");
              }
            } catch (pErr) {
              console.warn("Canal parceiro não carregado:", pErr);
            }
          }
          setNomeEmpresaExibicao("Primeira Implantação de Empresa");
          setEmpresaCategorias(["empresa_conectada"]);
          setLoading(false);
          return;
        }

        const docSnap = await getDoc(doc(db, "empresa_leads", empresaId));
        if (docSnap.exists()) {
          const d = docSnap.data();
          const loadedDoc = { id: docSnap.id, ...d };
          setEmpresaDoc(loadedDoc);
          setNomeEmpresaExibicao(d.nomeEmpresa || d.razaoSocial || "Empresa Parceira");
          setEmpresaCategorias(getEmpresaCategorias(d as any));
          setEmpresaPaiNome(d.empresaPaiNome);
          if (Array.isArray(d.colaboradoresList)) {
            setColaboradoresList(d.colaboradoresList);
          }
          setFormData({
            razaoSocial: d.razaoSocial || d.nomeEmpresa || "",
            cnpj: d.cnpj || "",
            cpfResponsavel: d.cpfResponsavel || "",
            nomeResponsavel: d.nomeResponsavel || d.contatoNome || "",
            email: d.email || "",
            telefone: d.telefone || "",
            quantidadeVidas: d.quantidadeVidas || d.colaboradores || "",
            produtosContratados: d.produtosContratados || d.servicosOferecidos || "",
            valoresDefinidos: d.valoresDefinidos || d.valoresAcertados || "",
            formaPagamento: d.formaPagamento || "",
            observacoesGerais: d.observacoesGerais || d.registrosDeReunioes || "",
          });

          // Valida autenticação por sessão
          const sessionAuth = sessionStorage.getItem(`ficha_empresa_auth_${empresaId}`);
          if (sessionAuth === "true") {
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
          }
        } else {
          setErrorMsg("Empresa não encontrada no sistema. Verifique o link ou entre em contato com o suporte.");
        }
      } catch (err) {
        console.error("Erro ao carregar ficha de implantação da empresa:", err);
        setErrorMsg("Não foi possível carregar os dados. Verifique sua conexão e tente novamente.");
      } finally {
        setLoading(false);
      }
    };

    if (empresaId) {
      fetchEmpresa();
    } else {
      setLoading(false);
      setErrorMsg("Identificador da empresa ausente na URL.");
    }
  }, [empresaId]);

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaDoc) return;
    const expectedPin = getEmpresaPin(empresaDoc);
    if (
      pinInput.trim() === expectedPin ||
      (empresaDoc.pinAcessoRH && pinInput.trim() === empresaDoc.pinAcessoRH.trim()) ||
      (empresaDoc.pinAcesso && pinInput.trim() === empresaDoc.pinAcesso.trim())
    ) {
      setIsAuthenticated(true);
      sessionStorage.setItem(`ficha_empresa_auth_${empresaId}`, "true");
      setPinError("");
      setToastMsg("Acesso autorizado à Ficha de Implantação!");
    } else {
      setPinError("Senha numérica (PIN de 4 dígitos) incorreta. Tente novamente.");
    }
  };

  const handleLockAccess = () => {
    sessionStorage.removeItem(`ficha_empresa_auth_${empresaId}`);
    setIsAuthenticated(false);
    setPinInput("");
    setPinError("");
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setSavedSuccess(false);
  };

  const handleAddProduto = (produto: string) => {
    setFormData((prev) => {
      const atual = prev.produtosContratados || "";
      if (atual.includes(produto)) return prev;
      const novo = atual ? `${atual}\n• ${produto}` : `• ${produto}`;
      return { ...prev, produtosContratados: novo };
    });
    setSavedSuccess(false);
  };

  const handleUpdateColaboradores = async (newList: ColaboradorEmpresa[]) => {
    setColaboradoresList(newList);
    try {
      await updateDoc(doc(db, "empresa_leads", empresaId), {
        colaboradoresList: newList,
        updatedAt: serverTimestamp(),
      });
      setToastMsg("Lista de colaboradores sincronizada com sucesso!");
      setTimeout(() => setToastMsg(null), 3500);
    } catch (err) {
      console.error("Erro ao salvar colaboradores:", err);
      alert("Falha ao salvar colaboradores no servidor. Verifique sua conexão.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.razaoSocial.trim()) {
      alert("Por favor, preencha a Razão Social da empresa.");
      return;
    }
    if (!formData.cnpj.trim()) {
      alert("Por favor, preencha o CNPJ da empresa.");
      return;
    }

    try {
      setSaving(true);
      if (isNovaEmpresa) {
        const generatedPin = Math.floor(1000 + Math.random() * 9000).toString();
        const docRef = await addDoc(collection(db, "empresa_leads"), {
          razaoSocial: formData.razaoSocial.trim(),
          cnpj: formData.cnpj.trim(),
          cpfResponsavel: formData.cpfResponsavel.trim(),
          nomeResponsavel: formData.nomeResponsavel.trim(),
          email: formData.email.trim(),
          telefone: formData.telefone.trim(),
          quantidadeVidas: formData.quantidadeVidas.trim(),
          produtosContratados: formData.produtosContratados.trim(),
          valoresDefinidos: formData.valoresDefinidos.trim(),
          formaPagamento: formData.formaPagamento.trim(),
          observacoesGerais: formData.observacoesGerais.trim(),
          nomeEmpresa: formData.razaoSocial.trim(),
          contatoNome: formData.nomeResponsavel.trim(),
          colaboradores: formData.quantidadeVidas.trim(),
          servicosOferecidos: formData.produtosContratados.trim(),
          valoresAcertados: formData.valoresDefinidos.trim(),
          colaboradoresList: colaboradoresList,
          categorias: ["empresa_conectada"],
          tipoParceria: "empresa_conectada",
          canalParceiroId: parceiroIdParam || null,
          empresaMaeId: parceiroIdParam || null,
          empresaPaiId: parceiroIdParam || null,
          empresaPaiNome: parceiroDoc?.nomeEmpresa || parceiroDoc?.razaoSocial || empresaPaiNome || "Canal Parceiro",
          pinAcessoRH: generatedPin,
          fichaPreenchidaPelaEmpresa: true,
          fichaPreenchidaEm: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setCreatedEmpresaId(docRef.id);
        setCreatedPin(generatedPin);
        setSavedSuccess(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        await updateDoc(doc(db, "empresa_leads", empresaId), {
          razaoSocial: formData.razaoSocial.trim(),
          cnpj: formData.cnpj.trim(),
          cpfResponsavel: formData.cpfResponsavel.trim(),
          nomeResponsavel: formData.nomeResponsavel.trim(),
          email: formData.email.trim(),
          telefone: formData.telefone.trim(),
          quantidadeVidas: formData.quantidadeVidas.trim(),
          produtosContratados: formData.produtosContratados.trim(),
          valoresDefinidos: formData.valoresDefinidos.trim(),
          formaPagamento: formData.formaPagamento.trim(),
          observacoesGerais: formData.observacoesGerais.trim(),
          // Mantém sincronizado com as chaves históricas para compatibilidade
          nomeEmpresa: formData.razaoSocial.trim(),
          contatoNome: formData.nomeResponsavel.trim(),
          colaboradores: formData.quantidadeVidas.trim(),
          servicosOferecidos: formData.produtosContratados.trim(),
          valoresAcertados: formData.valoresDefinidos.trim(),
          colaboradoresList: colaboradoresList,
          fichaPreenchidaPelaEmpresa: true,
          fichaPreenchidaEm: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setSavedSuccess(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      console.error("Erro ao salvar dados da Ficha de Implantação:", err);
      alert("Houve uma falha ao salvar as informações. Por favor, tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    const pin = empresaDoc ? getEmpresaPin(empresaDoc) : "";
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setToastMsg(pin ? `Link copiado! (PIN de Segurança: ${pin})` : "Link copiado!");
    setTimeout(() => setCopiedLink(false), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-warm p-6">
        <div className="w-12 h-12 border-4 border-sun-dark border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-forest font-semibold animate-pulse text-sm">
          Carregando Ficha de Implantação da Empresa...
        </p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-warm flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-soft max-w-md w-full">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="font-serif text-2xl text-forest mb-2">Ficha Indisponível</h2>
          <p className="text-forest/70 text-sm mb-6 leading-relaxed">{errorMsg}</p>
          <button
            onClick={onGoHome || onBack}
            className="w-full py-3 bg-sun text-forest font-semibold rounded-2xl hover:bg-sun-dark transition-colors text-sm"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  // TELA DE DESBLOQUEIO POR SENHA NUMÉRICA (PIN DE 4 DÍGITOS) - PROTEÇÃO LGPD
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-warm flex flex-col selection:bg-sun-dark/30">
        {/* Top Navbar */}
        <nav className="p-4 md:px-12 flex items-center justify-between bg-white/70 backdrop-blur-md sticky top-0 z-40 border-b border-soft">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={onGoHome || onBack}
            >
              <div className="w-10 h-10 bg-sun-dark rounded-xl flex items-center justify-center shadow-xs">
                <Building2 className="w-5 h-5 text-forest" />
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-xl font-bold tracking-tight text-forest leading-none">
                  AcolheMente
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest text-forest/60">
                  Corporativo & Saúde Mental
                </span>
              </div>
            </div>

            {/* Logo da Empresa no Topo */}
            {(empresaDoc?.logoUrl || empresaDoc?.logo || empresaDoc?.empresaLogo || empresaDoc?.logoBase64) && (
              <div className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-soft">
                <div className="w-8 h-8 rounded-lg bg-white border border-soft p-0.5 flex items-center justify-center overflow-hidden shadow-2xs">
                  <img
                    src={empresaDoc.logoUrl || empresaDoc.logo || empresaDoc.empresaLogo || empresaDoc.logoBase64}
                    alt={nomeEmpresaExibicao}
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <span className="text-xs font-bold text-forest max-w-[180px] truncate">
                  {nomeEmpresaExibicao}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={onGoHome || onBack}
            className="flex items-center gap-1.5 text-xs text-forest/80 hover:text-forest font-semibold px-3 py-2 rounded-xl hover:bg-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </button>
        </nav>

        {/* Card de Desbloqueio */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 sm:p-8 shadow-xl border border-soft relative overflow-hidden animate-in zoom-in-95">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-sun/20 rounded-full blur-2xl pointer-events-none" />

            <div className="text-center mb-6 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-forest text-sun flex items-center justify-center mx-auto mb-3 shadow-md">
                <Lock className="w-7 h-7" />
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 text-[11px] font-bold rounded-full border border-emerald-200 mb-2.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Acesso Seguro • Proteção LGPD
              </span>
              <h2 className="font-serif text-2xl font-bold text-forest">
                Ficha de Implantação da Empresa
              </h2>
              <p className="text-xs text-forest/70 mt-1.5 leading-relaxed">
                Esta página abriga dados contratuais e a planilha de colaboradores de{" "}
                <strong className="text-forest font-semibold">{nomeEmpresaExibicao}</strong>.
              </p>
            </div>

            {pinError && (
              <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{pinError}</span>
              </div>
            )}

            <form onSubmit={handleVerifyPin} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-forest uppercase tracking-wider mb-2 text-center">
                  Digite a Senha Numérica (PIN de 4 Dígitos)
                </label>
                <div className="relative max-w-[240px] mx-auto">
                  <input
                    type={showPin ? "text" : "password"}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={pinInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setPinInput(val);
                      if (pinError) setPinError("");
                    }}
                    placeholder="••••"
                    className="w-full py-3.5 bg-warm/50 border-2 border-soft focus:border-forest rounded-2xl text-center text-3xl font-mono tracking-[0.5em] text-forest outline-none transition-all placeholder:tracking-widest"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-forest/40 hover:text-forest p-1 rounded-lg"
                    title={showPin ? "Ocultar senha" : "Ver senha"}
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={pinInput.length < 4}
                className={`w-full py-3.5 font-bold text-sm rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  pinInput.length === 4
                    ? "bg-forest text-white hover:bg-forest/90 hover:scale-[1.01]"
                    : "bg-forest/40 text-white/80 cursor-not-allowed"
                }`}
              >
                <Unlock className="w-4 h-4 text-sun" />
                <span>Desbloquear Ficha de Implantação</span>
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-soft/60 text-center">
              <p className="text-[11px] text-forest/60 leading-relaxed">
                💡 <strong>Precisa do PIN?</strong> O código de segurança foi enviado para o WhatsApp/E-mail de contato cadastrado. Se necessário, contate o suporte do Projeto AcolheMente.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm flex flex-col selection:bg-sun-dark/30">
      {/* Top Navbar */}
      <nav className="p-4 md:px-12 flex items-center justify-between bg-white/70 backdrop-blur-md sticky top-0 z-40 border-b border-soft">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={onGoHome || onBack}
          >
            <div className="w-10 h-10 bg-sun-dark rounded-xl flex items-center justify-center shadow-xs">
              <Building2 className="w-5 h-5 text-forest" />
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-xl font-bold tracking-tight text-forest leading-none">
                AcolheMente
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-forest/60">
                Corporativo & Saúde Mental
              </span>
            </div>
          </div>

          {/* Logo da Empresa Replicado no Topo ao Lado do Nome */}
          {(empresaDoc?.logoUrl || empresaDoc?.logo || empresaDoc?.empresaLogo || empresaDoc?.logoBase64) && (
            <div className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-soft">
              <div className="w-8 h-8 rounded-lg bg-white border border-soft p-0.5 flex items-center justify-center overflow-hidden shadow-2xs">
                <img
                  src={empresaDoc.logoUrl || empresaDoc.logo || empresaDoc.empresaLogo || empresaDoc.logoBase64}
                  alt={nomeEmpresaExibicao}
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="text-xs font-bold text-forest max-w-[180px] truncate">
                {nomeEmpresaExibicao}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handleCopyLink}
            className="hidden sm:flex items-center gap-2 px-3 py-2 text-xs font-semibold text-forest bg-warm/80 hover:bg-soft rounded-xl transition-all border border-soft"
            title="Copiar link desta ficha com PIN"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copiedLink ? "Link Copiado!" : "Copiar Link"}</span>
          </button>
          <button
            type="button"
            onClick={handleLockAccess}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all border border-rose-200 cursor-pointer"
            title="Bloquear sessão da Ficha de Implantação"
          >
            <Lock className="w-3.5 h-3.5 text-rose-600" />
            <span>Bloquear</span>
          </button>
          <button
            onClick={onGoHome || onBack}
            className="flex items-center gap-1.5 text-xs text-forest/80 hover:text-forest font-semibold px-3 py-2 rounded-xl hover:bg-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </button>
        </div>
      </nav>

      {/* Breadcrumbs */}
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 pt-4">
        <Breadcrumbs
          items={[
            { label: "Início", onClick: onGoHome || onBack },
            { label: "Corporativo", onClick: onGoHome || onBack },
            { label: "Ficha de Implantação da Empresa", active: true },
          ]}
          className="!px-0 !mt-0"
        />
      </div>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 md:py-10 space-y-8">
        {/* Header Hero Banner */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-sm border border-soft relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-48 h-48 bg-sun/20 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-forest/5 text-forest text-xs font-bold rounded-full mb-3">
                <FileText className="w-3.5 h-3.5 text-sun-dark" />
                <span>Cadastro Oficial & Formalização</span>
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl text-forest font-semibold mb-2">
                Ficha de Implantação da Empresa
              </h1>
              <p className="text-sm sm:text-base text-forest/70 max-w-2xl leading-relaxed">
                Complete e confira as informações cadastrais, responsáveis, escopo de produtos
                contratados e condições comerciais para ativação e acompanhamento do programa de
                saúde psicossocial da sua empresa na plataforma AcolheMente.
              </p>
            </div>

            <div className="bg-warm/60 border border-soft rounded-2xl p-4 shrink-0 flex items-center gap-3.5 min-w-[280px]">
              {(empresaDoc?.logoUrl || empresaDoc?.logo || empresaDoc?.empresaLogo || empresaDoc?.logoBase64) ? (
                <div className="w-14 h-14 rounded-2xl bg-white border border-soft p-1 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
                  <img
                    src={empresaDoc.logoUrl || empresaDoc.logo || empresaDoc.empresaLogo || empresaDoc.logoBase64}
                    alt={nomeEmpresaExibicao}
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-forest flex items-center justify-center text-sun shadow-2xs font-bold text-sm shrink-0">
                  {nomeEmpresaExibicao.slice(0, 2).toUpperCase()}
                </div>
              )}

              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  {empresaCategorias.includes("empresa_direta") && (
                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                      Cliente Direta
                    </span>
                  )}
                  {empresaCategorias.includes("canal_parceiro") && (
                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-300">
                      Canal Parceiro
                    </span>
                  )}
                  {empresaCategorias.includes("empresa_conectada") && (
                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                      Conectada {empresaPaiNome ? `(${empresaPaiNome})` : ""}
                    </span>
                  )}
                </div>
                <span className="text-base font-bold text-forest line-clamp-1">
                  {nomeEmpresaExibicao}
                </span>
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Ambiente Seguro & LGPD</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Toast */}
        {toastMsg && (
          <div className="fixed bottom-6 right-6 z-50 bg-forest text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-sun/30 animate-in fade-in slide-in-from-bottom-4">
            <CheckCircle2 className="w-5 h-5 text-sun" />
            <span className="text-sm font-semibold">{toastMsg}</span>
          </div>
        )}

        {/* Abas Principais: Dados da Empresa vs. Colaboradores e Dependentes */}
        <div className="flex items-center gap-2 p-1.5 bg-white rounded-2xl border border-soft shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab("empresa")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "empresa"
                ? "bg-forest text-white shadow-xs"
                : "text-forest/70 hover:text-forest hover:bg-warm/60"
            }`}
          >
            <Building2 className="w-4 h-4 text-sun-dark" />
            <span>1. Dados da Empresa</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("colaboradores")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "colaboradores"
                ? "bg-forest text-white shadow-xs"
                : "text-forest/70 hover:text-forest hover:bg-warm/60"
            }`}
          >
            <Users className="w-4 h-4 text-emerald-500" />
            <span>2. Colaboradores e Dependentes</span>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
              activeTab === "colaboradores" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-900 border border-emerald-200"
            }`}>
              {colaboradoresList.length} vidas
            </span>
          </button>
        </div>

        {/* Success Alert */}
        {savedSuccess && activeTab === "empresa" && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-2xl p-5 sm:p-6 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 shadow-sm">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-base text-emerald-950">
                  {createdEmpresaId ? "Ficha de Implantação concluída com sucesso!" : "Ficha de Implantação salva com sucesso!"}
                </h4>
                <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                  {createdEmpresaId
                    ? `Os dados foram salvos e a empresa foi cadastrada como Empresa Conectada vinculada ao parceiro ${empresaPaiNome || "Canal Parceiro"}.`
                    : "Os dados contratuais e operacionais foram sincronizados diretamente com a gestão da plataforma AcolheMente."}
                </p>
              </div>
            </div>

            {createdEmpresaId && createdPin && (
              <div className="p-4 bg-white rounded-xl border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 block">
                    Acesso ao Portal do RH da Empresa Conectada
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-forest/70">Senha PIN de Acesso:</span>
                    <span className="font-mono font-bold text-base text-forest bg-amber-100 border border-amber-300 px-2 py-0.5 rounded">
                      {createdPin}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      const link = `${window.location.origin}/?portal_rh=${createdEmpresaId}`;
                      navigator.clipboard.writeText(link);
                      setToastMsg(`Link do Portal do RH copiado! PIN: ${createdPin}`);
                      setTimeout(() => setToastMsg(null), 3500);
                    }}
                    className="flex-1 sm:flex-initial px-3 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Link do Portal RH</span>
                  </button>
                  <a
                    href={`/?portal_rh=${createdEmpresaId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 sm:flex-initial px-3.5 py-2 bg-forest hover:bg-forest/90 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-sun" />
                    <span>Abrir Portal RH</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 1: Dados da Empresa Form */}
        {activeTab === "empresa" ? (
          <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. DADOS JURÍDICOS DA EMPRESA */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-soft space-y-6">
            <div className="flex items-center gap-3 border-b border-soft pb-4">
              <div className="w-9 h-9 rounded-xl bg-forest/5 flex items-center justify-center text-forest">
                <Building2 className="w-5 h-5 text-sun-dark" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-forest">
                  1. Identificação Jurídica da Empresa
                </h3>
                <p className="text-xs text-forest/60">
                  Dados cadastrais da pessoa jurídica contratante.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-forest/80">
                  Razão Social <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  name="razaoSocial"
                  value={formData.razaoSocial}
                  onChange={handleChange}
                  placeholder="Ex: Empresa ABC Tecnologia e Saúde LTDA"
                  className="px-4 py-3 bg-warm/40 border border-soft rounded-xl text-sm text-forest focus:outline-none focus:border-sun-dark focus:bg-white transition-all"
                />
                <span className="text-[11px] text-forest/50">
                  Nome oficial constante no cartão do CNPJ.
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-forest/80">
                  CNPJ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  name="cnpj"
                  value={formData.cnpj}
                  onChange={handleChange}
                  placeholder="00.000.000/0001-00"
                  className="px-4 py-3 bg-warm/40 border border-soft rounded-xl text-sm text-forest focus:outline-none focus:border-sun-dark focus:bg-white transition-all font-mono"
                />
                <span className="text-[11px] text-forest/50">
                  Cadastro Nacional de Pessoa Jurídica da empresa.
                </span>
              </div>
            </div>
          </section>

          {/* 2. DADOS DO RESPONSÁVEL */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-soft space-y-6">
            <div className="flex items-center gap-3 border-b border-soft pb-4">
              <div className="w-9 h-9 rounded-xl bg-forest/5 flex items-center justify-center text-forest">
                <UserCheck className="w-5 h-5 text-sun-dark" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-forest">
                  2. Responsável Legal & Contato Principal
                </h3>
                <p className="text-xs text-forest/60">
                  Pessoa responsável pela assinatura, gestão de contrato ou RH/Benefícios.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-forest/80">
                  Nome do Responsável <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  name="nomeResponsavel"
                  value={formData.nomeResponsavel}
                  onChange={handleChange}
                  placeholder="Ex: Carlos Eduardo de Souza"
                  className="px-4 py-3 bg-warm/40 border border-soft rounded-xl text-sm text-forest focus:outline-none focus:border-sun-dark focus:bg-white transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-forest/80">
                  CPF do Responsável <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  name="cpfResponsavel"
                  value={formData.cpfResponsavel}
                  onChange={handleChange}
                  placeholder="000.000.000-00"
                  className="px-4 py-3 bg-warm/40 border border-soft rounded-xl text-sm text-forest focus:outline-none focus:border-sun-dark focus:bg-white transition-all font-mono"
                />
                <span className="text-[11px] text-forest/50">
                  Necessário para a formalização contratual e conformidade jurídica.
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-forest/80">
                  E-mail Principal <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-forest/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="gestor@empresa.com.br"
                    className="w-full pl-10 pr-4 py-3 bg-warm/40 border border-soft rounded-xl text-sm text-forest focus:outline-none focus:border-sun-dark focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-forest/80">
                  Telefone / WhatsApp <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-forest/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="tel"
                    required
                    name="telefone"
                    value={formData.telefone}
                    onChange={handleChange}
                    placeholder="(11) 99999-9999"
                    className="w-full pl-10 pr-4 py-3 bg-warm/40 border border-soft rounded-xl text-sm text-forest focus:outline-none focus:border-sun-dark focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* 3. ESCOPO DO PROGRAMA & VIDAS */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-soft space-y-6">
            <div className="flex items-center gap-3 border-b border-soft pb-4">
              <div className="w-9 h-9 rounded-xl bg-forest/5 flex items-center justify-center text-forest">
                <Users className="w-5 h-5 text-sun-dark" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-forest">
                  3. Escopo, Vidas & Produtos Contratados
                </h3>
                <p className="text-xs text-forest/60">
                  Volume de colaboradores cobertos e soluções corporativas incluídas.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="flex flex-col gap-1.5 max-w-md">
                <label className="text-xs font-bold uppercase tracking-wider text-forest/80">
                  Quantidade de Vidas (Colaboradores) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  name="quantidadeVidas"
                  value={formData.quantidadeVidas}
                  onChange={handleChange}
                  placeholder="Ex: 120 colaboradores (vidas)"
                  className="px-4 py-3 bg-warm/40 border border-soft rounded-xl text-sm text-forest focus:outline-none focus:border-sun-dark focus:bg-white transition-all"
                />
                <span className="text-[11px] text-forest/50">
                  Número aproximado ou exato de pessoas que terão acesso ao benefício.
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-forest/80">
                    Produtos Contratados <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-forest/50">
                    Clique nas sugestões abaixo para adicionar rapidamente
                  </span>
                </div>

                {/* Sugestões rápidas de produtos */}
                <div className="flex flex-wrap gap-2 mb-2">
                  {PRODUTOS_SUGESTOES.map((prod, idx) => {
                    const jaIncluido = (formData.produtosContratados || "").includes(prod);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleAddProduto(prod)}
                        disabled={jaIncluido}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 ${
                          jaIncluido
                            ? "bg-forest/10 border-forest/20 text-forest/50 cursor-default"
                            : "bg-warm/60 hover:bg-sun/40 border-soft text-forest cursor-pointer"
                        }`}
                      >
                        <Sparkles className="w-3 h-3 text-sun-dark" />
                        <span>{prod}</span>
                        {jaIncluido && <span className="text-[10px] font-bold">✓</span>}
                      </button>
                    );
                  })}
                </div>

                <textarea
                  name="produtosContratados"
                  required
                  rows={4}
                  value={formData.produtosContratados}
                  onChange={handleChange}
                  placeholder="Descreva ou liste os produtos e serviços acordados (ex: Acolhimento individual, palestras presenciais bimestrais, canal confidencial)..."
                  className="px-4 py-3 bg-warm/40 border border-soft rounded-xl text-sm text-forest focus:outline-none focus:border-sun-dark focus:bg-white transition-all resize-y leading-relaxed"
                />
              </div>
            </div>
          </section>

          {/* 4. CONDIÇÕES FINANCEIRAS & FATURAMENTO */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-soft space-y-6">
            <div className="flex items-center gap-3 border-b border-soft pb-4">
              <div className="w-9 h-9 rounded-xl bg-forest/5 flex items-center justify-center text-forest">
                <CreditCard className="w-5 h-5 text-sun-dark" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-forest">
                  4. Condições Financeiras & Faturamento
                </h3>
                <p className="text-xs text-forest/60">
                  Valores acordados e método de quitação das mensalidades ou serviços.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-forest/80">
                  Valores Definidos <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  name="valoresDefinidos"
                  value={formData.valoresDefinidos}
                  onChange={handleChange}
                  placeholder="Ex: R$ 35,00 por vida/mês ou R$ 4.200,00 mensal"
                  className="px-4 py-3 bg-warm/40 border border-soft rounded-xl text-sm text-forest focus:outline-none focus:border-sun-dark focus:bg-white transition-all font-medium"
                />
                <span className="text-[11px] text-forest/50">
                  Valor acordado na proposta comercial ou aditivo contratual.
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-forest/80">
                  Forma de Pagamento <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  name="formaPagamento"
                  value={formData.formaPagamento}
                  onChange={handleChange}
                  className="px-4 py-3 bg-warm/40 border border-soft rounded-xl text-sm text-forest focus:outline-none focus:border-sun-dark focus:bg-white transition-all cursor-pointer"
                >
                  <option value="">Selecione a forma de pagamento...</option>
                  {FORMAS_PAGAMENTO_OPCOES.map((opt, i) => (
                    <option key={i} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-forest/50">
                  Formato de liquidação acordado para emissão de cobrança e NF.
                </span>
              </div>
            </div>

            {/* Observações / Notas adicionais */}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-soft">
              <label className="text-xs font-bold uppercase tracking-wider text-forest/80">
                Observações ou Instruções Financeiras Específicas
              </label>
              <textarea
                name="observacoesGerais"
                rows={2}
                value={formData.observacoesGerais}
                onChange={handleChange}
                placeholder="Ex: Enviar nota fiscal e boleto para o departamento financeiro (financeiro@empresa.com.br) até o dia 20 de cada mês."
                className="px-4 py-2.5 bg-warm/40 border border-soft rounded-xl text-sm text-forest focus:outline-none focus:border-sun-dark focus:bg-white transition-all resize-none"
              />
            </div>
          </section>

          {/* Submission Bar */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-soft flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-4 z-30">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <p className="text-xs text-forest/70">
                Os dados são armazenados de forma criptografada sob conformidade com a LGPD.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto px-8 py-3.5 bg-sun text-forest font-bold rounded-2xl hover:bg-sun-dark transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 text-sm"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-forest border-t-transparent rounded-full animate-spin" />
                    <span>Salvando Ficha...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Salvar Ficha de Implantação</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
        ) : (
          /* Tab 2: Planilha de Colaboradores e Dependentes */
          <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-soft">
            <EmpresaColaboradoresSpreadsheet
              empresaId={empresaId}
              empresaNome={formData.razaoSocial || nomeEmpresaExibicao}
              quantidadeVidasContratadas={formData.quantidadeVidas}
              colaboradores={colaboradoresList}
              onChangeColaboradores={handleUpdateColaboradores}
              onShowToast={(msg) => {
                setToastMsg(msg);
                setTimeout(() => setToastMsg(null), 3500);
              }}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="p-8 text-center text-xs text-forest/50 border-t border-soft bg-white/40 mt-12">
        <p>Projeto AcolheMente Saúde Mental • Plataforma de Cuidado Psicológico & Corporativo</p>
      </footer>
    </div>
  );
}
