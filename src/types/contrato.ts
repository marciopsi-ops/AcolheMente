export interface ContratoAssinaturaAudit {
  ip?: string;
  userAgent?: string;
  dataAceite: string; // ISO String
  dataAceiteFormatada: string; // "DD/MM/AAAA às HH:mm:ss"
  hashContrato: string; // Hash SHA-256 de integridade do texto
  pacienteNome: string;
  pacienteCpf: string;
  pacienteEmail: string;
  responsavelNome?: string;
  responsavelCpf?: string;
  menorIdade?: boolean;
  rubricaBase64?: string; // Imagem em png da rubrica desenhada no canvas
  versaoTermos: string;
  consentimentoLgpd: boolean;
}

export interface ContratoDados {
  id: string; // ID do documento do acolhimento
  pacienteId: string;
  pacienteNome: string;
  pacienteEmail: string;
  pacienteTelefone: string;
  pacienteCpf?: string;
  menorIdade?: boolean;
  responsavelNome?: string;
  responsavelCpf?: string;

  profissionalId?: string;
  profissionalNome?: string;
  profissionalCrp?: string;
  profissionalEmail?: string;
  profissionalTelefone?: string;
  profissionalEspecialidade?: string;

  valorSessao: string;
  frequenciaSessoes: string;
  estimativaMensal?: string;
  diaVencimento?: string | number;
  chavePix?: string;
  favorecidoPix?: string;

  textoContrato: string;
  status: "pendente" | "assinado";
  assinadoEm?: string;
  auditTrail?: ContratoAssinaturaAudit;
  criadoEm: string;
  atualizadoEm: string;
}

