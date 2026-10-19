# Plano de Implementação: Página de Profissionais, Recursos e Gestão de Planos

Este plano estabelece as alterações solicitadas para a experiência de psicólogos, psicanalistas e terapeutas na plataforma AcolheMente, com foco na ocultação dos planos na área pública, novo programa de incentivo por isenção, apresentação clara de recursos e controle por chave seletora na gestão integrada.

---

### Decisões Críticas de Arquitetura e Produto

> [!IMPORTANT]
> **Síntese das Diretrizes Definidas pelo Usuário:**
> 1. **Chave Seletora na Gestão:** Na área de gestão (`GestaoPlanosProfissionais`), dispor de uma chave master para habilitar ou não a exibição dos planos na página pública. A qualquer momento, novos planos ou recursos testados podem ser ativados sem retrabalho.
> 2. **Ocultação dos Planos na Página Pública:** Enquanto a chave estiver desativada, a página pública não exibe a tabela ou valores de planos, nem obriga a escolha de plano no formulário.
> 3. **Incentivo ao Engajamento (3 Meses de Isenção):** No lugar dos planos, apresentar com destaque o programa de incentivo: **isenção total de cobrança por 3 meses (90 dias) a partir do cadastro**.
> 4. **Apresentação de Recursos em Destaque:** Citar os recursos oferecidos, incluindo explicitamente:
>    - **Assistente de Emissão de Recibo e NF** (prático e em conformidade ética/fiscal).
>    - **Controle Financeiro Integrado** (sessões, recebimentos, faturamento de consultas regulares, corporativas e sociais).
>    - **Notificação Automática de Eventos** (lembretes automáticos de consulta, avisos de cobrança, confirmações via e-mail e mensagens).
> 5. **Design Refinado com Imagem Fundida Atrás do Texto:** Reestruturar o bloco Hero da página de profissionais adotando a mesma linguagem visual da página de empresas (`EmpresaView`), onde a imagem da profissional (`psicologa_hero_parda`) surge fundida suavemente atrás do título e dos textos em camadas de gradiente (`warm/forest`), garantindo máxima legibilidade e humanização.

---

## 1. Visão Geral e Estratégia de Dados

### 1.1 Persistência e Sincronização em Tempo Real (Firestore)
- **Documento:** `configuracoes/master`
- **Novo Campo:** `exibirPlanosProfissionais: boolean` (padrão: `false`).
- **Comportamento Reativo:**
  - `ProfissionalLandingView.tsx` escuta o snapshot de `configuracoes/master` em tempo real.
  - Se `exibirPlanosProfissionais === true`: exibe a vitrine dos planos e a etapa de seleção.
  - Se `exibirPlanosProfissionais === false`: exibe o módulo de **Incentivo ao Engajamento (3 meses de isenção)** e os **Recursos da Plataforma**, adaptando o formulário para cadastro 100% gratuito sem atrito.

### 1.2 Atualização no Formulário de Cadastro e Lead
- Quando a chave estiver desativada (`false`), a etapa final do cadastro não exige seleção de plano financeiro.
- O lead registrado em `profissionais_leads` registra:
  - `planoEscolhidoId: "isencao_3_meses"`
  - `planoEscolhidoNome: "Incentivo ao Engajamento - 3 Meses Grátis"`
  - `planoEscolhidoValor: "0,00 (Isenção inicial de 90 dias)"`
  - `beneficioIsencao: true`
- Mantém a transparência ética: o profissional declara ciência de que o credenciamento é gratuito e aproveita o período de isenção total.

---

## 2. Experiência do Usuário e Design Visual

### 2.1 Hero Container com Imagem da Profissional Fundida Atrás do Texto
- **Arquivo:** `src/views/ProfissionalLandingView.tsx`
- **Técnica:** Seguindo rigorosamente a arquitetura da página corporativa (`EmpresaView.tsx`):
  - Inserção de container com `relative rounded-3xl overflow-hidden p-6 sm:p-10 md:p-12 border border-soft/80 bg-warm shadow-md shadow-forest/5`.
  - Imagem de fundo `psicologoHero` (`psicologa_hero_parda_1788390113480.jpg`) em `absolute inset-0 pointer-events-none select-none object-cover object-right md:object-[80%_25%] opacity-45 mix-blend-multiply filter contrast-115 saturate-105`.
  - Camadas de gradientes suaves para fusão orgânica (`bg-gradient-to-r from-warm/95 via-warm/75 md:via-warm/50 to-transparent`, `bg-gradient-to-t from-warm/90 via-transparent to-warm/30`, e `bg-gradient-to-b from-warm/60 via-transparent to-warm/70`).
  - Textos sobrepostos com contraste ideal e sem cortes.

