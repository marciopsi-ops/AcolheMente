# Múltiplos Perfis de Faturamento (CPF/CNPJ) & Prestação de Serviços a Empresas (B2B)

Esta proposta expande a estrutura financeira do profissional para suportar **múltiplos perfis de recebimento por via** (diferentes contas CPF, caixa em dinheiro físico com controle de declaração no IR e múltiplos CNPJs) e inaugura uma **área dedicada à Prestação de Serviços a Empresas (B2B)** no Plano Avançado, mantendo a mesma ergonomia da Ficha de Bordo e do faturamento em linhas já familiar aos terapeutas, com consolidação automática no painel global.

---

## Validação & Decisões Recomendadas

> [!IMPORTANT]
> Abaixo estão as **3 definições de fluxo** recomendadas para esta entrega. Caso esteja de acordo com as recomendações padrão, basta aprovar o plano para iniciarmos a implementação; se preferir alterar algum item, basta responder indicando sua preferência.

- **1. Posicionamento da nova área de Empresas (B2B) no menu do Profissional:**
  - *(Recomendado)* **Aba principal "Empresas (B2B)"** na barra superior do profissional (ao lado de *Meus Pacientes*, protegida pelo selo do Plano Avançado). Como ela possui um **Dashboard B2B próprio** além da carteira de empresas, ter uma aba de primeiro nível evita menus aninhados em três camadas e dá destaque executivo à frente corporativa do terapeuta.
  - *Alternativa:* Incluir como uma 4ª sub-aba dentro de *Meus Pacientes* (*Valores Acessíveis | Corporativo | Externos | Empresas B2B*).
- **2. Controle de "Não Declarar em IR" (Dinheiro Físico e Contas CPF):**
  - *(Recomendado)* **Regra em dupla camada:** cada perfil PF cadastrado define seu comportamento padrão (*"Entra na base IRPF / Receita Saúde: Sim ou Não"* — ex.: um perfil *"Caixa Dinheiro Físico"* já nasce marcado como *Não declarar*), **e** cada linha de sessão/serviço também permite alternar pontualmente caso uma sessão avulsa seja paga em espécie. No painel financeiro, esses valores somam normalmente no **Caixa Gerencial Real**, mas ficam segregados e excluídos da **Base Tributável IRPF / Carnê-Leão**.
- **3. Sincronização opcional dos serviços B2B com a Agenda:**
  - *(Recomendado)* **Sincronização automática quando houver horário preenchido:** se o terapeuta informar data e horário em um serviço agendado para uma empresa (ex.: palestra, treinamento ou plantão), o compromisso aparece bloqueando o horário na **Agenda** com identificação visual B2B; lançamentos apenas de competência/mensalidade (sem horário) ficam restritos ao faturamento da empresa.

---

## 1. Visão Geral & Conceito Central

- **O Que Faz:**
  1. **Múltiplos Perfis de Faturamento (PF, Caixa Físico e PJ):** substitui o limite atual de apenas um CPF e um CNPJ por uma carteira ilimitada de perfis emissores/recebedores. O profissional pode cadastrar mais de uma conta vinculada a CPF, criar um perfil específico de **Dinheiro Físico (Caixa)** desvinculado de IR, e registrar **múltiplas empresas (CNPJs)** com dados fiscais, CNAEs e chaves Pix independentes.
  2. **Área B2B de Serviços a Empresas (Plano Avançado):** ambiente exclusivo para terapeutas que vendem palestras, workshops, consultorias NR-1, rodas de conversa, mentorias ou plantões diretamente a pessoas jurídicas — totalmente desacoplado da engrenagem de convênio de benefícios da gestão master, focado apenas na relação comercial direta *Profissional → Empresa Cliente*.
- **Público-Alvo:** Psicólogos, psicanalistas e terapeutas parceiros (com múltiplos perfis fiscais disponíveis a todos os profissionais, e o módulo B2B exclusivo aos assinantes do **Plano Avançado**).
- **Valor Principal:** Elimina controles paralelos em planilhas externas, evita confusão tributária entre receitas declaráveis no Receita Saúde, receitas em espécie e notas fiscais emitidas por diferentes CNPJs, e reaproveita 100% do padrão mental da Ficha de Bordo que o profissional já domina.

---

## 2. Experiência do Usuário & Design Visual

### Fluxos Principais do Usuário

