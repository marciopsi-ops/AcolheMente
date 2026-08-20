export interface ArtigoBlog {
  id?: string;
  titulo: string;
  resumo: string;
  conteudo: string; // Markdown / formatted text
  conteudoHtml?: string;
  autorNome: string;
  autorUid?: string;
  autorProfissao?: string;
  autorFoto?: string;
  palavrasChave: string[];
  categoria?: string;
  capaUrl?: string;
  tempoLeitura?: string;
  status: 'publicado' | 'pendente' | 'rascunho' | 'rejeitado';
  motivoRejeicao?: string;
  revisadoPor?: string;
  revisadoEm?: any;
  visualizacoes?: number;
  curtidas?: number;
  createdAt?: any;
  updatedAt?: any;
}
