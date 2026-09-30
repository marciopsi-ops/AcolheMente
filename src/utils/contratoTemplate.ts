/**
 * Utilitário para geração e formatação do Contrato Terapêutico Oficial (Prestação de Serviços Psicológicos)
 * Em conformidade com:
 * - Código de Ética Profissional do Psicólogo (Resolução CFP nº 010/2005)
 * - Resolução CFP nº 011/2018 (Prestação de serviços psicológicos realizados por meios de tecnologias da informação)
 * - Código Civil Brasileiro (Lei nº 10.406/2002, arts. 593 a 609)
 * - Lei Geral de Proteção de Dados - LGPD (Lei nº 13.709/2018)
 * - Validade da assinatura e aceite eletrônico (Art. 10, § 2º da Medida Provisória nº 2.200-2/2001 e Lei nº 14.063/2020)
 */

export interface ContratoDadosParams {
  paciente: {
    id: string;
    nome?: string;
    nomeCompleto?: string;
    nomeCivil?: string;
    nomeDesejado?: string;
    email?: string;
    telefone?: string;
    whatsapp?: string;
    cpf?: string;
    rg?: string;
    dataNascimento?: string;
    idade?: string | number;
    endereco?: string;
    cidade?: string;
    estado?: string;
    responsavelNome?: string;
    responsavelCpf?: string;
    valorSessao?: string | number;
    frequenciaSessoes?: string;
    formatoAtendimento?: string;
    viaAcesso?: string;
  };
  profissional: {
    name?: string;
    crp?: string;
    email?: string;
    telefone?: string;
    cpf?: string;
    especialidade?: string;
  };
  valorPersonalizado?: string;
  frequenciaPersonalizada?: string;
  modalidadePersonalizada?: string;
}

