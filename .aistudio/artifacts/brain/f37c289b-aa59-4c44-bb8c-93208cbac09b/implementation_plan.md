# Plano de Implementação: Página White-Label & Cartão Virtual do Profissional (Plano Avançado)

## 1. Visão Geral do Requisito
Permitir que profissionais com **Plano Avançado** configurem uma página pública independente (Cartão Virtual na internet), sem menção ao Acolimente, ideal para atrair clientes externos.
- **Customização Visual**: Paleta de cores (fundo, primária, secundária), foto do profissional e logotipo da empresa/CNPJ.
- **Dados Corporativos**: Razão Social, CNPJ, endereço e contatos corporativos.
- **Catálogo de Serviços Independentes**: Cadastro de serviços com precificação própria (fora da tabela da plataforma).
- **Reaproveitamento Inteligente**: Extensão modular da view existente `PublicProfProfileView.tsx`, alternando dinamicamente entre o modo padrão (com branding Acolimente para pacientes da plataforma) e o modo White-Label (para captação externa).

---

## 2. Arquitetura de Dados & Firestore (`users/{uid}`)
Adicionaremos novos campos no documento do usuário (profissional):
- `plano`: `'basico' | 'profissional' | 'avancado'`
- `whiteLabelEnabled`: `boolean`
- `whiteLabelConfig`:
  - `primaryColor`: string (ex: `#4F46E5`)
  - `secondaryColor`: string (ex: `#06B6D4`)
  - `backgroundColor`: string (ex: `#F8FAFC`)
  - `fontFamily`: string
- `companyData`:
  - `razaoSocial`: string
  - `cnpj`: string
  - `enderecoEmpresa`: string
  - `telefoneEmpresa`: string
  - `emailEmpresa`: string
  - `logoEmpresaUrl`: string
- `customServices`: Array de objetos `{ id, title, description, duration, price, active }` (ou subcoleção `servicos_customizados`).

---

## 3. Etapas de Desenvolvimento

### Etapa 1: Painel de Configuração no "Meu Perfil" / Dashboard
- Criar a aba/seção **"Página White-Label & Cartão Virtual"** restrita a assinantes do Plano Avançado (com componente de Feature Gate para upgrade caso não seja avançado).
- Formulários intuitivos para:
  1. **Aparência**: Seletor de cores, preview em tempo real.
  2. **Dados da Empresa / CNPJ**: Campos de CNPJ (com máscara), Razão Social, Logo da Empresa (upload/URL).
  3. **Serviços Particulares**: Gerenciador (CRUD) de serviços customizados com preços livres.

### Etapa 2: Adaptação da `PublicProfProfileView.tsx` (Modo Dual)
- Inspecionar se `prof.whiteLabelEnabled && prof.plano === 'avancado'`.
- Quando ativo:
  - Ocultar rodapé padrão do Acolimente, selos de triagem acessível da plataforma e chamadas para o ecossistema Acolimente.
  - Aplicar estilos inline ou classes dinâmicas baseadas nas cores configuradas (`whiteLabelConfig`).
  - Exibir tanto o avatar do profissional quanto o logotipo da empresa (`companyData.logoEmpresaUrl`).
  - Exibir rodapé corporativo com CNPJ e dados fiscais do profissional/empresa.
  - Substituir ou suplementar o catálogo de serviços pela aba **"Serviços & Consultas Particulares"** com os preços definidos pelo profissional.

### Etapa 3: Testes de Usabilidade e Roteamento
- Validar acesso direto via link público (`/?view=prof_profile&prof=UID`).
- Garantir comportamento responsivo impecável em celulares (cartão virtual ideal para WhatsApp e Instagram Bio).

---

## 4. Próximos Passos
Aguardando aprovação deste plano para iniciar a implementação técnica dos componentes e ajustes de persistência no Firestore.