### 2.2 Seção de Recursos Disponíveis da Plataforma
Substituição da tabela de preços por um conjunto organizado e modular de cards de recursos práticos da plataforma para psicólogos, psicanalistas e terapeutas:
1. **Assistente de Emissão de Recibo e NF:** Facilidade para emissão de recibos e notas fiscais de atendimentos, integrado aos dados de pacientes particulares e corporativos.
2. **Controle Financeiro Integrado:** Gestão de honorários, controle de recebimentos, histórico por paciente e relatórios financeiros transparentes.
3. **Notificação Automática de Eventos:** Lembretes automáticos aos pacientes antes das sessões, avisos de confirmação de agendamento e cobrança sem constrangimento para o profissional.
4. **Canal de Acolhimento & Triagem Qualificada:** Encaminhamento seguro de pessoas em sofrimento psíquico e colaboradores de empresas parceiras.
5. **Autonomia de Agenda e Disponibilidade:** Liberdade para definir sua grade de horários, quantidade de horas/mês e modalidades de atendimento.
6. **Comunidade & Intercâmbio Clínico:** Supervisão clínica, workshops, cursos e publicação de artigos autorais no Blog oficial para fortalecimento de autoridade.

### 2.3 Bloco de Incentivo ao Engajamento (3 Meses de Isenção)
- Um card destacado na paleta `forest` e `sun`, comunicando:
  - **Selo:** *Programa de Fomento & Parceria Clínica*
  - **Título:** *3 Meses de Isenção Total a partir do Credenciamento*
  - **Benefício:** Acesso a todos os recursos tecnológicos (triagem, notificações, controle financeiro, emissão de recibos/NF) com **custo zero** durante o primeiro trimestre.
  - **Propósito:** Permitir que o profissional experimente os recursos da plataforma, forme sua base de pacientes e comprove o valor prático no dia a dia.

---

## 3. Chave Seletora na Área de Gestão Integrada

### 3.1 Painel de Gestão (`GestaoPlanosProfissionais.tsx`)
- Adição de uma barra de controle no topo do componente:
  - **Chave Toggle Estilizada:** `Exibir Planos Financeiros na Página Pública`
  - **Status Visual:**
    - Ativado (Verde): *"Planos visíveis publicamente — Profissionais visualizam a tabela e valores de adesão."*
    - Desativado (Amarelo/Creme): *"Planos ocultos na página pública — Exibindo apenas recursos e programa de 3 meses de isenção."*
  - **Operação no Firestore:** Atualiza instantaneamente `exibirPlanosProfissionais` no documento `configuracoes/master`.
  - **Persistência dos 3 Planos:** O painel continua permitindo editar os valores, títulos, horas inclusas e descrições dos 3 planos (Acolher, Integrar, Pleno). Assim, quando a gestão decidir reativar a chave com novos recursos testados, as configurações já estarão prontas.

---

## 4. Etapas de Execução

1. **Gestão de Planos (`src/components/GestaoPlanosProfissionais.tsx`):**
   - Integrar a chave seletora com feedback visual e sincronização com o Firestore (`exibirPlanosProfissionais`).
2. **Página de Profissionais (`src/views/ProfissionalLandingView.tsx`):**
   - Integrar a leitura reativa do campo `exibirPlanosProfissionais`.
   - Implementar o novo Hero com a imagem da profissional fundida atrás do texto.
   - Construir a vitrine de recursos (assistente de recibos/NF, controle financeiro, notificações automáticas, triagem, etc.).
   - Construir o card de Incentivo ao Engajamento (3 meses de isenção).
   - Condicionar a exibição dos planos e o fluxo do formulário à chave seletora.
3. **Validação & Compilação:**
   - Executar compilação com `compile_applet` para garantir zero erros de tipagem e integridade da aplicação.

---

### Verificação de Prontidão

Após a sua aprovação, implementaremos essas mudanças em todos os componentes indicados.