1. **Configuração dos Perfis de Faturamento (Via CPF & Via CNPJ):**
   - Acessível tanto em **Meu Perfil** quanto diretamente no botão **"Gerenciar Perfis"** dentro de qualquer planilha de faturamento (de pacientes ou de empresas).
   - O profissional visualiza duas colunas ou seções claras:
     - **Via CPF / Pessoa Física & Espécie:** cartões para a conta CPF principal, eventuais outros CPFs/contas secundárias e perfil de **Dinheiro Físico**. Cada cartão exibe apelido (ex.: *"CPF Nubank"*, *"Caixa Consultório — Espécie"*), CPF/titular, chave Pix e a chave seletora **"Considerar na base de IRPF / Receita Saúde"**.
     - **Via CNPJ / Empresas do Profissional:** cartões para cada CNPJ do terapeuta (ex.: *"Clínica Silva LTDA"* para clínica e *"Silva Treinamentos ME"* para B2B), com Razão Social, CNPJ, Inscrição Municipal, CNAE, Endereço, Chave Pix PJ e dados bancários opcionais para pagamento via TED/Boleto corporativo.
   - **Seleção na Ficha e na Linha:** cada paciente ou empresa cliente tem seu **Perfil de Faturamento Padrão** fixado no topo da planilha, mas qualquer linha individual pode ter o perfil emissor trocado caso um pagamento específico ocorra por outra via.

2. **Gestão da Aba "Empresas (B2B)" & Dashboard Próprio:**
   - No topo da nova aba, um seletor alterna entre **Carteira de Empresas** e **Dashboard B2B**:
     - **Carteira de Empresas:** barra de busca instantânea (Razão Social, Nome Fantasia, CNPJ ou contato), filtros rápidos (*Ativas / Recorrentes*, *Projetos Pontuais*, *Prospecção / Orçamento*, *Encerradas*) e botão **+ Nova Empresa Cliente**. As empresas são listadas em barras horizontais compactas exibindo Razão Social, CNPJ, contato responsável, perfil emissor vinculado, resumo de faturamento pendente e atalho direto de WhatsApp.
     - **Dashboard B2B Próprio:** visão executiva dedicada apenas aos negócios corporativos do terapeuta no mês/competência selecionada — KPIs de *Total Faturado B2B*, *Total Recebido*, *Notas/Valores em Aberto* e *Ticket Médio por Empresa/Serviço*, acompanhados de uma tabela estilo planilha com o fechamento linha a linha por empresa e exportação CSV.

3. **Ficha de Bordo da Empresa Cliente (Mesma "Cara" da Ficha de Pacientes):**
   - Ao abrir uma empresa, o modal espelha fielmente a ergonomia da Ficha de Bordo de Pacientes:
     - **Cabeçalho Institucional Escuro (`Forest`):** Avatar/iniciais da empresa, Nome Fantasia + Razão Social, CNPJ em fonte monoespaçada, selo de status comercial, seletor de Perfil Emissor padrão e barra de ações rápidas (*WhatsApp RH/Financeiro*, *Proposta / Contrato B2B*, *Ir para Faturamento*, *Editar*).
     - **Seção 1 — Dados Fiscais da Tomadora & Contatos (RH / Contas a Pagar):** CNPJ, Razão Social, Inscrição Municipal/Estadual, endereço completo para emissão de NFS-e, nome do gestor/RH, WhatsApp, e-mail financeiro para envio de nota/boleto e condição de pagamento combinada (ex.: *15 dias após emissão da NF*).
     - **Seção 2 — Faturamento & Serviços Vendidos em Linhas:** planilha idêntica em fluidez à de sessões clínicas, adaptada ao vocabulário B2B:
       - Colunas: `#`, `Data`, `Serviço / Descrição` (com sugestões rápidas como Palestra, Workshop, Consultoria NR-1, Plantão, Treinamento ou texto livre + modalidade Online/Presencial), `Status Entrega` (*Agendado*, *Em Execução*, *Entregue*, *Cancelado*), `Valor (R$)`, `Perfil Emissor`, `NF / Recibo` (*Pendente* ou *NF Emitida*), `Pagamento` (*Pago* / *Pendente* + forma Pix/TED/Boleto).
       - Atalhos superiores e por linha: **+ Novo Serviço**, **Duplicar Linha** (ideal para contratos mensais recorrentes), **Assistente NFS-e PJ** (já formatado com os dados da empresa tomadora e do CNPJ/CPF emissor escolhido), **Recibo / Demonstrativo Comercial** e **Enviar Fechamento por WhatsApp** para o setor financeiro da empresa.
     - **Seção 3 — Contrato & Proposta Comercial B2B:** registro do escopo contratado, vigência, valor acordado e gerador de minuta comercial limpa entre o perfil emissor do profissional e a empresa cliente.
     - **Seção 4 — Diário de Bordo & Entregáveis Corporativos:** linha do tempo para registrar reuniões de alinhamento com o RH, atas de palestras, listas de presença ou relatórios técnicos entregues, vinculados opcionalmente a cada serviço da planilha.

