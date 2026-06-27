import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

// Beautiful corporate email template wrapper
function wrapInEmailTemplate(contentHtml: string): string {
  return `
<div style="font-family: 'Inter', Helvetica, Arial, sans-serif; background-color: #FAF8F5; padding: 40px 20px; color: #1e352f; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; border: 1px solid #e2ded5; box-shadow: 0 4px 12px rgba(30, 53, 47, 0.03);">
    <!-- Header -->
    <div style="background-color: #1e352f; padding: 40px 30px; text-align: center;">
      <h2 style="color: #ffffff; font-family: 'Georgia', serif; font-size: 28px; margin: 0; font-weight: 500; letter-spacing: -0.5px;">AcolheMente</h2>
      <p style="color: #e8b056; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin: 10px 0 0 0;">Saúde Mental & Bem-estar</p>
    </div>
    <!-- Body -->
    <div style="padding: 40px 30px; line-height: 1.6; font-size: 15px; color: #2e443e;">
      ${contentHtml}
    </div>
    <!-- Footer -->
    <div style="background-color: #f7f5f0; padding: 25px 30px; text-align: center; border-top: 1px solid #e2ded5; font-size: 11px; color: #737c76;">
      <p style="margin: 0 0 8px 0;"><strong>Projeto AcolheMente Saúde</strong></p>
      <p style="margin: 0 0 8px 0;">Cuidado que protege e transforma o ambiente de trabalho e de vida.</p>
      <p style="margin: 0 0 8px 0;">© 2026 Projeto AcolheMente Saúde. Todos os direitos reservados.</p>
      <p style="margin: 0; font-style: italic;">Este e-mail é gerado automaticamente em conformidade com a LGPD (Lei Geral de Proteção de Dados).</p>
    </div>
  </div>
</div>
  `;
}

// Low-level helper to trigger a Firestore mail document
export async function triggerEmail(to: string, subject: string, html: string, text?: string) {
  if (!to) return;
  try {
    await addDoc(collection(db, "mail"), {
      to: to,
      message: {
        subject: subject,
        html: wrapInEmailTemplate(html),
        text: text || html.replace(/<[^>]*>/g, ""), // clean basic fallback text
      },
      createdAt: serverTimestamp(),
    });
    console.log(`[EmailService] Email successfully queued for ${to}: "${subject}"`);
  } catch (err) {
    console.error("[EmailService] Error queueing email to Trigger Email Firestore extension:", err);
  }
}

// 1. Patient Registration Email
export async function sendPatientRegistrationEmail(nome: string, email: string) {
  const subject = "AcolheMente - Cadastro Recebido com Sucesso!";
  const html = `
    <h3 style="font-family: 'Georgia', serif; font-size: 22px; color: #1e352f; margin-top: 0;">Seja muito bem-vindo(a), ${nome}!</h3>
    <p>Estamos muito felizes em receber o seu cadastro no <strong>Projeto AcolheMente Saúde</strong>. Este é o primeiro passo em direção à sua jornada de autoconhecimento e cuidado emocional.</p>
    
    <div style="background-color: #fcfbf9; border: 1px solid #ebdcb9; border-radius: 16px; padding: 20px; margin: 25px 0;">
      <h4 style="margin-top: 0; color: #1e352f; font-family: 'Georgia', serif;">Próximos Passos do Acolhimento:</h4>
      <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #2e443e;">
        <li style="margin-bottom: 8px;"><strong>1. Triagem & Análise:</strong> Nossa equipe de psicólogos triadores está avaliando o seu perfil para encontrar o profissional com a abordagem mais adequada para você.</li>
        <li style="margin-bottom: 8px;"><strong>2. Proposta de Atendimento:</strong> Enviaremos por e-mail e WhatsApp uma proposta contendo o valor social enquadrado por sessão e a frequência.</li>
        <li><strong>3. Início das Sessões:</strong> Após o seu aceite, o psicólogo atribuído entrará em contato para agendar o primeiro atendimento.</li>
      </ul>
    </div>
    
    <p>Verifique a sua caixa de entrada e de spam regularmente. Caso tenha qualquer dúvida, nossa equipe de suporte está pronta para te auxiliar.</p>
  `;
  await triggerEmail(email, subject, html);
}