export function gerarModeloContrato({
  paciente,
  profissional,
  valorPersonalizado,
  frequenciaPersonalizada,
  modalidadePersonalizada,
}: ContratoDadosParams): string {
  const nomePaciente =
    paciente.nomeDesejado ||
    paciente.nomeCompleto ||
    paciente.nome ||
    paciente.nomeCivil ||
    "________________________";
  const cpfPaciente = paciente.cpf || "___.___.___-__";
  const emailPaciente = paciente.email || "não informado";
  const telefonePaciente = paciente.whatsapp || paciente.telefone || "não informado";

  const nomeProfissional = profissional.name || "Psicólogo(a) Responsável";
  const crpProfissional = profissional.crp ? `CRP: ${profissional.crp}` : "CRP ativo no Conselho Regional de Psicologia";
  const emailProfissional = profissional.email || "";

  const valor =
    valorPersonalizado ||
    (paciente.valorSessao ? `R$ ${paciente.valorSessao}` : "Conforme acordo prévio da triagem clínica");

  const frequencia =
    frequenciaPersonalizada || paciente.frequenciaSessoes || "Semanal (1 sessão por semana)";

  const modalidade =
    modalidadePersonalizada ||
    paciente.formatoAtendimento ||
    "Online / Telepsicologia (plataforma criptografada)";

  const hoje = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return `CONTRATO DE PRESTAÇÃO DE SERVIÇOS PSICOLÓGICOS E ENQUADRE TERAPÊUTICO

Pelo presente instrumento particular e na melhor forma de direito, as partes abaixo qualificadas:

I. CONTRATADO(A) (PROFISSIONAL):
Nome: ${nomeProfissional}
Registro Profissional: ${crpProfissional}
E-mail de Contato: ${emailProfissional || "Plataforma AcolheMente Saúde"}
Intermediado por: AcolheMente Saúde - Plataforma de Acolhimento e Saúde Mental

II. CONTRATANTE (PACIENTE / RESPONSÁVEL LEGAL):
Nome do Paciente: ${nomePaciente}
${paciente.responsavelNome ? `Responsável Legal: ${paciente.responsavelNome} (CPF: ${paciente.responsavelCpf || "Conferido"})\n` : ""}CPF: ${cpfPaciente}
E-mail: ${emailPaciente}
Telefone/WhatsApp: ${telefonePaciente}

Têm, entre si, justo e acordado o presente Contrato Terapêutico, que se regerá pelas seguintes cláusulas e condições:

CLÁUSULA 1ª - DO OBJETO
O presente contrato tem por objeto a prestação de serviços de atendimento e acompanhamento psicológico clínico pelo(a) CONTRATADO(A) em favor do(a) CONTRATANTE, na modalidade ${modalidade}, em estrita consonância com a Resolução CFP nº 011/2018 e o Código de Ética Profissional do Psicólogo.

CLÁUSULA 2ª - DO ENQUADRE TERAPÊUTICO, DURAÇÃO E FREQUÊNCIA
2.1. As sessões terão duração mínima de 45 (quarenta e cinco) a 50 (cinquenta) minutos cada, respeitando os regulamentos e recomendações dos conselhos regulamentadores da profissão.
2.2. A frequência acordada para o acompanhamento é: ${frequencia}.
2.3. Os atendimentos serão realizados em dias e horários previamente pactuados entre o(a) profissional e o(a) paciente.
2.4. Em caso de modalidade online, o(a) paciente compromete-se a estar em local reservado, silencioso e que garanta sua privacidade durante todo o atendimento.

CLÁUSULA 3ª - DOS HONORÁRIOS E FORMA DE PAGAMENTO
3.1. Pelos serviços prestados, o(a) CONTRATANTE pagará o valor de: ${valor}.
3.2. Os pagamentos deverão ser realizados via PIX ou transferência bancária conforme chave e orientações informadas pelo(a) profissional.
3.3. O envio do comprovante de pagamento consolida a confirmação da sessão e garante a reserva da agenda profissional.

CLÁUSULA 4ª - DA POLÍTICA DE FALTAS, CANCELAMENTOS E REMARCAÇÕES
4.1. Remarcações ou cancelamentos deverão ser comunicados com antecedência mínima de 24 (vinte e quatro) horas em relação ao horário agendado.
4.2. Faltas sem aviso prévio de 24 horas (salvo emergências médicas devidamente comprovadas) implicarão na cobrança normal do valor da sessão, tendo em vista que o horário de trabalho e a disponibilidade do(a) psicólogo(a) foram integralmente reservados.
4.3. Eventuais atrasos por parte do(a) paciente serão tolerados em até 15 minutos, mantendo-se o encerramento no horário previsto para não prejudicar os atendimentos subsequentes.

CLÁUSULA 5ª - DO SIGILO PROFISSIONAL E CONFIDENCIALIDADE
5.1. O(A) CONTRATADO(A) obriga-se a guardar absoluto sigilo profissional sobre todos os fatos, relatos e informações confiados em razão do atendimento clínico, nos estritos termos do Artigo 9º do Código de Ética Profissional do Psicólogo (Resolução CFP nº 010/2005).
5.2. O dever de sigilo somente poderá ser flexibilizado em situações estritas previstas em lei, mormente em circunstâncias de grave e iminente risco à integridade física da própria pessoa ou de terceiros, consoante o Artigo 10 do Código de Ética.

CLÁUSULA 6ª - DA PROTEÇÃO DE DADOS (LGPD)
6.1. O tratamento de dados pessoais e dados sensíveis de saúde necessários à execução do acompanhamento psicológico é realizado sob a égide da Lei Federal nº 13.709/2018 (LGPD, art. 7º, V e art. 11, II, "f").
6.2. O prontuário clínico psicológico é sigiloso, intransferível e mantido sob guarda estrita do(a) profissional pelo prazo legal mínimo de 5 (cinco) anos, conforme preconiza a Resolução CFP nº 001/2009.

CLÁUSULA 7ª - DO ENCERRAMENTO E ALTA CLÍNICA
7.1. O acompanhamento psicológico poderá ser encerrado a qualquer tempo por consenso entre as partes ou mediante notificação por qualquer uma delas.
7.2. Recomenda-se a realização de pelo menos 1 (uma) sessão de fechamento e conclusão para a devida devolutiva e síntese do processo terapêutico.
7.3. Em caso de absenteísmo contínuo, inadimplência injustificada ou interrupção unilateral sem comunicação, o vínculo poderá ser finalizado formalmente com a devida anotação em prontuário.

CLÁUSULA 8ª - DA VALIDADE DO ACEITE ELETRÔNICO
8.1. As partes reconhecem expressamente a plena validade jurídica, eficácia probatória e legitimidade deste contrato por meio de aceite eletrônico, assinatura digital em tela, registro de carimbo temporal e hash criptográfico SHA-256 gerado no momento da confirmação, em conformidade com o Art. 10, § 2º da Medida Provisória nº 2.200-2/2001 e com a Lei nº 14.063/2020.

Emitido em ${hoje}.
AcolheMente Saúde • Documento Oficial`;
}