export const MODELO_CONTRATO_PADRAO = `CONTRATO TERAPÊUTICO DE PRESTAÇÃO DE SERVIÇOS PSICOLÓGICOS E TERMO DE ENQUADRE

Pelo presente instrumento particular e na melhor forma de direito, de um lado:

CONTRATADA (PROFISSIONAL):
Nome: {NOME_PROFISSIONAL}
Registro Profissional: CRP {CRP_PROFISSIONAL}
E-mail: {EMAIL_PROFISSIONAL}
Telefone/WhatsApp: {TELEFONE_PROFISSIONAL}
Intervenção: Acolhimento e Acompanhamento Psicológico Clínico (Projeto AcolheMente)

E de outro lado:

CONTRATANTE (PACIENTE OU RESPONSÁVEL LEGAL):
Nome: {NOME_PACIENTE}
CPF: {CPF_PACIENTE}
E-mail: {EMAIL_PACIENTE}
Telefone/WhatsApp: {TELEFONE_PACIENTE}
{INFO_RESPONSAVEL_LEGAL}

Têm entre si, justo e acordado, o presente Contrato de Prestação de Serviços Psicológicos, que se regerá pelas seguintes cláusulas e condições:

CLÁUSULA PRIMEIRA – DO OBJETO
1.1. O presente contrato tem por objetivo a prestação de serviços psicológicos na modalidade online (atendimento síncrono por videoconferência segura), em conformidade com as Resoluções vigentes do Conselho Federal de Psicologia (CFP) e o Código de Ética Profissional do Psicólogo.
1.2. O acompanhamento visa à promoção da saúde mental, autoconhecimento e cuidado psicológico, sendo estruturado individualmente de acordo com as necessidades clínicas identificadas.

CLÁUSULA SEGUNDA – DO FORMATO, FREQUÊNCIA E DURAÇÃO DAS SESSÕES
2.1. As sessões terão duração mínima de 45 (quarenta e cinco) a 50 (cinquenta) minutos cada, respeitando os regulamentos e recomendações dos conselhos de classe.
2.2. A periodicidade acordada entre as partes é {FREQUENCIA_SESSOES}, em dia e horário fixados em comum acordo.
2.3. Em caso de atraso por parte do(a) CONTRATANTE, a sessão se encerrará no horário previamente agendado para não prejudicar os atendimentos subsequentes. Em caso de atraso por parte da CONTRATADA, o tempo correspondente será reposto integralmente.

CLÁUSULA TERCEIRA – DOS HONORÁRIOS E FORMA DE PAGAMENTO
3.1. Pelo serviço prestado, o(a) CONTRATANTE pagará o valor de R$ {VALOR_SESSAO} por sessão individual.
3.2. A estimativa mensal é calculada de acordo com o número de sessões no mês de referência (média estimada: {ESTIMATIVA_MENSAL}).
3.3. Os pagamentos deverão ser realizados via transferência/Pix {DADOS_PIX} ou conforme alinhamento prévio entre as partes até a data acordada.

CLÁUSULA QUARTA – DAS FALTAS, DESMARCAÇÕES E REAGENDAMENTOS
4.1. O horário da sessão é reservado com exclusividade para o(a) CONTRATANTE.
4.2. Avisos de desmarcação ou pedido de reagendamento devem ser comunicados com antecedência mínima de 24 (vinte e quatro) horas úteis.
4.3. Cancelamentos sem aviso prévio de 24 horas ou ausências não justificadas (faltas) ensejarão a cobrança regular dos honorários da sessão reservada, tendo em vista a disponibilidade e reserva do horário pelo profissional.
4.4. Em situações excepcionais de força maior ou emergência médica devidamente comprovadas, o reagendamento será viabilizado sem cobrança adicional.

CLÁUSULA QUINTA – DO SIGILO PROFISSIONAL E PRIVACIDADE
5.1. A CONTRATADA se compromete a zelar pelo mais rigoroso sigilo profissional, conforme estabelecido no Artigo 9º do Código de Ética Profissional do Psicólogo, protegendo as informações compartilhadas durante as sessões.
5.2. A quebra de sigilo só ocorrerá nas estritas hipóteses previstas em lei (risco iminente à vida do paciente ou de terceiros, ou determinação judicial formal).
5.3. As sessões virtuais não poderão ser gravadas por nenhuma das partes em áudio ou vídeo sem o consentimento prévio e expresso de ambos, com vistas à preservação da intimidade e confidencialidade.

CLÁUSULA SEXTA – DA PROTEÇÃO DE DADOS (LGPD - LEI Nº 13.709/2018)
6.1. O(A) CONTRATANTE manifesta consentimento expresso para o tratamento de seus dados pessoais fornecidos, exclusivamente para fins de registro no prontuário psicológico, comunicações do tratamento e formalização administrativa.
6.2. Fica assegurado o direito de consulta e atualização dos dados cadastrais a qualquer tempo.

CLÁUSULA SÉTIMA – DA RESCISÃO E ALTA TERAPÊUTICA
7.1. O processo terapêutico poderá ser encerrado a qualquer momento por iniciativa de qualquer uma das partes, recomendando-se, sempre que possível, a realização de ao menos uma sessão de encerramento para elaboração do desligamento ou alta clínica.
7.2. Faltas reiteradas sem comunicação por mais de 3 (três) semanas consecutivas caracterizam interrupção voluntária por desistência, facultando à CONTRATADA disponibilizar o horário.

CLÁUSULA OITAVA – DO ACEITE ELETRÔNICO E VALIDADE JURÍDICA
8.1. As partes reconhecem como plenamente válida, eficaz e com força executiva a formalização deste contrato por meio de assinatura eletrônica simples/avançada nos termos da Medida Provisória nº 2.200-2/2001 (Art. 10, § 2º) e Lei nº 14.063/2020.
8.2. A aposição de rubrica digital, confirmação de CPF, carimbo de data/hora (timestamp), endereço IP e hash criptográfico SHA-256 constituem evidência probatória irrevogável de autoria e integridade das manifestações de vontade.

E, por estarem de pleno e mútuo acordo com todas as cláusulas e condições estipuladas, firma-se o presente instrumento digitalmente para que produza todos os seus jurídicos e legais efeitos.

Data de Emissão: {DATA_EMISSAO}
Local: Plataforma Segura AcolheMente Saúde
`;
