# Sistema de Backup & Custódia de Dados (Profissional e Gestão)

Plataforma integrada de proteção e custódia documental com exportação física estruturada (JSON de restauração + relatório clínico/administrativo legível) e envio com 1 clique para o Google Drive do usuário, equipada com filtragem temporal por período e isolamento de sigilo profissional conforme resoluções do CFP e LGPD.

### User Review & Critical Decisions

> [!IMPORTANT]
> As decisões essenciais de arquitetura e usabilidade foram definidas e alinhadas:
> - **Nuvem Econômica e Direta**: Salvamento direto no **Google Drive pessoal** do profissional e da gestão via OAuth 2.0 com escopo restrito (`drive.file`), sem nenhum custo de servidor ou storage para a plataforma.
> - **Pacote Físico Duplo**: O download gera tanto o arquivo estruturado completo (`.json` para restauração do sistema) quanto o relatório legível (`.csv` / `.html` legível para auditoria clínica e prontuário médico de 5 anos exigido pelo CFP).
> - **Acesso Dedicado**: Uma nova aba **"Backup & Custódia"** no menu principal de navegação tanto para o Profissional quanto para a Gestão, com visual padronizado e compacto.

- **Decisão Confirmada 1 (Nuvem)**: Google Drive direto do usuário (`drive.file`), transferindo o arquivo gerado do navegador para o Drive do psicólogo/gestor sem intermediários.
- **Decisão Confirmada 2 (Formato Físico)**: Pacote duplo com JSON para restauração técnica integral e relatório em planilha/CSV legível para conferência de prontuários, evoluções e faturamentos.
- **Decisão Confirmada 3 (Localização)**: Aba dedicada de navegação ("Backup & Custódia") padronizada no menu superior para todos os perfis com acesso contextualizado.

---

### 1. Overview & Core Concept

- **O que faz**: Oferece ao profissional de psicologia e à equipe de gestão o controle total sobre a segurança e custódia de seus dados. Permite filtrar por períodos específicos (ex.: *Todo o histórico*, *Últimos 30 dias*, *Últimos 3 meses*, *Ano atual*, ou *Período personalizado com data inicial e final*) e gerar cópias de segurança físicas (download instantâneo no computador) ou sincronizar na nuvem (Google Drive) com um clique.
- **Público-Alvo**:
  - **Psicólogo / Profissional**: Tem acesso restrito e seguro aos seus pacientes atribuídos, histórico de acolhimentos, notas de evolução/prontuários de atendimento, faturamentos e sessões registradas, esteira de tarefas e seus artigos autorais do blog.
  - **Gestão (Master e Triagem)**: Tem acesso à visão institucional completa da plataforma (usuários, cadastros de empresas, doações, compliance, artigos, eventos, serviços e auditoria financeira).
- **Valor Principal**: Conformidade rigorosa com a **LGPD** e com as **Resoluções CFP nº 001/2009 e 004/2020** (guarda de prontuários por no mínimo 5 anos), permitindo que o profissional tenha portabilidade de dados e segurança jurídica com custo zero de infraestrutura para a plataforma Elo.

---

### 2. User Experience & Visual Design

#### Fluxos Principais do Usuário

1. **Entrada na Aba de Backup**:
   - O profissional clica na aba **"Backup & Custódia"** (ao lado de Tarefas, Pacientes e Faturamento).
   - A tela apresenta um painel limpo com indicadores visuais do status de proteção: data do último backup realizado, volume de pacientes/registros sob sua responsabilidade e atalhos rápidos.

2. **Configuração do Filtro de Período**:
   - Seletor de período rápido:
     - *Todo o histórico*
     - *Últimos 30 dias*
     - *Últimos 3 meses*
     - *Ano corrente*
     - *Intervalo personalizado*: Seleção de `Data Inicial` e `Data Final`.
   - Seletor de módulos (checkboxes elegantes): Pacientes & Triagens, Evoluções & Prontuários, Faturamento & Sessões, Tarefas e Artigos do Blog.

3. **Geração do Backup Físico**:
   - Botão primário **"Baixar Backup no Computador"**:
   - O sistema gera instantaneamente no navegador:
     - `backup_profissional_[nome]_[data].json`: Arquivo técnico de integridade para restauração.
     - `relatorio_prontuarios_[nome]_[data].csv`: Planilha legível detalhada com datas de sessão, nomes, diagnósticos e evoluções clínicas organizadas cronologicamente.

4. **Sincronização com o Google Drive**:
   - Card interativo **"Salvar no Google Drive"**:
   - Se não conectado: Exibe botão elegante "Conectar ao Google Drive" com autenticação segura.
   - Uma vez conectado: Mostra o e-mail Google vinculado, espaço na pasta do Drive do usuário e botão "Enviar Backup para o Google Drive".
   - O arquivo é enviado diretamente para uma pasta organizada no Drive do usuário: `Instituto Elo - Backups/Ano/`.

#### Identidade Visual & Design

