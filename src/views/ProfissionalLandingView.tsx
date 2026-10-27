import { Footer } from '../components/Footer';
import { ArrowLeft, ArrowRight, CheckCircle2, HeartHandshake, UserPlus, Clock, PiggyBank, Network, Wallet, Check, CreditCard, Sparkles, BookOpen, MessageSquare, Mail, FileText, Copy, ShieldCheck, Coins, Star, Receipt, BellRing, FileSpreadsheet, Gift } from "lucide-react";
import React, { FormEvent, useState, useEffect } from "react";
import { collection, addDoc, serverTimestamp, getDocs, query, where, doc, onSnapshot } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { sendProfessionalLeadEmail } from "../lib/emailService";
import { sendWebhookNotification } from "../lib/webhookNotifier";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { StripeCheckoutModal } from "../components/StripeCheckoutModal";
import { PLANOS_PROFISSIONAIS_PADRAO, PlanoProfissionalItem, sanitizePlanoSemHoras, normalizePlanosConfig } from "../types/planosProfissionais";

import psicologoHero from '../assets/images/psicologa_hero_parda_1788390113480.jpg';
import logoImage from '../assets/images/logo_acolhe.svg';
import { BrandLogo } from '../components/BrandLogo';

export const OPCOES_SERVICOS = [
  "Terapia Individual (Adulto)",
  "Terapia de Casal",
  "Terapia Familiar",
  "Terapia Adolescente",
  "Terapia Infantil On Line (Acima dos 12 anos de idade)",
  "Avaliação Psicológica",
  "Avaliação Neuropsicológica",
  "Acompanhamento e Orientação Vocacional/ Transição Profissional e Carreira",
  "Psicologia Jurídica",
  "Laudo para Cirurgias",
  "Terapias Integrativas",
  "Outros"
];

export const OPCOES_HORAS_REGULARES = [
  "8 horas/mês",
  "10 horas/mês",
  "12 horas/mês",
  "14 horas/mês",
  "16 horas/mês",
  "18 horas/mês",
  "20 horas/mês",
  "24 horas/mês",
  "28 horas/mês",
  "32 horas/mês",
];

export const OPCOES_HORAS_ADICIONAIS = [
  "2 horas/mês",
  "4 horas/mês",
  "6 horas/mês",
  "8 horas/mês",
  "10 horas/mês",
  "12 horas/mês",
];

export function generateTermoValoresProfissional(
  aceitaGratuito: boolean,
  horasGratuito: string,
  aceita30: boolean,
  nomeProfissional?: string,
  horasRegular?: string,
  horas30?: string
): string {
  const nome = (nomeProfissional || "").trim() || "o(a) Profissional Parceiro(a)";
  const regularStr = horasRegular || "8 horas/mês";
  const h30Str = aceita30 ? (horas30 || "2 horas/mês") : "0 horas/mês";
  const hGratuitoStr = aceitaGratuito ? (horasGratuito || "2 horas/mês") : "0 horas/mês";

  const numRegular = parseInt(regularStr.replace(/\D+/g, "") || "8", 10);
  const num30 = aceita30 ? parseInt(h30Str.replace(/\D+/g, "") || "2", 10) : 0;
  const numGratuito = aceitaGratuito ? parseInt(hGratuitoStr.replace(/\D+/g, "") || "2", 10) : 0;
  const numTotal = numRegular + num30 + numGratuito;

  let termo = `TERMO DE CIÊNCIA E COMPROMISSO SOBRE VALORES E COTA DE HORAS PRATICADOS NA PLATAFORMA ACOLHEMENTE\n\n`;

  termo += `1. DA COTA MÍNIMA REGULAR E VALORES PRATICADOS:\n`;
  termo += `Pelo presente instrumento, declaro estar plenamente ciente de que a cota mínima obrigatória para credenciamento na plataforma AcolheMente é de 8 (oito) horas mensais destinadas exclusivamente à grade regular de atendimentos particulares com valor acessível (partindo obrigatoriamente de R$ 50,00 por sessão clínica individual). As horas são sempre estruturadas em números pares para compatibilização com as frequências semanais (4h/mês) ou quinzenais (2h/mês).\n\n`;
  termo += `Declaro expressamente que minha cota base regular é fixada em ${regularStr}, sendo esta base protegida e não passível de conversão em atendimentos gratuitos ou na faixa extraordinária de R$ 30,00.\n\n`;

  if (!aceitaGratuito && !aceita30) {
    termo += `2. DO REGIME DE ATENDIMENTO:\n`;
    termo += `Declaro que meus atendimentos clínicos na plataforma serão conduzidos estritamente dentro da grade padrão regular com valores a partir de R$ 50,00 por sessão, totalizando ${numTotal} horas/mês, não optando, no presente momento, pela realização de atendimentos em modalidade gratuita ou na faixa extraordinária de vulnerabilidade.\n\n`;
  } else {
    termo += `2. DAS HORAS ADICIONAIS EXTRAORDINÁRIAS E CONDIÇÕES ESPECIAIS:\n`;
    termo += `Em caráter de compromisso humanitário com o acolhimento qualificado e acessível, manifesto minha expressa autorização para adicionar à minha cota regular as seguintes horas extraordinárias (em números pares, sem dedução das 8h mínimas regulares):\n\n`;
    
    if (aceita30) {
      termo += `• FAIXA EXTRAORDINÁRIA DE VULNERABILIDADE (R$ 30,00):\n  Declaro aceitar atender casos especiais e de alta vulnerabilidade pelo valor extraordinário de R$ 30,00 (trinta reais) por sessão clínica individual, disponibilizando ${h30Str} adicionais para encaminhamentos seletivos da coordenação. Reconheço que esta faixa tem caráter de exceção humanitária e permanece oculta do público geral.\n\n`;
    }
    
    if (aceitaGratuito) {
      termo += `• ATENDIMENTO GRATUITO (VOLUNTÁRIO / PRO BONO):\n  Declaro aceitar atender gratuitamente e disponibilizo ${hGratuitoStr} adicionais para acolhimento clínico 100% gratuito (pro bono), destinado a pacientes em situação de extrema vulnerabilidade socioeconômica encaminhados pela coordenação do projeto.\n\n`;
    }

    termo += `• COTA TOTAL CONSOLIDADA: ${numTotal} horas/mês (sendo ${regularStr} na base regular a partir de R$ 50, ${aceita30 ? `${h30Str} a R$ 30` : '0h a R$ 30'} e ${aceitaGratuito ? `${hGratuitoStr} gratuitas` : '0h gratuitas'}).\n\n`;
  }

  termo += `3. DA ÉTICA, RIGOR E SIGILO PROFISSIONAL:\n`;
  termo += `Comprometo-me a dispensar a todo e qualquer paciente acolhido na plataforma o mesmo padrão técnico de excelência, pontualidade, sigilo absoluto e conformidade ética com o Código de Ética Profissional do Conselho de Psicologia, sem distinção ou discriminação pela faixa de valor, gratuidade ou modalidade de encaminhamento.\n\n`;

  termo += `4. DO TEMPO MÍNIMO DE DURAÇÃO DAS SESSÕES:\n`;
  termo += `Comprometo-me a assegurar o tempo mínimo de duração de 45 (quarenta e cinco) minutos para cada sessão clínica ou acolhimento individual, respeitando integralmente as resoluções, diretrizes técnicas e recomendações dos conselhos regulamentadores da profissão.\n\n`;

  termo += `5. DA DECLARAÇÃO E ACEITE:\n`;
  termo += `Declaro que as informações prestadas são verdadeiras e que este termo passa a integrar as diretrizes do meu vínculo colaborativo junto à Rede AcolheMente a partir da confirmação deste cadastro.`;

  return termo;
}

export function generateTermoDuracaoSessaoProfissional(nomeProfissional?: string): string {
  const nome = (nomeProfissional || "").trim() || "o(a) Profissional Parceiro(a)";
  return `TERMO DE CIÊNCIA E COMPROMISSO SOBRE A DURAÇÃO MÍNIMA DAS SESSÕES CLÍNICAS

Pelo presente instrumento, ${nome} declara estar ciente e formalmente comprometido(a) com as seguintes diretrizes de atendimento na plataforma AcolheMente:

1. DO TEMPO MÍNIMO DE DURAÇÃO:
Comprometo-me a assegurar que cada consulta, atendimento ou sessão de psicoterapia individual realizada a pacientes encaminhados pela plataforma AcolheMente tenha o tempo mínimo de duração de 45 (quarenta e cinco) minutos.

2. DA CONFORMIDADE COM CONSELHOS REGULAMENTADORES:
Declaro que a condução das sessões observará rigorosamente os regulamentos, resoluções normativas e recomendações dos conselhos de classe pertinentes (em especial o Conselho Federal de Psicologia - CFP e Conselhos Regionais de Psicologia - CRP), bem como o respectivo Código de Ética Profissional.

3. DO ENQUADRE TERAPÊUTICO E DA QUALIDADE DO ATENDIMENTO:
Reconheço que o tempo mínimo de 45 minutos é essencial para a garantia da escuta qualificada, elaboração clínica adequada, segurança do paciente e efetividade do processo terapêutico.

4. DA PONTUALIDADE E DEDICAÇÃO EXCLUSIVA:
Comprometo-me a iniciar pontualmente os atendimentos e manter dedicação técnica exclusiva durante todo o período da sessão clínica agendada.`;
}