// 2. Professional Lead Registration Email
export async function sendProfessionalLeadEmail(nome: string, email: string) {
  const subject = "AcolheMente - Cadastro Profissional Recebido";
  const html = `
    <h3 style="font-family: 'Georgia', serif; font-size: 22px; color: #1e352f; margin-top: 0;">Olá, Dr(a). ${nome}!</h3>
    <p>Agradecemos imensamente o seu interesse em fazer parte do corpo clínico do <strong>Projeto AcolheMente Saúde</strong>. Unir forças no cuidado psicossocial e compliance de saúde mental é fundamental.</p>
    
    <p>Nossa equipe técnica e de supervisão clínica está revisando os seus dados, CRP e preferências de público informados.</p>
    
    <div style="background-color: #faf9f6; border-left: 4px solid #e8b056; padding: 15px 20px; margin: 25px 0; font-size: 14px;">
      <strong>O que acontece agora?</strong><br>
      Entraremos em contato em breve para realizar o agendamento da sua entrevista virtual e apresentação detalhada do modelo de atuação e remuneração da plataforma.
    </div>
    
    <p>Qualquer dúvida, você pode responder diretamente a este contato.</p>
  `;
  await triggerEmail(email, subject, html);
}

// 3. Company Lead Registration Email
export async function sendCompanyLeadEmail(nomeContato: string, nomeEmpresa: string, email: string) {
  const subject = "AcolheMente - Interesse de Parceria Registrado";
  const html = `
    <h3 style="font-family: 'Georgia', serif; font-size: 22px; color: #1e352f; margin-top: 0;">Olá, ${nomeContato}!</h3>
    <p>É uma honra receber o interesse da <strong>${nomeEmpresa}</strong> em ser nossa parceira corporativa no <strong>AcolheMente Saúde</strong>.</p>
    
    <p>Mapear, prevenir e gerenciar os riscos psicossociais no ambiente de trabalho é o caminho mais inteligente para estar em conformidade total com a <strong>NR1</strong> e promover um ambiente saudável e altamente produtivo.</p>
    
    <div style="background-color: #f3f9f6; border: 1px solid #d1ebd8; border-radius: 16px; padding: 20px; margin: 25px 0; font-size: 14px; color: #1b3d2b;">
      <strong>Nosso Compromisso:</strong><br>
      Um consultor de parcerias corporativas e compliance do AcolheMente está montando uma proposta ideal de acordo com a quantidade de colaboradores informada e entrará em contato em <strong>até 24 horas</strong>.
    </div>
    
    <p>Seja muito bem-vindo ao cuidado estratégico corporativo!</p>
  `;
  await triggerEmail(email, subject, html);
}

// 4. Patient Proposal Accepted Confirmation (Email to Patient)
export async function sendProposalAcceptedToPatientEmail(nome: string, email: string, profissionalNome: string) {
  const subject = "AcolheMente - Proposta de Atendimento Aceita!";
  const html = `
    <h3 style="font-family: 'Georgia', serif; font-size: 22px; color: #1e352f; margin-top: 0;">Tudo certo, ${nome}!</h3>
    <p>A sua proposta de atendimento no Projeto AcolheMente Saúde foi aceita por você com sucesso.</p>
    
    <p>O seu acompanhamento psicológico foi confirmado com o profissional <strong>${profissionalNome}</strong>.</p>
    
    <div style="background-color: #f3f9f6; border: 1px solid #d1ebd8; border-radius: 16px; padding: 20px; margin: 25px 0; font-size: 14px; color: #1b3d2b;">
      <strong>Próximo Passo:</strong><br>
      Fique atento(a) ao seu celular (WhatsApp) e ao seu e-mail. O profissional <strong>${profissionalNome}</strong> fará contato direto com você para realizar o agendamento da sua primeira sessão!
    </div>
    
    <p>Estamos muito animados por você iniciar essa maravilhosa jornada conosco!</p>
  `;
  await triggerEmail(email, subject, html);
}

