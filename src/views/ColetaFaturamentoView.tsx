import React, { useState, useEffect } from "react";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  ShieldCheck,
  CheckCircle2,
  FileText,
  User,
  CreditCard,
  Calendar,
  Mail,
  Phone,
  AlertCircle,
  Building2,
  Lock,
  ArrowRight,
  HeartHandshake
} from "lucide-react";
import { getAppBranding } from "../utils/branding";

interface ColetaFaturamentoViewProps {
  fichaId: string;
  onGoHome?: () => void;
}

// Máscara e validador de CPF
function maskCpf(val: string) {
  const digits = val.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

function validarCpf(cpf: string): boolean {
  const clean = cpf.replace(/\D/g, "");
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(clean.charAt(i), 10) * (10 - i);
  }
  let resto = 11 - (soma % 11);
  let digito1 = resto >= 10 ? 0 : resto;
  if (digito1 !== parseInt(clean.charAt(9), 10)) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(clean.charAt(i), 10) * (11 - i);
  }
  resto = 11 - (soma % 11);
  let digito2 = resto >= 10 ? 0 : resto;
  return digito2 === parseInt(clean.charAt(10), 10);
}

// Máscara de Telefone BR
function maskPhone(val: string) {
  const digits = val.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

export function ColetaFaturamentoView({ fichaId, onGoHome }: ColetaFaturamentoViewProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [recordData, setRecordData] = useState<any>(null);
  const [profBrandName, setProfBrandName] = useState<string>("");
  const [targetCollection, setTargetCollection] = useState<
    "triagem_corporativa" | "acolhimentos" | "pacientes"
  >("triagem_corporativa");

  // Campos do formulário
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [cpf, setCpf] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    const loadData = async () => {
      try {
        let col: "triagem_corporativa" | "acolhimentos" | "pacientes" = "triagem_corporativa";
        let snap = await getDoc(doc(db, "triagem_corporativa", fichaId));

        if (!snap.exists()) {
          snap = await getDoc(doc(db, "acolhimentos", fichaId));
          if (snap.exists()) {
            col = "acolhimentos";
          }
        }

        if (!snap.exists()) {
          snap = await getDoc(doc(db, "pacientes", fichaId));
          if (snap.exists()) {
            col = "pacientes";
          }
        }

        if (snap.exists()) {
          const d = snap.data();
          setTargetCollection(col);
          setRecordData(d);

          if (d.profissionalId) {
            try {
              const pSnap = await getDoc(doc(db, "users", d.profissionalId));
              if (pSnap.exists()) {
                const pData = pSnap.data();
                const branding = getAppBranding(pData);
                if (branding.isCustom) {
                  setProfBrandName(branding.brandName);
                }
              }
            } catch (e) {}
          }

          // Inicializar campos com o que já tiver
          const nomeInicial =
            d.pacienteNomeCompleto ||
            d.nomeCivil ||
            d.dadosContrato?.pacienteNome ||
            d.dadosContrato?.nome ||
            (d.beneficiarioTipo === "dependente" && d.dependenteInfo ? d.dependenteInfo : d.colaboradorNome) ||
            d.nome ||
            d.nomeCompleto ||
            "";

          const cpfInicial =
            d.pacienteCpf ||
            d.cpf ||
            d.dadosContrato?.pacienteCpf ||
            d.dadosContrato?.cpf ||
            "";

          const emailInicial =
            d.pacienteEmail ||
            d.colaboradorEmail ||
            d.email ||
            d.dadosContrato?.pacienteEmail ||
            d.dadosContrato?.email ||
            "";

          const telInicial =
            d.pacienteTelefone ||
            d.colaboradorWhatsapp ||
            d.colaboradorTelefone ||
            d.whatsapp ||
            d.telefone ||
            "";

          const dataNascInicial =
            d.pacienteDataNascimento ||
            d.colaboradorDataNascimento ||
            d.dataNascimento ||
            "";

          setNomeCompleto(nomeInicial);
          if (cpfInicial) setCpf(maskCpf(cpfInicial));
          if (emailInicial) setEmail(emailInicial);
          if (telInicial) setTelefone(maskPhone(telInicial));
          if (dataNascInicial) setDataNascimento(dataNascInicial);

          if (typeof d.endereco === "string" && d.endereco.trim()) {
            setEndereco(d.endereco);
          } else if (typeof d.enderecoCompleto === "string" && d.enderecoCompleto.trim()) {
            setEndereco(d.enderecoCompleto);
          } else if (d.endereco && typeof d.endereco === "object") {
            const eObj = d.endereco;
            const formattedEnd = [
              eObj.logradouro ? `${eObj.logradouro}${eObj.numero ? `, ${eObj.numero}` : ""}` : "",
              eObj.complemento,
              eObj.bairro,
              eObj.cidade ? `${eObj.cidade}${eObj.uf ? ` - ${eObj.uf}` : ""}` : "",
            ]
              .filter(Boolean)
              .join(", ");
            if (formattedEnd) setEndereco(formattedEnd);
          }
        } else {
          setErrorMsg("Ficha cadastral não encontrada ou link expirado.");
        }
      } catch (err: any) {
        console.error("Erro ao carregar dados de faturamento:", err);
        setErrorMsg("Não foi possível carregar o formulário. Tente recarregar a página.");
      } finally {
        setLoading(false);
      }
    };

    if (fichaId) {
      loadData();
    } else {
      setLoading(false);
      setErrorMsg("Identificador da ficha não informado no link.");
    }
  }, [fichaId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!nomeCompleto.trim()) {
      setErrorMsg("Por favor, preencha seu nome completo.");
      return;
    }

    const cpfDigits = cpf.replace(/\D/g, "");
    if (!cpfDigits || cpfDigits.length !== 11) {
      setErrorMsg("Por favor, informe um CPF válido com 11 dígitos.");
      return;
    }

    if (!validarCpf(cpf)) {
      setErrorMsg("O CPF informado possui dígitos verificadores inválidos. Verifique a digitação.");
      return;
    }

    if (!dataNascimento) {
      setErrorMsg("Por favor, selecione sua data de nascimento.");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setErrorMsg("Por favor, informe um e-mail válido para envio dos recibos.");
      return;
    }

    if (!telefone.trim() || telefone.replace(/\D/g, "").length < 10) {
      setErrorMsg("Por favor, informe um telefone/WhatsApp de contato válido com DDD.");
      return;
    }

    try {
      setSaving(true);
      const agoraIso = new Date().toISOString();
      const agoraFormatada = new Date().toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const updates: any = {
        pacienteNomeCompleto: nomeCompleto.trim(),
        pacienteCpf: cpf.trim(),
        pacienteDataNascimento: dataNascimento,
        pacienteEmail: email.trim().toLowerCase(),
        pacienteTelefone: telefone.trim(),
        dadosFaturamentoPreenchidosEm: agoraFormatada,
        cpf: cpf.trim(),
        updatedAt: serverTimestamp(),
      };

      if (targetCollection === "pacientes") {
        updates.nome = nomeCompleto.trim();
        updates.nomeCivil = nomeCompleto.trim();
        updates.email = email.trim().toLowerCase();
        updates.telefone = telefone.trim();
        updates.dataNascimento = dataNascimento;
        if (String(endereco || "").trim()) {
          updates.enderecoCompleto = String(endereco).trim();
        }
      } else {
        updates.colaboradorEmail = email.trim().toLowerCase();
        updates.colaboradorDataNascimento = dataNascimento;
        if (String(endereco || "").trim()) {
          updates.endereco = String(endereco).trim();
        }
      }

      // Se for triagem corporativa, registra no histórico
      if (targetCollection === "triagem_corporativa") {
        const historicoExistente = recordData?.historico || [];
        updates.historico = [
          ...historicoExistente,
          {
            data: agoraIso,
            autor: "Paciente (Formulário Seguro)",
            acao: "Dados de Faturamento & Recibo Informados",
            detalhes: `Dados preenchidos: ${nomeCompleto.trim()} (CPF: ${cpf.trim()}, Nasc: ${dataNascimento.split("-").reverse().join("/")}).`,
          },
        ];
      }

      await updateDoc(doc(db, targetCollection, fichaId), updates);
      setCompleted(true);
    } catch (err: any) {
      console.error("Erro ao salvar dados cadastrais:", err);
      setErrorMsg("Ocorreu um erro ao salvar as informações. Por favor, tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
        <div className="flex flex-col items-center gap-3 text-stone-600">
          <div className="w-10 h-10 border-3 border-emerald-600/30 border-t-emerald-700 rounded-full animate-spin"></div>
          <p className="text-sm font-medium">Carregando formulário seguro...</p>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50/60 via-stone-50 to-emerald-50/40 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl border border-emerald-200/80 p-6 sm:p-10 max-w-lg w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-800 bg-emerald-100/70 px-3 py-1 rounded-full">
              Cadastro Concluído
            </span>
            <h2 className="text-2xl font-bold font-serif text-emerald-950">
              Dados Confirmados com Sucesso!
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Obrigado, <strong>{nomeCompleto.split(" ")[0]}</strong>. Suas informações para emissão de recibos e documentação clínica foram registradas com segurança e já estão disponíveis para o seu psicólogo.
            </p>
          </div>

          <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 text-left text-xs space-y-2 text-stone-700">
            <div className="flex justify-between py-1 border-b border-stone-200/70">
              <span className="text-stone-500">Nome:</span>
              <span className="font-semibold">{nomeCompleto}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-stone-200/70">
              <span className="text-stone-500">CPF:</span>
              <span className="font-mono font-semibold">{cpf}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-stone-200/70">
              <span className="text-stone-500">Data de Nasc.:</span>
              <span className="font-semibold">{dataNascimento.split("-").reverse().join("/")}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-stone-500">E-mail:</span>
              <span className="font-semibold">{email}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-emerald-800 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Dados criptografados e protegidos sob a LGPD.</span>
          </div>

          {onGoHome && (
            <button
              type="button"
              onClick={onGoHome}
              className="w-full py-3 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
            >
              Concluir e Ir para a Página Inicial
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 via-emerald-50/30 to-stone-100 flex flex-col justify-between py-8 px-4 sm:px-6">
      <div className="max-w-xl w-full mx-auto space-y-6">
        {/* CABEÇALHO COM IDENTIDADE VISUAL */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 border border-emerald-300/80 text-emerald-900 text-xs font-semibold shadow-2xs">
            <HeartHandshake className="w-4 h-4 text-emerald-700" />
            <span>
              {targetCollection === "pacientes" ||
              recordData?.tipo === "externo" ||
              recordData?.viaAcesso === "Carteira Externa"
                ? `${profBrandName || "AcolheHub"} • Consultório Particular`
                : "AcolheMente Saúde • Atendimento Corporativo"}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold font-serif text-emerald-950 tracking-tight">
            Dados para Recibo & Faturamento
          </h1>

          <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto leading-relaxed">
            Por gentileza, confirme seus dados cadastrais para que possamos emitir seus recibos clínicos individuais ou consolidados para declaração do IRPF / reembolso.
          </p>

          {recordData?.empresaNome && (
            <div className="inline-flex items-center gap-1.5 text-xs text-stone-500 bg-white px-3 py-1 rounded-lg border border-stone-200 shadow-2xs">
              <Building2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>Programa Corporativo: <strong>{recordData.empresaNome}</strong></span>
              {recordData.profissionalNome && (
                <span>• Psicólogo(a): <strong>{recordData.profissionalNome}</strong></span>
              )}
            </div>
          )}
        </div>

        {/* MENSAGEM DE ERRO SE HOUVER */}
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 text-xs flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{errorMsg}</div>
          </div>
        )}

        {/* CARD DO FORMULÁRIO */}
        <div className="bg-white rounded-3xl shadow-lg border border-stone-200/90 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-800 to-emerald-900 p-4 sm:p-5 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <FileText className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-wide">Identificação do Paciente / Tomador</h3>
                <p className="text-[11px] text-emerald-200">Preenchimento rápido e criptografado</p>
              </div>
            </div>
            <Lock className="w-4 h-4 text-emerald-300" />
          </div>

          <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-4 text-xs">
            {/* NOME COMPLETO */}
            <div>
              <label className="block font-bold text-stone-700 uppercase tracking-wider text-[11px] mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-700" />
                Nome Completo (como consta no documento) *
              </label>
              <input
                type="text"
                required
                value={nomeCompleto}
                onChange={(e) => setNomeCompleto(e.target.value)}
                placeholder="Ex: Mariana Silva Souza"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 text-stone-800 font-medium outline-none transition-all text-xs"
              />
            </div>

            {/* GRID: CPF & DATA DE NASCIMENTO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-bold text-stone-700 uppercase tracking-wider text-[11px] mb-1.5 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
                  CPF *
                </label>
                <input
                  type="text"
                  required
                  value={cpf}
                  onChange={(e) => setCpf(maskCpf(e.target.value))}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 text-stone-800 font-mono font-medium outline-none transition-all text-xs"
                />
                <span className="text-[10px] text-stone-400 mt-1 block">Obrigatório para Receita Saúde / Carnê-Leão</span>
              </div>

              <div>
                <label className="block font-bold text-stone-700 uppercase tracking-wider text-[11px] mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                  Data de Nascimento *
                </label>
                <input
                  type="date"
                  required
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 text-stone-800 font-medium outline-none transition-all text-xs"
                />
                <span className="text-[10px] text-stone-400 mt-1 block">Necessária para dedução no IRPF</span>
              </div>
            </div>

            {/* GRID: EMAIL & TELEFONE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-bold text-stone-700 uppercase tracking-wider text-[11px] mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-emerald-700" />
                  E-mail para Envio de Recibos *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@exemplo.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 text-stone-800 font-medium outline-none transition-all text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 uppercase tracking-wider text-[11px] mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-700" />
                  Telefone / WhatsApp *
                </label>
                <input
                  type="tel"
                  required
                  value={telefone}
                  onChange={(e) => setTelefone(maskPhone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 text-stone-800 font-mono font-medium outline-none transition-all text-xs"
                />
              </div>
            </div>

            {/* ENDEREÇO (OPCIONAL) */}
            <div>
              <label className="block font-bold text-stone-700 uppercase tracking-wider text-[11px] mb-1.5">
                Endereço com Cidade/UF <span className="text-stone-400 font-normal">(opcional - caso precise de Nota Fiscal NFS-e)</span>
              </label>
              <input
                type="text"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                placeholder="Rua, número, bairro, cidade - UF"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 text-stone-800 font-medium outline-none transition-all text-xs"
              />
            </div>

            {/* LGPD NOTICE */}
            <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200/80 flex items-start gap-2.5 text-emerald-950 text-[11px] leading-relaxed">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <strong>Privacidade e Sigilo Profissional:</strong> Seus dados são utilizados estritamente pelo psicólogo responsável para emissão de recibos de honorários profissionais (Receita Federal / Carnê-Leão e NFS-e) e faturamento dos atendimentos, em conformidade com o Código de Ética do CFP e a Lei Geral de Proteção de Dados (LGPD).
              </div>
            </div>

            {/* BOTÃO ENVIAR */}
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3.5 px-4 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-60 text-white rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-98"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Gravando informações...</span>
                </>
              ) : (
                <>
                  <span>Confirmar e Salvar Meus Dados</span>
                  <ArrowRight className="w-4 h-4 text-amber-300" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* RODAPÉ */}
      <div className="text-center text-[11px] text-stone-400 mt-6">
        © {new Date().getFullYear()}{" "}
        {targetCollection === "pacientes" ||
        recordData?.tipo === "externo" ||
        recordData?.viaAcesso === "Carteira Externa"
          ? `${profBrandName || "AcolheHub"} • Gestão Clínica Segura em conformidade com o CFP e LGPD`
          : "AcolheMente Saúde • Plataforma de Cuidado Psicológico e Bem-Estar Corporativo"}
      </div>
    </div>
  );
}
