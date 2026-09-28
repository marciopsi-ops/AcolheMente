import React, { useState, useEffect } from "react";
import {
  FileText,
  XCircle,
  CheckCircle2,
  Copy,
  ExternalLink,
  ShieldCheck,
  Send,
  RotateCcw,
  Sparkles,
  Download,
  Clock,
  UserCheck,
  AlertCircle
} from "lucide-react";
import { gerarModeloContrato } from "../utils/contratoTemplate";

interface ContratoModalProps {
  isOpen: boolean;
  onClose: () => void;
  paciente: any;
  profissional: any;
  onSaveContrato: (novoTexto: string) => Promise<void>;
  onShowToast: (msg: string, type: "success" | "error" | "info") => void;
}

export function ContratoModal({
  isOpen,
  onClose,
  paciente,
  profissional,
  onSaveContrato,
  onShowToast,
}: ContratoModalProps) {
  const [texto, setTexto] = useState("");
  const [activeTab, setActiveTab] = useState<"editar" | "auditoria">("editar");
  const [isSaving, setIsSaving] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!paciente) return;
    if (paciente.contratoText && paciente.contratoText.trim().length > 0) {
      setTexto(paciente.contratoText);
    } else {
      // Gera automaticamente preenchido com dados do paciente e profissional
      const gerado = gerarModeloContrato({
        paciente,
        profissional: profissional || {},
      });
      setTexto(gerado);
    }

    if (paciente.contratoAssinado) {
      setActiveTab("auditoria");
    } else {
      setActiveTab("editar");
    }
  }, [paciente, profissional, isOpen]);

  if (!isOpen || !paciente) return null;

  const publicLink = `${window.location.origin}/?contrato=${paciente.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicLink);
    setCopiedLink(true);
    onShowToast("Link do contrato copiado para a área de transferência!", "success");
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleOpenPublic = () => {
    window.open(publicLink, "_blank");
  };

  const handleSendWhatsApp = () => {
    const rawPhone = paciente.whatsapp || paciente.telefone || "";
    const cleanPhone = rawPhone.replace(/\D/g, "");
    const nomePaciente = paciente.nomeDesejado || paciente.nomeCompleto || paciente.nome || "Paciente";
    const mensagem = encodeURIComponent(
      `Olá, ${nomePaciente}! Tudo bem?\n\nPara iniciarmos nosso acompanhamento psicológico com total transparência e segurança jurídica, elaborei o nosso Contrato Terapêutico e Enquadre Clínico.\n\nVocê pode ler as cláusulas e registrar seu aceite digital com apenas alguns cliques no link seguro abaixo:\n👉 ${publicLink}\n\nFico à disposição para esclarecer qualquer dúvida!`
    );

    if (cleanPhone.length >= 10) {
      const fullPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
      window.open(`https://api.whatsapp.com/send?phone=${fullPhone}&text=${mensagem}`, "_blank");
    } else {
      window.open(`https://api.whatsapp.com/send?text=${mensagem}`, "_blank");
    }
    onShowToast("Abrindo WhatsApp com mensagem e link do contrato...", "info");
  };

  const handleRestaurarModelo = () => {
    const gerado = gerarModeloContrato({
      paciente,
      profissional: profissional || {},
    });
    setTexto(gerado);
    onShowToast("Modelo padrão gerado e preenchido com dados da ficha!", "info");
  };

  const handleSave = async () => {
    if (!texto.trim()) {
      onShowToast("O texto do contrato não pode estar vazio.", "error");
      return;
    }
    setIsSaving(true);
    try {
      await onSaveContrato(texto);
      onShowToast("Contrato terapêutico salvo com sucesso na ficha!", "success");
      onClose();
    } catch (err) {
      console.error(err);
      onShowToast("Erro ao salvar contrato.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const dadosAuditoria = paciente.dadosContrato || {};

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-2 sm:px-4 bg-forest/35 backdrop-blur-sm animate-in fade-in py-3">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-soft overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 border-b border-soft bg-gradient-to-r from-warm/60 via-white to-warm/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
              <FileText className="w-5 h-5 text-sun" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg sm:text-xl font-bold text-forest">
                  Contrato Terapêutico & Aceite Digital
                </h3>
                {paciente.contratoAssinado ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Assinado
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-700" /> Aguardando Aceite
                  </span>
                )}
              </div>
              <p className="text-xs text-forest/70">
                Paciente: <strong className="text-forest font-semibold">{paciente.nomeCompleto || paciente.nome || "Paciente"}</strong> • Profissional: <strong className="text-forest font-semibold">{profissional?.name || "Psicólogo(a)"}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-forest/50 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors"
            title="Fechar"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar / Quick Sharing Tools */}
        <div className="px-6 py-3 bg-warm/30 border-b border-soft flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("editar")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "editar"
                  ? "bg-forest text-white shadow-2xs"
                  : "bg-white text-forest/70 border border-soft hover:bg-warm"
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Cláusulas & Minuta
            </button>
            {paciente.contratoAssinado && (
              <button
                type="button"
                onClick={() => setActiveTab("auditoria")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === "auditoria"
                    ? "bg-emerald-700 text-white shadow-2xs"
                    : "bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" /> Trilha de Auditoria & Certificado
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-1.5 bg-white hover:bg-warm text-forest border border-soft rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-2xs"
              title="Copiar link da página de aceite para enviar ao paciente"
            >
              <Copy className="w-3.5 h-3.5 text-forest/60" />
              {copiedLink ? "Link Copiado!" : "Copiar Link"}
            </button>

            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="px-3 py-1.5 bg-[#25D366] hover:bg-[#20BD5A] text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
              title="Abrir WhatsApp com mensagem pronta"
            >
              <Send className="w-3.5 h-3.5" /> WhatsApp
            </button>

            <button
              type="button"
              onClick={handleOpenPublic}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
              title="Abrir página pública de assinatura em nova guia"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-700" /> Abrir Página
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4 bg-warm/10 custom-scrollbar">
          {/* Status Alert Banner */}
          {paciente.contratoAssinado ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
              <div className="p-2 bg-emerald-700 text-white rounded-xl shrink-0 mt-0.5">
                <ShieldCheck className="w-5 h-5 text-sun" />
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-emerald-950 text-sm">
                    Contrato Formalizado e Assinado pelo Paciente
                  </h4>
                  <span className="text-[10px] bg-white text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full font-mono font-bold">
                    {paciente.contratoAssinadoEm || dadosAuditoria.dataAceiteFormatada}
                  </span>
                </div>
                <p className="text-emerald-900/80 leading-relaxed">
                  O paciente realizou a conferência de dados, declarou ciência dos honorários e enquadre clínico, e registrou seu aceite com integridade verificada via SHA-256.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
              <div className="p-2 bg-amber-500 text-white rounded-xl shrink-0 mt-0.5">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1 text-xs text-amber-950">
                <h4 className="font-bold text-amber-950 text-sm">
                  Aguardando Confirmação do Paciente
                </h4>
                <p className="text-amber-900/80 leading-relaxed">
                  Envie o link acima para o paciente pelo WhatsApp ou e-mail. Ao acessar, o paciente visualizará a página do contrato, conferirá seu CPF e registrará o aceite digital.
                </p>
              </div>
            </div>
          )}

          {activeTab === "auditoria" && paciente.contratoAssinado ? (
            <div className="space-y-4">
              <div className="p-5 bg-white border border-soft rounded-2xl shadow-xs space-y-4">
                <h5 className="text-xs font-bold uppercase tracking-wider text-forest/70 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" /> Registro da Trilha de Auditoria Jurídica
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-warm/30 rounded-xl border border-soft">
                    <span className="text-[10px] uppercase font-bold text-forest/60 block">Nome do Signatário</span>
                    <span className="font-bold text-forest text-sm">{dadosAuditoria.pacienteNome || paciente.nome}</span>
                  </div>

                  <div className="p-3 bg-warm/30 rounded-xl border border-soft">
                    <span className="text-[10px] uppercase font-bold text-forest/60 block">CPF Registrado no Aceite</span>
                    <span className="font-bold text-forest text-sm font-mono">{dadosAuditoria.pacienteCpf || paciente.cpf || "Conferido"}</span>
                  </div>

                  <div className="p-3 bg-warm/30 rounded-xl border border-soft">
                    <span className="text-[10px] uppercase font-bold text-forest/60 block">Data e Horário do Aceite</span>
                    <span className="font-bold text-emerald-900 text-sm">{dadosAuditoria.dataAceiteFormatada || paciente.contratoAssinadoEm}</span>
                  </div>

                  <div className="p-3 bg-warm/30 rounded-xl border border-soft">
                    <span className="text-[10px] uppercase font-bold text-forest/60 block">Conformidade Legal</span>
                    <span className="font-bold text-forest text-xs">MP 2.200-2/2001 • Resolução CFP 11/2018</span>
                  </div>

                  <div className="p-3 bg-warm/30 rounded-xl border border-soft sm:col-span-2">
                    <span className="text-[10px] uppercase font-bold text-forest/60 block">Hash Criptográfico SHA-256 (Integridade)</span>
                    <span className="font-mono text-[11px] text-emerald-950 font-bold break-all select-all block mt-0.5">
                      {dadosAuditoria.hashContrato || "Identificador de integridade gerado no aceite"}
                    </span>
                  </div>
                </div>

                {dadosAuditoria.rubricaBase64 && (
                  <div className="p-3 bg-warm/30 rounded-xl border border-soft flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-forest/60 block">Rubrica Digital Registrada</span>
                      <span className="text-xs text-forest/70">Assinatura capturada na tela do dispositivo</span>
                    </div>
                    <img
                      src={dadosAuditoria.rubricaBase64}
                      alt="Rubrica Digital"
                      className="h-14 border border-soft rounded-lg bg-white px-3 py-1 object-contain"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-forest/70 block">
                  Cópia do Contrato Assinado
                </span>
                <div className="p-5 bg-white border border-soft rounded-2xl text-xs text-forest/90 leading-relaxed font-serif whitespace-pre-wrap max-h-72 overflow-y-auto custom-scrollbar select-text">
                  {texto}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-forest/80 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-forest/60" /> Minuta do Contrato (Editável)
                </label>

                <button
                  type="button"
                  onClick={handleRestaurarModelo}
                  className="text-xs text-sun-dark font-bold hover:underline flex items-center gap-1"
                  title="Gera novamente o texto do contrato com os dados atuais da ficha do paciente"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Re-preencher Dados da Ficha
                </button>
              </div>

              <textarea
                rows={16}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                className="w-full text-xs font-mono bg-white border border-soft p-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-600 resize-none leading-relaxed text-forest"
                placeholder="Insira os termos do contrato..."
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-soft bg-warm/40 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-forest/70 hover:text-forest transition-colors"
          >
            Fechar
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-sun" />
              {isSaving ? "Salvando..." : "Salvar Minuta na Ficha"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