4. **Consolidação Global no Dashboard do Profissional:**
   - Na aba global **Dashboard → Faturamento Consolidado**, as empresas B2B passam a compor automaticamente os cartões de receita total, alimentando também o cálculo de **Lucro Líquido** em *Gestão de Despesas*.
   - O filtro **Origem** passa a oferecer: *Todas as Origens*, *Triagem Acessível*, *Convênio Corporativo*, *Carteira Externa* e *Empresas (B2B)*.
   - O filtro **Emissão** passa a permitir filtrar tanto pela modalidade macro (*Todos*, *PF Tributável*, *Caixa Físico / Sem IR*, *PJ*) quanto por **um perfil específico** (ex.: ver apenas o faturamento do *CNPJ 2* ou apenas do *CPF 1*).

### Identidade Visual & Regras de Interface
- **Paleta & Superfícies:** Preservação rigorosa da identidade editorial e acolhedora da plataforma (`forest` para cabeçalhos e títulos em serifa, `warm` para planos de fundo suaves, `sun` para destaques pontuais e bordas finas `border-soft` de elevação única, sem aninhamento pesado de cartões).
- **Tipografia Numérica & Densidade de Dados:** Uso obrigatório de numerais tabulares (`tabular-nums` / `font-mono`) em todos os CNPJs, CPFs, valores monetários, datas e totalizadores das planilhas para alinhamento vertical exato. Linhas de tabela compactas (36px–44px) com estados vazios orientativos (*"Cadastre sua primeira empresa cliente"* / *"+ Novo Serviço"*).

---

## 3. Decisões de Produto & Trade-Offs

- **Decisão 1: Migração Silenciosa e Retrocompatibilidade Total de PF/PJ**
  - *Abordagem Escolhida:* Todo profissional que já possui CPF/Pix ou dados de PJ cadastrados hoje terá esses dados convertidos automaticamente em seus primeiros perfis (`PF Principal` e `PJ Principal`), mantendo todas as fichas de pacientes existentes funcionando sem precisar reconfigurar nada.
  - *Por quê:* Evita retrabalho para profissionais ativos e previne qualquer perda de vínculo nos recibos já emitidos.

- **Decisão 2: Separação entre "Caixa Gerencial" e "Base Fiscal IRPF"**
  - *Abordagem Escolhida:* Recebimentos marcados como *Não declarar em IR* (seja via perfil de Dinheiro Físico ou conta CPF específica) continuam visíveis nos indicadores gerenciais de entrada de caixa e lucro real, mas são automaticamente filtrados fora do **Assistente Receita Saúde / Carnê-Leão** e sinalizados com indicador discreto de *Controle Interno*.
  - *Por quê:* Atende exatamente à necessidade prática do terapeuta: saber quanto realmente recebeu no mês sem correr o risco de exportar lançamentos em espécie por engano na apuração fiscal.

- **Decisão 3: Coleção Própria e Enxuta para Empresas B2B do Profissional**
  - *Abordagem Escolhida:* Armazenar as empresas clientes do terapeuta em uma coleção dedicada e isolada por profissional (seguindo o mesmo isolamento de segurança da Carteira Externa), em vez de misturá-las na coleção de empresas de benefícios da Gestão Master.
  - *Por quê:* Garante sigilo comercial absoluto da carteira privada do assinante do Plano Avançado (nem outros profissionais nem a triagem veem os clientes B2B particulares dele) e elimina dezenas de campos desnecessários de vidas, faixas de preço e códigos de colaboradores.

---

## 4. Arquitetura Técnica & Estratégia de Dados

### Diagrama de Arquitetura e Fluxo de Consolidação

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                     PERFIL DO PROFISSIONAL (autenticado)                     │
│  ┌─────────────────────────┐  ┌─────────────────────────┐  ┌──────────────┐  │
│  │ Perfis Via CPF (1..N)   │  │ Perfil Caixa / Espécie  │  │ Perfis CNPJ  │  │
│  │ • Declarar IR: Sim/Não  │  │ • Declarar IR: Não (pad)│  │ • Empresas   │  │
│  │ • CPF + Chave Pix       │  │ • Controle Gerencial    │  │   1..N + NFS │  │
│  └────────────┬────────────┘  └────────────┬────────────┘  └──────┬───────┘  │
└───────────────┼────────────────────────────┼──────────────────────┼──────────┘
                │                            │                      │
                ▼                            ▼                      ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                  FONTES DE RECEITA EM LINHAS DO PROFISSIONAL                 │
