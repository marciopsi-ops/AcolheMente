export type TipoDocumentoPsicologico = 
  | "declaracao" 
  | "atestado" 
  | "relatorio" 
  | "laudo" 
  | "parecer"
  | "certificado";

export interface SecaoDocumento {
  id: string;
  titulo: string;
  conteudo: string;
}

export interface PerfilProfissionalEmissao {
  nome: string;
  profissao: string;
  crp: string;
  contato: string;
  cnpj?: string;
  nomeEmpresa?: string;
  enderecoProfissional?: string;
}

export interface AssinaturaDocumento {
  tipo: "desenhada" | "imagem";
  dados: string; // base64 data url
}

export interface DocumentoPsicologicoItem {
  id: string;
  profissionalId: string;
  pacienteId: string;
  pacienteNome: string;
  tipo: TipoDocumentoPsicologico;
  titulo: string;
  conteudo: string; // fallback / resumo geral
  secoes: SecaoDocumento[];
  dadosPacienteIncluidos: string[]; // ['nome', 'nascimento', 'cpf', 'rg', 'endereco', 'telefone']
  perfilProfissionalUsado: PerfilProfissionalEmissao;
  assinatura: AssinaturaDocumento;
  configuracaoPaginas: number; // 1, 2, 3...
  codigoAcesso: string;
  senhaAcesso?: string;
  finalidade: string;
  observacoes?: string;
  dataEmissao: string;
  numeroEmissao: string;
  status: "emitido" | "rascunho";
  whiteLabelEnabled?: boolean;
  whiteLabelConfig?: any;
  companyData?: any;
  createdAt: any;
  updatedAt: any;
}
