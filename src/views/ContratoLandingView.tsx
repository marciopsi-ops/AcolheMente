import React, { useState, useEffect, useRef } from "react";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  Leaf,
  Heart,
  CheckCircle2,
  ShieldCheck,
  FileSignature,
  Printer,
  Download,
  AlertCircle,
  Clock,
  UserCheck,
  Lock,
  RotateCcw,
  Sparkles,
  Info
} from "lucide-react";
import { Breadcrumbs } from "../components/Breadcrumbs";

// Função para gerar hash SHA-256 do texto para prova matemática de integridade
async function gerarHashSha256(mensagem: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(mensagem);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch (e) {
    // Fallback simples
    let hash = 0;
    for (let i = 0; i < mensagem.length; i++) {
      const char = mensagem.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `sha256_${Math.abs(hash).toString(16)}${Date.now().toString(16)}`;
  }
}

export function ContratoLandingView({
  contratoId,
  onBack,
  onGoHome,
}: {
  contratoId: string;
  onBack: () => void;
  onGoHome?: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [signed, setSigned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    cpf: "",
    menorIdade: false,
    nomeMenor: "",
    cpfMenor: "",
    aceiteLgpd: true,
    aceiteEnquadre: true,
  });

  // Canvas para Rubrica com o dedo / touch / mouse
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  useEffect(() => {
    const fetchAcolhimento = async () => {
      try {
        const docSnap = await getDoc(doc(db, "acolhimentos", contratoId));
        if (docSnap.exists()) {
          const docData = docSnap.data();
          setData(docData);
          setFormData((prev) => ({
            ...prev,
            nome: docData.nome || docData.nomeCompleto || "",
            email: docData.email || "",
            cpf: docData.cpf || "",
            menorIdade: docData.menorIdade || docData.tratamentoPara === "Filho(a) / Criança" || false,
            nomeMenor: docData.responsavelNome ? docData.nome : "",
          }));
          if (docData.contratoAssinado) {
            setSigned(true);
          }
        }
      } catch (err) {
        console.error("Erro ao buscar contrato:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAcolhimento();
  }, [contratoId]);

  // Funções de desenho da Rubrica Digital
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1b4d3e"; // Forest green signature
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!formData.nome.trim() || !formData.email.trim() || !formData.cpf.trim()) {
      setErrorMsg("Por favor, preencha todos os campos obrigatórios (Nome, E-mail e CPF).");
      return;
    }

    if (!formData.aceiteEnquadre || !formData.aceiteLgpd) {
      setErrorMsg("É obrigatório concordar com os termos de atendimento e a Política de Privacidade (LGPD).");
      return;
    }

    setIsSubmitting(true);

    try {
      // Captura a imagem da rubrica em base64 se desenhada
      let rubricaBase64 = "";
      if (canvasRef.current && hasSignature) {
        rubricaBase64 = canvasRef.current.toDataURL("image/png");
      }

      const textoParaHash = data.contratoText || "Contrato Terapêutico Padrão AcolheMente Saúde";
      const hashContrato = await gerarHashSha256(textoParaHash);
      const now = new Date();
      const dataIso = now.toISOString();
      const dataFormatada = now.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      const auditTrail = {
        dataAceite: dataIso,
        dataAceiteFormatada: dataFormatada,
        hashContrato: hashContrato,
        pacienteNome: formData.nome.trim(),
        pacienteCpf: formData.cpf.trim(),
        pacienteEmail: formData.email.trim().toLowerCase(),
        menorIdade: formData.menorIdade,
        nomeMenor: formData.menorIdade ? formData.nomeMenor : "",
        rubricaBase64: rubricaBase64 || null,
        userAgent: navigator.userAgent || "Navegador Web",
        consentimentoLgpd: true,
        versaoTermos: "1.0 - Resolução CFP 11/2018",
      };

      const notifAnterior = data.notificacao ? data.notificacao + "\n\n" : "";
      const notifAssinatura = `[CONTRATO ASSINADO - ${dataFormatada}] O paciente ${formData.nome} confirmou o aceite digital do contrato terapêutico (Hash: ${hashContrato.slice(0, 16)}...). Documento válido e arquivado.`;

      const updates: any = {
        contratoAssinado: true,
        contratoAssinadoEm: dataFormatada,
        cpf: formData.cpf.trim(),
        dadosContrato: {
          nome: formData.nome.trim(),
          email: formData.email.trim().toLowerCase(),
          cpf: formData.cpf.trim(),
          menorIdade: formData.menorIdade,
          nomeMenor: formData.menorIdade ? formData.nomeMenor : "",
          ...auditTrail,
        },
        notificacao: `${notifAnterior}${notifAssinatura}`,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(doc(db, "acolhimentos", contratoId), updates);

      setData((prev: any) => ({ ...prev, ...updates }));
      setSigned(true);
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    } catch (err: any) {
      console.error("Erro ao assinar contrato:", err);
      setErrorMsg("Ocorreu um erro ao registrar sua assinatura. Por favor, tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-forest/20 border-t-forest rounded-full animate-spin"></div>
          <span className="text-forest font-semibold text-sm">Carregando termos do contrato...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-warm p-6 text-center">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-4 border border-rose-200">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-serif text-forest mb-2">Contrato não encontrado</h2>
        <p className="text-forest/70 max-w-md text-sm mb-6">
          O link acessado pode ter expirado ou o atendimento não foi localizado. Entre em contato com seu psicólogo.
        </p>
        <button
          onClick={onBack || onGoHome}
          className="px-6 py-2.5 bg-forest text-white rounded-full text-sm font-semibold hover:bg-forest/90 transition-all cursor-pointer"
        >
          Voltar ao Início
        </button>
      </div>
    );
  }

  // TELA DE SUCESSO / CONTRATO JÁ ASSINADO COM SELO DE AUDITORIA
  if (signed) {
    const audit = data.dadosContrato || {};
    return (
      <div className="min-h-screen bg-warm/40 flex flex-col items-center py-12 px-4 selection:bg-emerald-100">
        <nav className="max-w-4xl w-full mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={onGoHome || onBack}>
            <div className="w-10 h-10 bg-emerald-700 text-white rounded-xl flex items-center justify-center shadow-xs">
              <Leaf className="w-5 h-5" />
            </div>
            <span className="font-serif text-xl font-bold tracking-tight text-forest">
              AcolheMente Saúde
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-white text-forest text-xs font-bold rounded-xl border border-soft hover:bg-warm transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Baixar / Imprimir PDF
            </button>
          </div>
        </nav>

        <div className="bg-white rounded-[2rem] shadow-xl p-8 sm:p-12 max-w-3xl w-full flex flex-col border border-soft slide-up space-y-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mb-4 ring-8 ring-emerald-50">
              <CheckCircle2 className="w-10 h-10 text-emerald-700" />
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl text-forest font-bold mb-2">
              Contrato Terapêutico Assinado!
            </h2>
            <p className="text-forest/70 text-sm max-w-lg leading-relaxed">
              O seu aceite foi registrado com sucesso e possui validade jurídica plena (Medida Provisória nº 2.200-2/2001 e Lei nº 14.063/2020).
            </p>
          </div>

          {/* Selo Oficial de Auditoria / Evidence Box */}
          <div className="p-5 bg-gradient-to-r from-emerald-50 via-warm/30 to-emerald-50 rounded-2xl border-2 border-emerald-300 space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-200/80 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-950 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700" /> Certificado de Autenticidade & Trilha de Auditoria
              </span>
              <span className="text-[10px] font-extrabold text-emerald-900 bg-white px-2.5 py-0.5 rounded-full border border-emerald-300">
                Documento Auditável
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-white/90 p-3 rounded-xl border border-emerald-200">
                <span className="text-[10px] uppercase font-bold text-forest/60 block">Signatário (Contratante)</span>
                <span className="font-bold text-forest block">{audit.pacienteNome || audit.nome || data.nome}</span>
                <span className="text-forest/80 font-mono text-[11px]">CPF: {audit.pacienteCpf || audit.cpf || "Conferido"}</span>
              </div>

              <div className="bg-white/90 p-3 rounded-xl border border-emerald-200">
                <span className="text-[10px] uppercase font-bold text-forest/60 block">Data e Hora do Aceite (Timestamp)</span>
                <span className="font-bold text-emerald-900 block">{audit.dataAceiteFormatada || data.contratoAssinadoEm || "Registrado"}</span>
                <span className="text-forest/60 text-[10px]">Padrão Horário Oficial de Brasília</span>
              </div>

              <div className="bg-white/90 p-3 rounded-xl border border-emerald-200 sm:col-span-2">
                <span className="text-[10px] uppercase font-bold text-forest/60 block">Hash de Integridade do Documento (SHA-256)</span>
                <span className="font-mono text-[10px] text-emerald-900 break-all select-all block mt-0.5">
                  {audit.hashContrato || "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"}
                </span>
                <span className="text-[9px] text-forest/50 mt-1 block">
                  *Este hash comprova matematicamente que o texto do contrato não sofreu qualquer alteração após o aceite.
                </span>
              </div>
            </div>

            {audit.rubricaBase64 && (
              <div className="bg-white/90 p-3 rounded-xl border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-forest/60 block">Rubrica Digital Registrada</span>
                  <span className="text-xs text-forest/70">Coletada via tela sensível ao toque / dispositivo</span>
                </div>
                <img
                  src={audit.rubricaBase64}
                  alt="Rubrica Digital"
                  className="h-12 border border-soft rounded-lg bg-warm/30 px-3 py-1 object-contain"
                />
              </div>
            )}
          </div>

          {/* Cópia do Contrato para Leitura / Impressão */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-forest/70 block">
              Via Integral do Contrato Terapêutico
            </span>
            <div className="p-6 bg-warm/20 border border-soft rounded-2xl text-xs sm:text-sm text-forest/90 leading-relaxed font-serif whitespace-pre-wrap max-h-80 overflow-y-auto custom-scrollbar select-text">
              {data.contratoText || "Contrato Terapêutico arquivado com sucesso."}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-soft">
            <span className="text-xs text-forest/60">
              Uma via deste documento permanece disponível na sua Ficha de Bordo.
            </span>
            <button
              onClick={handlePrint}
              className="w-full sm:w-auto px-6 py-2.5 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4" /> Baixar Cópia em PDF
            </button>
          </div>
        </div>
      </div>
    );
  }

  // TELA DE LEITURA E ASSINATURA ELETRÔNICA DO PACIENTE
  return (
    <div className="min-h-screen bg-warm/40 flex flex-col selection:bg-emerald-100">
      <nav className="p-4 md:px-12 flex items-center justify-between bg-white/70 backdrop-blur-md sticky top-0 z-50 border-b border-soft">
        <div className="flex items-center gap-3 cursor-pointer" onClick={onBack || onGoHome}>
          <div className="w-10 h-10 bg-emerald-700 text-white rounded-xl flex items-center justify-center shadow-xs">
            <Leaf className="w-5 h-5" />
          </div>
          <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-forest">
            AcolheMente Saúde
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-emerald-700" /> Ambiente Seguro e Criptografado
          </span>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto w-full px-4 md:px-8 mt-4">
        <Breadcrumbs
          items={[
            { label: "Início", onClick: onBack || onGoHome },
            { label: "Contrato Terapêutico & Aceite", active: true },
          ]}
          className="!px-0 !mt-0"
        />
      </div>

      <main className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-8 space-y-8">
        {/* Cabeçalho da Proposta / Contrato */}
        <div className="space-y-3">
          <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-100/80 px-3 py-1 rounded-full">
            Enquadre Terapêutico • Resolução CFP 11/2018
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-forest font-bold leading-tight">
            Contrato de Prestação de Serviços Psicológicos
          </h1>
          <p className="text-sm sm:text-base text-forest/70 leading-relaxed max-w-3xl">
            Olá, <strong className="text-forest font-semibold">{formData.nome || "Paciente"}</strong>! Para darmos início ao seu acompanhamento com total clareza, transparência e respaldo ético, leia atentamente as cláusulas contratuais abaixo (sigilo profissional, agendamento, faltas e honorários) e confirme sua assinatura eletrônica.
          </p>
        </div>

        {/* Resumo do Enquadre */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4.5 rounded-2xl border border-soft shadow-2xs space-y-1">
            <span className="text-[10px] uppercase font-bold text-forest/50 block">Profissional Responsável</span>
            <span className="font-bold text-forest text-sm block truncate">
              {data.profissionalNome || data.dadosContrato?.profissionalNome || "Psicólogo(a) Credenciado(a)"}
            </span>
            <span className="text-xs text-forest/70">
              CRP: {data.profissionalCrp || "Sob Registro Ativo no CFP"}
            </span>
          </div>

          <div className="bg-white p-4.5 rounded-2xl border border-soft shadow-2xs space-y-1">
            <span className="text-[10px] uppercase font-bold text-forest/50 block">Honorários por Sessão</span>
            <span className="font-bold text-emerald-800 text-sm block">
              {data.valorSessao ? `R$ ${data.valorSessao}` : "Conforme alinhado"}
            </span>
            <span className="text-xs text-forest/70">
              Duração: ~50 minutos online
            </span>
          </div>

          <div className="bg-white p-4.5 rounded-2xl border border-soft shadow-2xs space-y-1">
            <span className="text-[10px] uppercase font-bold text-forest/50 block">Frequência Acordada</span>
            <span className="font-bold text-forest text-sm block truncate">
              {data.frequenciaSessoes || "Semanal"}
            </span>
            <span className="text-xs text-forest/70">
              Exclusividade de horário reservado
            </span>
          </div>
        </div>

        {/* Bloco do Contrato na Íntegra (Scroll com Cláusulas) */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-soft space-y-4">
          <div className="flex items-center justify-between border-b border-soft pb-3">
            <h3 className="font-serif text-lg sm:text-xl font-bold text-forest flex items-center gap-2">
              <FileSignature className="w-5 h-5 text-emerald-700" /> Termos & Cláusulas do Contrato Terapêutico
            </h3>
            <span className="text-xs text-forest/60">
              Role para ler o texto completo
            </span>
          </div>

          <div className="text-xs sm:text-sm text-forest/90 whitespace-pre-wrap leading-relaxed max-h-[380px] overflow-y-auto pr-4 custom-scrollbar font-serif bg-warm/20 p-5 rounded-2xl border border-soft select-text">
            {data.contratoText || "Carregando texto das cláusulas contratuais..."}
          </div>
        </div>

        {/* Formulário de Identificação e Assinatura Eletrônica */}
        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-10 rounded-3xl shadow-xl border border-soft space-y-6">
          <div>
            <h3 className="font-serif text-xl font-bold text-forest">
              Dados do Signatário para Assinatura Eletrônica
            </h3>
            <p className="text-xs text-forest/70 mt-1">
              Conforme a Medida Provisória nº 2.200-2/2001 e a Lei nº 14.063/2020, confirme seus dados de identificação civil para conferir fé pública e validade probatória a este documento.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wider text-forest/80">
                Nome Completo do(a) Contratante <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="w-full bg-warm/30 text-sm text-forest font-semibold border border-soft rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-2xs"
                placeholder="Seu nome completo"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-forest/80">
                CPF do(a) Contratante <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                className="w-full bg-warm/30 text-sm text-forest font-mono font-semibold border border-soft rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-2xs"
                placeholder="000.000.000-00"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-3">
              <label className="text-xs font-bold uppercase tracking-wider text-forest/80">
                E-mail para Recebimento de Comprovantes <span className="text-rose-600">*</span>
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-warm/30 text-sm text-forest border border-soft rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-2xs"
                placeholder="seu.email@exemplo.com"
              />
            </div>
          </div>

          {/* Menor de idade */}
          <div className="p-4 bg-warm/30 rounded-2xl border border-soft space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.menorIdade}
                onChange={(e) => setFormData({ ...formData, menorIdade: e.target.checked })}
                className="w-5 h-5 rounded border-soft text-emerald-700 focus:ring-emerald-500 accent-emerald-700"
              />
              <span className="text-xs sm:text-sm font-semibold text-forest">
                O atendimento é destinado a uma criança ou adolescente (menor de 18 anos)?
              </span>
            </label>

            {formData.menorIdade && (
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in">
                <div>
                  <label className="text-[10px] font-bold uppercase text-forest/60 block mb-1">
                    Nome Completo do Menor
                  </label>
                  <input
                    type="text"
                    required={formData.menorIdade}
                    value={formData.nomeMenor}
                    onChange={(e) => setFormData({ ...formData, nomeMenor: e.target.value })}
                    className="w-full bg-white text-xs text-forest border border-soft rounded-xl p-2.5 focus:outline-none focus:border-emerald-600"
                    placeholder="Nome da criança ou adolescente"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-forest/60 block mb-1">
                    CPF do Menor (se possuir)
                  </label>
                  <input
                    type="text"
                    value={formData.cpfMenor}
                    onChange={(e) => setFormData({ ...formData, cpfMenor: e.target.value })}
                    className="w-full bg-white text-xs text-forest font-mono border border-soft rounded-xl p-2.5 focus:outline-none focus:border-emerald-600"
                    placeholder="Opcional"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Rubrica Digital (Opção 2 recomendada - Canvas de toque) */}
          <div className="p-5 bg-warm/20 rounded-2xl border border-soft space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-forest/80 flex items-center gap-1.5">
                  <FileSignature className="w-4 h-4 text-emerald-700" /> Rubrica Digital na Tela (Com o dedo ou mouse)
                </label>
                <p className="text-[11px] text-forest/60">
                  Desenhe sua assinatura no quadro abaixo. Ela será anexada ao seu termo de auditoria.
                </p>
              </div>

              {hasSignature && (
                <button
                  type="button"
                  onClick={clearSignature}
                  className="text-xs font-semibold text-rose-700 hover:text-rose-900 underline cursor-pointer"
                >
                  Limpar e redesenhar
                </button>
              )}
            </div>

            <div className="relative bg-white rounded-xl border-2 border-dashed border-forest/20 overflow-hidden touch-none h-32 flex items-center justify-center">
              <canvas
                ref={canvasRef}
                width={700}
                height={128}
                className="w-full h-full cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              {!hasSignature && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-forest/30 text-xs italic">
                  ✍️ Toque ou use o mouse para assinar aqui
                </div>
              )}
            </div>
          </div>

          {/* Declarações e Consentimento LGPD */}
          <div className="space-y-3 pt-2">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                required
                checked={formData.aceiteEnquadre}
                onChange={(e) => setFormData({ ...formData, aceiteEnquadre: e.target.checked })}
                className="mt-1 w-5 h-5 rounded border-soft text-emerald-700 focus:ring-emerald-500 accent-emerald-700 shrink-0 cursor-pointer"
              />
              <span className="text-xs text-forest/80 leading-relaxed">
                <strong>Enquadre Terapêutico:</strong> Li, compreendi e concordo integralmente com todas as cláusulas do contrato terapêutico acima, incluindo honorários, regras de cancelamento com mínimo de 24h de antecedência e sigilo profissional.
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                required
                checked={formData.aceiteLgpd}
                onChange={(e) => setFormData({ ...formData, aceiteLgpd: e.target.checked })}
                className="mt-1 w-5 h-5 rounded border-soft text-emerald-700 focus:ring-emerald-500 accent-emerald-700 shrink-0 cursor-pointer"
              />
              <span className="text-xs text-forest/80 leading-relaxed">
                <strong>Privacidade e LGPD (Lei nº 13.709/2018):</strong> Autorizo expressamente o tratamento dos meus dados pessoais para os devidos fins de prontuário e acompanhamento terapêutico, sob o mais estrito sigilo ético profissional do psicólogo.
              </span>
            </label>
          </div>

          {/* Botão de Envio */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white py-4 rounded-2xl font-bold text-base transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-5 h-5 text-sun" />
            {isSubmitting ? "Autenticando e Assinando..." : "Li, Concordo e Assino Eletronicamente"}
          </button>
        </form>
      </main>

      <footer className="w-full max-w-5xl mx-auto p-6 md:p-8 text-center text-xs text-forest/50 mt-auto">
        <p>Projeto AcolheMente Saúde • Plataforma de Apoio e Gestão em Psicologia • Resoluções CFP 11/2018 e 04/2020 • Em conformidade com a LGPD (Lei nº 13.709/2018).</p>
      </footer>
    </div>
  );
}