│                                                                              │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────────────┐  │
│  │ Pacientes        │ │ Carteira Externa │ │ NOVA ABA: Empresas (B2B)     │  │
│  │ Plataforma       │ │ (Pacientes PF)   │ │ (Exclusiva Plano Avançado)   │  │
│  │ (Acessível/Corp) │ │                  │ │                              │  │
│  └────────┬─────────┘ └────────┬─────────┘ │ • Lista de Empresas Clientes │  │
│           │                    │           │ • Ficha de Bordo da Empresa  │  │
│           │                    │           │ • Planilha de Serviços B2B   │  │
│           │                    │           │ • Contrato & Entregáveis     │  │
│           │                    │           │ • Dashboard B2B Próprio      │  │
│           │                    │           └──────────────┬───────────────┘  │
└───────────┼────────────────────┼──────────────────────────┼──────────────────┘
            │                    │                          │
            └────────────────────┼──────────────────────────┘
                                 ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│              MOTOR DE CONSOLIDAÇÃO GLOBAL (Dashboard Financeiro)             │
│                                                                              │
│  ┌────────────────────────┐  ┌─────────────────────┐  ┌───────────────────┐  │
│  │ Caixa Gerencial Global │  │ Apuração PF (e-CAC) │  │ Faturamento PJ    │  │
│  │ Soma todas as origens  │  │ Filtra apenas itens │  │ Agrupa por CNPJ   │  │
│  │ (Clínica + B2B + Caixa)│  │ PF c/ Declarar = Sim│  │ (Empresa 1, 2...) │  │
│  │ -> Alimenta Despesas   │  │                     │  │ -> Espelhos NFS-e │  │
│  └────────────────────────┘  └─────────────────────┘  └───────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Modelo de Dados & Segurança

- **Perfis de Faturamento do Profissional (no documento do usuário):**
  - Lista estruturada contendo `id`, `via` (`PF` ou `PJ`), `subtipo` (`conta_cpf`, `dinheiro_fisico` ou `empresa_cnpj`), `apelido`, `padrao` (booleano), `declararIr` (booleano), além dos dados específicos de PF (Nome do titular, CPF, Chave Pix) ou PJ (Razão Social, Nome Fantasia, CNPJ, Inscrição Municipal, CNAE, Endereço, Chave Pix PJ, Banco/Agência/Conta).
- **Vínculo nas Sessões e Serviços:**
  - Cada ficha (paciente ou empresa) armazena o `perfilFaturamentoId` padrão (mantendo `perfilFaturamento: "PF" | "PJ"` sincronizado para compatibilidade).
  - Cada linha de sessão/serviço suporta `perfilFaturamentoId` opcional (quando diferente do padrão da ficha) e `declararIrOverride` opcional para flexibilidade total linha a linha.
- **Coleção de Empresas B2B do Profissional (Banco de Dados + Regras de Segurança):**
  - Documentos vinculados exclusivamente ao `profissionalId` autenticado, contendo dados cadastrais/fiscais da empresa tomadora, contatos do RH/Financeiro, status comercial, lista de `historicoServicos` (linhas de faturamento B2B), `registrosBordo` (atas e entregáveis), dados de contrato/proposta e `agendamentos` sincronizados quando houver data e hora definidas.
  - Regras de segurança estritas garantindo que apenas o próprio profissional dono da carteira possa listar, criar, editar ou excluir suas empresas clientes B2B.

### Mapeamento de Interações & Estados
- **CRUD de Perfis de Faturamento:** criação, edição, definição de perfil principal e exclusão segura (impedindo deixar a lista vazia e migrando automaticamente para o perfil padrão).
- **Planilha em Linhas B2B:** adição instantânea de serviço, edição inline com salvamento reativo de data, descrição, modalidade, status de execução, valor, status de NF, status/forma de pagamento e perfil emissor; duplicação em 1 clique para recorrências mensais; modal de confirmação in-app para exclusão.
- **Sincronização Ponta a Ponta:** alterações de serviços realizados ou pagos na Ficha de Bordo da Empresa refletem imediatamente tanto no **Dashboard B2B** da aba quanto no **Faturamento Consolidado** e na **Gestão de Despesas** globais.
