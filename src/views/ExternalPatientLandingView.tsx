import React, { useState, useEffect } from "react";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  CheckCircle2,
  ShieldCheck,
  User,
  MapPin,
  Clock,
  Phone,
  AlertCircle,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";
import { BrandLogo } from "../components/BrandLogo";
import { hasIntegrarFeatures } from "../types/planosProfissionais";
import { formatProfessionalName } from "../utils/formatters";
import {
  GENERO_OPCOES,
  TERAPIA_ANTERIOR_OPCOES,
} from "../constants/opcoesCadastroPaciente";

interface ExternalPatientLandingViewProps {
  profUid: string | null;
  onGoHome: () => void;
}

export function ExternalPatientLandingView({
  profUid,
  onGoHome,
}: ExternalPatientLandingViewProps) {
  // Leitura de parâmetros de URL
  const [urlParams] = useState(() => {
    if (typeof window === "undefined") return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  });

  const initialProfUid =
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
  const paramPacienteId =
    urlParams.get("paciente") ||
    urlParams.get("id") ||
    urlParams.get("pacienteId") ||
    "";
  const paramTipo = urlParams.get("tipo") || "externo";
  const isModoAtualizacao = Boolean(paramPacienteId);
  const paramSections = urlParams.get("sections");
  const activeSectionsList = paramSections ? paramSections.split(",") : null;
  const showSection = (key: string) => !activeSectionsList || activeSectionsList.includes(key);

  const [resolvedProfUid, setResolvedProfUid] = useState<string | null>(
    initialProfUid
  );
  const [profData, setProfData] = useState<any>(null);
  const [loadingProf, setLoadingProf] = useState<boolean>(
    Boolean(initialProfUid || paramPacienteId)
  );
  const [loadedCollection, setLoadedCollection] = useState<string>("pacientes");
  const [loadingPacienteExistente, setLoadingPacienteExistente] =
    useState<boolean>(Boolean(paramPacienteId));

  const [logoImgError, setLogoImgError] = useState(false);
  const [profImgError, setProfImgError] = useState(false);

  // Form states - Básicos
  const [nome, setNome] = useState("");
  const [nomeSocial, setNomeSocial] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [cpf, setCpf] = useState("");
  const [genero, setGenero] = useState("");
  const [generoOutro, setGeneroOutro] = useState("");
  const [profissao, setProfissao] = useState("");

  // Menor de idade / Responsável Legal
  const [isMenorIdade, setIsMenorIdade] = useState(false);
  const [menorManualOverride, setMenorManualOverride] = useState<boolean | null>(
    null
  );
  const [nomeResponsavel, setNomeResponsavel] = useState("");
  const [telefoneResponsavel, setTelefoneResponsavel] = useState("");
  const [cpfResponsavel, setCpfResponsavel] = useState("");
  const [emailResponsavel, setEmailResponsavel] = useState("");
  const [parentescoResponsavel, setParentescoResponsavel] = useState("");

  // Endereço Residencial
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
  const [contatoEmergenciaTelefone, setContatoEmergenciaTelefone] =
    useState("");

  // Preferências de Atendimento
  const [modalidadeEscolhida, setModalidadeEscolhida] = useState(
    paramModalidade && paramModalidade !== "ambas" ? paramModalidade : "online"
  );
  const [turnoPreferido, setTurnoPreferido] = useState("");
  const [diasPreferidos, setDiasPreferidos] = useState<string[]>([]);

  const DIAS_SEMANA_OPCOES = [
    "Segunda",
    "Terça",
    "Quarta",
    "Quinta",
    "Sexta",
    "Sábado",
  ];

  const FONTES_INDICACAO_OPCOES = [
    "Instagram / Redes Sociais",
    "Indicação de Amigo / Familiar",
    "Google / Pesquisa na Web",
    "Indicação de Médico / Psiquiatra",
    "Site Pessoal",
    "Já era meu paciente",
    "WhatsApp Direto",
    "Outros",
  ];

  const normalizeFonteIndicacao = (raw: string): string => {
    const clean = String(raw || "").trim();
    if (!clean) return "";
    const lower = clean.toLowerCase();
    if (lower === "instagram" || lower === "redes sociais")
      return "Instagram / Redes Sociais";
    if (lower === "indicacao" || lower === "indicação")
      return "Indicação de Amigo / Familiar";
    if (lower === "google") return "Google / Pesquisa na Web";
    if (lower === "whatsapp") return "WhatsApp Direto";
    if (lower === "site") return "Site Pessoal";
    return clean;
  };

  // Fonte de indicação
  const [fonteIndicacao, setFonteIndicacao] = useState(() =>
    normalizeFonteIndicacao(paramOrigem || "")
  );

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
    if (digits.length <= 9)
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const formatCep = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  };

  // Carregar dados e configurações White-Label do profissional
  useEffect(() => {
    if (!initialProfUid || initialProfUid === "avulso") {
      if (!paramPacienteId) {
        setLoadingProf(false);
      }
      return;
    }

    let cancelled = false;
    const loadProf = async () => {
      setLoadingProf(true);
      try {
        const snap = await getDoc(doc(db, "users", initialProfUid));
        if (!cancelled && snap.exists()) {
          const data = snap.data();
          setProfData(data);
          setLogoImgError(false);
          setProfImgError(false);

          if (!paramModalidade && !isModoAtualizacao) {
            const padrao = data?.configFormularioExterno?.modalidadePadrao;
            if (padrao && padrao !== "ambas") {
              setModalidadeEscolhida(padrao);
            } else if (data?.modalidadeAtendimento === "presencial") {
              setModalidadeEscolhida("presencial");
            }
          }
        }
      } catch (err) {
        console.error("Erro ao carregar dados do profissional:", err);
      } finally {
        if (!cancelled) {
          setLoadingProf(false);
        }
      }
    };
    loadProf();

    return () => {
      cancelled = true;
    };
  }, [initialProfUid, paramModalidade, paramPacienteId, isModoAtualizacao]);

  // Carregar dados existentes do paciente caso seja um link de atualização cadastral
  useEffect(() => {
    if (!paramPacienteId) return;

    let cancelled = false;
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

        if (!cancelled && snap && snap.exists()) {
          const d = snap.data();
          setLoadedCollection(col);
          setNome(
            d.nomeCivil ||
              d.pacienteNomeCompleto ||
              d.nome ||
              d.colaboradorNome ||
              d.nomeCompleto ||
              ""
          );
          setNomeSocial(d.nomeSocial || d.nomeDesejado || "");
          setEmail(
            d.email || d.pacienteEmail || d.colaboradorEmail || ""
          );
          setTelefone(
            d.telefone ||
              d.pacienteTelefone ||
              d.colaboradorWhatsapp ||
              d.whatsapp ||
              ""
          );
          setDataNascimento(
            d.dataNascimento ||
              d.pacienteDataNascimento ||
              d.colaboradorDataNascimento ||
              ""
          );
          setCpf(d.cpf || d.pacienteCpf || d.colaboradorCpf || "");
          setGenero(d.genero || "");
          setProfissao(d.profissao || d.cargoNome || "");

          if (d.responsavel && typeof d.responsavel === "object") {
            setNomeResponsavel(
              d.responsavel.nome || d.responsavelNome || ""
            );
            setTelefoneResponsavel(
              d.responsavel.telefone || d.responsavelTelefone || ""
            );
            setCpfResponsavel(d.responsavel.cpf || d.responsavelCpf || "");
            setEmailResponsavel(
              d.responsavel.email || d.responsavelEmail || ""
            );
            setParentescoResponsavel(
              d.responsavel.parentesco || d.responsavelParentesco || ""
            );
          } else {
            setNomeResponsavel(d.responsavelNome || "");
            setTelefoneResponsavel(d.responsavelTelefone || "");
            setCpfResponsavel(d.responsavelCpf || "");
            setEmailResponsavel(d.responsavelEmail || "");
            setParentescoResponsavel(d.responsavelParentesco || "");
          }

          if (
            d.isMenorIdade ||
            d.menorIdade ||
            d.responsavel?.nome ||
            d.responsavelNome
          ) {
            setIsMenorIdade(true);
            setMenorManualOverride(true);
          }

          const end =
            typeof d.endereco === "object" && d.endereco !== null
              ? d.endereco
              : d.enderecoDetalhado && typeof d.enderecoDetalhado === "object"
                ? d.enderecoDetalhado
                : {};
          setCep(d.cep || end.cep || "");
          setLogradouro(
            d.logradouro ||
              end.logradouro ||
              (typeof d.endereco === "string" ? d.endereco : "") ||
              ""
          );
          setNumero(d.numero || end.numero || "");
          setComplemento(d.complemento || end.complemento || "");
          setBairro(d.bairro || end.bairro || "");
          setCidade(d.cidade || end.cidade || "");
          setUf(d.uf || end.uf || "");

          setQueixaPrincipal(
            d.queixaPrincipal || d.motivo || d.queixa || ""
          );
          setTerapiaAnterior(d.terapiaAnterior || "");
          setMedicacao(d.medicacao || "");

          const rawEmergencia = d.contatoEmergencia;
          if (rawEmergencia && typeof rawEmergencia === "object") {
            setContatoEmergenciaNome(String(rawEmergencia.nome || ""));
            setContatoEmergenciaTelefone(String(rawEmergencia.telefone || ""));
          } else if (
            typeof rawEmergencia === "string" &&
            rawEmergencia.trim()
          ) {
            const match = rawEmergencia.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
            if (match) {
              setContatoEmergenciaNome(match[1].trim());
              setContatoEmergenciaTelefone(match[2].trim());
            } else {
              setContatoEmergenciaNome(rawEmergencia.trim());
              setContatoEmergenciaTelefone(
                String(
                  d.contatoEmergenciaObj?.telefone ||
                    d.contatoEmergenciaTelefone ||
                    ""
                )
              );
            }
          } else if (
            d.contatoEmergenciaObj &&
            typeof d.contatoEmergenciaObj === "object"
          ) {
            setContatoEmergenciaNome(String(d.contatoEmergenciaObj.nome || ""));
            setContatoEmergenciaTelefone(
              String(d.contatoEmergenciaObj.telefone || "")
            );
          }

          if (d.modalidade) {
            setModalidadeEscolhida(String(d.modalidade).toLowerCase());
          }
          if (d.turnoPreferido) {
            setTurnoPreferido(String(d.turnoPreferido));
          }
          if (Array.isArray(d.diasPreferidos)) {
            setDiasPreferidos(d.diasPreferidos.filter(Boolean));
          } else if (
            typeof d.diasPreferidos === "string" &&
            d.diasPreferidos.trim()
          ) {
            setDiasPreferidos(
              d.diasPreferidos
                .split(",")
                .map((s: string) => s.trim())
                .filter(Boolean)
            );
          }
          if (d.fonteIndicacao) {
            setFonteIndicacao(normalizeFonteIndicacao(d.fonteIndicacao));
          }
          setAceitouLgpd(true);

          // Se o link não trouxe profUid na URL, carrega o profissional vinculado à ficha antes de encerrar loadingProf
          const profTarget = d.profissionalId || d.profissionalUid;
          if (profTarget && profTarget !== "avulso" && !initialProfUid) {
            setResolvedProfUid(profTarget);
            try {
              const profSnap = await getDoc(doc(db, "users", profTarget));
              if (!cancelled && profSnap.exists()) {
                setProfData(profSnap.data());
                setLogoImgError(false);
                setProfImgError(false);
              }
            } catch (errProf) {
              console.error("Erro ao carregar profissional vinculado:", errProf);
            }
          }
        }
      } catch (err) {
        console.error(
          "Erro ao carregar dados do paciente para atualização:",
          err
        );
      } finally {
        if (!cancelled) {
          setLoadingPacienteExistente(false);
          if (!initialProfUid) {
            setLoadingProf(false);
          }
        }
      }
    };

    loadPaciente();
    return () => {
      cancelled = true;
    };
  }, [paramPacienteId, paramTipo, initialProfUid]);

  // Verificar se é menor de idade pela data de nascimento (respeitando override manual se marcado)
  useEffect(() => {
    if (!dataNascimento) return;
    const nasc = new Date(`${dataNascimento}T12:00:00`);
    if (isNaN(nasc.getTime())) return;
    const hoje = new Date();
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) {
      idade--;
    }
    if (idade < 18) {
      setIsMenorIdade(true);
    } else if (menorManualOverride === null) {
      setIsMenorIdade(false);
    }
  }, [dataNascimento, menorManualOverride]);

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

  // Identidade White-Label & Configurações do Profissional
  const isWhiteLabel =
    Boolean(
      profData &&
        (hasIntegrarFeatures(profData) || profData.whiteLabelEnabled === true)
    ) ||
    (!profData && loadedCollection === "pacientes" && paramTipo === "externo");

  const wlConfig = profData?.whiteLabelConfig || {};
  const company = profData?.companyData || {};
  const config = profData?.configFormularioExterno || {};

  const bgColor = isWhiteLabel
    ? wlConfig.backgroundColor || "#F8FAFC"
    : "#FDFBF7";
  const primaryColor = isWhiteLabel
    ? wlConfig.primaryColor || "#0F766E"
    : "#1B4332";
  const secondaryColor = isWhiteLabel
    ? wlConfig.secondaryColor || "#06B6D4"
    : "#2D6A4F";

  const profRawNome = String(profData?.name || profData?.nome || "").trim();
  const formattedProfName = profRawNome
    ? formatProfessionalName(profRawNome)
    : "Profissional Responsável";
  const profPhoto =
    profData?.photoURL || profData?.photoUrl || profData?.fotoUrl || "";
  const profCrp = String(profData?.crp || "").trim();
  const profEspecialidade = String(
    profData?.profissao || profData?.especialidade || ""
  ).trim();
  const profAbordagem = String(profData?.abordagem || "").trim();

  const brandDisplayName = isWhiteLabel
    ? company.razaoSocial?.trim() ||
      (profRawNome ? formattedProfName : "Consultório Particular")
    : "Projeto AcolheMente";

  const brandLogo = isWhiteLabel
    ? company.logoEmpresaUrl?.trim() || profData?.logoEmpresaUrl?.trim() || null
    : null;

  const tituloPagina = isModoAtualizacao
    ? "Atualização de Dados Cadastrais"
    : config.tituloPersonalizado || "Ficha de Cadastro do Paciente";

  const mensagemBoasVindas = isModoAtualizacao
    ? "Confira e atualize seus dados abaixo para manter seu prontuário clínico e documentos sempre em dia."
    : config.mensagemBoasVindas ||
      "Preencha seus dados abaixo para registro seguro no prontuário do consultório.";

  const valorFinalSessao = paramValor || config.valorPadrao || "";
  const solicitarEndereco = config.solicitarEndereco !== false;
  const solicitarQueixaPrincipal = config.solicitarQueixaPrincipal !== false;
  const solicitarDisponibilidade = config.solicitarDisponibilidade !== false;
  const solicitarContatoEmergencia = config.solicitarContatoEmergencia !== false;

  // Endereço presencial do consultório (caso configurado pelo profissional)
  const enderecoConsultorio = profData?.enderecoPresencial || {};
  const possuiEnderecoConsultorioPublico = Boolean(
    profData?.atendePresencial === true &&
      profData?.divulgarEnderecoPresencial !== false &&
      enderecoConsultorio?.logradouro
  );
  const textoEnderecoConsultorio = possuiEnderecoConsultorioPublico
    ? [
        enderecoConsultorio.nomeEspaco,
        `${enderecoConsultorio.logradouro}${
          enderecoConsultorio.numero ? `, ${enderecoConsultorio.numero}` : ""
        }${
          enderecoConsultorio.complemento
            ? ` (${enderecoConsultorio.complemento})`
            : ""
        }`,
        [
          enderecoConsultorio.bairro,
          enderecoConsultorio.cidade
            ? `${enderecoConsultorio.cidade}${
                enderecoConsultorio.uf ? `/${enderecoConsultorio.uf}` : ""
              }`
            : "",
        ]
          .filter(Boolean)
          .join(" - "),
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  // Numeração editorial dinâmica conforme seções ativas
  let secCounter = 1;
  const secNumIdentificacao = String(secCounter++).padStart(2, "0");
  const secNumEndereco = solicitarEndereco
    ? String(secCounter++).padStart(2, "0")
    : "";
  const secNumClinico = solicitarQueixaPrincipal
    ? String(secCounter++).padStart(2, "0")
    : "";
  const secNumPreferencias = String(secCounter++).padStart(2, "0");
  const secNumOrigem = String(secCounter++).padStart(2, "0");

  // Sincronização dinâmica do título da aba e metadados (zero referência ao AcolheMente em White-Label)
  useEffect(() => {
    if (loadingProf) return;
    const originalTitle = document.title;
    const dynamicTitle = `${tituloPagina} | ${brandDisplayName}`;
    document.title = dynamicTitle;

    const metaDesc = `${tituloPagina} — ${formattedProfName}. Ambiente protegido sob sigilo ético profissional (CFP) e LGPD.`;
    const metaMap: Record<string, { attr: string; val: string }> = {
      description: { attr: "name", val: metaDesc },
      "og:title": { attr: "property", val: dynamicTitle },
      "og:description": { attr: "property", val: metaDesc },
    };

    const createdEls: HTMLMetaElement[] = [];
    Object.entries(metaMap).forEach(([key, { attr, val }]) => {
      let el = document.querySelector(
        `meta[${attr}="${key}"]`
      ) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
        createdEls.push(el);
      }
      el.setAttribute("content", val);
    });

    return () => {
      document.title = originalTitle;
      createdEls.forEach((el) => el.remove());
    };
  }, [loadingProf, tituloPagina, brandDisplayName, formattedProfName]);

  const toggleDiaPreferido = (dia: string) => {
    setDiasPreferidos((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (
      !nome.trim() ||
      !telefone.trim() ||
      !dataNascimento ||
      !cpf.trim()
    ) {
      setErrorMsg("Por favor, preencha todos os campos obrigatórios (*).");
      return;
    }

    if (
      isMenorIdade &&
      (!nomeResponsavel.trim() ||
        !telefoneResponsavel.trim() ||
        !cpfResponsavel.trim())
    ) {
      setErrorMsg(
        "Para pacientes menores de 18 anos ou com responsável legal, preencha nome, CPF e telefone do responsável."
      );
      return;
    }

    if (!aceitouLgpd) {
      setErrorMsg(
        "É necessário concordar com os Termos e Acordos (LGPD) para prosseguir."
      );
      return;
    }

    setSubmitting(true);
    try {
      const cidadeTrim = String(cidade || "").trim();
      const ufTrim = String(uf || "").trim().toUpperCase();
      const logradouroTrim = String(logradouro || "").trim();
      const numeroTrim = String(numero || "").trim();
      const complementoTrim = String(complemento || "").trim();
      const bairroTrim = String(bairro || "").trim();
      const cepTrim = String(cep || "").trim();

      const enderecoCompleto = [
        logradouroTrim
          ? `${logradouroTrim}${numeroTrim ? `, ${numeroTrim}` : ""}`
          : "",
        complementoTrim,
        bairroTrim,
        cidadeTrim ? `${cidadeTrim}${ufTrim ? ` - ${ufTrim}` : ""}` : "",
      ]
        .filter(Boolean)
        .join(", ");

      const enderecoEstruturado = {
        cep: cepTrim,
        logradouro: logradouroTrim,
        numero: numeroTrim,
        complemento: complementoTrim,
        bairro: bairroTrim,
        cidade: cidadeTrim,
        uf: ufTrim,
      };

      const emergNome = String(contatoEmergenciaNome || "").trim();
      const emergTel = String(contatoEmergenciaTelefone || "").trim();
      const contatoEmergenciaFinal = emergNome
        ? emergTel
          ? `${emergNome} (${emergTel})`
          : emergNome
        : emergTel;

      const disponibilidadeTexto = [
        turnoPreferido ? `Turno: ${turnoPreferido}` : "",
        diasPreferidos.length > 0 ? `Dias: ${diasPreferidos.join(", ")}` : "",
      ]
        .filter(Boolean)
        .join(" | ");

      const responsavelPayload = {
        nome: nomeResponsavel.trim(),
        telefone: telefoneResponsavel.trim(),
        cpf: cpfResponsavel.trim(),
        email: emailResponsavel.trim(),
        parentesco: parentescoResponsavel.trim(),
      };

      const generoFinal =
        genero === "Outro"
          ? generoOutro.trim() || "Outro"
          : genero.trim();

      if (isModoAtualizacao && paramPacienteId) {
        const isPacientesCol = loadedCollection === "pacientes";
        await updateDoc(doc(db, loadedCollection, paramPacienteId), {
          nome: nome.trim(),
          nomeCivil: nome.trim(),
          nomeSocial: nomeSocial.trim(),
          nomeDesejado: nomeSocial.trim() || nome.trim(),
          email: email.trim(),
          telefone: telefone.trim(),
          dataNascimento,
          cpf: cpf.trim(),
          genero: generoFinal,
          profissao: profissao.trim(),
          isMenorIdade,
          menorIdade: isMenorIdade,
          ...(loadedCollection === "triagem_corporativa"
            ? {
                pacienteNomeCompleto: nome.trim(),
                pacienteCpf: cpf.trim(),
                pacienteEmail: email.trim(),
                pacienteTelefone: telefone.trim(),
                pacienteDataNascimento: dataNascimento,
                colaboradorNome: nome.trim(),
                colaboradorWhatsapp: telefone.trim(),
                colaboradorEmail: email.trim(),
                colaboradorCpf: cpf.trim(),
                colaboradorDataNascimento: dataNascimento,
              }
            : {}),
          responsavel: responsavelPayload,
          responsavelNome: nomeResponsavel.trim(),
          responsavelTelefone: telefoneResponsavel.trim(),
          responsavelCpf: cpfResponsavel.trim(),
          responsavelEmail: emailResponsavel.trim(),
          responsavelParentesco: parentescoResponsavel.trim(),
          endereco: isPacientesCol ? enderecoEstruturado : enderecoCompleto,
          enderecoDetalhado: enderecoEstruturado,
          cep: cepTrim,
          logradouro: logradouroTrim,
          numero: numeroTrim,
          complemento: complementoTrim,
          bairro: bairroTrim,
          enderecoCompleto,
          cidade: cidadeTrim,
          uf: ufTrim,
          cidadeEstado: cidadeTrim
            ? `${cidadeTrim}${ufTrim ? ` - ${ufTrim}` : ""}`
            : "",
          queixaPrincipal: queixaPrincipal.trim(),
          motivo: queixaPrincipal.trim(),
          terapiaAnterior: terapiaAnterior.trim(),
          medicacao: medicacao.trim(),
          contatoEmergencia: contatoEmergenciaFinal,
          contatoEmergenciaObj: {
            nome: emergNome,
            telefone: emergTel,
          },
          modalidade: modalidadeEscolhida || "online",
          turnoPreferido,
          diasPreferidos,
          ...(disponibilidadeTexto
            ? { disponibilidade: disponibilidadeTexto }
            : {}),
          ...(fonteIndicacao ? { fonteIndicacao } : {}),
          aceitouLgpd: true,
          dadosAtualizadosPeloPacienteEm: new Date().toISOString(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "pacientes"), {
          nome: nome.trim(),
          nomeCivil: nome.trim(),
          nomeSocial: nomeSocial.trim(),
          nomeDesejado: nomeSocial.trim() || nome.trim(),
          email: email.trim(),
          telefone: telefone.trim(),
          dataNascimento,
          cpf: cpf.trim(),
          genero: generoFinal,
          profissao: profissao.trim(),
          isMenorIdade,
          menorIdade: isMenorIdade,

          responsavel: responsavelPayload,
          responsavelNome: nomeResponsavel.trim(),
          responsavelTelefone: telefoneResponsavel.trim(),
          responsavelCpf: cpfResponsavel.trim(),
          responsavelEmail: emailResponsavel.trim(),
          responsavelParentesco: parentescoResponsavel.trim(),

          endereco: enderecoEstruturado,
          enderecoDetalhado: enderecoEstruturado,
          cep: cepTrim,
          logradouro: logradouroTrim,
          numero: numeroTrim,
          complemento: complementoTrim,
          bairro: bairroTrim,
          enderecoCompleto,
          cidade: cidadeTrim,
          uf: ufTrim,
          cidadeEstado: cidadeTrim
            ? `${cidadeTrim}${ufTrim ? ` - ${ufTrim}` : ""}`
            : "",

          queixaPrincipal: queixaPrincipal.trim(),
          motivo: queixaPrincipal.trim(),
          terapiaAnterior: terapiaAnterior.trim(),
          medicacao: medicacao.trim(),
          contatoEmergencia: contatoEmergenciaFinal,
          contatoEmergenciaObj: {
            nome: emergNome,
            telefone: emergTel,
          },

          valorSessao: valorFinalSessao || "A combinar",
          modalidade: modalidadeEscolhida || "online",
          frequenciaSessoes: paramFrequencia || "Semanal",
          turnoPreferido,
          diasPreferidos,
          disponibilidade: disponibilidadeTexto,

          fonteIndicacao: fonteIndicacao || "Formulário Web",
          origem: "formulario_externo",
          origemCampanha: paramOrigem || "",
          tipo: "externo",
          profissionalId: resolvedProfUid || "avulso",
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

      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      setSubmitted(true);
    } catch (err) {
      console.error("Erro ao salvar cadastro do paciente:", err);
      setErrorMsg(
        "Ocorreu um erro ao salvar suas informações. Por favor, tente novamente."
      );
      if (
        err instanceof Error &&
        err.message.toLowerCase().includes("insufficient permissions")
      ) {
        handleFirestoreError(
          err,
          isModoAtualizacao ? OperationType.UPDATE : OperationType.CREATE,
          isModoAtualizacao ? loadedCollection : "pacientes"
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const publicProfileHref =
    resolvedProfUid && resolvedProfUid !== "avulso"
      ? `${typeof window !== "undefined" ? window.location.origin : ""}/?prof=${resolvedProfUid}`
      : "";

  const inputBaseClass =
    "w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[var(--wl-primary)] focus:ring-2 focus:ring-[var(--wl-primary)]/15 transition-colors";

  // Estado inicial de carregamento sem exibir nenhuma marca de plataforma antes da resolução do perfil
  if (loadingProf || (isModoAtualizacao && loadingPacienteExistente && !profData)) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-9 h-9 border-3 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
          <p className="text-xs font-medium text-slate-500">
            Preparando formulário seguro...
          </p>
        </div>
      </div>
    );
  }

  // Tela de confirmação sincronizada com o tema White-Label
  if (submitted) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6"
        style={{
          backgroundColor: bgColor,
          ["--wl-primary" as any]: primaryColor,
          ["--wl-secondary" as any]: secondaryColor,
        }}
      >
        <div className="bg-white max-w-lg w-full rounded-3xl p-7 sm:p-9 border border-slate-200/90 shadow-sm text-center flex flex-col items-center gap-5">
          {brandLogo && !logoImgError ? (
            <img
              src={brandLogo}
              alt={brandDisplayName}
              referrerPolicy="no-referrer"
              onError={() => setLogoImgError(true)}
              className="h-9 max-w-[160px] object-contain"
            />
          ) : null}

          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center border"
            style={{
              backgroundColor: `${primaryColor}12`,
              borderColor: `${primaryColor}30`,
              color: primaryColor,
            }}
          >
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="font-serif text-2xl font-bold text-slate-900 text-balance">
              {isModoAtualizacao
                ? "Dados atualizados com sucesso"
                : "Cadastro concluído com sucesso"}
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              {isModoAtualizacao ? (
                <>
                  Suas informações cadastrais foram atualizadas diretamente no
                  prontuário sob responsabilidade de{" "}
                  <strong className="text-slate-900">
                    {formattedProfName}
                  </strong>
                  .
                </>
              ) : (
                <>
                  Seus dados cadastrais foram encaminhados com segurança ao
                  prontuário sob responsabilidade de{" "}
                  <strong className="text-slate-900">
                    {formattedProfName}
                  </strong>
                  .
                </>
              )}
            </p>
          </div>

          <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs text-slate-600 space-y-1.5 text-left">
            <p>
              Registro sincronizado automaticamente com data e hora no
              prontuário clínico.
            </p>
            <p>
              Dados protegidos sob sigilo ético profissional (CFP) e Lei Geral
              de Proteção de Dados (LGPD).
            </p>
          </div>

          {publicProfileHref ? (
            <a
              href={publicProfileHref}
              style={{
                background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
              }}
              className="w-full py-3 px-5 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-95 flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <span>Acessar página profissional</span>
              <ExternalLink className="w-4 h-4 shrink-0" />
            </a>
          ) : !isWhiteLabel ? (
            <button
              type="button"
              onClick={onGoHome}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              Voltar ao início
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen text-slate-800 flex flex-col items-center px-4 sm:px-6 py-6 sm:py-10"
      style={{
        backgroundColor: bgColor,
        ["--wl-primary" as any]: primaryColor,
        ["--wl-secondary" as any]: secondaryColor,
      }}
    >
      <div className="w-full max-w-3xl flex flex-col gap-6">
        {/* Top Bar Contract (3 zonas limpas: Marca · Contexto · Ação única) */}
        <header className="flex items-center justify-between gap-6 pb-4 border-b border-slate-200/80">
          <div className="flex items-center gap-2.5 min-w-0 shrink-0">
            {isWhiteLabel ? (
              brandLogo && !logoImgError ? (
                <img
                  src={brandLogo}
                  alt={brandDisplayName}
                  referrerPolicy="no-referrer"
                  onError={() => setLogoImgError(true)}
                  className="h-8 sm:h-9 max-w-[150px] object-contain shrink-0"
                />
              ) : (
                <span className="font-serif text-base sm:text-lg font-bold tracking-tight text-slate-900 truncate max-w-[240px] sm:max-w-[320px]">
                  {brandDisplayName}
                </span>
              )
            ) : (
              <button
                type="button"
                onClick={onGoHome}
                className="inline-flex items-center gap-2 text-left cursor-pointer shrink-0"
              >
                <BrandLogo size="sm" showSubtitle={false} />
              </button>
            )}
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 whitespace-nowrap shrink-0">
            <ShieldCheck
              className="w-3.5 h-3.5 shrink-0"
              style={{ color: primaryColor }}
            />
            <span>Prontuário Criptografado</span>
            <span aria-hidden="true">·</span>
            <span>Conformidade CFP e LGPD</span>
          </div>

          <div className="flex items-center shrink-0">
            {publicProfileHref ? (
              <a
                href={publicProfileHref}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/90 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <ArrowLeft
                  className="w-3.5 h-3.5 shrink-0"
                  style={{ color: primaryColor }}
                />
                <span>Página Profissional</span>
              </a>
            ) : (
              <span className="md:hidden text-[11px] text-slate-500 whitespace-nowrap shrink-0">
                Sigilo CFP · LGPD
              </span>
            )}
          </div>
        </header>

        {/* Hero / Cabeçalho Clínico sincronizado com a identidade White-Label */}
        <section className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div
            className="h-1.5 w-full"
            style={{
              background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`,
            }}
          />

          <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="space-y-2 min-w-0 flex-1">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance">
                {tituloPagina}
              </h1>

              {/* Credenciais em texto limpo com separadores tipográficos */}
              <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs sm:text-sm text-slate-600">
                <strong
                  className="font-semibold"
                  style={{ color: primaryColor }}
                >
                  {formattedProfName}
                </strong>
                {profEspecialidade && (
                  <>
                    <span aria-hidden="true" className="text-slate-300">
                      ·
                    </span>
                    <span>{profEspecialidade}</span>
                  </>
                )}
                {profCrp && (
                  <>
                    <span aria-hidden="true" className="text-slate-300">
                      ·
                    </span>
                    <span className="tabular-nums">CRP {profCrp}</span>
                  </>
                )}
                {profAbordagem && (
                  <>
                    <span aria-hidden="true" className="text-slate-300">
                      ·
                    </span>
                    <span>{profAbordagem}</span>
                  </>
                )}
              </div>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-1 max-w-2xl">
                {mensagemBoasVindas}
              </p>
            </div>

            {/* Foto do Profissional com anel na cor primária White-Label */}
            <div
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl p-0.5 shrink-0 overflow-hidden flex items-center justify-center bg-slate-50 border-2"
              style={{ borderColor: primaryColor }}
            >
              {profPhoto && !profImgError ? (
                <img
                  src={profPhoto}
                  alt={formattedProfName}
                  referrerPolicy="no-referrer"
                  onError={() => setProfImgError(true)}
                  className="w-full h-full object-cover rounded-[13px]"
                />
              ) : (
                <User
                  className="w-8 h-8"
                  style={{ color: primaryColor }}
                />
              )}
            </div>
          </div>

          {/* Linha de condições acordadas (se parametrizadas no link ou perfil) */}
          {(valorFinalSessao || paramModalidade || paramFrequencia) && (
            <div
              className="px-6 sm:px-8 py-3.5 border-t flex flex-wrap items-center justify-between gap-2 text-xs"
              style={{
                backgroundColor: `${primaryColor}08`,
                borderColor: `${primaryColor}20`,
              }}
            >
              <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-slate-700">
                <span
                  className="font-semibold"
                  style={{ color: primaryColor }}
                >
                  Condições do atendimento:
                </span>
                <span className="tabular-nums">
                  {valorFinalSessao
                    ? `Sessão R$ ${valorFinalSessao}`
                    : "Honorários a combinar"}
                </span>
                {modalidadeEscolhida && (
                  <>
                    <span aria-hidden="true" className="text-slate-300">
                      ·
                    </span>
                    <span>
                      Modalidade{" "}
                      {modalidadeEscolhida === "presencial"
                        ? "Presencial"
                        : "Online"}
                    </span>
                  </>
                )}
                {paramFrequencia && (
                  <>
                    <span aria-hidden="true" className="text-slate-300">
                      ·
                    </span>
                    <span className="capitalize">
                      Frequência {paramFrequencia}
                    </span>
                  </>
                )}
              </div>
              <span className="text-slate-500">Atendimento Particular</span>
            </div>
          )}
        </section>

        {/* Formulário Principal */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8 flex flex-col gap-8"
        >
          {loadingPacienteExistente && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs font-medium flex items-center gap-2">
              <Clock
                className="w-4 h-4 animate-spin shrink-0"
                style={{ color: primaryColor }}
              />
              <span>Carregando seus dados atuais para conferência...</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* SEÇÃO 01: IDENTIFICAÇÃO PESSOAL */}
          {showSection("pessoais") && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-2.5 flex items-baseline justify-between gap-2">
                <h2 className="text-sm sm:text-base font-semibold text-slate-900">
                  <span
                    className="font-mono text-xs mr-1.5 tabular-nums"
                    style={{ color: primaryColor }}
                  >
                    {secNumIdentificacao}.
                  </span>
                  Identificação Pessoal
                </h2>
                <span className="text-[11px] text-slate-400">
                  Campos com * são obrigatórios
                </span>
              </div>

              {/* Nome Completo */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nome Completo <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Digite seu nome completo civil"
                  className={inputBaseClass}
                />
              </div>

              {/* Nome Social */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nome Social / Como prefere ser chamado(a){" "}
                  <span className="text-slate-400 font-normal">(Opcional)</span>
                </label>
                <input
                  type="text"
                  value={nomeSocial}
                  onChange={(e) => setNomeSocial(e.target.value)}
                  placeholder="Preencha caso utilize um nome diferente do registro civil"
                  className={inputBaseClass}
                />
              </div>

              {/* E-mail e Telefone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    E-mail{" "}
                    {!isModoAtualizacao && (
                      <span className="text-rose-500">*</span>
                    )}
                  </label>
                  <input
                    type="email"
                    required={!isModoAtualizacao}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    className={inputBaseClass}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    WhatsApp / Celular <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={telefone}
                    onChange={(e) => setTelefone(formatPhone(e.target.value))}
                    placeholder="(00) 00000-0000"
                    className={`${inputBaseClass} tabular-nums`}
                  />
                </div>
              </div>

              {/* Data de Nascimento e CPF */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Data de Nascimento <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={dataNascimento}
                    onChange={(e) => setDataNascimento(e.target.value)}
                    className={`${inputBaseClass} tabular-nums`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    CPF <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={cpf}
                    onChange={(e) => setCpf(formatCpf(e.target.value))}
                    placeholder="000.000.000-00"
                    className={`${inputBaseClass} tabular-nums`}
                  />
                </div>
              </div>

              {/* Gênero e Profissão */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Gênero
                    </label>
                    <select
                      value={genero}
                      onChange={(e) => setGenero(e.target.value)}
                      className={`${inputBaseClass} cursor-pointer`}
                    >
                      <option value="">Selecione...</option>
                      {genero &&
                        !(GENERO_OPCOES as readonly string[]).includes(genero) && (
                          <option value={genero}>{genero}</option>
                        )}
                      {GENERO_OPCOES.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  {genero === "Outro" && (
                    <input
                      type="text"
                      value={generoOutro}
                      onChange={(e) => setGeneroOutro(e.target.value)}
                      placeholder="Como prefere especificar? (Opcional)"
                      className={inputBaseClass}
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Profissão / Ocupação
                  </label>
                  <input
                    type="text"
                    value={profissao}
                    onChange={(e) => setProfissao(e.target.value)}
                    placeholder="Ex: Arquiteta, Estudante, Analista..."
                    className={inputBaseClass}
                  />
                </div>
              </div>

              {/* Responsável Legal (Menor de 18 anos ou toggle manual) */}
              <div className="pt-2">
                <label className="inline-flex items-center gap-2.5 cursor-pointer select-none text-xs font-medium text-slate-700 hover:text-slate-900">
                  <input
                    type="checkbox"
                    checked={isMenorIdade}
                    onChange={(e) => {
                      setIsMenorIdade(e.target.checked);
                      setMenorManualOverride(e.target.checked);
                    }}
                    style={{ accentColor: primaryColor }}
                    className="w-4 h-4 rounded cursor-pointer shrink-0"
                  />
                  <span>
                    Paciente menor de 18 anos ou representado por responsável
                    legal
                  </span>
                </label>
              </div>

              {isMenorIdade && (
                <div className="p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col gap-3.5">
                  <div className="flex items-center gap-2">
                    <AlertCircle
                      className="w-4 h-4 shrink-0"
                      style={{ color: primaryColor }}
                    />
                    <span className="font-semibold text-xs text-slate-900">
                      Dados do Responsável Legal
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nome do Responsável Legal{" "}
                        <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required={isMenorIdade}
                        value={nomeResponsavel}
                        onChange={(e) => setNomeResponsavel(e.target.value)}
                        placeholder="Nome completo do responsável"
                        className={inputBaseClass}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Parentesco / Grau de Guarda{" "}
                        <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required={isMenorIdade}
                        value={parentescoResponsavel}
                        onChange={(e) => setParentescoResponsavel(e.target.value)}
                        placeholder="Ex: Mãe, Pai, Responsável Legal..."
                        className={inputBaseClass}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        CPF do Responsável{" "}
                        <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required={isMenorIdade}
                        value={cpfResponsavel}
                        onChange={(e) =>
                          setCpfResponsavel(formatCpf(e.target.value))
                        }
                        placeholder="000.000.000-00"
                        className={`${inputBaseClass} tabular-nums`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        WhatsApp / Telefone{" "}
                        <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required={isMenorIdade}
                        value={telefoneResponsavel}
                        onChange={(e) =>
                          setTelefoneResponsavel(formatPhone(e.target.value))
                        }
                        placeholder="(00) 00000-0000"
                        className={`${inputBaseClass} tabular-nums`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        E-mail do Responsável
                      </label>
                      <input
                        type="email"
                        value={emailResponsavel}
                        onChange={(e) => setEmailResponsavel(e.target.value)}
                        placeholder="email@exemplo.com"
                        className={inputBaseClass}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SEÇÃO: ENDEREÇO RESIDENCIAL (Parametrizável) */}
          {solicitarEndereco && showSection("endereco") && (
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-sm sm:text-base font-semibold text-slate-900">
                  <span
                    className="font-mono text-xs mr-1.5 tabular-nums"
                    style={{ color: primaryColor }}
                  >
                    {secNumEndereco}.
                  </span>
                  Endereço Residencial
                </h2>
                <span className="text-[11px] text-slate-400">
                  Para prontuário e emissão de recibos
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    CEP{" "}
                    {buscandoCep && (
                      <span
                        className="text-[11px] font-normal"
                        style={{ color: primaryColor }}
                      >
                        (Buscando...)
                      </span>
                    )}
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
                    className={`${inputBaseClass} tabular-nums`}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Rua / Logradouro
                  </label>
                  <input
                    type="text"
                    value={logradouro}
                    onChange={(e) => setLogradouro(e.target.value)}
                    placeholder="Nome da rua ou avenida"
                    className={inputBaseClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Número
                  </label>
                  <input
                    type="text"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    placeholder="Ex: 123"
                    className={inputBaseClass}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Complemento
                  </label>
                  <input
                    type="text"
                    value={complemento}
                    onChange={(e) => setComplemento(e.target.value)}
                    placeholder="Apto, Bloco..."
                    className={inputBaseClass}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Bairro
                  </label>
                  <input
                    type="text"
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                    placeholder="Bairro"
                    className={inputBaseClass}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    placeholder="Cidade"
                    className={inputBaseClass}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    UF
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    value={uf}
                    onChange={(e) => setUf(e.target.value.toUpperCase())}
                    placeholder="SP"
                    className={`${inputBaseClass} uppercase`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* SEÇÃO: MOTIVO DA CONSULTA & INFORMAÇÕES CLÍNICAS (Parametrizável) */}
          {solicitarQueixaPrincipal && showSection("queixa") && (
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <h2 className="text-sm sm:text-base font-semibold text-slate-900">
                <span
                  className="font-mono text-xs mr-1.5 tabular-nums"
                  style={{ color: primaryColor }}
                >
                  {secNumClinico}.
                </span>
                Motivo da Consulta e Histórico Clínico
              </h2>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  O que motivou a busca por psicoterapia neste momento? (Queixa
                  Principal)
                </label>
                <textarea
                  rows={3}
                  value={queixaPrincipal}
                  onChange={(e) => setQueixaPrincipal(e.target.value)}
                  placeholder="Conte brevemente o que gostaria de trabalhar ou quais desafios está vivenciando..."
                  className={`${inputBaseClass} leading-relaxed`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Já fez terapia?
                  </label>
                  <select
                    value={terapiaAnterior}
                    onChange={(e) => setTerapiaAnterior(e.target.value)}
                    className={`${inputBaseClass} cursor-pointer`}
                  >
                    <option value="">Selecione...</option>
                    {terapiaAnterior &&
                      !(TERAPIA_ANTERIOR_OPCOES as readonly string[]).includes(
                        terapiaAnterior
                      ) && (
                        <option value={terapiaAnterior}>
                          {terapiaAnterior}
                        </option>
                      )}
                    {TERAPIA_ANTERIOR_OPCOES.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Faz uso de medicação psiquiátrica?
                  </label>
                  <input
                    type="text"
                    value={medicacao}
                    onChange={(e) => setMedicacao(e.target.value)}
                    placeholder="Se sim, informe qual medicação (Opcional)"
                    className={inputBaseClass}
                  />
                </div>
              </div>
            </div>
          )}

          {/* SEÇÃO: PREFERÊNCIAS DE ATENDIMENTO & DISPONIBILIDADE */}
          {showSection("disponibilidade") && (
            <div className="space-y-4 pt-2 border-t border-slate-100">
            <h2 className="text-sm sm:text-base font-semibold text-slate-900">
              <span
                className="font-mono text-xs mr-1.5 tabular-nums"
                style={{ color: primaryColor }}
              >
                {secNumPreferencias}.
              </span>
              Preferências de Atendimento
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Modalidade do Atendimento
                </label>
                <select
                  value={modalidadeEscolhida}
                  onChange={(e) => setModalidadeEscolhida(e.target.value)}
                  className={`${inputBaseClass} font-medium cursor-pointer`}
                >
                  <option value="online">Online (Videochamada)</option>
                  <option value="presencial">Presencial (Consultório)</option>
                </select>
              </div>

              {solicitarDisponibilidade && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Melhor Turno para Sessões
                  </label>
                  <select
                    value={turnoPreferido}
                    onChange={(e) => setTurnoPreferido(e.target.value)}
                    className={`${inputBaseClass} cursor-pointer`}
                  >
                    <option value="">Selecione seu turno preferido...</option>
                    {turnoPreferido &&
                      ![
                        "Manhã (08h às 12h)",
                        "Tarde (13h às 18h)",
                        "Noite (18h às 21h)",
                        "Flexível",
                      ].includes(turnoPreferido) && (
                        <option value={turnoPreferido}>{turnoPreferido}</option>
                      )}
                    <option value="Manhã (08h às 12h)">
                      Manhã (08h às 12h)
                    </option>
                    <option value="Tarde (13h às 18h)">
                      Tarde (13h às 18h)
                    </option>
                    <option value="Noite (18h às 21h)">
                      Noite (18h às 21h)
                    </option>
                    <option value="Flexível">
                      Qualquer horário / Flexível
                    </option>
                  </select>
                </div>
              )}
            </div>

            {/* Exibição sincronizada do endereço do consultório caso Presencial selecionado e configurado no perfil */}
            {modalidadeEscolhida === "presencial" &&
              textoEnderecoConsultorio && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start gap-2.5 text-xs text-slate-600">
                  <MapPin
                    className="w-4 h-4 shrink-0 mt-0.5"
                    style={{ color: primaryColor }}
                  />
                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-800 block">
                      Local de atendimento presencial:
                    </span>
                    <span className="block">{textoEnderecoConsultorio}</span>
                    {enderecoConsultorio.referencia && (
                      <span className="text-slate-500 block">
                        Referência: {enderecoConsultorio.referencia}
                      </span>
                    )}
                  </div>
                </div>
              )}

            {solicitarDisponibilidade && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Dias da Semana de Preferência{" "}
                  <span className="text-slate-400 font-normal">(Opcional)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {DIAS_SEMANA_OPCOES.map((dia) => {
                    const ativo = diasPreferidos.includes(dia);
                    return (
                      <button
                        key={dia}
                        type="button"
                        onClick={() => toggleDiaPreferido(dia)}
                        style={
                          ativo
                            ? {
                                backgroundColor: primaryColor,
                                borderColor: primaryColor,
                                color: "#FFFFFF",
                              }
                            : undefined
                        }
                        className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                          ativo
                            ? "shadow-2xs"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {dia}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Contato de Emergência (Parametrizável) */}
            {solicitarContatoEmergencia && showSection("emergencia") && (
              <div className="pt-2 space-y-2.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Phone
                    className="w-3.5 h-3.5 shrink-0"
                    style={{ color: primaryColor }}
                  />
                  <span>Contato de Emergência (Pessoa de Confiança)</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <input
                    type="text"
                    value={contatoEmergenciaNome}
                    onChange={(e) => setContatoEmergenciaNome(e.target.value)}
                    placeholder="Nome e parentesco (Ex: Maria - Mãe)"
                    className={inputBaseClass}
                  />
                  <input
                    type="tel"
                    value={contatoEmergenciaTelefone}
                    onChange={(e) =>
                      setContatoEmergenciaTelefone(formatPhone(e.target.value))
                    }
                    placeholder="Telefone (00) 00000-0000"
                    className={`${inputBaseClass} tabular-nums`}
                  />
                </div>
              </div>
            )}
          </div>
          )}

          {/* SEÇÃO: ORIGEM / INDICAÇÃO */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h2 className="text-sm sm:text-base font-semibold text-slate-900">
              <span
                className="font-mono text-xs mr-1.5 tabular-nums"
                style={{ color: primaryColor }}
              >
                {secNumOrigem}.
              </span>
              Origem do Contato
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Como você conheceu meu trabalho?{" "}
                {!isModoAtualizacao && <span className="text-rose-500">*</span>}
              </label>
              <select
                required={!isModoAtualizacao}
                value={fonteIndicacao}
                onChange={(e) => setFonteIndicacao(e.target.value)}
                className={`${inputBaseClass} cursor-pointer`}
              >
                <option value="">Selecione uma opção...</option>
                {fonteIndicacao &&
                  !FONTES_INDICACAO_OPCOES.includes(fonteIndicacao) && (
                    <option value={fonteIndicacao}>{fonteIndicacao}</option>
                  )}
                {FONTES_INDICACAO_OPCOES.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* TERMOS E LGPD */}
          <div className="p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200/90 flex flex-col gap-2.5">
            <span className="font-semibold text-xs text-slate-900 flex items-center gap-1.5">
              <ShieldCheck
                className="w-4 h-4 shrink-0"
                style={{ color: primaryColor }}
              />
              Termos de Consentimento, Sigilo Ético e LGPD
            </span>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={aceitouLgpd}
                onChange={(e) => setAceitouLgpd(e.target.checked)}
                style={{ accentColor: primaryColor }}
                className="mt-0.5 rounded w-4 h-4 cursor-pointer shrink-0"
              />
              <span className="text-xs text-slate-600 leading-relaxed">
                <strong className="text-slate-800">
                  Ciente sobre o tratamento de dados (LGPD):
                </strong>{" "}
                Autorizo a coleta, armazenamento e tratamento dos dados
                informados neste formulário por{" "}
                <strong className="text-slate-900">{formattedProfName}</strong>
                {company.razaoSocial?.trim()
                  ? ` (${company.razaoSocial.trim()})`
                  : ""}
                , estritamente para fins de prontuário clínico, agendamentos,
                emissão de recibos ou notas fiscais e cumprimento do Código de
                Ética Profissional do Psicólogo (CFP) e da Lei Geral de
                Proteção de Dados (Lei nº 13.709/2018).
              </span>
            </label>
          </div>

          {/* CTA PRIMÁRIO */}
          <button
            type="submit"
            disabled={submitting}
            style={{
              background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
            }}
            className="w-full py-3.5 px-6 rounded-xl text-white font-semibold text-sm sm:text-base transition-opacity hover:opacity-95 shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            <span>
              {submitting
                ? isModoAtualizacao
                  ? "Salvando atualizações..."
                  : "Registrando cadastro..."
                : isModoAtualizacao
                  ? "Confirmar e salvar atualização cadastral"
                  : "Finalizar cadastro"}
            </span>
          </button>
        </form>

        {/* Rodapé Silencioso Sincronizado com Dados White-Label */}
        <footer className="py-4 text-center space-y-1.5 text-xs text-slate-500">
          <div className="flex items-center justify-center flex-wrap gap-x-2 gap-y-1">
            <span className="font-medium text-slate-700">
              © {new Date().getFullYear()} {brandDisplayName}
            </span>
            {company.cnpj?.trim() && (
              <>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">
                  CNPJ {company.cnpj.trim()}
                </span>
              </>
            )}
            {profCrp && (
              <>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">CRP {profCrp}</span>
              </>
            )}
          </div>

          {(company.enderecoEmpresa?.trim() ||
            company.telefoneEmpresa?.trim()) && (
            <div className="flex items-center justify-center flex-wrap gap-x-2 gap-y-1 text-[11px] text-slate-400">
              {company.enderecoEmpresa?.trim() && (
                <span>{company.enderecoEmpresa.trim()}</span>
              )}
              {company.enderecoEmpresa?.trim() &&
                company.telefoneEmpresa?.trim() && (
                  <span aria-hidden="true">·</span>
                )}
              {company.telefoneEmpresa?.trim() && (
                <span className="tabular-nums">
                  {company.telefoneEmpresa.trim()}
                </span>
              )}
            </div>
          )}

          <p className="text-[11px] text-slate-400">
            Ambiente protegido sob sigilo ético profissional (CFP) e LGPD
          </p>
        </footer>
      </div>
    </div>
  );
}
