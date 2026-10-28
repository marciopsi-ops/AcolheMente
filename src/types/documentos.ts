export type TipoDocumentoPsicologico = 
  | "declaracao" 
  | "atestado" 
  | "relatorio" 
  | "laudo" 
  | "parecer";

export interface DocumentoPsicologicoItem {
  id: string;
  profissionalId: string;
  pacienteId: string;
  pacienteNome: string;
  tipo: TipoDocumentoPsicologico;
  titulo: string;
  conteudo: string;
  finalidade: string;
  observacoes?: string;
  dataEmissao: string;
  numeroEmissao: string;
  status: "emitido" | "rascunho";
  createdAt: any;
  updatedAt: any;
}
