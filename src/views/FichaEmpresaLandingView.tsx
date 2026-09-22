import React, { useState, useEffect } from "react";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
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
} from "lucide-react";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { EmpresaColaboradoresSpreadsheet, ColaboradorEmpresa } from "../components/EmpresaColaboradoresSpreadsheet";

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
  const [copiedLink, setCopiedLink] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeTab, setActiveTab] = useState<"empresa" | "colaboradores">("empresa");
  const [colaboradoresList, setColaboradoresList] = useState<ColaboradorEmpresa[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

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

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  useEffect(() => {
    const fetchEmpresa = async () => {
      try {
        setLoading(true);
        const docSnap = await getDoc(doc(db, "empresa_leads", empresaId));
        if (docSnap.exists()) {
          const d = docSnap.data();
          setNomeEmpresaExibicao(d.nomeEmpresa || d.razaoSocial || "Empresa Parceira");
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
        } else {
          setErrorMsg("Empresa não encontrada no sistema. Verifique o link ou entre em contato com o suporte.");
        }
      } catch (err) {
        console.error("Erro ao carregar ficha da empresa:", err);
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
    } catch (err) {
      console.error("Erro ao salvar dados da Ficha de Bordo:", err);
      alert("Houve uma falha ao salvar as informações. Por favor, tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-warm p-6">
        <div className="w-12 h-12 border-4 border-sun-dark border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-forest font-semibold animate-pulse text-sm">
          Carregando Ficha de Bordo da Empresa...
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

  return (
    <div className="min-h-screen bg-warm flex flex-col selection:bg-sun-dark/30">
      {/* Top Navbar */}
      <nav className="p-4 md:px-12 flex items-center justify-between bg-white/70 backdrop-blur-md sticky top-0 z-40 border-b border-soft">
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

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCopyLink}
            className="hidden sm:flex items-center gap-2 px-3 py-2 text-xs font-semibold text-forest bg-warm/80 hover:bg-soft rounded-xl transition-all border border-soft"
            title="Copiar link desta ficha"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copiedLink ? "Link Copiado!" : "Copiar Link"}</span>
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
            { label: "Ficha de Bordo da Empresa", active: true },
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
                Ficha de Bordo da Empresa
              </h1>
              <p className="text-sm sm:text-base text-forest/70 max-w-2xl leading-relaxed">
                Complete e confira as informações cadastrais, responsáveis, escopo de produtos
                contratados e condições comerciais para ativação e acompanhamento do programa de
                saúde psicossocial da sua empresa na plataforma AcolheMente.
              </p>
            </div>

            <div className="bg-warm/60 border border-soft rounded-2xl p-4 shrink-0 flex flex-col gap-1 min-w-[220px]">
              <span className="text-[10px] uppercase font-bold tracking-wider text-forest/60">
                Empresa Parceira
              </span>
              <span className="text-base font-bold text-forest line-clamp-1">
                {nomeEmpresaExibicao}
              </span>
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold mt-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Ambiente Seguro & LGPD</span>
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
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl p-5 flex items-start gap-4 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm">Ficha de Bordo salva com sucesso!</h4>
              <p className="text-xs text-emerald-800 mt-1">
                Os dados contratuais e operacionais foram sincronizados diretamente com a gestão da
                plataforma AcolheMente.
              </p>
            </div>
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
                    <span>Salvar Ficha de Bordo</span>
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