// 5. Patient Proposal Accepted Alert (Email to Assigned Professional)
export async function sendProposalAcceptedToProfessionalEmail(
  profissionalEmail: string,
  profissionalNome: string,
  pacienteNome: string,
  pacienteEmail: string,
  pacienteTelefone: string,
  valorSessao: string,
  frequenciaSessoes: string
) {
  const subject = "Novo Paciente Atribuído - Projeto AcolheMente";
  const html = `
    <h3 style="font-family: 'Georgia', serif; font-size: 20px; color: #1e352f; margin-top: 0;">Olá, Dr(a). ${profissionalNome}!</h3>
    <p>Gostaríamos de informar que o paciente <strong>${pacienteNome}</strong> revisou e <strong>ACEITOU</strong> a proposta de acompanhamento com você no Projeto AcolheMente.</p>
    
    <div style="background-color: #faf9f6; border: 1px solid #e2ded5; border-radius: 16px; padding: 20px; margin: 25px 0;">
      <h4 style="margin-top: 0; color: #1e352f; font-family: 'Georgia', serif; font-size: 16px;">Detalhes do Alinhamento Clínico:</h4>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 6px 0; color: #737c76; width: 140px;"><strong>Paciente:</strong></td>
          <td style="padding: 6px 0; color: #1e352f;">${pacienteNome}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #737c76;"><strong>Valor por Sessão:</strong></td>
          <td style="padding: 6px 0; color: #1e352f;">R$ ${valorSessao}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #737c76;"><strong>Frequência:</strong></td>
          <td style="padding: 6px 0; color: #1e352f;">${frequenciaSessoes}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #737c76;"><strong>E-mail:</strong></td>
          <td style="padding: 6px 0; color: #1e352f;">${pacienteEmail}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #737c76;"><strong>Telefone/Wpp:</strong></td>
          <td style="padding: 6px 0; color: #1e352f;">${pacienteTelefone}</td>
        </tr>
      </table>
    </div>
    
    <div style="background-color: #fbf6eb; border-left: 4px solid #e8b056; padding: 15px 20px; margin: 25px 0; font-size: 14px;">
      <strong>Orientação de Atendimento:</strong><br>
      Por favor, faça contato com o paciente através do telefone ou e-mail acima em até 24-48 horas para agendar o primeiro acolhimento e estabelecer as regras do contrato terapêutico.
    </div>
    
    <p>Agradecemos a sua dedicação e carinho no atendimento aos nossos acolhidos!</p>
  `;
  await triggerEmail(profissionalEmail, subject, html);
}

// 6. Patient Requested Proposal Revision (Email to Patient)
export async function sendProposalRevisionRequestEmail(nome: string, email: string) {
  const subject = "AcolheMente - Solicitação de Revisão Recebida";
  const html = `
    <h3 style="font-family: 'Georgia', serif; font-size: 22px; color: #1e352f; margin-top: 0;">Olá, ${nome}!</h3>
    <p>Recebemos a sua solicitação para revisar o valor acertado ou a frequência das suas sessões do Projeto AcolheMente.</p>
    
    <p>Nossa equipe de triagem e coordenação social compreende perfeitamente e fará uma análise humana do seu caso para tentar reajustar a sua proposta de modo que ela caiba em sua realidade de forma sustentável.</p>
    
    <div style="background-color: #faf9f6; border-left: 4px solid #e8b056; padding: 15px 20px; margin: 25px 0; font-size: 14px;">
      <strong>O que acontece agora?</strong><br>
      Nossa equipe entrará em contato com você via e-mail ou WhatsApp em breve para apresentar alternativas de enquadramento.
    </div>
    
    <p>Agradecemos o seu contato e sinceridade. O cuidado terapêutico deve ser viável para você!</p>
  `;
  await triggerEmail(email, subject, html);
}
