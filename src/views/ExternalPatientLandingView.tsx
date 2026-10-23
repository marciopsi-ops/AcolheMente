import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { addDoc, collection, doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import {
  CheckCircle2,
  ChevronRight,
  Home,
  ShieldCheck,
  User,
  MapPin,
  Heart,
  Calendar,
  Clock,
  Sparkles,
  Phone,
  Mail,
  DollarSign,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { formatProfessionalName } from "../utils/formatters";

interface ExternalPatientLandingViewProps {
  profUid: string | null;
  onGoHome: () => void;
}

export function ExternalPatientLandingView({ profUid, onGoHome }: ExternalPatientLandingViewProps) {
  const [profData, setProfData] = useState<any>(null);
  const [loadingProf, setLoadingProf] = useState(true);

  // Leitura de parâmetros de URL
  const [urlParams] = useState(() => {
    if (typeof window === "undefined") return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  });

  const activeProfUid =
    profUid ||
    urlParams.get("prof") ||
    urlParams.get("profissional") ||
    urlParams.get("profissionalId") ||
    urlParams.get("uid") ||
    null;

  const paramValor = urlParams.get("valor") || "";
  const paramModalidade = urlParams.get("modalidade") || "";
  const paramFrequencia = urlParams.get("frequencia") || "";
  const paramOrigem = urlParams.get("origem") || "";
  const paramPacienteId = urlParams.get("paciente") || urlParams.get("id") || urlParams.get("pacienteId") || "";
  const paramTipo = urlParams.get("tipo") || "externo";
  const isModoAtualizacao = Boolean(paramPacienteId);
  const [loadedCollection, setLoadedCollection] = useState<string>("pacientes");
  const [loadingPacienteExistente, setLoadingPacienteExistente] = useState(false);

  // Form states - Básicos
  const [nome, setNome] = useState("");
  const [nomeSocial, setNomeSocial] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [cpf, setCpf] = useState("");
  const [genero, setGenero] = useState("");
  const [profissao, setProfissao] = useState("");

  // Menor de idade
  const [isMenorIdade, setIsMenorIdade] = useState(false);
  const [nomeResponsavel, setNomeResponsavel] = useState("");
  const [telefoneResponsavel, setTelefoneResponsavel] = useState("");
  const [cpfResponsavel, setCpfResponsavel] = useState("");
  const [emailResponsavel, setEmailResponsavel] = useState("");
  const [parentescoResponsavel, setParentescoResponsavel] = useState("");

  // Endereço
  const [cep, setCep] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [buscandoCep, setBuscandoCep] = useState(false);

  // Queixa e Clínico
  const [queixaPrincipal, setQueixaPrincipal] = useState("");
  const [terapiaAnterior, setTerapiaAnterior] = useState("");
  const [medicacao, setMedicacao] = useState("");
  const [contatoEmergenciaNome, setContatoEmergenciaNome] = useState("");
  const [contatoEmergenciaTelefone, setContatoEmergenciaTelefone] = useState("");

  // Preferências de Atendimento
  const [modalidadeEscolhida, setModalidadeEscolhida] = useState(
    paramModalidade && paramModalidade !== "ambas" ? paramModalidade : "online"
  );
  const [turnoPreferido, setTurnoPreferido] = useState("");
  const [diasPreferidos, setDiasPreferidos] = useState<string[]>([]);

  // Fonte de indicação
  const [fonteIndicacao, setFonteIndicacao] = useState(paramOrigem || "");

  // LGPD
  const [aceitouLgpd, setAceitouLgpd] = useState(false);

  // Status
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Helpers de formatação
  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const formatCpf = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const formatCep = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  };

  // Carregar dados e configurações do profissional
  useEffect(() => {
    if (!activeProfUid) {
      setLoadingProf(false);
      return;
    }
    const loadProf = async () => {
      try {
        const snap = await getDoc(doc(db, "users", activeProfUid));
        if (snap.exists()) {
          const data = snap.data();
          setProfData(data);

          // Se o profissional tiver modalidade padrão e a URL não especificou
          if (!paramModalidade && data?.configFormularioExterno?.modalidadePadrao) {
            const padrao = data.configFormularioExterno.modalidadePadrao;
            if (padrao !== "ambas") {
              setModalidadeEscolhida(padrao);
            }
          }
        }
      } catch (err) {
        console.error("Erro ao carregar dados do profissional:", err);
      } finally {
        setLoadingProf(false);
      }
    };
    loadProf();
  }, [activeProfUid, paramModalidade]);

  // Carregar dados existentes do paciente caso seja um link de atualização cadastral
  useEffect(() => {
    if (!paramPacienteId) return;

    const loadPaciente = async () => {
      setLoadingPacienteExistente(true);
      try {
        let snap: any = null;
        let col = "pacientes";

        if (paramTipo === "acolhimento") {
          col = "acolhimentos";
          snap = await getDoc(doc(db, "acolhimentos", paramPacienteId));
        } else if (paramTipo === "corporativo") {
          col = "triagem_corporativa";
          snap = await getDoc(doc(db, "triagem_corporativa", paramPacienteId));
        } else {
          snap = await getDoc(doc(db, "pacientes", paramPacienteId));
          if (!snap.exists()) {
            col = "acolhimentos";
            snap = await getDoc(doc(db, "acolhimentos", paramPacienteId));
          }
          if (!snap.exists()) {
            col = "triagem_corporativa";
            snap = await getDoc(doc(db, "triagem_corporativa", paramPacienteId));
          }
        }

        if (snap && snap.exists()) {
          const d = snap.data();
          setLoadedCollection(col);
          setNome(d.nomeCivil || d.nome || d.colaboradorNome || d.nomeCompleto || "");
          setNomeSocial(d.nomeSocial || d.nomeDesejado || "");
          setEmail(d.email || d.colaboradorEmail || "");
          setTelefone(d.telefone || d.colaboradorWhatsapp || d.whatsapp || "");
          setDataNascimento(d.dataNascimento || d.colaboradorDataNascimento || "");
          setCpf(d.cpf || d.colaboradorCpf || "");
          setGenero(d.genero || "");
          setProfissao(d.profissao || d.cargoNome || "");

          if (d.responsavel) {
            setNomeResponsavel(d.responsavel.nome || d.responsavelNome || "");
            setTelefoneResponsavel(d.responsavel.telefone || d.responsavelTelefone || "");
            setCpfResponsavel(d.responsavel.cpf || d.responsavelCpf || "");
            setEmailResponsavel(d.responsavel.email || d.responsavelEmail || "");
            setParentescoResponsavel(d.responsavel.parentesco || "");
          } else {
            setNomeResponsavel(d.responsavelNome || "");
            setTelefoneResponsavel(d.responsavelTelefone || "");
            setCpfResponsavel(d.responsavelCpf || "");
            setEmailResponsavel(d.responsavelEmail || "");
          }

          const end = d.endereco || {};
          setCep(d.cep || end.cep || "");
          setLogradouro(d.logradouro || end.logradouro || "");
          setNumero(d.numero || end.numero || "");
          setComplemento(d.complemento || end.complemento || "");
          setBairro(d.bairro || end.bairro || "");
          setCidade(d.cidade || end.cidade || "");
          setUf(d.uf || end.uf || "");

          setQueixaPrincipal(d.queixaPrincipal || d.motivo || d.queixa || "");
          setTerapiaAnterior(d.terapiaAnterior || "");
          setMedicacao(d.medicacao || "");
          if (d.contatoEmergencia) {
            setContatoEmergenciaNome(d.contatoEmergencia);
          }
          if (d.modalidade) {
            setModalidadeEscolhida(d.modalidade);
          }
          setAceitouLgpd(true);

          // Se não havia profissional carregado, carrega o vinculado ao paciente
          const profTarget = d.profissionalId || d.profissionalUid;
          if (profTarget && !profData) {
            try {
              const profSnap = await getDoc(doc(db, "users", profTarget));
              if (profSnap.exists()) {
                setProfData(profSnap.data());
              }
            } catch (errProf) {
              console.error("Erro ao carregar profissional vinculado:", errProf);
            }
          }
        }
      } catch (err) {
        console.error("Erro ao carregar dados do paciente para atualização:", err);
      } finally {
        setLoadingPacienteExistente(false);
      }
    };

    loadPaciente();
  }, [paramPacienteId, paramTipo]);

  // Verificar se é menor de idade pela data de nascimento
  useEffect(() => {
    if (!dataNascimento) return;
    const nasc = new Date(dataNascimento);
    const hoje = new Date();
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) {
      idade--;
    }
    if (idade < 18) {
      setIsMenorIdade(true);
    } else {
      setIsMenorIdade(false);
    }
  }, [dataNascimento]);

  // Busca automática de CEP
  const handleBuscarCep = async (cepValue: string) => {
    const cleanCep = cepValue.replace(/\D/g, "");
    if (cleanCep.length === 8) {
      setBuscandoCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setLogradouro(data.logradouro || "");
          setBairro(data.bairro || "");
          setCidade(data.localidade || "");
          setUf(data.uf || "");
        }
      } catch (err) {
        console.error("Erro ao consultar ViaCEP:", err);
      } finally {
        setBuscandoCep(false);
      }
    }
  };

  // Configurações ativas do profissional
  const config = profData?.configFormularioExterno || {};
  const tituloPagina = isModoAtualizacao
    ? "Atualização de Dados Cadastrais"
    : config.tituloPersonalizado || "Ficha de Cadastro do Paciente";
  const mensagemBoasVindas = isModoAtualizacao
    ? "Por favor, confira e atualize seus dados cadastrais para manter seu prontuário em dia."
    : config.mensagemBoasVindas ||
      "Preencha seus dados abaixo para registro seguro no prontuário do consultório.";
  const valorFinalSessao = paramValor || config.valorPadrao || "";
  const solicitarEndereco = config.solicitarEndereco !== false;
  const solicitarQueixaPrincipal = config.solicitarQueixaPrincipal !== false;
  const solicitarDisponibilidade = !isModoAtualizacao && config.solicitarDisponibilidade !== false;
  const solicitarContatoEmergencia = config.solicitarContatoEmergencia !== false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!nome.trim() || !telefone.trim() || !dataNascimento || !cpf.trim()) {
      setErrorMsg("Por favor, preencha todos os campos obrigatórios (*).");
      return;
    }

    if (isMenorIdade && (!nomeResponsavel.trim() || !telefoneResponsavel.trim() || !cpfResponsavel.trim())) {
      setErrorMsg("Para pacientes menores de 18 anos, os dados do responsável legal são obrigatórios.");
      return;
    }

    if (!aceitouLgpd) {
      setErrorMsg("É necessário concordar com os Termos e Acordos (LGPD) para prosseguir.");
      return;
    }

    setSubmitting(true);
    try {
      const enderecoCompleto = [
        logradouro ? `${logradouro}${numero ? `, ${numero}` : ""}` : "",
        complemento,
        bairro,
        cidade ? `${cidade}${uf ? ` - ${uf}` : ""}` : "",
      ]
        .filter(Boolean)
        .join(", ");

      const contatoEmergenciaFinal = contatoEmergenciaNome.trim()
        ? `${contatoEmergenciaNome.trim()} (${contatoEmergenciaTelefone.trim()})`
        : "";

      if (isModoAtualizacao && paramPacienteId) {
        // MODO ATUALIZAÇÃO: atualiza o registro existente
        await updateDoc(doc(db, loadedCollection, paramPacienteId), {
          nome: nome.trim(),
          nomeCivil: nome.trim(),
          nomeSocial: nomeSocial.trim(),
          nomeDesejado: (nomeSocial.trim() || nome.trim()),
          email: email.trim(),
          telefone: telefone.trim(),
          dataNascimento,
          cpf: cpf.trim(),
          genero: genero.trim(),
          profissao: profissao.trim(),
          ...(loadedCollection === "triagem_corporativa"
            ? {
                colaboradorNome: nome.trim(),
                colaboradorWhatsapp: telefone.trim(),
                colaboradorEmail: email.trim(),
                colaboradorCpf: cpf.trim(),
                colaboradorDataNascimento: dataNascimento,
              }
            : {}),
          responsavel: {
            nome: nomeResponsavel.trim(),
            telefone: telefoneResponsavel.trim(),
            cpf: cpfResponsavel.trim(),
            email: emailResponsavel.trim(),
            parentesco: parentescoResponsavel.trim(),
          },
          endereco: {
            cep: cep.trim(),
            logradouro: logradouro.trim(),
            numero: numero.trim(),
            complemento: complemento.trim(),
            bairro: bairro.trim(),
            cidade: cidade.trim(),
            uf: uf.trim(),
          },
          cep: cep.trim(),
          enderecoCompleto,
          cidade,
          uf,
          cidadeEstado: cidade ? `${cidade} - ${uf}` : "",
          queixaPrincipal: queixaPrincipal.trim(),
          motivo: queixaPrincipal.trim(),
          terapiaAnterior: terapiaAnterior.trim(),
          medicacao: medicacao.trim(),
          contatoEmergencia: contatoEmergenciaFinal,
          modalidade: modalidadeEscolhida || "online",
          dadosAtualizadosPeloPacienteEm: new Date().toISOString(),
          updatedAt: serverTimestamp(),
        });
      } else {
        // MODO NOVO CADASTRO
        await addDoc(collection(db, "pacientes"), {
          nome: nome.trim(),
          nomeCivil: nome.trim(),
          nomeSocial: nomeSocial.trim(),
          nomeDesejado: (nomeSocial.trim() || nome.trim()),
          email: email.trim(),
          telefone: telefone.trim(),
          dataNascimento,
          cpf: cpf.trim(),
          genero: genero.trim(),
          profissao: profissao.trim(),
          
          responsavel: {
            nome: nomeResponsavel.trim(),
            telefone: telefoneResponsavel.trim(),
            cpf: cpfResponsavel.trim(),
            email: emailResponsavel.trim(),
            parentesco: parentescoResponsavel.trim(),
          },

          endereco: {
            cep: cep.trim(),
            logradouro: logradouro.trim(),
            numero: numero.trim(),
            complemento: complemento.trim(),
            bairro: bairro.trim(),
            cidade: cidade.trim(),
            uf: uf.trim(),
          },
          cep: cep.trim(),
          enderecoCompleto,
          cidade,
          uf,
          cidadeEstado: cidade ? `${cidade} - ${uf}` : "",

          queixaPrincipal: queixaPrincipal.trim(),
          motivo: queixaPrincipal.trim(),
          terapiaAnterior: terapiaAnterior.trim(),
          medicacao: medicacao.trim(),
          contatoEmergencia: contatoEmergenciaFinal,

          valorSessao: valorFinalSessao || "A combinar",
          modalidade: modalidadeEscolhida || "online",
          frequenciaSessoes: paramFrequencia || "Semanal",
          disponibilidade: [
            turnoPreferido ? `Turno: ${turnoPreferido}` : "",
            diasPreferidos.length > 0 ? `Dias: ${diasPreferidos.join(", ")}` : "",
          ]
            .filter(Boolean)
            .join(" | "),

          fonteIndicacao: fonteIndicacao || "Formulário Web",
          origem: "formulario_externo",
          origemCampanha: paramOrigem || "",
          tipo: "externo",
          profissionalId: activeProfUid || "avulso",
          status: "Em Atendimento",
          statusTratamento: "Em Atendimento",
          atribuicaoStatus: "Aceito",
          viaAcesso: "Carteira Externa",
          aceitouLgpd: true,

          prontuarioClinico: [],
          historicoSessoes: [],

          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      setSubmitted(true);
    } catch (err) {
      console.error("Erro ao salvar cadastro do paciente:", err);
      setErrorMsg("Ocorreu um erro ao salvar suas informações. Por favor, tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const profNome = profData?.name || profData?.nome || "Profissional Responsável";
  const profPhoto = profData?.photoURL || profData?.fotoUrl;
  const profCrp = profData?.crp;

  if (submitted) {
    return (
      <div className="min-h-screen bg-warm/50 flex flex-col items-center justify-center p-4">
        <div className="bg-white max-w-lg w-full rounded-3xl p-8 border border-soft shadow-lg text-center flex flex-col items-center gap-4 animate-in fade-in zoom-in-95">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-forest">
            {isModoAtualizacao ? "Dados Atualizados com Sucesso!" : "Cadastro Concluído com Sucesso!"}
          </h2>
          <p className="text-sm text-forest/75 leading-relaxed">
            {isModoAtualizacao ? (
              <>
                Seus dados cadastrais foram revisados e atualizados diretamente no prontuário do(a){" "}
                <strong>{formatProfessionalName(profNome)}</strong>.
              </>
            ) : (
              <>
                Seus dados cadastrais foram encaminhados com total segurança e sigilo ao prontuário do(a){" "}
                <strong>{formatProfessionalName(profNome)}</strong>.
              </>
            )}
          </p>
          <div className="w-full bg-warm/60 p-4 rounded-2xl border border-soft text-xs text-forest/70 space-y-1 text-left">
            <p>• Suas informações foram sincronizadas e registradas com data e hora.</p>
            <p>• Suas informações estão resguardadas sob rigoroso sigilo ético profissional e LGPD.</p>
          </div>
          <button
            type="button"
            onClick={onGoHome}
            className="mt-2 px-6 py-2.5 rounded-full bg-forest text-white font-semibold text-xs hover:bg-forest/90 transition-all cursor-pointer shadow-xs"
          >
            Voltar para o Início
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] py-8 px-4 flex flex-col items-center">
      <div className="max-w-2xl w-full flex flex-col gap-5">
        
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs text-forest/60 bg-white/80 px-4 py-2 rounded-xl border border-soft w-fit shadow-2xs">
          <button
            type="button"
            onClick={onGoHome}
            className="hover:text-forest flex items-center gap-1 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Início</span>
          </button>
          <ChevronRight className="w-3 h-3 text-forest/40" />
          <span className="font-semibold text-forest">{tituloPagina}</span>
        </div>

        {/* Card Header Dourado / Sun conforme identidade visual */}
        <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 rounded-3xl p-6 sm:p-7 shadow-md text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-serif text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-2xs">
              {tituloPagina}
            </h1>
            <div className="flex items-center gap-2.5 pt-1">
              <span className="text-xs sm:text-sm font-semibold text-white/95">
                Profissional: <strong className="font-bold underline decoration-white/40">{formatProfessionalName(profNome)}</strong>
                {profCrp && <span className="opacity-80"> (CRP: {profCrp})</span>}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-white/90 pt-0.5">
              {mensagemBoasVindas}
            </p>
          </div>

          {/* Foto de Perfil do Profissional */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/20 backdrop-blur-xs border-2 border-white/80 p-0.5 shadow-md shrink-0 overflow-hidden flex items-center justify-center">
            {profPhoto ? (
              <img
                src={profPhoto}
                alt={profNome}
                className="w-full h-full object-cover rounded-xl"
              />
            ) : (
              <User className="w-8 h-8 text-white" />
            )}
          </div>
        </div>

        {/* Banner de Condições Acordadas / Parametrizadas (se houver valor ou modalidade) */}
        {(valorFinalSessao || paramModalidade || paramFrequencia) && (
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200/80 flex items-center justify-between flex-wrap gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-emerald-700" />
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-950 block">
                  Condições do Atendimento:
                </span>
                <span className="text-xs text-emerald-800">
                  {valorFinalSessao ? `Sessão: R$ ${valorFinalSessao}` : "Valor a combinar"}
                  {modalidadeEscolhida ? ` • Modalidade ${modalidadeEscolhida === "online" ? "Online" : "Presencial"}` : ""}
                  {paramFrequencia ? ` • Frequência ${paramFrequencia}` : ""}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 border border-emerald-300">
              Particular
            </span>
          </div>
        )}

        {/* Formulário Principal */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl border border-soft shadow-xs p-6 sm:p-8 flex flex-col gap-6"
        >
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* 1. SEÇÃO DE IDENTIFICAÇÃO PESSOAL */}
          <div className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-forest/70 block border-b border-soft pb-2">
              1. Identificação Pessoal
            </span>

            {/* Nome Completo */}
            <div>
              <label className="block text-xs font-bold text-forest mb-1.5">
                Nome Completo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Digite seu nome completo civil"
                className="w-full px-4 py-3 bg-white border border-soft rounded-2xl text-xs sm:text-sm text-forest focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-500 transition-all shadow-2xs"
              />
            </div>

            {/* Nome Social */}
            <div>
              <label className="block text-xs font-bold text-forest mb-1.5">
                Nome Social / Como prefere ser chamado(a) <span className="text-forest/40 font-normal">(Opcional)</span>
              </label>
              <input
                type="text"
                value={nomeSocial}
                onChange={(e) => setNomeSocial(e.target.value)}
                placeholder="Se preferir um nome diferente do registro civil"
                className="w-full px-4 py-3 bg-white border border-soft rounded-2xl text-xs sm:text-sm text-forest focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-500 transition-all shadow-2xs"
              />
            </div>

            {/* E-mail e Telefone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-forest mb-1.5">
                  E-mail <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@exemplo.com"
                  className="w-full px-4 py-3 bg-white border border-soft rounded-2xl text-xs sm:text-sm text-forest focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-500 transition-all shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-forest mb-1.5">
                  WhatsApp / Celular <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={telefone}
                  onChange={(e) => setTelefone(formatPhone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  className="w-full px-4 py-3 bg-white border border-soft rounded-2xl text-xs sm:text-sm text-forest focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-500 transition-all shadow-2xs"
                />
              </div>
            </div>

            {/* Data de Nascimento e CPF */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-forest mb-1.5">
                  Data de Nascimento <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-soft rounded-2xl text-xs sm:text-sm text-forest focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-500 transition-all shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-forest mb-1.5">
                  CPF <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={cpf}
                  onChange={(e) => setCpf(formatCpf(e.target.value))}
                  placeholder="000.000.000-00"
                  className="w-full px-4 py-3 bg-white border border-soft rounded-2xl text-xs sm:text-sm text-forest focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-500 transition-all shadow-2xs"
                />
              </div>
            </div>

            {/* Gênero e Profissão */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-forest mb-1.5">
                  Gênero / Identidade
                </label>
                <input
                  type="text"
                  value={genero}
                  onChange={(e) => setGenero(e.target.value)}
                  placeholder="Ex: Feminino, Masculino, Não-binário..."
                  className="w-full px-4 py-3 bg-white border border-soft rounded-2xl text-xs sm:text-sm text-forest focus:outline-none focus:border-amber-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-forest mb-1.5">
                  Profissão / Ocupação
                </label>
                <input
                  type="text"
                  value={profissao}
                  onChange={(e) => setProfissao(e.target.value)}
                  placeholder="Ex: Designer, Estudante..."
                  className="w-full px-4 py-3 bg-white border border-soft rounded-2xl text-xs sm:text-sm text-forest focus:outline-none focus:border-amber-500 shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* 2. RESPONSÁVEL LEGAL (Exibido se menor de 18 anos ou toggle manual) */}
          {isMenorIdade && (
            <div className="p-4 sm:p-5 bg-amber-50/50 rounded-2xl border-2 border-amber-300/80 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                <span className="font-bold text-xs text-amber-950">
                  Paciente Menor de 18 Anos — Dados Obrigatórios do Responsável Legal:
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-forest/70 mb-1">
                    Nome do Responsável Legal <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required={isMenorIdade}
                    value={nomeResponsavel}
                    onChange={(e) => setNomeResponsavel(e.target.value)}
                    placeholder="Nome completo do responsável"
                    className="w-full px-3.5 py-2.5 bg-white border border-soft rounded-xl text-xs text-forest focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-forest/70 mb-1">
                    Parentesco / Grau de Guarda <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required={isMenorIdade}
                    value={parentescoResponsavel}
                    onChange={(e) => setParentescoResponsavel(e.target.value)}
                    placeholder="Ex: Mãe, Pai, Guardião..."
                    className="w-full px-3.5 py-2.5 bg-white border border-soft rounded-xl text-xs text-forest focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-forest/70 mb-1">
                    CPF do Responsável <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required={isMenorIdade}
                    value={cpfResponsavel}
                    onChange={(e) => setCpfResponsavel(formatCpf(e.target.value))}
                    placeholder="000.000.000-00"
                    className="w-full px-3.5 py-2.5 bg-white border border-soft rounded-xl text-xs text-forest focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-forest/70 mb-1">
                    WhatsApp/Telefone do Responsável <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required={isMenorIdade}
                    value={telefoneResponsavel}
                    onChange={(e) => setTelefoneResponsavel(formatPhone(e.target.value))}
                    placeholder="(00) 00000-0000"
                    className="w-full px-3.5 py-2.5 bg-white border border-soft rounded-xl text-xs text-forest focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 3. ENDEREÇO RESIDENCIAL (Parametrizável) */}
          {solicitarEndereco && (
            <div className="space-y-4 pt-2 border-t border-soft">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-forest/70 block">
                  2. Endereço Residencial
                </span>
                <span className="text-[10px] text-forest/50">Para registro de prontuário e recibos</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-forest mb-1.5">
                    CEP {buscandoCep && <span className="text-emerald-600 text-[10px] font-normal">(Buscando...)</span>}
                  </label>
                  <input
                    type="text"
                    value={cep}
                    onChange={(e) => {
                      const formatted = formatCep(e.target.value);
                      setCep(formatted);
                      if (formatted.replace(/\D/g, "").length === 8) {
                        handleBuscarCep(formatted);
                      }
                    }}
                    placeholder="00000-000"
                    className="w-full px-3.5 py-2.5 bg-white border border-soft rounded-xl text-xs sm:text-sm text-forest focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-forest mb-1.5">
                    Rua / Logradouro
                  </label>
                  <input
                    type="text"
                    value={logradouro}
                    onChange={(e) => setLogradouro(e.target.value)}
                    placeholder="Nome da sua rua ou avenida"
                    className="w-full px-3.5 py-2.5 bg-white border border-soft rounded-xl text-xs sm:text-sm text-forest focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-forest mb-1.5">
                    Número
                  </label>
                  <input
                    type="text"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    placeholder="Ex: 123"
                    className="w-full px-3.5 py-2.5 bg-white border border-soft rounded-xl text-xs sm:text-sm text-forest focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-forest mb-1.5">
                    Complemento
                  </label>
                  <input
                    type="text"
                    value={complemento}
                    onChange={(e) => setComplemento(e.target.value)}
                    placeholder="Apto, Bloco..."
                    className="w-full px-3.5 py-2.5 bg-white border border-soft rounded-xl text-xs sm:text-sm text-forest focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-forest mb-1.5">
                    Bairro
                  </label>
                  <input
                    type="text"
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                    placeholder="Bairro"
                    className="w-full px-3.5 py-2.5 bg-white border border-soft rounded-xl text-xs sm:text-sm text-forest focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-forest mb-1.5">
                    Cidade / UF
                  </label>
                  <input
                    type="text"
                    value={cidade ? `${cidade}${uf ? ` - ${uf}` : ""}` : ""}
                    onChange={(e) => setCidade(e.target.value)}
                    placeholder="Cidade - UF"
                    className="w-full px-3.5 py-2.5 bg-white border border-soft rounded-xl text-xs sm:text-sm text-forest focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 4. QUEIXA PRINCIPAL / MOTIVO DA CONSULTA (Parametrizável) */}
          {solicitarQueixaPrincipal && (
            <div className="space-y-4 pt-2 border-t border-soft">
              <span className="text-xs font-bold uppercase tracking-wider text-forest/70 block">
                3. Motivo da Consulta & Informações Clínicas
              </span>

              <div>
                <label className="block text-xs font-bold text-forest mb-1.5">
                  O que te motivou a buscar psicoterapia neste momento? (Queixa Principal)
                </label>
                <textarea
                  rows={3}
                  value={queixaPrincipal}
                  onChange={(e) => setQueixaPrincipal(e.target.value)}
                  placeholder="Conte brevemente o que você gostaria de trabalhar ou quais sentimentos/desafios está vivenciando..."
                  className="w-full px-4 py-3 bg-white border border-soft rounded-2xl text-xs sm:text-sm text-forest focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-500 transition-all shadow-2xs leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-forest mb-1.5">
                    Já fez psicoterapia anteriormente?
                  </label>
                  <select
                    value={terapiaAnterior}
                    onChange={(e) => setTerapiaAnterior(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-soft rounded-xl text-xs sm:text-sm text-forest focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="">Selecione...</option>
                    <option value="Sim, já fiz e foi uma boa experiência">Sim, já fiz e foi positiva</option>
                    <option value="Sim, mas interrompi">Sim, mas interrompi</option>
                    <option value="Não, é minha primeira vez em terapia">Não, é minha primeira vez</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-forest mb-1.5">
                    Faz uso de medicação psiquiátrica?
                  </label>
                  <input
                    type="text"
                    value={medicacao}
                    onChange={(e) => setMedicacao(e.target.value)}
                    placeholder="Se sim, qual medicação? (Opcional)"
                    className="w-full px-3.5 py-2.5 bg-white border border-soft rounded-xl text-xs sm:text-sm text-forest focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 5. PREFERÊNCIAS DE ATENDIMENTO & DISPONIBILIDADE */}
          <div className="space-y-4 pt-2 border-t border-soft">
            <span className="text-xs font-bold uppercase tracking-wider text-forest/70 block">
              4. Preferências de Atendimento
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-forest mb-1.5">
                  Modalidade do Atendimento
                </label>
                <select
                  value={modalidadeEscolhida}
                  onChange={(e) => setModalidadeEscolhida(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-soft rounded-xl text-xs sm:text-sm text-forest focus:outline-none focus:border-amber-500 font-semibold cursor-pointer"
                >
                  <option value="online">Online (Videochamada)</option>
                  <option value="presencial">Presencial (Consultório)</option>
                </select>
              </div>

              {solicitarDisponibilidade && (
                <div>
                  <label className="block text-xs font-bold text-forest mb-1.5">
                    Melhor Turno para Sessões
                  </label>
                  <select
                    value={turnoPreferido}
                    onChange={(e) => setTurnoPreferido(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-soft rounded-xl text-xs sm:text-sm text-forest focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="">Selecione seu turno preferido...</option>
                    <option value="Manhã (08h às 12h)">Manhã (08h às 12h)</option>
                    <option value="Tarde (13h às 18h)">Tarde (13h às 18h)</option>
                    <option value="Noite (18h às 21h)">Noite (18h às 21h)</option>
                    <option value="Flexível">Qualquer horário / Flexível</option>
                  </select>
                </div>
              )}
            </div>

            {/* Contato de Emergência (Parametrizável) */}
            {solicitarContatoEmergencia && (
              <div className="p-4 bg-warm/30 rounded-2xl border border-soft flex flex-col gap-3">
                <span className="text-xs font-bold text-forest flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-forest/60" />
                  Contato de Emergência (Pessoa de Confiança)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={contatoEmergenciaNome}
                    onChange={(e) => setContatoEmergenciaNome(e.target.value)}
                    placeholder="Nome completo (Ex: Irmã Maria)"
                    className="w-full px-3.5 py-2 bg-white border border-soft rounded-xl text-xs text-forest focus:outline-none focus:border-amber-500"
                  />
                  <input
                    type="tel"
                    value={contatoEmergenciaTelefone}
                    onChange={(e) => setContatoEmergenciaTelefone(formatPhone(e.target.value))}
                    placeholder="Telefone (00) 00000-0000"
                    className="w-full px-3.5 py-2 bg-white border border-soft rounded-xl text-xs text-forest focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 6. FONTE DE INDICAÇÃO */}
          <div>
            <label className="block text-xs font-bold text-forest mb-1.5">
              Como você conheceu meu trabalho? <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={fonteIndicacao}
              onChange={(e) => setFonteIndicacao(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-soft rounded-2xl text-xs sm:text-sm text-forest focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-500 transition-all shadow-2xs cursor-pointer"
            >
              <option value="">Selecione uma opção...</option>
              <option value="Instagram / Redes Sociais">Instagram / Redes Sociais</option>
              <option value="Indicação de Amigo / Familiar">Indicação de Amigo / Familiar</option>
              <option value="Google / Pesquisa na Web">Google / Pesquisa na Web</option>
              <option value="Indicação de Médico / Psiquiatra">Indicação de Médico / Psiquiatra</option>
              <option value="Já era meu paciente">Já era meu paciente</option>
              <option value="WhatsApp Direto">WhatsApp Direto</option>
              <option value="Outros">Outros</option>
            </select>
          </div>

          {/* 7. TERMOS E LGPD */}
          <div className="p-4 sm:p-5 bg-warm/20 rounded-2xl border border-soft flex flex-col gap-2.5">
            <span className="font-bold text-xs text-forest flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Termos e Acordos (Sigilo Ético & LGPD)
            </span>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={aceitouLgpd}
                onChange={(e) => setAceitouLgpd(e.target.checked)}
                className="mt-1 rounded text-amber-500 focus:ring-amber-400 w-4 h-4 cursor-pointer shrink-0"
              />
              <span className="text-xs text-forest/80 leading-relaxed">
                <strong>Ciente sobre o uso de dados (LGPD):</strong> Autorizo a coleta, armazenamento e tratamento
                dos meus dados pessoais informados neste formulário pela clínica profissional do(a){" "}
                <strong>{formatProfessionalName(profNome)}</strong>, estritamente para as
                finalidades de prestação de serviços psicológicos, agendamentos, emissão de recibos/notas
                fiscais e cumprimento do Código de Ética Profissional do Psicólogo e Lei Geral de Proteção
                de Dados (LGPD).
              </span>
            </label>
          </div>

          {/* BOTÃO FINALIZAR / ATUALIZAR CADASTRO */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-500 hover:to-yellow-500 text-amber-950 font-bold text-sm sm:text-base transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <span>{isModoAtualizacao ? "Salvando Atualizações no Prontuário..." : "Salvando Cadastro no Prontuário..."}</span>
            ) : (
              <span>{isModoAtualizacao ? "Confirmar e Salvar Atualização Cadastral" : "Finalizar Cadastro Seguro"}</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
