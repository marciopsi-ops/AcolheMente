export interface CampanhaMesData {
  mes: number; // 1 a 12
  id: string;
  nomeCampanha: string;
  subtitulo: string;
  lacoEmoji: string;
  corTemaHex: string;
  badgeBgClass: string;
  badgeTextClass: string;
  btnSecundarioBgClass: string;
  btnSecundarioTextClass: string;
  frasePrincipal: string;
  fraseComplementar: string;
  imagemFundoUrl: string;
  // Chaves seletoras e textos dos botões de ação
  exibirBotoes?: boolean; // Se false, oculta todos os botões do banner deste tema
  exibirBotaoPrincipal?: boolean; // Se false, oculta o botão primário (ex: Iniciar Acolhimento)
  botaoPrincipalTexto: string;
  exibirBotaoSecundario?: boolean; // Se false, oculta o botão secundário (ex: Apoio Imediato 188)
  botaoSecundarioTexto: string;
  botaoSecundarioAcao: "cvv" | "acolhimento" | "link";
  linkSecundarioUrl?: string;
  modalTitulo?: string;
  modalTexto?: string;
}

export interface CampanhasConfigState {
  bannerAtivo: boolean;
  modoExibicao: "automatico" | "manual";
  mesManual: number; // 1 a 12
  exibirBotoesGeral?: boolean; // Chave seletora mestra para exibir/ocultar botões em todos os banners
  customizacoes: Record<number, Partial<CampanhaMesData>>;
}
