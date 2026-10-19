export interface PlanoProfissionalItem {
  id: string; // "plano_1" | "plano_2" | "plano_3"
  nome: string;
  subtitulo: string;
  valorMensal: string; // ex: "29,90"
  descricao: string;
  horasInclusas: string; // ex: "Até 8h/mês"
  recursos: string[];
  destaque?: boolean;
  ativo: boolean;
}

export const PLANOS_PROFISSIONAIS_PADRAO: PlanoProfissionalItem[] = [
  {
    id: "plano_1",
    nome: "Plano Acolher (Básico)",
    subtitulo: "Início e Vagas Sociais",
    valorMensal: "29,90",
    horasInclusas: "Até 8 horas/mês",
    descricao: "Ideal para iniciar atendimentos na rede com até 8 horas/mês dedicadas a acolhimentos com valores acessíveis.",
    recursos: [
      "Acesso à esteira de triagem de novos pacientes",
      "Até 8 horas mensais de atendimento acessível",
      "Perfil público profissional na plataforma AcolheMente",
      "Prontuário eletrônico sigiloso e gestão de sessões",
      "Gestão de recebimentos e termos de consentimento"
    ],
    destaque: false,
    ativo: true,
  },
  {
    id: "plano_2",
    nome: "Plano Integrar (Intermediário)",
    subtitulo: "Mais Procurado • Clínico & Corporativo",
    valorMensal: "49,90",
    horasInclusas: "Até 16 horas/mês",
    descricao: "Mais vagas na esteira clínica e acesso prioritário à Triagem Corporativa com empresas parceiras.",
    recursos: [
      "Tudo o que está incluído no Plano Acolher",
      "Até 16 horas mensais de atendimento",
      "Acesso a pacientes de Convênios Corporativos e Empresas",
      "Destaque nas buscas por especialidades e abordagens",
      "Notificações automáticas de agendamento e lembretes",
      "Suporte prioritário da equipe de triagem AcolheMente"
    ],
    destaque: true,
    ativo: true,
  },
  {
    id: "plano_3",
    nome: "Plano Pleno (Avançado)",
    subtitulo: "Expansão Máxima de Agenda",
    valorMensal: "79,90",
    horasInclusas: "Acima de 20 horas/mês",
    descricao: "Para atuação abrangente e ampliação máxima de agenda clínica, corporativa e projetos especiais.",
    recursos: [
      "Tudo o que está incluído no Plano Integrar",
      "Agenda expandida acima de 20 horas mensais",
      "Prioridade máxima na esteira de encaminhamentos clínicos",
      "Participação em palestras corporativas, eventos e blog da rede",
      "Selo de Profissional Sênior no diretório público",
      "Canal direto de suporte clínico e assessoria técnica"
    ],
    destaque: false,
    ativo: true,
  },
];
