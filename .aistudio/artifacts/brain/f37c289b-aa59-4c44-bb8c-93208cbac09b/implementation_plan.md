# Plano de Implementação: Carteira Externa, Ficha de Bordo & Parametrização

## Status: Concluído (100%)

### 1. Ficha de Bordo do Paciente Externo (`FichaPacienteExternoModal.tsx`)
- Mantém rigorosamente a familiaridade, estética e layout da Ficha de Bordo do Acolhimento, contextualizada para a clínica particular.
- **Header Completo**: Nome civil e social, CPF, idade, status clínico (Ativo, Em Pausa, Concluído, Inativo), botão WhatsApp 1 clique, botão Editar/Salvar e Fechar.
- **Action Bar**:
  - Prontuário Clínico (com badge de quantidade de evoluções).
  - Sessões & Faturamento (com contador de pendências).
  - Contrato Terapêutico Particular (com indicador de contrato assinado).
  - Agendamento direto na Agenda Clínica.
  - Arquivar / Reativar paciente.
- **Seções Estruturadas & Navegação Rápida Ancorada**:
  - `1. Dados Pessoais`: Nome completo, social, CPF, nascimento, idade, gênero, profissão, estado civil, fonte de indicação.
  - `2. Responsável Legal`: Nome, parentesco, CPF, telefone e e-mail (para menores ou dependentes).
  - `3. Contato & Endereço`: WhatsApp, e-mail, contato de emergência, CEP, logradouro, número, bairro, cidade e estado.
  - `4. Queixa & Clínico`: Queixa principal / motivo da consulta, histórico de psicoterapia anterior, medicação psiquiátrica e disponibilidade.
  - `5. Honorários & Acordo`: Valor acordado da sessão particular (100% do profissional), modalidade (online/presencial), frequência (semanal/quinzenal), forma de pagamento e chave Pix com botão de cópia rápida.
  - `6. Sessões & Finanças`: Resumo com total de sessões, realizadas, total recebido e pendente, com botão de abertura da planilha completa.
  - `7. Prontuário & Evoluções`: Registro rápido de novas evoluções com data e modalidade, além da linha do tempo com os registros clínicos.
  - `8. Alertas & WhatsApp`: Modelos de mensagens prontas para envio imediato (lembrete de sessão, dados Pix para pagamento e link de sala online).

### 2. Parametrização do Link de Cadastro (`ParametrizarLinkModal.tsx`)
- Acesso direto na aba "Carteira de Pacientes Externos" via botão **"Parametrizar"**.
- **Aba 1: Gerador de Link Inteligente**:
  - Definição em tempo real de: Valor da Sessão (R$), Modalidade (Online / Presencial / Ambas), Frequência sugerida e Origem/Canal (Instagram, WhatsApp, Google, Indicação, etc.).
  - Geração automática da URL parametrizada: `/?view=cadastro_externo&prof=...&valor=150&modalidade=online&origem=Instagram`.
  - Botões rápidos: "Copiar Link", "Enviar no WhatsApp" com mensagem pronta e "Testar Formulário" com link direto seguro.
- **Aba 2: Configurações Globais do Formulário**:
  - Título e mensagem de boas-vindas customizados do consultório.
  - Switches para ativar/desativar campos opcionais: Endereço completo, Queixa principal, Disponibilidade de turnos e Contato de emergência.
  - Valor e modalidade padrão gravados no perfil (`users/{uid}.configFormularioExterno`).

### 3. Formulário Público do Paciente (`ExternalPatientLandingView.tsx`) & Resolução de Rotas
- **Roteamento Consistente**: Avaliado com prioridade máxima no `App.tsx` para garantir que o formulário abra diretamente sem conflitar com o perfil público de atendimento (`PublicProfProfileView`).
- **Resiliência de Parâmetros**: Leitura robusta do UID do profissional em query params (`prof`, `profissional`, `profissionalId`, `uid`), permitindo abertura impecável.
- **Card do Link Otimizado**: Removida a exibição crua do link escrito, priorizando descrição limpa, botão de cópia com feedback, link nativo para abertura sem bloqueio de popups e atalho para o modal de parametrização.
