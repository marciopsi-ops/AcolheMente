import React, { useState, useEffect } from "react";
import { FileText, Printer, ShieldCheck, Lock, AlertCircle, CheckCircle2, Building2, User } from "lucide-react";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { DocumentoPsicologicoItem } from "../types/documentos";
import { BrandLogo } from "./BrandLogo";

interface DocumentoPublicoViewProps {
  documentoId?: string;
  codigoVerificacao?: string;
  onGoHome: () => void;
}

export const DocumentoPublicoView: React.FC<DocumentoPublicoViewProps> = ({
  documentoId,
  codigoVerificacao,
  onGoHome,
}) => {
  const [loading, setLoading] = useState(true);
  const [documento, setDocumento] = useState<DocumentoPsicologicoItem | null>(null);
  const [senhaInput, setSenhaInput] = useState("");
  const [senhaValidada, setSenhaValidada] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const fetchDoc = async () => {
      setLoading(true);
      try {
        let docData: DocumentoPsicologicoItem | null = null;
        if (documentoId) {
          const ref = doc(db, "documentos_psicologicos", documentoId);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            docData = { id: snap.id, ...snap.data() } as DocumentoPsicologicoItem;
          }
        } else if (codigoVerificacao) {
          const q = query(
            collection(db, "documentos_psicologicos"),
            where("numeroEmissao", "==", codigoVerificacao)
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            const d = snap.docs[0];
            docData = { id: d.id, ...d.data() } as DocumentoPsicologicoItem;
          }
        }

        if (docData) {
          setDocumento(docData);
          // Se não houver senha cadastrada, já libera
          if (!docData.senhaAcesso) {
            setSenhaValidada(true);
          }
        } else {
          setErro("Documento não encontrado ou código inválido.");
        }
      } catch (err) {
        console.error("Erro ao buscar documento público:", err);
        setErro("Erro ao carregar documento.");
      } finally {
        setLoading(false);
      }
    };

    fetchDoc();
  }, [documentoId, codigoVerificacao]);

  const handleValidarSenha = (e: React.FormEvent) => {
    e.preventDefault();
    if (documento && documento.senhaAcesso && senhaInput === documento.senhaAcesso) {
      setSenhaValidada(true);
      setErro("");
    } else {
      setErro("Senha de acesso incorreta.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-warm flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-forest border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-forest">Verificando autenticidade do documento...</p>
        </div>
      </div>
    );
  }

  if (erro || !documento) {
    return (
      <div className="min-h-screen bg-warm flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full p-8 rounded-3xl shadow-xl border border-soft text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold font-serif text-forest">Documento Não Localizado</h2>
          <p className="text-xs text-forest/70">{erro || "O link acessado é inválido ou o documento foi removido."}</p>
          <button
            onClick={onGoHome}
            className="w-full py-3 bg-forest text-white rounded-xl text-xs font-bold hover:bg-forest/90 transition-all cursor-pointer"
          >
            Voltar à Página Inicial
          </button>
        </div>
      </div>
    );
  }

  if (documento.senhaAcesso && !senhaValidada) {
    return (
      <div className="min-h-screen bg-warm flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full p-8 rounded-3xl shadow-xl border border-soft text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-700 mx-auto flex items-center justify-center">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold font-serif text-forest">Documento Protegido por Senha</h2>
          <p className="text-xs text-forest/70">
            Este documento exige uma senha de acesso fornecida pelo emitente para visualização segura.
          </p>

          <form onSubmit={handleValidarSenha} className="space-y-3 text-left">
            <div>
              <label className="block text-xs font-bold text-forest mb-1">Senha de Acesso</label>
              <input
                type="password"
                value={senhaInput}
                onChange={(e) => setSenhaInput(e.target.value)}
                placeholder="Digite a senha..."
                required
                className="w-full px-4 py-2.5 bg-warm/50 border border-soft rounded-xl text-xs text-forest focus:outline-none focus:border-forest"
              />
            </div>
            {erro && <p className="text-xs text-rose-600 font-semibold">{erro}</p>}
            <button
              type="submit"
              className="w-full py-3 bg-forest text-white rounded-xl text-xs font-bold hover:bg-forest/90 transition-all cursor-pointer shadow-xs"
            >
              Desbloquear Documento
            </button>
          </form>
        </div>
      </div>
    );
  }

  const prof = (documento.perfilProfissionalUsado || {}) as any;
  const isCertificado = documento.tipo === "certificado";
  const cargaHorariaCert = (documento as any).cargaHoraria as string | undefined;
  const wlEnabled = Boolean(documento.whiteLabelEnabled);
  const primaryColor = wlEnabled
    ? (documento.whiteLabelConfig?.primaryColor || "#1b3022")
    : "#1b3022";
  const secondaryColor = wlEnabled
    ? (documento.whiteLabelConfig?.secondaryColor || "#f59e0b")
    : "#f59e0b";
  const logoUrl = wlEnabled ? (documento.companyData?.logoUrl || "") : "";

  return (
    <div className="min-h-screen bg-slate-200 py-8 px-4 flex flex-col items-center justify-start print:bg-white print:p-0">
      {/* Top Bar for Recipient (Hidden in print) */}
      <div className="w-full max-w-[210mm] bg-forest text-white p-4 rounded-2xl shadow-md mb-6 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
          <div>
            <h3 className="font-bold font-serif text-sm">
              {isCertificado ? "Certificado Verificado e Autêntico" : "Documento Verificado e Autêntico"}
            </h3>
            <p className="text-[11px] text-emerald-100/80">
              {isCertificado
                ? "Autenticidade e carga horária validadas digitalmente"
                : "Emitido em conformidade com as normas CFP"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-sun text-forest rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-sun/90 transition-all cursor-pointer shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / Salvar PDF</span>
          </button>
          <button
            onClick={onGoHome}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            AcolheMente
          </button>
        </div>
      </div>

      {/* A4 Sheet Container */}
      <div className="w-full max-w-[210mm] min-h-[297mm] bg-white p-8 sm:p-14 shadow-2xl rounded-2xl border border-slate-300 flex flex-col justify-between text-slate-900 print:shadow-none print:border-none print:p-0">
        <div>
          {/* Header Timbrado */}
          <div
            className="flex items-center justify-between pb-6 border-b-2 mb-8"
            style={{ borderColor: `${primaryColor}33` }}
          >
            <div className="flex items-center gap-3.5">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-12 max-w-[160px] object-contain" />
              ) : (
                <div
                  className="w-12 h-12 rounded-full text-white font-bold flex items-center justify-center text-lg shrink-0"
                  style={{ backgroundColor: primaryColor }}
                >
                  {(prof.nome || "P").charAt(0)}
                </div>
              )}
              <div>
                <h1
                  className="font-serif font-bold text-base sm:text-lg"
                  style={{ color: primaryColor }}
                >
                  {prof.nomeEmpresa || prof.nome || "Profissional de Saúde"}
                </h1>
                <p className="text-xs text-slate-600 font-mono">
                  {prof.profissao || "Psicólogo(a)"}
                  {prof.crp ? ` · CRP ${prof.crp}` : ""}
                </p>
                {prof.nomeEmpresa && prof.nome && (
                  <p className="text-[11px] text-slate-500">
                    Resp.: {prof.nome} {prof.cnpj ? `(CNPJ: ${prof.cnpj})` : ""}
                  </p>
                )}
              </div>
            </div>

            <div className="text-right text-[11px] text-slate-500 font-mono">
              <p className="font-bold" style={{ color: primaryColor }}>{documento.numeroEmissao}</p>
              <p>{new Date(documento.dataEmissao).toLocaleDateString("pt-BR")}</p>
            </div>
          </div>

          {/* Título */}
          <div className="text-center my-8">
            <h2
              className="text-lg sm:text-xl font-bold font-serif uppercase tracking-wider underline decoration-2 underline-offset-8"
              style={{ color: primaryColor, textDecorationColor: secondaryColor }}
            >
              {documento.titulo}
            </h2>
            <p className="text-xs text-slate-500 mt-2">
              Finalidade: {documento.finalidade}
            </p>
          </div>

          {/* Dados do Destinatário / Participante */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 text-xs text-slate-700 space-y-1">
            <p
              className="font-bold mb-1 uppercase text-[10px] tracking-wider"
              style={{ color: primaryColor }}
            >
              {isCertificado ? "Participante Certificado(a):" : "Destinatário(a) / Paciente:"}
            </p>
            <p className="font-bold text-sm text-slate-900">{documento.pacienteNome}</p>
            {isCertificado && cargaHorariaCert && (
              <p className="text-xs text-slate-600 pt-0.5">
                Carga Horária Total: <strong className="text-slate-900">{cargaHorariaCert}</strong>
              </p>
            )}
          </div>

          {/* Seções ou Conteúdo Principal */}
          {documento.secoes && documento.secoes.length > 0 ? (
            <div className="space-y-6 my-6">
              {documento.secoes.map((secao, idx) => (
                <div key={secao.id || idx} className="space-y-2">
                  <h3
                    className="font-serif font-bold text-sm uppercase tracking-wide border-b border-slate-200 pb-1"
                    style={{ color: primaryColor }}
                  >
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
              {documento.conteudo}
            </div>
          )}
        </div>

        {/* Rodapé e Assinatura */}
        <div className="pt-12 mt-auto border-t border-slate-200">
          <div className="flex flex-col items-center justify-center mb-8">
            {documento.assinatura?.dados ? (
              <div className="mb-2 h-20 flex items-center justify-center">
                <img
                  src={documento.assinatura.dados}
                  alt="Assinatura Profissional"
                  className="max-h-20 max-w-[240px] object-contain"
                />
              </div>
            ) : (
              <div className="w-64 border-b border-slate-400 mb-2 h-12"></div>
            )}
            <p className="font-bold text-sm text-slate-900">
              {prof.nome || documento.profissionalId}
            </p>
            <p className="text-xs text-slate-600 font-mono">
              {prof.profissao || "Psicólogo(a)"}
              {prof.crp ? ` · CRP ${prof.crp}` : ""}
            </p>
            {prof.contato && <p className="text-[11px] text-slate-500 mt-0.5">{prof.contato}</p>}
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono border-t border-slate-100 pt-4">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Verificado via AcolheMente · Código: {documento.numeroEmissao}</span>
            </span>
            <span>Página 1 de {documento.configuracaoPaginas || 1}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