export function ProfissionalLandingView({ onNavigate }: { onNavigate: (view: 'landing' | 'acolhimento' | 'dashboard' | 'profile' | 'empresa' | 'doacao' | 'profissional') => void }) {
  const [formData, setFormData] = useState({
    nome: '',
    profissao: 'Psicólogo(a)',
    especialidade: '',
    abordagem: '',
    anoFormacao: '',
    crp: '',
    cpf: '',
    email: '',
    telefone: '',
    cidade: '',
    uf: '',
    genero: '',
    deficiencia: '',
    horasDisponiveis: '8 horas/mês',
    horasRegular: '8 horas/mês',
    aceitaAtendimentoGratuito: false,
    horasAtendimentoGratuito: '2 horas/mês',
    aceitaAtendimento30Reais: false,
    horasAtendimento30Reais: '2 horas/mês',
    termoValoresAceito: false,
    termoDuracaoAceito: false,
    publicosExperiencia: [] as string[],
    publicosGosto: [] as string[],
    outrosPublicosExperiencia: '',
    outrosPublicosGosto: '',
    motivacao: '',
    comoConheceu: '',
    outroComoConheceu: '',
    servicosOferecidos: [] as string[],
    servicosOrcamentoAcessivel: [] as string[],
    outrosServicos: ''
  });
  
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [taxaAssociativaMensal, setTaxaAssociativaMensal] = useState("29,90");
  const [planosProfissionais, setPlanosProfissionais] = useState<PlanoProfissionalItem[]>(PLANOS_PROFISSIONAIS_PADRAO);
  const [planoEscolhidoId, setPlanoEscolhidoId] = useState<string>("plano_2");
  const [exibirPlanosProfissionais, setExibirPlanosProfissionais] = useState<boolean>(false);
  const [stripeConfig, setStripeConfig] = useState<any>(null);
  const [cienciaTaxa, setCienciaTaxa] = useState(false);
  const [copiedTermo, setCopiedTermo] = useState(false);
  const [copiedTermoDuracao, setCopiedTermoDuracao] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [registeredLeadId, setRegisteredLeadId] = useState<string | undefined>(undefined);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "configuracoes", "master"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.planosProfissionais && Array.isArray(data.planosProfissionais) && data.planosProfissionais.length > 0) {
          const normalized = normalizePlanosConfig(data.planosProfissionais, data.planosSchemaVersion);
          setPlanosProfissionais(normalized);
          const featured = normalized.find((p: PlanoProfissionalItem) => p.destaque && p.ativo !== false) || normalized.find((p: PlanoProfissionalItem) => p.ativo !== false);
          if (featured) {
            setPlanoEscolhidoId(featured.id);
          }
        }
        if (typeof data.exibirPlanosProfissionais === 'boolean') {
          setExibirPlanosProfissionais(data.exibirPlanosProfissionais);
        }
        if (data.taxaAssociativaMensal) {
          setTaxaAssociativaMensal(data.taxaAssociativaMensal);
        }
        setStripeConfig({
          stripeEnabled: data.stripeEnabled,
          stripePublicKey: data.stripePublicKey,
          stripeCheckoutUrl: data.stripeCheckoutUrl,
        });
      }
    }, (err) => console.error("Error fetching config:", err));
    return () => unsub();
  }, []);

  const planosAtivos = (planosProfissionais && planosProfissionais.length > 0 ? planosProfissionais : PLANOS_PROFISSIONAIS_PADRAO)
    .filter(p => p.ativo !== false)
    .map(sanitizePlanoSemHoras);
  const planoSelecionado = planosAtivos.find(p => p.id === planoEscolhidoId) || planosAtivos[0] || PLANOS_PROFISSIONAIS_PADRAO[0];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCheckboxChange = (field: 'publicosExperiencia' | 'publicosGosto', value: string) => {
    setFormData(prev => {
      const current = prev[field];
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter(v => v !== value) };
      } else {
        return { ...prev, [field]: [...current, value] };
      }
    });
  };

  const handleServiceCheckboxChange = (service: string) => {
    setFormData(prev => {
      const current = prev.servicosOferecidos || [];
      const isChecked = current.includes(service);
      const nextOferecidos = isChecked
        ? current.filter(s => s !== service)
        : [...current, service];
      
      const currentAcessivel = prev.servicosOrcamentoAcessivel || [];
      const nextAcessivel = isChecked
        ? currentAcessivel.filter(s => s !== service)
        : currentAcessivel;

      return {
        ...prev,
        servicosOferecidos: nextOferecidos,
        servicosOrcamentoAcessivel: nextAcessivel
      };
    });
  };

  const handleServiceAccessibleChange = (service: string) => {
    setFormData(prev => {
      const current = prev.servicosOrcamentoAcessivel || [];
      const next = current.includes(service)
        ? current.filter(s => s !== service)
        : [...current, service];
      return { ...prev, servicosOrcamentoAcessivel: next };
    });
  };

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    if (step > 1) {
      setStep(prev => prev - 1);
      setErrorMsg('');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (step === 1) {
      if (!formData.nome || !formData.email || !formData.telefone || !formData.cpf || !formData.cidade || !formData.uf || !formData.genero || !formData.deficiencia) {
        setErrorMsg("Por favor, preencha todos os campos obrigatórios.");
        return;
      }
      setErrorMsg('');
      setStep(2);
      return;
    }

    if (step === 2) {
      if (!formData.abordagem || !formData.anoFormacao || !formData.horasDisponiveis) {
        setErrorMsg("Por favor, preencha todos os campos obrigatórios.");
        return;
      }
      setErrorMsg('');
      setStep(3);
      return;
    }

    if (step === 3) {
      if (!formData.servicosOferecidos || formData.servicosOferecidos.length === 0) {
        setErrorMsg("Por favor, selecione pelo menos um serviço profissional que você oferece.");
        return;
      }
      setErrorMsg('');
      setStep(4);
      return;
    }

    if (step === 4) {
      if (!formData.comoConheceu || !formData.motivacao) {
        setErrorMsg("Por favor, preencha todos os campos obrigatórios, incluindo como conheceu nossa plataforma.");
        return;
      }
      if (!formData.termoValoresAceito) {
        setErrorMsg("Para prosseguir, você deve ler e declarar ciência do Termo de Valores Praticados na Plataforma.");
        return;
      }
      if (!formData.termoDuracaoAceito) {
        setErrorMsg("Para prosseguir, você deve declarar ciência e compromisso com o tempo mínimo de 45 minutos por sessão.");
        return;
      }
      if (exibirPlanosProfissionais) {
        if (!cienciaTaxa) {
          setErrorMsg(`Para prosseguir, você deve declarar estar ciente da Taxa mensal do plano selecionado (${planoSelecionado.nome} - R$ ${planoSelecionado.valorMensal}/mês).`);
          return;
        }
      } else {
        if (!cienciaTaxa) {
          setErrorMsg("Para prosseguir, você deve declarar estar ciente do benefício de 3 meses de isenção total.");
          return;
        }
      }
      setIsSubmitting(true);
      setErrorMsg('');

      try {
        const q = query(collection(db, "profissionais_leads"), where("email", "==", formData.email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setErrorMsg("Este email já aparece em nossa triagem ou em nosso banco de dados.");
          setIsSubmitting(false);
          return;
        }

        const regularHoras = parseInt((formData.horasRegular || formData.horasDisponiveis || "8").replace(/\D+/g, "") || "8", 10);
        const h30Num = formData.aceitaAtendimento30Reais
          ? parseInt((formData.horasAtendimento30Reais || "2").replace(/\D+/g, "") || "2", 10)
          : 0;
        const hGratuitoNum = formData.aceitaAtendimentoGratuito
          ? parseInt((formData.horasAtendimentoGratuito || "2").replace(/\D+/g, "") || "2", 10)
          : 0;
        const totalHorasCalculado = regularHoras + h30Num + hGratuitoNum;

        const termoValoresTexto = generateTermoValoresProfissional(
          formData.aceitaAtendimentoGratuito,
          formData.horasAtendimentoGratuito,
          formData.aceitaAtendimento30Reais,
          formData.nome,
          `${regularHoras} horas/mês`,
          `${h30Num} horas/mês`
        );
        const termoDuracaoTexto = generateTermoDuracaoSessaoProfissional(formData.nome);

        const docRef = await addDoc(collection(db, "profissionais_leads"), {
          ...formData,
          horasRegular: `${regularHoras} horas/mês`,
          aceitaAtendimento30Reais: Boolean(formData.aceitaAtendimento30Reais),
          horasAtendimento30Reais: formData.aceitaAtendimento30Reais ? `${h30Num} horas/mês` : "0 horas/mês",
          aceitaAtendimentoGratuito: Boolean(formData.aceitaAtendimentoGratuito),
          horasAtendimentoGratuito: formData.aceitaAtendimentoGratuito ? `${hGratuitoNum} horas/mês` : "0 horas/mês",
          horasDisponiveis: `${totalHorasCalculado} horas/mês`,
          termoValoresAceito: true,
          termoValoresTexto,
          termoDuracaoAceito: true,
          termoDuracaoTexto,
          duracaoMinimaSessaoMinutos: 45,
          planoEscolhidoId: exibirPlanosProfissionais ? planoSelecionado.id : "isencao_3_meses",
          planoEscolhidoNome: exibirPlanosProfissionais ? planoSelecionado.nome : "Incentivo ao Engajamento (3 Meses de Isenção)",
          planoEscolhidoValor: exibirPlanosProfissionais ? planoSelecionado.valorMensal : "0,00",
          taxaAssociativaMensal: exibirPlanosProfissionais ? planoSelecionado.valorMensal : "0,00",
          beneficioIsencao3Meses: !exibirPlanosProfissionais,
          cienciaTaxaAceita: true,
          statusPagamento: 'pendente',
          status: 'Aguardando Entrevista',
          notificacao: 'Novo cadastro de profissional associado/candidato (Psicólogo/Psicanalista/Terapeuta).',
          createdAt: serverTimestamp()
        });

        setRegisteredLeadId(docRef.id);

        try {
          await sendProfessionalLeadEmail(formData.nome, formData.email);
        } catch (emailErr) {
          console.error("Failed to send professional confirmation email:", emailErr);
        }

        // Webhook dispatch
        try {
          await sendWebhookNotification({
            event: 'novo_profissional',
            recipientEmail: formData.email,
            recipientName: formData.nome,
            title: 'Novo Profissional Cadastrado - AcolheMente',
            message: `Dr(a). ${formData.nome} realizou o cadastro de profissional associado.`,
            data: {
              leadId: docRef.id,
              nome: formData.nome,
              email: formData.email,
              telefone: formData.telefone,
              crp: formData.crp,
              especialidade: formData.especialidade,
              taxaAssociativaMensal,
              aceitaAtendimentoGratuito: Boolean(formData.aceitaAtendimentoGratuito),
              horasAtendimentoGratuito: formData.aceitaAtendimentoGratuito ? formData.horasAtendimentoGratuito : "",
              aceitaAtendimento30Reais: Boolean(formData.aceitaAtendimento30Reais),
              duracaoMinimaSessaoMinutos: 45,
              termoDuracaoAceito: true,
            }
          });
        } catch (webhookErr) {
          console.error("Webhook notification error:", webhookErr);
        }

        setIsSuccess(true);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, "profissionais_leads");
        setErrorMsg("Ocorreu um erro ao processar o cadastro.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-warm overflow-y-auto">
      {/* Header */}
      <nav className="h-16 sm:h-20 bg-white/70 backdrop-blur-md border-b border-soft px-3.5 sm:px-6 md:px-12 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button 
            onClick={() => {
              window.scrollTo({ top: 0, left: 0, behavior: "instant" });
              onNavigate('landing');
            }} 
            className="text-forest/60 hover:text-forest transition-colors p-2 -ml-2 rounded-full hover:bg-forest/5 cursor-pointer shrink-0"
            aria-label="Voltar para a página inicial"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <BrandLogo 
            size="md"
            badge="Para Terapeutas"
            onClick={() => {
              window.scrollTo({ top: 0, left: 0, behavior: "instant" });
              onNavigate('landing');
            }}
          />
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center pb-16">
        <Breadcrumbs items={[{ label: "Início", onClick: () => onNavigate("landing") }, { label: "Para Psicólogos, Psicanalistas e Terapeutas", active: true }]} />
        {/* Presentation Section */}
        <section className="w-full px-6 md:px-12 py-12 md:py-16 flex justify-center bg-warm text-forest border-b border-soft">
          <div className="max-w-[1440px] w-full flex flex-col items-center justify-between gap-8">
            
            {/* Hero Container com Imagem da Profissional Fundida Atrás do Título */}
            <div className="w-full relative rounded-3xl overflow-hidden p-6 sm:p-10 md:p-12 border border-soft/80 bg-warm shadow-md shadow-forest/5 min-h-[440px] sm:min-h-[480px] flex items-center">
              {/* Imagem da profissional deslocada à direita e com foco facial nítido em telas pequenas e grandes */}
              <div className="absolute right-0 top-0 bottom-0 w-full sm:w-[68%] md:w-[56%] lg:w-[48%] pointer-events-none select-none overflow-hidden z-0">
                <img
                  src={psicologoHero}
                  alt="Profissional Psicóloga, Psicanalista e Terapeuta"
                  className="w-full h-full object-cover object-[53%_18%] sm:object-[53%_16%] opacity-35 sm:opacity-50 md:opacity-70 lg:opacity-85 mix-blend-multiply filter contrast-115 saturate-105"
                  referrerPolicy="no-referrer"
                />
                {/* Esmaecimento suave nas bordas para fundir harmonicamente e resguardar o texto à esquerda */}
                <div className="absolute inset-0 bg-gradient-to-r from-warm via-warm/70 sm:via-warm/40 md:via-warm/20 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-warm/90 via-transparent to-warm/30" />
                <div className="absolute inset-0 bg-gradient-to-b from-warm/60 via-transparent to-warm/60" />
              </div>

              {/* Conteúdo à esquerda com largura calibrada para nunca cobrir a profissional */}
              <div className="relative z-10 max-w-2xl lg:max-w-[56%] xl:max-w-[58%] flex flex-col gap-5 pr-0 sm:pr-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 bg-sun-light text-forest text-[10px] font-bold uppercase tracking-[0.2em] rounded">
                    Rede Humanizada
                  </span>
                  <span className="px-3 py-1 bg-white/90 border border-soft text-forest/75 text-[10px] font-semibold tracking-wider rounded backdrop-blur-xs">
                    Psicólogos · Psicanalistas · Terapeutas
                  </span>
                </div>

                <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl leading-[1.1] font-medium text-forest drop-shadow-xs">
                  Terapia não deve ser um privilégio.{" "}
                  <span className="italic font-normal block text-forest/85 text-2xl sm:text-3xl md:text-4xl mt-2">
                    Assim como o tempo do profissional não pode ser engolido por burocracias.
                  </span>
                </h1>

                <p className="text-base md:text-lg text-forest/85 leading-relaxed max-w-2xl">
                  O cuidado com a saúde mental é uma necessidade de todos e não um privilégio. Como uma ponte humanizada e tecnológica, conectamos profissionais a quem necessita: de um lado, pessoas que nunca se sentiriam capazes de investir num processo terapêutico; de outro, colaboradores de empresas parceiras com remuneração corporativa. Gestão e burocracias merecem atenção, mas não podem ser maiores do que aquilo que você faz de melhor: acolher e escutar.
                </p>

                {/* Linha de Ação & Destaques Perfeitamente Alinhados */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3.5 pt-2">
                  <a
                    href="#cadastro"
                    onClick={(e) => {
                      e.preventDefault();
                      const formEl = document.querySelector('form');
                      if (formEl) formEl.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-6 py-3.5 bg-forest hover:bg-forest/90 text-white font-bold text-sm rounded-xl shadow-md shadow-forest/15 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    <span>Quero Fazer Parte da Rede</span>
                    <CheckCircle2 className="w-4 h-4 text-sun" />
                  </a>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-forest/80 font-medium">
                    <span className="inline-flex items-center gap-1.5 bg-white/80 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-soft shadow-2xs">
                      <span className="text-emerald-700 font-bold">✓</span> Credenciamento 100% gratuito
                    </span>
                    <span className="inline-flex items-center gap-1.5 bg-white/80 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-soft shadow-2xs">
                      <span className="text-emerald-700 font-bold">✓</span> 3 meses de isenção inicial
                    </span>
                    <span className="inline-flex items-center gap-1.5 bg-amber-50/90 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-amber-300/80 font-bold text-amber-950 shadow-2xs">
                      <Coins className="w-3.5 h-3.5 text-amber-800" />
                      Mensalidades a partir de R$ 29,90
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Recursos Disponíveis para Psicólogos, Psicanalistas e Terapeutas */}
            <div className="w-full">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-forest/70 bg-white/80 px-3 py-1 rounded-full border border-soft">
                    Tecnologia & Gestão Clínica
                  </span>
                  <h3 className="font-serif text-2xl md:text-3xl font-bold text-forest mt-2">
                    Recursos Disponíveis na Plataforma
                  </h3>
                  <p className="text-sm text-forest/75 max-w-2xl mt-1">
                    Ferramentas práticas e intuitivas criadas sob medida para simplificar sua rotina e proteger seu tempo clínico.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Recurso 1: Assistente de Emissão de Recibo e NF */}
                <div className="bg-white/95 backdrop-blur-md p-6 rounded-3xl border border-soft hover:border-sun/60 shadow-md shadow-forest/5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between gap-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-900 group-hover:bg-sun group-hover:text-forest transition-colors duration-300 shadow-xs">
                        <Receipt className="w-6 h-6 text-amber-800 group-hover:text-forest" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-forest/60 bg-warm px-2.5 py-1 rounded-md border border-soft">
                        Fiscal & Ético
                      </span>
                    </div>
                    <h4 className="font-bold text-lg text-forest leading-snug">
                      Assistente de Emissão de Recibo e NF
                    </h4>
                    <p className="text-sm text-forest/80 leading-relaxed">
                      Emita recibos clínicos em PDF e conte com um assistente inteligente para emissão de notas fiscais (espelho com dados consolidados para copiar e colar no emissor da sua prefeitura), com cálculo automático e total conformidade ética.
                    </p>
                  </div>
                  <div className="pt-3 border-t border-soft/60 flex items-center gap-1.5 text-xs text-forest/70 font-semibold">
                    <Check className="w-3.5 h-3.5 text-sun-dark" />
                    <span>Recibo em PDF e espelho de NF com 1 clique</span>
                  </div>
                </div>

                {/* Recurso 2: Controle Financeiro Integrado */}
                <div className="bg-white/95 backdrop-blur-md p-6 rounded-3xl border border-soft hover:border-sun/60 shadow-md shadow-forest/5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between gap-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-900 group-hover:bg-emerald-200 transition-colors duration-300 shadow-xs">
                        <FileSpreadsheet className="w-6 h-6 text-emerald-800" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-forest/60 bg-warm px-2.5 py-1 rounded-md border border-soft">
                        Finanças em Dia
                      </span>
                    </div>
                    <h4 className="font-bold text-lg text-forest leading-snug">
                      Controle Financeiro Integrado
                    </h4>
                    <p className="text-sm text-forest/80 leading-relaxed">
                      Acompanhe seus honorários em tempo real: faturamento de consultas regulares, atendimentos corporativos e ações de acolhimento. Extratos por período, controle de recebimentos e relatórios organizados.
                    </p>
                  </div>
                  <div className="pt-3 border-t border-soft/60 flex items-center gap-1.5 text-xs text-forest/70 font-semibold">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Visão clara de caixa e previsão mensal</span>
                  </div>
                </div>

                {/* Recurso 3: Notificação Automática de Eventos */}
                <div className="bg-white/95 backdrop-blur-md p-6 rounded-3xl border border-soft hover:border-sun/60 shadow-md shadow-forest/5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between gap-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-900 group-hover:bg-blue-200 transition-colors duration-300 shadow-xs">
                        <BellRing className="w-6 h-6 text-blue-800" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-forest/60 bg-warm px-2.5 py-1 rounded-md border border-soft">
                        Automação
                      </span>
                    </div>
                    <h4 className="font-bold text-lg text-forest leading-snug">
                      Notificação Automática de Eventos
                    </h4>
                    <p className="text-sm text-forest/80 leading-relaxed">
                      Lembretes automáticos de sessão enviados diretamente aos pacientes, avisos gentis de cobrança e confirmações de horário por e-mail e mensageria, reduzindo faltas de última hora sem desgaste emocional.
                    </p>
                  </div>
                  <div className="pt-3 border-t border-soft/60 flex items-center gap-1.5 text-xs text-forest/70 font-semibold">
                    <Check className="w-3.5 h-3.5 text-blue-600" />
                    <span>Lembretes pré-sessão e confirmações</span>
                  </div>
                </div>

                {/* Recurso 4: Acolhimento & Triagem Qualificada */}
                <div className="bg-white/95 backdrop-blur-md p-6 rounded-3xl border border-soft hover:border-sun/60 shadow-md shadow-forest/5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between gap-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-900 group-hover:bg-rose-200 transition-colors duration-300 shadow-xs">
                        <HeartHandshake className="w-6 h-6 text-rose-800" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-forest/60 bg-warm px-2.5 py-1 rounded-md border border-soft">
                        Particular & Empresas
                      </span>
                    </div>
                    <h4 className="font-bold text-lg text-forest leading-snug">
                      Conexão Ética: Particular e Corporativo
                    </h4>
                    <p className="text-sm text-forest/80 leading-relaxed">
                      Respeitamos diferentes jornadas de cuidado: pacientes particulares contam com triagem especializada para alinhamento de perfil terapêutico, enquanto os colaboradores de empresas parceiras têm a autonomia de navegar pela rede e selecionar o profissional de sua preferência.
                    </p>
                  </div>
                  <div className="pt-3 border-t border-soft/60 flex items-center gap-1.5 text-xs text-forest/70 font-semibold">
                    <Check className="w-3.5 h-3.5 text-rose-600" />
                    <span>Triagem estruturada e catálogo de perfis ativos</span>
                  </div>
                </div>

                {/* Recurso 5: Autonomia & Liberdade de Agenda */}
                <div className="bg-white/95 backdrop-blur-md p-6 rounded-3xl border border-soft hover:border-sun/60 shadow-md shadow-forest/5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between gap-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-sun/20 flex items-center justify-center text-forest group-hover:bg-sun transition-colors duration-300 shadow-xs">
                        <Clock className="w-6 h-6 text-forest" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-forest/60 bg-warm px-2.5 py-1 rounded-md border border-soft">
                        Sua Rotina
                      </span>
                    </div>
                    <h4 className="font-bold text-lg text-forest leading-snug">
                      Liberdade e Autonomia de Agenda
                    </h4>
                    <p className="text-sm text-forest/80 leading-relaxed">
                      Você escolhe quantas horas por mês deseja disponibilizar e define seus próprios horários. Sua disponibilidade fortalece a rede de apoio no ritmo que se adapta à sua vida.
                    </p>
                  </div>
                  <div className="pt-3 border-t border-soft/60 flex items-center gap-1.5 text-xs text-forest/70 font-semibold">
                    <Check className="w-3.5 h-3.5 text-sun-dark" />
                    <span>Grade flexível e controle independente</span>
                  </div>
                </div>

                {/* Recurso 6: Comunidade, Supervisão & Artigos */}
                <div className="bg-white/95 backdrop-blur-md p-6 rounded-3xl border border-soft hover:border-sun/60 shadow-md shadow-forest/5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between gap-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-900 group-hover:bg-purple-200 transition-colors duration-300 shadow-xs">
                        <BookOpen className="w-6 h-6 text-purple-800" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-forest/60 bg-warm px-2.5 py-1 rounded-md border border-soft">
                        Intercâmbio
                      </span>
                    </div>
                    <h4 className="font-bold text-lg text-forest leading-snug">
                      Comunidade, Supervisão & Blog
                    </h4>
                    <p className="text-sm text-forest/80 leading-relaxed">
                      Conexão com outros profissionais da psicologia, psicanálise e terapias: supervisão clínica, workshops e publicação de artigos autorais no Blog oficial para consolidação de autoridade.
                    </p>
                  </div>
                  <div className="pt-3 border-t border-soft/60 flex items-center gap-1.5 text-xs text-forest/70 font-semibold">
                    <Check className="w-3.5 h-3.5 text-purple-600" />
                    <span>Autoridade e crescimento compartilhado</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Alternância: Planos (se habilitados na gestão) OU Oportunidade de Incentivo ao Engajamento (3 Meses de Isenção) */}
            {exibirPlanosProfissionais ? (
              /* Quadro Integrado de 3 Planos da Rede para Psicólogos, Psicanalistas e Terapeutas */
              <div className="w-full bg-gradient-to-br from-forest via-[#1a3828] to-[#102419] text-white p-6 sm:p-10 rounded-3xl border-2 border-sun-dark/40 shadow-xl relative overflow-hidden my-3">
                {/* Glow Auras */}
                <div className="absolute -right-12 -bottom-12 w-80 h-80 bg-sun/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -left-12 -top-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="relative z-10 flex flex-col gap-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/15 pb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="px-3 py-1 bg-sun text-forest text-[11px] font-black uppercase tracking-wider rounded-full shadow-sm">
                          ⭐ Planos de Adesão da Rede
                        </span>
                        <span className="px-3 py-1 bg-white/10 text-sun-light text-[11px] font-semibold rounded-full border border-white/20">
                          Cobrança Somente Após Aceite & Contrato
                        </span>
                      </div>
                      <h3 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
                        <Wallet className="w-7 h-7 text-sun shrink-0" />
                        Planos para Psicólogos, Psicanalistas e Terapeutas
                      </h3>
                      <p className="text-white/80 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
                        Valores transparentes configurados na gestão para manutenção técnica e triagem de casos. A pré-inscrição é 100% gratuita.
                      </p>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/15 text-left sm:text-right shrink-0">
                      <span className="text-[10px] uppercase tracking-wider text-sun font-bold block">Inscrição Gratuita</span>
                      <span className="text-xs text-white/90">Nenhuma taxa de cadastro</span>
                    </div>
                  </div>

                  {/* Grid dos 3 Planos Oficiais */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {planosAtivos.map((plano, pIdx) => {
                      return (
                        <div
                          key={plano.id || pIdx}
                          className={`rounded-2xl p-5 sm:p-6 flex flex-col justify-between transition-all duration-300 relative border ${
                            plano.destaque
                              ? "bg-white/15 border-sun shadow-2xl ring-2 ring-sun/40 backdrop-blur-md md:-translate-y-1"
                              : "bg-white/10 border-white/20 hover:bg-white/15 backdrop-blur-sm"
                          }`}
                        >
                          {plano.destaque && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-sun text-forest text-[10px] font-extrabold px-3 py-0.5 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                              <Star className="w-3 h-3 fill-forest" />
                              Mais Escolhido
                            </div>
                          )}

                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-bold text-sun-light uppercase tracking-wider">
                                {plano.subtitulo || `Plano ${pIdx + 1}`}
                              </span>
                            </div>

                            <h4 className="font-serif text-xl font-bold text-white mt-1.5">
                              {plano.nome}
                            </h4>

                            <div className="flex items-baseline gap-1 my-3">
                              <span className="text-sm font-bold text-sun">R$</span>
                              <span className="text-3xl sm:text-4xl font-extrabold text-white font-serif">{plano.valorMensal}</span>
                              <span className="text-xs text-white/70">/mês</span>
                            </div>

                            <p className="text-xs text-white/85 leading-relaxed min-h-[36px]">
                              {plano.descricao}
                            </p>

                            <div className="mt-4 pt-3 border-t border-white/15 space-y-2">
                              {(plano.recursos || []).slice(0, 5).map((rec, rIdx) => (
                                <div key={rIdx} className="flex items-start gap-2 text-xs text-white/90">
                                  <Check className="w-3.5 h-3.5 text-sun shrink-0 mt-0.5" />
                                  <span className="leading-tight">{rec}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="mt-6 pt-3 border-t border-white/15">
                            <span className="text-[11px] text-sun-light/90 block text-center font-medium">
                              ✓ Cobrado apenas após aceite e contrato
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Faixa de Garantias e Regra Transparente */}
                  <div className="mt-2 pt-4 border-t border-white/15 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-white/90">
                    <div className="flex items-start gap-2.5 bg-white/5 p-3 rounded-xl border border-white/10">
                      <Check className="w-4 h-4 text-sun shrink-0 mt-0.5" />
                      <span>Inscrição 100% gratuita e sem fidelidade inicial</span>
                    </div>
                    <div className="flex items-start gap-2.5 bg-white/5 p-3 rounded-xl border border-white/10">
                      <Check className="w-4 h-4 text-sun shrink-0 mt-0.5" />
                      <span>Página profissional individual no catálogo público</span>
                    </div>
                    <div className="flex items-start gap-2.5 bg-white/5 p-3 rounded-xl border border-white/10">
                      <Check className="w-4 h-4 text-sun shrink-0 mt-0.5" />
                      <span>Triagem ativa e encaminhamento seguro de casos</span>
                    </div>
                    <div className="flex items-start gap-2.5 bg-white/5 p-3 rounded-xl border border-white/10">
                      <Check className="w-4 h-4 text-sun shrink-0 mt-0.5" />
                      <span>Cobrança somente após entrevista e contrato formal</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Bloco de Incentivo ao Engajamento com 3 Meses de Isenção Total */
              <div className="w-full bg-gradient-to-br from-forest via-[#1c3829] to-[#0f2419] text-white p-6 sm:p-10 rounded-3xl border-2 border-sun-dark/40 shadow-xl relative overflow-hidden my-3">
                {/* Glow Auras */}
                <div className="absolute -right-12 -bottom-12 w-80 h-80 bg-sun/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -left-12 -top-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="relative z-10 flex flex-col gap-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/15 pb-5">
                    <div>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="px-3 py-1 bg-sun text-forest text-[11px] font-black uppercase tracking-wider rounded-full shadow-sm flex items-center gap-1.5">
                          <Gift className="w-3.5 h-3.5 fill-forest" />
                          Incentivo ao Engajamento Clínico & Social
                        </span>
                        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-[11px] font-bold rounded-full border border-emerald-400/30">
                          Inscrição 100% Gratuita
                        </span>
                      </div>
                      <h3 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
                        <Sparkles className="w-7 h-7 text-sun shrink-0" />
                        3 Meses de Isenção Total a partir do seu Cadastro
                      </h3>
                      <p className="text-white/80 text-xs sm:text-sm mt-1.5 max-w-2xl leading-relaxed">
                        Como forma de incentivar sua chegada e colaboração na rede, oferecemos <strong>isenção integral de qualquer taxa ou mensalidade durante os primeiros 90 dias</strong> após a aprovação do seu credenciamento.
                      </p>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md px-5 py-3.5 rounded-2xl border border-white/15 text-left sm:text-right shrink-0">
                      <span className="text-[10px] uppercase tracking-wider text-sun font-extrabold block">Período de Carência</span>
                      <span className="text-2xl font-black text-white font-serif">90 Dias</span>
                      <span className="text-[10px] text-white/70 block">Custo Zero de Plataforma</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white/10 backdrop-blur-sm p-5 rounded-2xl border border-white/15 flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-sun font-bold text-xs uppercase tracking-wider">
                        <CheckCircle2 className="w-4 h-4 text-sun" />
                        <span>Sem Taxa de Adesão</span>
                      </div>
                      <h4 className="font-bold text-white text-base">Inscrição e Validação Grátis</h4>
                      <p className="text-xs text-white/80 leading-relaxed">
                        Envie seus dados, formação e CRP sem qualquer custo ou compromisso financeiro antecipado.
                      </p>
                    </div>

                    <div className="bg-white/10 backdrop-blur-sm p-5 rounded-2xl border border-white/15 flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-sun font-bold text-xs uppercase tracking-wider">
                        <CheckCircle2 className="w-4 h-4 text-sun" />
                        <span>Todos os Recursos Inclusos</span>
                      </div>
                      <h4 className="font-bold text-white text-base">Tecnologia Completa</h4>
                      <p className="text-xs text-white/80 leading-relaxed">
                        Utilize o assistente de emissão de recibos e NF, controle de honorários, notificações automáticas e prontuário sem restrições.
                      </p>
                    </div>

                    <div className="bg-white/10 backdrop-blur-sm p-5 rounded-2xl border border-white/15 flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-sun font-bold text-xs uppercase tracking-wider">
                        <CheckCircle2 className="w-4 h-4 text-sun" />
                        <span>Transparência Absoluta</span>
                      </div>
                      <h4 className="font-bold text-white text-base">Sem Fidelidade ou Letras Miúdas</h4>
                      <p className="text-xs text-white/80 leading-relaxed">
                        Apenas após os 3 meses e com novos recursos consolidados é que os planos da rede passam a vigorar. Oferecemos opções acessíveis com <strong>mensalidades a partir de R$ 29,90</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Alinhamento de Textos e Botão no Quadro de Incentivo */}
                  <div className="mt-2 pt-5 border-t border-white/15 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-white/90">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-sun shrink-0" />
                        <span>3 meses de isenção integral a partir da aprovação</span>
                      </div>
                      <div className="hidden sm:block text-white/30">•</div>
                      <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-lg border border-white/15 text-sun-light font-bold">
                        <Coins className="w-4 h-4 text-sun shrink-0" />
                        <span>Mensalidades a partir de R$ 29,90</span>
                      </div>
                    </div>

                    <a
                      href="#cadastro"
                      onClick={(e) => {
                        e.preventDefault();
                        const formEl = document.querySelector('form');
                        if (formEl) formEl.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="px-6 py-3 bg-sun hover:bg-sun-dark text-forest font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto shrink-0"
                    >
                      <span>Aproveitar Isenção de 3 Meses</span>
                      <ArrowRight className="w-4 h-4 text-forest" />
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Form Section with Glassmorphism and Glow */}
        <section className="w-full px-6 md:px-12 py-16 flex justify-center relative -mt-10">
          <div className="max-w-2xl w-full bg-white/95 backdrop-blur-md rounded-[36px] shadow-2xl shadow-forest/10 p-8 md:p-12 border border-white/80 relative overflow-hidden">
            {/* Subtle internal glow accent */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-sun/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
            {isSuccess ? (
              <div className="flex flex-col items-center text-center py-6 animate-in zoom-in-95 duration-500">
                <div className="w-20 h-20 bg-sun-light rounded-full flex items-center justify-center mb-4 border border-sun-dark/30 shadow-xs">
                  <CheckCircle2 className="w-10 h-10 text-forest" />
                </div>
                <h2 className="font-serif text-3xl font-bold text-forest mb-2">Pré-Inscrição Concluída!</h2>
                <p className="text-forest/80 max-w-lg mx-auto mb-4 text-sm leading-relaxed">
                  Muito obrigado pela iniciativa em fazer parte da nossa rede de apoio! Recebemos suas informações com sucesso.
                </p>

                {/* Highlight: Contato em até 24h para envio de login e acesso */}
                <div className="w-full max-w-lg bg-emerald-50/90 border border-emerald-300 p-4 rounded-2xl mb-4 text-left flex items-start gap-3.5 shadow-xs">
                  <div className="w-10 h-10 rounded-xl bg-forest text-sun flex items-center justify-center shrink-0 mt-0.5">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-forest flex items-center gap-1.5">
                      <span>Envio de Acesso e Login</span>
                      <span className="bg-sun/40 text-forest text-[10px] px-2 py-0.5 rounded-full font-bold">Em até 24h</span>
                    </h4>
                    <p className="text-xs text-forest/90 leading-relaxed mt-0.5">
                      Nossa equipe entrará em contato via <strong>e-mail ou WhatsApp em até 24 horas</strong> para envio do seu <strong>acesso e credenciais de login</strong> na plataforma, bem como para o alinhamento das próximas etapas.
                    </p>
                  </div>
                </div>

                {/* Clear Process / Fee Policy Banner */}
                <div className="w-full max-w-lg bg-warm/50 p-4 rounded-2xl border border-soft mb-6 text-left flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-forest font-bold text-xs uppercase tracking-wider">
                    <Clock className="w-4 h-4 text-forest/70 shrink-0" />
                    <span>Próximas Etapas do Processo</span>
                  </div>
                  <ol className="text-xs text-forest/90 space-y-1.5 list-decimal pl-4 leading-relaxed">
                    <li><strong>Contato e Envio de Acesso:</strong> Em até 24h via e-mail/WhatsApp.</li>
                    <li><strong>Análise de Perfil:</strong> Validação dos dados profissionais e CRP pela equipe de gestão.</li>
                    <li><strong>Entrevista de Alinhamento:</strong> Reunião online com nossos coordenadores.</li>
                    <li><strong>Aceite & Assinatura de Contrato:</strong> Formalização e liberação para atendimentos.</li>
                  </ol>
                  <p className="text-[11px] text-forest/80 italic border-t border-soft pt-2 mt-1">
                    {exibirPlanosProfissionais ? (
                      <>💡 <strong>Lembrete:</strong> Nenhuma cobrança é efetuada neste momento. A mensalidade do plano selecionado ({planoSelecionado.nome} - R$ {planoSelecionado.valorMensal}/mês) só é devida após a aprovação e assinatura formal do contrato.</>
                    ) : (
                      <>💡 <strong>Lembrete:</strong> Nenhuma cobrança é efetuada agora. Seu credenciamento é gratuito e você conta com <strong>3 meses de isenção total</strong> de qualquer taxa ou mensalidade a partir do cadastro.</>
                    )}
                  </p>
                </div>

                {/* Stripe Checkout Call to Action for already-approved members (apenas se planos habilitados) */}
                {exibirPlanosProfissionais && stripeConfig?.stripeEnabled && (
                  <div className="w-full max-w-lg bg-warm/60 p-5 rounded-2xl border border-soft mb-6 flex flex-col gap-3 text-left">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-forest" />
                        <span className="font-bold text-sm text-forest">Já passou pela entrevista e assinou o contrato?</span>
                      </div>
                      <span className="px-2 py-0.5 bg-sun-light text-forest text-[10px] font-bold rounded uppercase">
                        Adesão
                      </span>
                    </div>
                    <p className="text-xs text-forest/80 leading-relaxed">
                      Se você já foi aprovado na entrevista e concluiu o contrato, ative a mensalidade do plano {planoSelecionado.nome} (R$ {planoSelecionado.valorMensal}/mês) com total segurança via Pix ou Cartão de Crédito.
                    </p>
                    <button
                      onClick={() => setShowCheckoutModal(true)}
                      className="w-full py-3.5 px-6 bg-forest text-white rounded-xl font-bold hover:bg-forest/90 transition-all shadow-md flex items-center justify-center gap-2 text-sm mt-1"
                    >
                      <Sparkles className="w-4 h-4 text-sun" />
                      Efetuar Pagamento da Mensalidade ({planoSelecionado.nome} - R$ {planoSelecionado.valorMensal}/mês)
                    </button>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-lg">
                  <button 
                    onClick={() => {
                      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
                      onNavigate('landing');
                    }}
                    className="flex-1 py-3 px-6 border border-soft text-forest rounded-full font-semibold hover:bg-forest/5 transition-all text-sm cursor-pointer"
                  >
                    Voltar ao Início
                  </button>
                  <button 
                    onClick={() => {
                      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
                      onNavigate('dashboard');
                    }}
                    className="flex-1 py-3 px-6 bg-warm text-forest border border-soft rounded-full font-semibold hover:bg-warm/80 transition-all text-sm cursor-pointer"
                  >
                    Acessar Meu Painel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <h2 className="font-serif text-3xl font-medium text-forest mb-2">
                    {step === 1 && "Dados Pessoais"}
                    {step === 2 && "Sua Formação"}
                    {step === 3 && "Serviços oferecidos e Experiência clínica"}
                    {step === 4 && "Seu Propósito"}
                  </h2>
                  <p className="text-forest/80 text-sm">
                    {step === 1 && "Preencha suas informações de identificação e contato."}
                    {step === 2 && "Conte-nos um pouco sobre sua formação e disponibilidade."}
                    {step === 3 && "Selecione os serviços profissionais oferecidos e informe sua experiência com atendimento clínico."}
                    {step === 4 && "Diga-nos como nos conheceu e o que te motiva a fazer parte do AcolheMente."}
                  </p>
                  
                  <div className="flex gap-2 mt-6">
                    {Array.from({ length: 4 }).map((_, idx) => (
                      <div key={idx} className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${idx < step ? 'bg-sun-dark' : 'bg-soft'}`} />
                    ))}
                  </div>
                </div>

                {errorMsg && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm text-center">
                    {errorMsg}
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
                
                  {step === 1 && (
                    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold uppercase tracking-wider text-forest/70 ml-2">Nome Completo *</label>
                          <input 
                            required 
                            name="nome"
                            value={formData.nome}
                            onChange={handleChange}
                            className="px-5 py-4 bg-warm/50 border border-soft rounded-2xl focus:outline-none focus:border-sun-dark focus:bg-white transition-all text-sm text-forest" 
                            placeholder="Ex: Maria da Silva" 
                          />
                        </div>
                        
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold uppercase tracking-wider text-forest/70 ml-2">CPF *</label>
                          <input 
                            required
                            name="cpf"
                            value={formData.cpf}
                            onChange={handleChange}
                            className="px-5 py-4 bg-warm/50 border border-soft rounded-2xl focus:outline-none focus:border-sun-dark focus:bg-white transition-all text-sm text-forest" 
                            placeholder="000.000.000-00" 
                          />
                        </div>
                      </div>

                      {formData.nome.trim().length >= 3 && formData.cpf.trim().length >= 3 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500">
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold uppercase tracking-wider text-forest/70 ml-2">E-mail *</label>
                            <input 
                              required 
                              type="email"
                              name="email"
                              value={formData.email}
                              onChange={handleChange}
                              className="px-5 py-4 bg-warm/50 border border-soft rounded-2xl focus:outline-none focus:border-sun-dark focus:bg-white transition-all text-sm text-forest" 
                              placeholder="maria@exemplo.com"
                            />
                          </div>
                          
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold uppercase tracking-wider text-forest/70 ml-2">Telefone / WhatsApp *</label>
                            <input 
                              required 
                              type="tel"
                              name="telefone"
                              value={formData.telefone}
                              onChange={handleChange}
                              className="px-5 py-4 bg-warm/50 border border-soft rounded-2xl focus:outline-none focus:border-sun-dark focus:bg-white transition-all text-sm text-forest" 
                              placeholder="(00) 00000-0000"
                            />
                          </div>
                        </div>
                      )}

                      {formData.nome.trim().length >= 3 && formData.cpf.trim().length >= 3 && formData.email.includes('@') && formData.telefone.trim().length >= 4 && (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500 border-t border-soft pt-6">
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold uppercase tracking-wider text-forest/70 ml-2">Cidade *</label>
                            <input 
                              required 
                              name="cidade"
                              value={formData.cidade}
                              onChange={handleChange}
                              className="px-5 py-4 bg-warm/50 border border-soft rounded-2xl focus:outline-none focus:border-sun-dark focus:bg-white transition-all text-sm text-forest" 
                              placeholder="Ex: São Paulo"
                            />
                          </div>
                          
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold uppercase tracking-wider text-forest/70 ml-2">Estado / UF *</label>
                            <select 
                              required 
                              name="uf"
                              value={formData.uf}
                              onChange={handleChange}
                              className="px-5 py-4 bg-warm/50 border border-soft rounded-2xl focus:outline-none focus:border-sun-dark focus:bg-white transition-all text-sm text-forest appearance-none" 
                            >
                              <option value="">Selecione...</option>
                              <option value="AC">Acre</option>
                              <option value="AL">Alagoas</option>
                              <option value="AP">Amapá</option>
                              <option value="AM">Amazonas</option>
                              <option value="BA">Bahia</option>
                              <option value="CE">Ceará</option>
                              <option value="DF">Distrito Federal</option>
                              <option value="ES">Espírito Santo</option>
                              <option value="GO">Goiás</option>
                              <option value="MA">Maranhão</option>
                              <option value="MT">Mato Grosso</option>
                              <option value="MS">Mato Grosso do Sul</option>
                              <option value="MG">Minas Gerais</option>
                              <option value="PA">Pará</option>
                              <option value="PB">Paraíba</option>
                              <option value="PR">Paraná</option>
                              <option value="PE">Pernambuco</option>
                              <option value="PI">Piauí</option>
                              <option value="RJ">Rio de Janeiro</option>
                              <option value="RN">Rio Grande do Norte</option>
                              <option value="RS">Rio Grande do Sul</option>
                              <option value="RO">Rondônia</option>
                              <option value="RR">Roraima</option>
                              <option value="SC">Santa Catarina</option>
                              <option value="SP">São Paulo</option>
                              <option value="SE">Sergipe</option>
                              <option value="TO">Tocantins</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500 border-t border-soft pt-6 mt-2">
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold uppercase tracking-wider text-forest/70 ml-2">Gênero *</label>
                            <select 
                              required 
                              name="genero"
                              value={formData.genero}
                              onChange={handleChange}
                              className="px-5 py-4 bg-warm/50 border border-soft rounded-2xl focus:outline-none focus:border-sun-dark focus:bg-white transition-all text-sm text-forest appearance-none"
                            >
                              <option value="">Selecione...</option>
                              <option value="Feminino">Feminino</option>
                              <option value="Masculino">Masculino</option>
                              <option value="Não-binário">Não-binário</option>
                              <option value="Prefiro não informar">Prefiro não informar</option>
                              <option value="Outro">Outro</option>
                            </select>
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold uppercase tracking-wider text-forest/70 ml-2">Deficiência ou Necessidade Especial *</label>
                            <select 
                              required 
                              name="deficiencia"
                              value={formData.deficiencia}
                              onChange={handleChange}
                              className="px-5 py-4 bg-warm/50 border border-soft rounded-2xl focus:outline-none focus:border-sun-dark focus:bg-white transition-all text-sm text-forest appearance-none"
                            >
                              <option value="">Selecione...</option>
                              <option value="Não possuo">Não possuo</option>
                              <option value="Deficiência física">Deficiência física (motora)</option>
                              <option value="Deficiência visual">Deficiência visual</option>
                              <option value="Deficiência auditiva">Deficiência auditiva</option>
                              <option value="Deficiência intelectual/cognitiva">Deficiência intelectual/cognitiva</option>
                              <option value="Transtorno do Espectro Autista (TEA)">Transtorno do Espectro Autista (TEA)</option>
                              <option value="Múltiplas deficiências">Múltiplas deficiências</option>
                              <option value="Outra necessidade especial">Outra necessidade especial</option>
                              <option value="Prefiro não responder">Prefiro não responder</option>
                            </select>
                          </div>
                        </div>
                      </>
                    )}
                    </div>
                  )}

                  {step === 2 && (
                    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-forest/70 ml-2">Profissão / Atuação Principal *</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <select 
                            name="profissao"
                            value={
                              ["Psicólogo(a)", "Psicólogo(a) Clínico(a)", "Psicanalista", "Terapeuta", "Terapeuta Holístico(a)", "Psicopedagogo(a)"].includes(formData.profissao)
                                ? formData.profissao
                                : "Outro"
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val !== "Outro") {
                                setFormData(prev => ({ ...prev, profissao: val }));
                              }
                            }}
                            className="px-5 py-4 bg-warm/50 border border-soft rounded-2xl focus:outline-none focus:border-sun-dark focus:bg-white transition-all text-sm text-forest"
                          >
                            <option value="Psicólogo(a)">Psicólogo(a)</option>
                            <option value="Psicólogo(a) Clínico(a)">Psicólogo(a) Clínico(a)</option>
                            <option value="Psicanalista">Psicanalista</option>
                            <option value="Terapeuta">Terapeuta</option>
                            <option value="Terapeuta Holístico(a)">Terapeuta Holístico(a)</option>
                            <option value="Psicopedagogo(a)">Psicopedagogo(a)</option>
                            <option value="Outro">Outra Profissão / Título</option>
                          </select>
                          <input 
                            name="profissao"
                            value={formData.profissao}
                            onChange={handleChange}
                            className="px-5 py-4 bg-warm/50 border border-soft rounded-2xl focus:outline-none focus:border-sun-dark focus:bg-white transition-all text-sm text-forest" 
                            placeholder="Sua profissão (ex: Terapeuta, Psicanalista...)" 
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold uppercase tracking-wider text-forest/70 ml-2">Abordagens Psicológicas de Atendimento *</label>
                          <input 
                            required 
                            name="abordagem"
                            value={formData.abordagem}
                            onChange={handleChange}
                            className="px-5 py-4 bg-warm/50 border border-soft rounded-2xl focus:outline-none focus:border-sun-dark focus:bg-white transition-all text-sm text-forest" 
                            placeholder="Ex: TCC, Psicanálise, Humanista..." 
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold uppercase tracking-wider text-forest/70 ml-2">Ano de formação / graduação *</label>
                          <input 
                            required
                            type="number"
                            name="anoFormacao"
                            value={formData.anoFormacao}
                            onChange={handleChange}
                            className="px-5 py-4 bg-warm/50 border border-soft rounded-2xl focus:outline-none focus:border-sun-dark focus:bg-white transition-all text-sm text-forest" 
                            placeholder="Ex: 2015" 
                          />
                        </div>
                      </div>

                      {formData.abordagem.trim().length >= 2 && formData.anoFormacao.trim().length >= 4 && (
                        <div className="flex flex-col gap-6 animate-in fade-in duration-500 border-t border-soft pt-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-bold uppercase tracking-wider text-forest/70 ml-2">CRP / Registro (Se houver)</label>
                              <input 
                                name="crp"
                                value={formData.crp}
                                onChange={handleChange}
                                className="px-5 py-4 bg-warm/50 border border-soft rounded-2xl focus:outline-none focus:border-sun-dark focus:bg-white transition-all text-sm text-forest" 
                                placeholder="00/00000" 
                              />
                            </div>

                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-bold uppercase tracking-wider text-forest/70 ml-2">Especialidade / Pós-graduação</label>
                              <input 
                                name="especialidade"
                                value={formData.especialidade}
                                onChange={handleChange}
                                className="px-5 py-4 bg-warm/50 border border-soft rounded-2xl focus:outline-none focus:border-sun-dark focus:bg-white transition-all text-sm text-forest" 
                                placeholder="Ex: Especialidade em saúde mental..." 
                              />
                            </div>
                          </div>

                          {/* Cota Base Regular */}
                          <div className="flex flex-col gap-1.5 bg-white p-5 rounded-2xl border border-soft shadow-2xs">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                              <label className="text-xs font-bold uppercase tracking-wider text-forest flex items-center gap-1.5">
                                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                                Cota Base Regular (≥ R$ 50,00 por sessão) *
                              </label>
                              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200 w-fit">
                                Mínimo de 8h/mês • Números Pares
                              </span>
                            </div>
                            <p className="text-xs text-forest/70 leading-relaxed">
                              Todo credenciado inicia com no mínimo 8h exclusivas para a grade regular da plataforma (a partir de R$ 50/sessão). Esta base é protegida e não pode ser convertida para gratuidades ou R$ 30.
                            </p>
                            <select 
                              required 
                              name="horasRegular"
                              value={formData.horasRegular || formData.horasDisponiveis || "8 horas/mês"}
                              onChange={(e) => {
                                const val = e.target.value;
                                setFormData(prev => ({
                                  ...prev,
                                  horasRegular: val,
                                  horasDisponiveis: val
                                }));
                              }}
                              className="mt-1 px-5 py-4 bg-warm/50 border border-soft rounded-2xl focus:outline-none focus:border-sun-dark focus:bg-white transition-all text-sm font-bold text-forest cursor-pointer" 
                            >
                              {OPCOES_HORAS_REGULARES.map((op) => (
                                <option key={op} value={op}>{op} {op === "8 horas/mês" ? "(Mínimo obrigatório)" : ""}</option>
                              ))}
                            </select>
                          </div>

                          {/* Pergunta: Condições Especiais de Atendimento & Horas Extras */}
                          <div className="bg-emerald-50/70 p-5 sm:p-6 rounded-2xl border border-emerald-200/90 flex flex-col gap-4 shadow-xs mt-2">
                            <div className="flex items-center gap-2 text-forest font-bold text-sm">
                              <HeartHandshake className="w-5 h-5 text-emerald-700 shrink-0" />
                              <span>Condições de Atendimento & Horas Extraordinárias / Pro Bono</span>
                            </div>
                            
                            {/* Caixa de Critérios Oficiais */}
                            <div className="bg-emerald-100/70 p-3.5 rounded-xl border border-emerald-300/70 text-xs text-emerald-950 leading-relaxed font-medium space-y-1.5">
                              <div className="font-bold flex items-center gap-1.5 text-emerald-900">
                                📌 <strong>Critérios Oficiais da Plataforma:</strong>
                              </div>
                              <ul className="list-disc pl-4 space-y-1 text-[11px] text-emerald-900/90 leading-relaxed">
                                <li><strong>Base regular mínima:</strong> 8h/mês remuneradas a partir de R$ 50/sessão (essas horas não podem ser revertidas para gratuito ou R$ 30).</li>
                                <li><strong>Horas Adicionais:</strong> Caso queira atender a R$ 30 ou Pro Bono, você adiciona horas extras à sua grade.</li>
                                <li><strong>Números Pares:</strong> Seleções sempre em números pares para adequação a frequências semanais (4h/mês) ou quinzenais (2h/mês).</li>
                              </ul>
                            </div>

                            <label className="text-xs font-bold uppercase tracking-wider text-forest/80 ml-1">
                              Disponibilidade adicional opcional:
                            </label>

                            <div className="space-y-3">
                              {/* Caixa 1: R$ 30 por sessão */}
                              <div className={`p-4 rounded-xl border transition-all ${formData.aceitaAtendimento30Reais ? 'bg-white border-amber-300 shadow-xs ring-2 ring-amber-500/10' : 'bg-white/70 border-soft'}`}>
                                <label className="flex items-start gap-3 cursor-pointer select-none">
                                  <input 
                                    type="checkbox"
                                    name="aceitaAtendimento30Reais"
                                    checked={formData.aceitaAtendimento30Reais}
                                    onChange={(e) => setFormData(prev => ({ 
                                      ...prev, 
                                      aceitaAtendimento30Reais: e.target.checked,
                                      horasAtendimento30Reais: e.target.checked ? (prev.horasAtendimento30Reais || "2 horas/mês") : "0 horas/mês"
                                    }))}
                                    className="mt-1 w-5 h-5 rounded border-amber-300 text-amber-700 accent-amber-600 cursor-pointer shrink-0"
                                  />
                                  <div className="flex-1">
                                    <span className="text-sm font-bold text-forest flex items-center gap-1.5">
                                      <Coins className="w-4 h-4 text-amber-600" />
                                      30 reais por sessão (Faixa Extraordinária)
                                    </span>
                                    <span className="text-xs text-forest/75 block mt-0.5 leading-relaxed">
                                      Horas extras adicionadas além da base regular para casos de alta vulnerabilidade encaminhados pontualmente pela triagem (mantida oculta do público geral).
                                    </span>
                                  </div>
                                </label>

                                {formData.aceitaAtendimento30Reais && (
                                  <div className="mt-3.5 pt-3 border-t border-amber-100 flex flex-col gap-1.5 pl-8 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <label className="text-xs font-bold text-forest/90">
                                      Quantas horas extras por mês gostaria de dispor para a faixa de R$ 30? *
                                    </label>
                                    <select
                                      name="horasAtendimento30Reais"
                                      value={formData.horasAtendimento30Reais}
                                      onChange={handleChange}
                                      className="w-full sm:max-w-md px-4 py-2.5 bg-amber-50/70 border border-amber-300 rounded-xl text-xs font-bold text-forest focus:outline-none focus:border-amber-600 cursor-pointer"
                                    >
                                      {OPCOES_HORAS_ADICIONAIS.map((op) => (
                                        <option key={`30-${op}`} value={op}>+{op}</option>
                                      ))}
                                    </select>
                                    <p className="text-[11px] text-amber-900 font-medium">
                                      Estas horas serão somadas à sua cota regular como capacidade extra de acolhimento.
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Caixa 2: Gratuitamente */}
                              <div className={`p-4 rounded-xl border transition-all ${formData.aceitaAtendimentoGratuito ? 'bg-white border-emerald-400 shadow-xs ring-2 ring-emerald-500/10' : 'bg-white/70 border-soft'}`}>
                                <label className="flex items-start gap-3 cursor-pointer select-none">
                                  <input 
                                    type="checkbox"
                                    name="aceitaAtendimentoGratuito"
                                    checked={formData.aceitaAtendimentoGratuito}
                                    onChange={(e) => setFormData(prev => ({ 
                                      ...prev, 
                                      aceitaAtendimentoGratuito: e.target.checked,
                                      horasAtendimentoGratuito: e.target.checked ? (prev.horasAtendimentoGratuito || "2 horas/mês") : "0 horas/mês"
                                    }))}
                                    className="mt-1 w-5 h-5 rounded border-emerald-300 text-emerald-700 accent-emerald-700 cursor-pointer shrink-0"
                                  />
                                  <div className="flex-1">
                                    <span className="text-sm font-bold text-forest flex items-center gap-1.5">
                                      <HeartHandshake className="w-4 h-4 text-emerald-700" />
                                      Gratuitamente (Voluntário / Pro Bono)
                                    </span>
                                    <span className="text-xs text-forest/75 block mt-0.5 leading-relaxed">
                                      Horas extras adicionadas além da base regular para acolhimento 100% gratuito de pessoas em extrema vulnerabilidade.
                                    </span>
                                  </div>
                                </label>

                                {formData.aceitaAtendimentoGratuito && (
                                  <div className="mt-3.5 pt-3 border-t border-emerald-100 flex flex-col gap-1.5 pl-8 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <label className="text-xs font-bold text-forest/90">
                                      Quantas horas extras por mês aceitaria atender gratuitamente? *
                                    </label>
                                    <select
                                      name="horasAtendimentoGratuito"
                                      value={formData.horasAtendimentoGratuito}
                                      onChange={handleChange}
                                      className="w-full sm:max-w-md px-4 py-2.5 bg-emerald-50/70 border border-emerald-300 rounded-xl text-xs font-bold text-forest focus:outline-none focus:border-emerald-600 cursor-pointer"
                                    >
                                      {OPCOES_HORAS_ADICIONAIS.map((op) => (
                                        <option key={`grat-${op}`} value={op}>+{op}</option>
                                      ))}
                                    </select>
                                    <p className="text-[11px] text-emerald-800 font-medium">
                                      Estas horas serão somadas à sua cota como acolhimento social/humanitário pro bono.
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Card de Consolidação da Cota */}
                            {(() => {
                              const regNum = parseInt((formData.horasRegular || formData.horasDisponiveis || "8").replace(/\D+/g, "") || "8", 10);
                              const h30Num = formData.aceitaAtendimento30Reais ? parseInt((formData.horasAtendimento30Reais || "2").replace(/\D+/g, "") || "2", 10) : 0;
                              const hGratNum = formData.aceitaAtendimentoGratuito ? parseInt((formData.horasAtendimentoGratuito || "2").replace(/\D+/g, "") || "2", 10) : 0;
                              const totalNum = regNum + h30Num + hGratNum;

                              return (
                                <div className="p-4 bg-white/90 rounded-2xl border border-emerald-200 flex flex-col gap-2 mt-2 shadow-2xs">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider text-forest/80">
                                      Cota Total Mensal Consolidada:
                                    </span>
                                    <span className="text-base font-extrabold text-emerald-900 bg-emerald-100 px-3 py-1 rounded-xl border border-emerald-300">
                                      {totalNum} horas/mês
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-forest/75 flex flex-wrap gap-x-3 gap-y-1 pt-1 border-t border-soft/50">
                                    <span>• Regular (≥ R$ 50): <strong>{regNum}h</strong></span>
                                    <span>• Extraordinário (R$ 30): <strong>{h30Num}h</strong></span>
                                    <span>• Gratuito (Pro Bono): <strong>{hGratNum}h</strong></span>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {step === 3 && (
                    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
                      
                      {/* Questão: Serviços profissionais que ofereço */}
                      <div className="flex flex-col gap-3 bg-warm/30 p-5 rounded-2xl border border-soft/80">
                        <label className="text-xs font-bold uppercase tracking-wider text-forest/70 ml-2 leading-relaxed">
                          Serviços profissionais que ofereço *
                        </label>
                        <p className="text-[11px] text-forest/60 -mt-1 ml-2 leading-relaxed">
                          Marque os serviços que você realiza e selecione "Disponibilizar para orçamento acessível" caso queira oferecer valores de atendimento acessível para o mesmo.
                        </p>
                        
                        <div className="flex flex-col gap-3 mt-2">
                          {OPCOES_SERVICOS.map(op => {
                            const isOferecido = (formData.servicosOferecidos || []).includes(op);
                            const isAcessivel = (formData.servicosOrcamentoAcessivel || []).includes(op);
                            
                            return (
                              <div key={`srv-chk-${op}`} className="bg-white p-4 rounded-xl border border-soft shadow-xs flex flex-col gap-2">
                                <label className="flex items-center gap-2.5 text-sm font-semibold text-forest cursor-pointer select-none">
                                  <input 
                                    type="checkbox" 
                                    checked={isOferecido}
                                    onChange={() => handleServiceCheckboxChange(op)}
                                    className="accent-forest rounded border-soft w-4.5 h-4.5 cursor-pointer" 
                                  />
                                  {op === "Outros" ? "Outros: Especifique" : op}
                                </label>
                                
                                {isOferecido && (
                                  <div className="pl-7 flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 duration-200 border-t border-soft/40 pt-2">
                                    {op === "Outros" && (
                                      <input 
                                        type="text"
                                        name="outrosServicos"
                                        placeholder="Especifique o outro serviço..."
                                        value={formData.outrosServicos || ''}
                                        onChange={handleChange}
                                        className="w-full px-3 py-1.5 bg-warm/30 border border-soft rounded-lg text-xs focus:outline-none focus:border-sun-dark text-forest"
                                      />
                                    )}
                                    <label className="flex items-center gap-2 text-xs text-forest/70 cursor-pointer select-none font-medium">
                                      <input 
                                        type="checkbox" 
                                        checked={isAcessivel}
                                        onChange={() => handleServiceAccessibleChange(op)}
                                        className="accent-emerald-600 rounded border-soft w-4 h-4 cursor-pointer" 
                                      />
                                      Disponibilizar para orçamento acessível
                                    </label>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex flex-col gap-3">
                        <label className="text-xs font-bold uppercase tracking-wider text-forest/70 ml-2 leading-relaxed">
                          Experiência de no mínimo um ano com atendimento clínico de:
                        </label>
                        <div className="flex flex-col gap-2 px-2">
                          {['Adulto', 'Idoso', 'Criança', 'Adolescente', 'Casal', 'Família', 'Não tenho experiência clínica/ menos de 1 ano de experiência', 'Outros'].map(op => (
                            <label key={`exp-${op}`} className="flex items-center gap-2 text-sm text-forest cursor-pointer w-fit">
                              <input 
                                type="checkbox" 
                                checked={formData.publicosExperiencia.includes(op)}
                                onChange={() => handleCheckboxChange('publicosExperiencia', op)}
                                className="accent-sun-dark w-4 h-4 cursor-pointer" 
                              />
                              {op}
                            </label>
                          ))}
                          {formData.publicosExperiencia.includes('Outros') && (
                            <input 
                              type="text"
                              name="outrosPublicosExperiencia"
                              placeholder="Especifique outros públicos"
                              value={formData.outrosPublicosExperiencia}
                              onChange={handleChange}
                              className="w-full mt-1 border-b border-soft bg-transparent focus:outline-none focus:border-sun-dark text-sm py-2 px-1"
                            />
                          )}
                        </div>
                      </div>

                      {formData.publicosExperiencia.length > 0 && (
                        <div className="flex flex-col gap-3 animate-in fade-in duration-500 border-t border-soft pt-6">
                          <label className="text-xs font-bold uppercase tracking-wider text-forest/70 ml-2 leading-relaxed">
                            Gosto de atender:
                          </label>
                          <div className="flex flex-col gap-2 px-2">
                            {['Adulto', 'Idoso', 'Criança', 'Adolescente', 'Casal', 'Família', 'Outros'].map(op => (
                              <label key={`gosto-${op}`} className="flex items-center gap-2 text-sm text-forest cursor-pointer w-fit">
                                <input 
                                  type="checkbox" 
                                  checked={formData.publicosGosto.includes(op)}
                                  onChange={() => handleCheckboxChange('publicosGosto', op)}
                                  className="accent-sun-dark w-4 h-4 cursor-pointer" 
                                />
                                {op}
                              </label>
                            ))}
                            {formData.publicosGosto.includes('Outros') && (
                              <input 
                                type="text"
                                name="outrosPublicosGosto"
                                placeholder="Especifique outros públicos"
                                value={formData.outrosPublicosGosto}
                                onChange={handleChange}
                                className="w-full mt-1 border-b border-soft bg-transparent focus:outline-none focus:border-sun-dark text-sm py-2 px-1"
                              />
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {step === 4 && (
                    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-forest/70 ml-2">Como conheceu nossa plataforma? *</label>
                        <select
                          required
                          name="comoConheceu"
                          value={formData.comoConheceu}
                          onChange={handleChange}
                          className="px-5 py-4 bg-warm/50 border border-soft rounded-2xl focus:outline-none focus:border-sun-dark focus:bg-white transition-all text-sm text-forest"
                        >
                          <option value="">Selecione uma opção...</option>
                          <option value="Redes Sociais (Instagram, LinkedIn, etc.)">Redes Sociais (Instagram, LinkedIn, etc.)</option>
                          <option value="Indicação de colega / amigo">Indicação de colega / amigo</option>
                          <option value="Google / Pesquisa na internet">Google / Pesquisa na internet</option>
                          <option value="Evento ou Palestra">Evento ou Palestra</option>
                          <option value="Outros">Outros</option>
                        </select>
                        {formData.comoConheceu === 'Outros' && (
                          <input
                            type="text"
                            name="outroComoConheceu"
                            placeholder="Especifique como conheceu..."
                            value={formData.outroComoConheceu}
                            onChange={handleChange}
                            className="mt-2 px-4 py-3 bg-warm/50 border border-soft rounded-xl text-xs text-forest focus:outline-none focus:border-sun-dark"
                          />
                        )}
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-forest/70 ml-2">Por que você quer fazer parte desse projeto? *</label>
                        <textarea 
                          required 
                          name="motivacao"
                          rows={3}
                          value={formData.motivacao}
                          onChange={handleChange}
                          className="px-5 py-4 bg-warm/50 border border-soft rounded-2xl focus:outline-none focus:border-sun-dark focus:bg-white transition-all text-sm text-forest resize-none" 
                          placeholder="Fale um pouco sobre as suas motivações..."
                        />
                      </div>

                      {formData.motivacao.trim().length >= 10 && (
                        <div className="flex flex-col gap-6 animate-in fade-in duration-500 border-t border-soft pt-6">
                          {/* Termo de Ciência sobre os Valores Praticados na Plataforma */}
                          <div className="bg-white p-5 sm:p-6 rounded-2xl border-2 border-forest/20 flex flex-col gap-3.5 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-soft pb-3">
                              <div className="flex items-center gap-2 text-forest font-bold text-sm">
                                <FileText className="w-5 h-5 text-forest shrink-0" />
                                <span>Termo de Ciência sobre Valores Praticados na Plataforma</span>
                              </div>
                              {formData.aceitaAtendimentoGratuito || formData.aceitaAtendimento30Reais ? (
                                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-extrabold rounded-full uppercase tracking-wider self-start sm:self-auto">
                                  Termo Especial com Variações
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 bg-slate-100 text-slate-800 border border-slate-300 text-[10px] font-extrabold rounded-full uppercase tracking-wider self-start sm:self-auto">
                                  Termo Padrão da Plataforma
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-forest/80 leading-relaxed font-medium">
                              O valor mínimo praticado na plataforma AcolheMente é de <strong>R$ 50,00 por sessão</strong>. Com base na sua declaração na etapa anterior
                              {formData.aceitaAtendimentoGratuito || formData.aceitaAtendimento30Reais 
                                ? " (incluindo as variações para atendimento gratuito e/ou na faixa extraordinária de R$ 30,00)" 
                                : " (grade regular de atendimentos a partir de R$ 50,00)"}, 
                              geramos o seu termo formal de ciência e compromisso:
                            </p>

                            {/* Visualizador do Termo Dinâmico */}
                            <div className="relative group">
                              <div className="bg-warm/40 border border-soft rounded-xl p-4 sm:p-5 max-h-56 overflow-y-auto font-mono text-[11px] leading-relaxed text-forest/90 whitespace-pre-wrap select-text shadow-inner">
                                {generateTermoValoresProfissional(
                                  formData.aceitaAtendimentoGratuito,
                                  formData.horasAtendimentoGratuito,
                                  formData.aceitaAtendimento30Reais,
                                  formData.nome,
                                  formData.horasRegular || formData.horasDisponiveis,
                                  formData.horasAtendimento30Reais
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const text = generateTermoValoresProfissional(
                                    formData.aceitaAtendimentoGratuito,
                                    formData.horasAtendimentoGratuito,
                                    formData.aceitaAtendimento30Reais,
                                    formData.nome,
                                    formData.horasRegular || formData.horasDisponiveis,
                                    formData.horasAtendimento30Reais
                                  );
                                  navigator.clipboard.writeText(text);
                                  setCopiedTermo(true);
                                  setTimeout(() => setCopiedTermo(false), 2500);
                                }}
                                className="absolute top-3 right-3 px-2.5 py-1 bg-white/95 hover:bg-white border border-soft text-forest text-[11px] font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                                title="Copiar termo para sua guarda"
                              >
                                {copiedTermo ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    <span className="text-emerald-700">Copiado</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5 text-forest/70" />
                                    <span>Copiar Termo</span>
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Checkbox de Ciência e Aceite Formal */}
                            <label className="flex items-start gap-3 cursor-pointer mt-1 group">
                              <input 
                                type="checkbox" 
                                required
                                checked={formData.termoValoresAceito}
                                onChange={(e) => setFormData(prev => ({ ...prev, termoValoresAceito: e.target.checked }))}
                                className="mt-1 w-5 h-5 rounded border-forest/40 text-forest focus:ring-forest/20 accent-forest cursor-pointer shrink-0"
                              />
                              <span className="text-xs font-semibold text-forest leading-relaxed">
                                Declaro estar ciente de que o <strong>valor mínimo praticado na plataforma é de R$ 50,00 por sessão</strong> e concordo integralmente com o <strong>Termo de Ciência e Compromisso</strong> gerado acima {formData.aceitaAtendimentoGratuito || formData.aceitaAtendimento30Reais ? "com as condições especiais declaradas" : ""}. *
                              </span>
                            </label>
                          </div>

                          {/* Termo de Compromisso: Duração Mínima das Sessões (Mínimo de 45 min) */}
                          <div className="bg-white p-5 sm:p-6 rounded-2xl border-2 border-forest/20 flex flex-col gap-3.5 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-soft pb-3">
                              <div className="flex items-center gap-2 text-forest font-bold text-sm">
                                <Clock className="w-5 h-5 text-forest shrink-0" />
                                <span>Termo de Compromisso: Duração Mínima das Sessões</span>
                              </div>
                              <span className="px-2.5 py-0.5 bg-blue-100 text-blue-900 border border-blue-300 text-[10px] font-extrabold rounded-full uppercase tracking-wider self-start sm:self-auto">
                                Mínimo de 45 min • Normas CFP/CRP
                              </span>
                            </div>

                            <p className="text-xs text-forest/80 leading-relaxed font-medium">
                              Em estrita consonância com os regulamentos, resoluções e recomendações dos conselhos regulamentadores da profissão, orientamos que o <strong>tempo mínimo de duração de cada sessão clínica individual é de 45 minutos</strong>:
                            </p>

                            {/* Visualizador do Termo Dinâmico de Duração Mínima */}
                            <div className="relative group">
                              <div className="bg-warm/40 border border-soft rounded-xl p-4 sm:p-5 max-h-52 overflow-y-auto font-mono text-[11px] leading-relaxed text-forest/90 whitespace-pre-wrap select-text shadow-inner">
                                {generateTermoDuracaoSessaoProfissional(formData.nome)}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const text = generateTermoDuracaoSessaoProfissional(formData.nome);
                                  navigator.clipboard.writeText(text);
                                  setCopiedTermoDuracao(true);
                                  setTimeout(() => setCopiedTermoDuracao(false), 2500);
                                }}
                                className="absolute top-3 right-3 px-2.5 py-1 bg-white/95 hover:bg-white border border-soft text-forest text-[11px] font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                                title="Copiar termo para sua guarda"
                              >
                                {copiedTermoDuracao ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    <span className="text-emerald-700">Copiado</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5 text-forest/70" />
                                    <span>Copiar Termo</span>
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Checkbox de Aceite Formal da Duração Mínima */}
                            <label className="flex items-start gap-3 cursor-pointer mt-1 group">
                              <input 
                                type="checkbox" 
                                required
                                checked={formData.termoDuracaoAceito}
                                onChange={(e) => setFormData(prev => ({ ...prev, termoDuracaoAceito: e.target.checked }))}
                                className="mt-1 w-5 h-5 rounded border-forest/40 text-forest focus:ring-forest/20 accent-forest cursor-pointer shrink-0"
                              />
                              <span className="text-xs font-semibold text-forest leading-relaxed">
                                Declaro estar ciente e comprometo-me a cumprir o <strong>tempo mínimo de duração de 45 minutos por sessão</strong>, respeitando integralmente os regulamentos, resoluções e recomendações dos conselhos regulamentadores da profissão. *
                              </span>
                            </label>
                          </div>

                          {/* Seleção Interativa de Planos OU Programa de 3 Meses de Isenção */}
                          {exibirPlanosProfissionais ? (
                            <div className="bg-gradient-to-br from-amber-50/90 to-warm/60 p-5 sm:p-6 rounded-2xl border-2 border-sun-dark/30 flex flex-col gap-4 shadow-sm">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-soft pb-3">
                                <div className="flex items-center gap-2 text-forest font-bold text-sm">
                                  <Wallet className="w-5 h-5 text-forest shrink-0" />
                                  <span>Selecione seu Plano de Adesão Inicial</span>
                                </div>
                                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-extrabold rounded-full uppercase tracking-wider self-start sm:self-auto">
                                  Inscrição 100% Gratuita
                                </span>
                              </div>

                              <p className="text-xs text-forest/80 leading-relaxed font-medium">
                                Escolha o plano da rede com o qual você mais se identifica. Você poderá ajustar ou migrar de plano posteriormente junto à coordenação:
                              </p>

                              {/* Seletor dos 3 Planos Editáveis */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {planosAtivos.map((plano) => {
                                  const isSelected = planoEscolhidoId === plano.id;
                                  return (
                                    <button
                                      key={plano.id}
                                      type="button"
                                      onClick={() => setPlanoEscolhidoId(plano.id)}
                                      className={`p-4 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all cursor-pointer relative ${
                                        isSelected
                                          ? "bg-white border-forest ring-2 ring-forest/30 shadow-md scale-[1.02]"
                                          : "bg-white/70 border-soft hover:bg-white hover:border-forest/30"
                                      }`}
                                    >
                                      {plano.destaque && (
                                        <span className="inline-flex items-center gap-1 text-[9px] bg-sun text-forest font-extrabold px-2 py-0.5 rounded-full absolute -top-2.5 right-3 shadow-2xs">
                                          <Star className="w-2.5 h-2.5 fill-forest" />
                                          Mais Escolhido
                                        </span>
                                      )}

                                      <div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-forest/60">
                                          {plano.subtitulo}
                                        </span>
                                        <h5 className="font-serif text-sm font-bold text-forest leading-tight mt-0.5">
                                          {plano.nome}
                                        </h5>
                                      </div>

                                      <div className="pt-2 border-t border-soft/50 flex items-baseline justify-between w-full">
                                        <div className="flex items-baseline gap-1">
                                          <span className="text-xs text-forest/60 font-semibold">R$</span>
                                          <span className="text-lg font-extrabold text-forest font-serif">{plano.valorMensal}</span>
                                          <span className="text-[10px] text-forest/50">/mês</span>
                                        </div>
                                      </div>

                                      {isSelected && (
                                        <div className="flex items-center gap-1 text-emerald-700 text-[10px] font-bold mt-1">
                                          <Check className="w-3.5 h-3.5" />
                                          <span>Plano Selecionado</span>
                                        </div>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Detalhes do Plano Escolhido */}
                              <div className="bg-white/95 p-4 rounded-xl border border-soft text-xs text-forest/90 space-y-2 shadow-2xs">
                                <div className="flex items-center justify-between border-b border-soft/60 pb-2 flex-wrap gap-2">
                                  <span className="font-bold text-forest text-xs flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-sun-dark" />
                                    Benefícios do {planoSelecionado.nome}:
                                  </span>
                                  <span className="text-forest font-extrabold text-xs">
                                    R$ {planoSelecionado.valorMensal}/mês
                                  </span>
                                </div>
                                <p className="text-forest/75 text-[11px] leading-relaxed">
                                  {planoSelecionado.descricao}
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                                  {(planoSelecionado.recursos || []).slice(0, 4).map((rec, rIdx) => (
                                    <div key={rIdx} className="flex items-start gap-1.5 text-[11px] text-forest/85">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                      <span>{rec}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Banner de Cobrança Transparente */}
                              <div className="bg-amber-100/70 p-3.5 rounded-xl border border-amber-300 text-xs text-amber-950 leading-relaxed font-medium">
                                📌 <strong>Regra de Cobrança 100% Transparente:</strong> O preenchimento desta pré-inscrição é <strong>100% gratuito</strong>. A taxa do plano ({planoSelecionado.nome} - R$ {planoSelecionado.valorMensal}/mês) <strong>NÃO</strong> é cobrada no envio deste formulário. A mensalidade <strong>só passará a ser devida após a realização da entrevista com a coordenação, o aceite formal de ambas as partes e a assinatura do contrato de credenciamento</strong>.
                              </div>

                              <label className="flex items-start gap-3 cursor-pointer mt-1 group">
                                <input 
                                  type="checkbox" 
                                  required
                                  checked={cienciaTaxa}
                                  onChange={(e) => setCienciaTaxa(e.target.checked)}
                                  className="mt-1 w-5 h-5 rounded border-amber-300 text-forest focus:ring-amber-500/20 accent-forest cursor-pointer shrink-0"
                                />
                                <span className="text-xs font-semibold text-forest leading-relaxed">
                                  Declaro estar ciente de que esta pré-inscrição é gratuita e que a mensalidade do plano selecionado ({planoSelecionado.nome} - R$ {planoSelecionado.valorMensal}/mês) só passará a ser cobrada após a realização da entrevista, aceite formal da gestão para ingresso no projeto e assinatura do contrato. *
                                </span>
                              </label>
                            </div>
                          ) : (
                            /* Card de Incentivo ao Engajamento: 3 Meses de Isenção */
                            <div className="bg-gradient-to-br from-emerald-50/90 to-warm/70 p-5 sm:p-6 rounded-2xl border-2 border-emerald-500/30 flex flex-col gap-4 shadow-sm">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-soft pb-3">
                                <div className="flex items-center gap-2 text-forest font-bold text-sm">
                                  <Gift className="w-5 h-5 text-emerald-700 shrink-0" />
                                  <span>Incentivo ao Engajamento: 3 Meses de Isenção Total</span>
                                </div>
                                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-extrabold rounded-full uppercase tracking-wider self-start sm:self-auto">
                                  Benefício de Boas-Vindas
                                </span>
                              </div>

                              <p className="text-xs text-forest/85 leading-relaxed font-medium">
                                Parabéns! Pela sua inscrição neste momento, você está contemplado com <strong>3 meses de isenção total (90 dias)</strong> de qualquer taxa de plataforma a partir do seu credenciamento:
                              </p>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                                <div className="bg-white/95 p-3 rounded-xl border border-emerald-200/80 text-forest shadow-2xs">
                                  <span className="font-bold block text-emerald-800">✓ R$ 0,00 nos 90 dias</span>
                                  <span className="text-[11px] text-forest/70">Acesso irrestrito a todos os recursos</span>
                                </div>
                                <div className="bg-white/95 p-3 rounded-xl border border-emerald-200/80 text-forest shadow-2xs">
                                  <span className="font-bold block text-emerald-800">✓ Assistente de Recibos & NF</span>
                                  <span className="text-[11px] text-forest/70">Controle financeiro integrado</span>
                                </div>
                                <div className="bg-white/95 p-3 rounded-xl border border-emerald-200/80 text-forest shadow-2xs">
                                  <span className="font-bold block text-emerald-800">✓ Notificações Automáticas</span>
                                  <span className="text-[11px] text-forest/70">Lembretes e avisos aos pacientes</span>
                                </div>
                              </div>

                              <div className="bg-emerald-100/70 p-3.5 rounded-xl border border-emerald-300 text-xs text-emerald-950 leading-relaxed font-medium">
                                🎁 <strong>Regra Clara de Boas-Vindas:</strong> O credenciamento é <strong>100% gratuito</strong>. Nenhuma cobrança é efetuada no envio deste formulário nem durante os seus primeiros 3 meses na plataforma. Após o período de isenção, você terá acesso a planos com <strong>mensalidades a partir de R$ 29,90</strong>, com total autonomia e sem qualquer fidelidade.
                              </div>

                              <label className="flex items-start gap-3 cursor-pointer mt-1 group">
                                <input 
                                  type="checkbox" 
                                  required
                                  checked={cienciaTaxa}
                                  onChange={(e) => setCienciaTaxa(e.target.checked)}
                                  className="mt-1 w-5 h-5 rounded border-emerald-400 text-forest focus:ring-emerald-500/20 accent-forest cursor-pointer shrink-0"
                                />
                                <span className="text-xs font-semibold text-forest leading-relaxed">
                                  Declaro estar ciente de que o <strong>credenciamento é 100% gratuito</strong> e que tenho direito a <strong>3 meses de isenção total</strong> de qualquer taxa a partir da data de aprovação do cadastro. *
                                </span>
                              </label>
                            </div>
                          )}

                          <label className="flex items-start gap-3 cursor-pointer group">
                            <input 
                              type="checkbox" 
                              required 
                              className="mt-1 w-5 h-5 rounded border-soft text-sun-dark focus:ring-sun-dark/20 accent-sun-dark cursor-pointer"
                            />
                            <span className="text-xs text-forest/70 leading-relaxed">
                              <strong>Privacidade e LGPD:</strong> Estou ciente e concordo que meus dados profissionais e de contato serão tratados de forma sigilosa para fins de validação e cadastro na plataforma, conforme a Lei Geral de Proteção de Dados (LGPD).
                            </span>
                          </label>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-4 border-t border-soft pt-6 mt-4">
                    {step > 1 && (
                      <button 
                        type="button" 
                        onClick={handleBack}
                        className="flex-1 py-4 px-6 border border-soft text-forest hover:bg-forest/5 rounded-full font-semibold transition-all text-center cursor-pointer active:scale-[0.99]"
                      >
                        Voltar
                      </button>
                    )}
                    
                    <div className="flex-1 relative group">
                      <div className="absolute -inset-1 bg-gradient-to-r from-forest/30 via-sun/20 to-forest/30 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                      <button 
                        disabled={isSubmitting}
                        type="submit" 
                        className="w-full relative py-4 px-6 bg-forest text-white rounded-full font-semibold shadow-lg shadow-forest/15 hover:bg-forest/90 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                      >
                        {step < 4 ? "Avançar" : (isSubmitting ? "Enviando..." : "Finalizar Cadastro")}
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-center text-[10px] text-forest/60 uppercase tracking-widest font-semibold mt-2">
                    Agradecemos pela sua disposição em apoiar esse projeto.
                  </p>
                </form>
              </>
            )}
          </div>
        </section>
      </main>
      <Footer onNavigate={onNavigate} />

      {/* Stripe Checkout Modal */}
      {showCheckoutModal && (
        <StripeCheckoutModal
          isOpen={showCheckoutModal}
          onClose={() => setShowCheckoutModal(false)}
          amountFormatted={planoSelecionado.valorMensal}
          professionalName={formData.nome || "Profissional Associado"}
          professionalEmail={formData.email}
          leadId={registeredLeadId}
        />
      )}
    </div>
  );
}