- **Estética**: Clínica, segura, profissional e minimalista, alinhada à paleta institucional do Instituto Elo (tons de verde floresta `#2D3B36`, creme suave, bordas delicadas e tipografia refinada).
- **Consistência de Tamanhos**: Textos compactos padronizados com o novo padrão da plataforma (sem banners gigantescos, títulos precisos em `text-base` / `text-lg` e descrição em `text-xs text-forest/70`).
- **Estados Interativos**:
  - Barra de progresso animada durante a coleta dos registros no Firestore.
  - Alertas de sucesso elegantes informando a quantidade de registros protegidos.
  - Alerta de conformidade ética do CFP destacando a confidencialidade dos prontuários.

---

### 3. Key Product Decisions & Trade-Offs

- **Decisão 1: Arquitetura de Nuvem via Google Drive Client-Side (`drive.file`)**
  - *Abordagem*: Autenticação Google OAuth 2.0 solicitando apenas o escopo restrito `https://www.googleapis.com/auth/drive.file` (que só enxerga os arquivos criados pelo próprio Elo, respeitando o princípio de privilégio mínimo).
  - *Por que*: **Custo zero de servidor**, sem necessidade de contratar buckets S3 ou discos externos caros, e garante que a custódia do arquivo fica nas mãos do próprio profissional em sua conta pessoal Google.
  - *Alternativas Consideradas*: Buckets no Firebase Storage ou servidores dedicados (descartados devido a custos recorrentes de armazenamento e transferência).

- **Decisão 2: Isolamento Contextual de Permissões (Profissional vs Gestão)**
  - *Abordagem*: O serviço de backup detecta o perfil ativo:
    - Se `role === 'psicologo'`, filtra estritamente por `responsavelId === uid` ou `responsavelUid === uid` e coleções autorizadas.
    - Se `role === 'master' || role === 'triagem'`, permite exportação e restauração completa de todas as 12 coleções da instituição.
  - *Por que*: Segurança de dados, proteção de sigilo médico-psicológico e conformidade estrita com a LGPD.

- **Decisão 3: Formato Duplo de Exportação (JSON Estruturado + Planilha Legível)**
  - *Abordagem*: Download de dois arquivos complementares com JSON de restauração e planilha formatada de prontuários/faturamento.
  - *Por que*: O JSON permite restauração automatizada pelo sistema se necessário; o CSV permite que o psicólogo abra no Excel ou imprima para auditoria ética do Conselho Regional de Psicologia (CRP).

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

#### Diagrama de Arquitetura do Sistema

```
┌────────────────────────────────────────────────────────────────────────┐
│                   PAINEL ELO (PROFISSIONAL & GESTÃO)                   │
├────────────────────────────────────────────────────────────────────────┤
│  [Aba Backup & Custódia]                                              │
│  ├── Filtro Temporal (30 dias / 90 dias / Ano / Personalizado)         │
│  ├── Seleção de Módulos (Pacientes, Evoluções, Faturamento, Tarefas)   │
│  └── Status do Último Backup & Indicador de Conformidade CFP           │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
         ┌──────────▼──────────┐          ┌──────────▼──────────┐
         │   BACKUP FÍSICO     │          │  GOOGLE DRIVE SYNC  │
         │   (No Navegador)    │          │  (OAuth drive.file) │
         ├─────────────────────┤          ├─────────────────────┤
         │ • .JSON Estruturado │          │ • Token OAuth 2.0   │
         │ • .CSV Prontuários  │          │ • Upload multipart  │
         │ • Download Direto   │          │ • Pasta Automática  │
         └──────────┬──────────┘          └──────────┬──────────┘
                    │                                │
                    └────────────────┬───────────────┘
                                     │
                        ┌────────────▼────────────┐
                        │   FIRESTORE DATABASE    │
                        ├─────────────────────────┤
                        │ • acolhimentos          │
                        │ • evolucoes             │
                        │ • faturamentos / sessões│
                        │ • esteira_tarefas       │
                        │ • artigos_blog          │
                        │ • coleções gestao       │
                        └─────────────────────────┘
```

#### Componentes & Arquivos Envolvidos

1. **`src/lib/backupService.ts`**:
   - Expansão do serviço de backup existente para incluir suporte a:
     - `generateProfissionalBackup(profile, options)`: Coleta e filtragem por período e por `uid` do profissional.
     - `generateCSVExport(dados)`: Conversão dos dados de prontuário e sessões em formato tabular legível.
     - `uploadBackupToGoogleDrive(accessToken, fileData, filename)`: Envio direto via API v3 do Google Drive (`https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`).
2. **`src/lib/googleDriveService.ts`**:
   - Módulo client-side de autenticação com Google Identity Services (GIS) para obter token temporário com o escopo `https://www.googleapis.com/auth/drive.file`.
3. **`src/components/BackupManager.tsx`**:
   - Atualização do componente para suportar tanto o modo **Gestão Global** quanto o modo **Profissional Individual**, com filtros de datas, alternadores de formato e integração com Google Drive.
4. **`src/views/DashboardView.tsx`**:
   - Inclusão do botão da aba **"Backup & Custódia"** na barra de abas do Profissional (além de manter na Gestão).
   - Renderização contextualizada do `BackupManager` com perfil e permissões do usuário logado.
