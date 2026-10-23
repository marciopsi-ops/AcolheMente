import React, { useState } from "react";
import {
  X,
  Link2,
  Copy,
  ExternalLink,
  Sliders,
  Sparkles,
  Settings,
  DollarSign,
  Calendar,
  Tag,
  Check,
  Share2,
  Phone,
  MessageCircle,
  HelpCircle,
  Save,
  CheckCircle2,
} from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

interface ParametrizarLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  profUid: string;
  profile: any;
  onUpdateProfile?: (updated: any) => void;
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
}

export function ParametrizarLinkModal({
  isOpen,
  onClose,
  profUid,
  profile,
  onUpdateProfile,
  showToast,
}: ParametrizarLinkModalProps) {
  const [activeTab, setActiveTab] = useState<"gerador" | "configuracoes">("gerador");

  // 1. Estados do Gerador de Links
  const [valorSessao, setValorSessao] = useState(profile?.configFormularioExterno?.valorPadrao || "");
  const [modalidade, setModalidade] = useState(profile?.configFormularioExterno?.modalidadePadrao || "online");
  const [frequencia, setFrequencia] = useState("semanal");
  const [origem, setOrigem] = useState("Instagram");
  const [origemCustom, setOrigemCustom] = useState("");
  const [copiou, setCopiou] = useState(false);

  // 2. Estados das Configurações Gerais do Formulário
  const existingConfig = profile?.configFormularioExterno || {};
  const [tituloPersonalizado, setTituloPersonalizado] = useState(
    existingConfig.tituloPersonalizado || "Ficha de Cadastro do Paciente"
  );
  const [mensagemBoasVindas, setMensagemBoasVindas] = useState(
    existingConfig.mensagemBoasVindas ||
      "Olá! Por favor, preencha seus dados abaixo para cadastro seguro no consultório."
  );
  const [solicitarEndereco, setSolicitarEndereco] = useState(
    existingConfig.solicitarEndereco !== false
  );
  const [solicitarQueixaPrincipal, setSolicitarQueixaPrincipal] = useState(
    existingConfig.solicitarQueixaPrincipal !== false
  );
  const [solicitarDisponibilidade, setSolicitarDisponibilidade] = useState(
    existingConfig.solicitarDisponibilidade !== false
  );
  const [solicitarContatoEmergencia, setSolicitarContatoEmergencia] = useState(
    existingConfig.solicitarContatoEmergencia !== false
  );
  const [valorPadraoConfig, setValorPadraoConfig] = useState(
    existingConfig.valorPadrao || ""
  );
  const [modalidadePadraoConfig, setModalidadePadraoConfig] = useState(
    existingConfig.modalidadePadrao || "ambas"
  );
  const [savingConfig, setSavingConfig] = useState(false);

  if (!isOpen) return null;

  // Montagem da URL parametrizada
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const params = new URLSearchParams();
  params.set("prof", profUid);
  if (valorSessao.trim()) params.set("valor", valorSessao.trim());
  if (modalidade && modalidade !== "ambas") params.set("modalidade", modalidade);
  if (frequencia) params.set("frequencia", frequencia);
  const finalOrigem = origem === "Outro" ? origemCustom.trim() : origem;
  if (finalOrigem) params.set("origem", finalOrigem);
  const urlParametrizada = `${baseUrl}/?view=cadastro_externo&${params.toString()}`;

  const handleCopyLink = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(urlParametrizada);
      setCopiou(true);
      showToast("Link parametrizado copiado para a área de transferência!", "success");
      setTimeout(() => setCopiou(false), 2500);
    }
  };

  const handleShareWhatsApp = () => {
    const texto = `Olá! Segue o link exclusivo para preencher seus dados de cadastro para darmos início aos nossos atendimentos:\n\n${urlParametrizada}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
  };

  const handleSaveConfigs = async () => {
    setSavingConfig(true);
    try {
      const configFormularioExterno = {
        tituloPersonalizado: tituloPersonalizado.trim(),
        mensagemBoasVindas: mensagemBoasVindas.trim(),
        solicitarEndereco,
        solicitarQueixaPrincipal,
        solicitarDisponibilidade,
        solicitarContatoEmergencia,
        valorPadrao: valorPadraoConfig.trim(),
        modalidadePadrao: modalidadePadraoConfig,
      };

      await updateDoc(doc(db, "users", profUid), {
        configFormularioExterno,
      });

      if (onUpdateProfile && profile) {
        onUpdateProfile({ ...profile, configFormularioExterno });
      }

      showToast("Configurações do formulário salvas com sucesso!", "success");
    } catch (err) {
      console.error("Erro ao salvar configurações do formulário:", err);
      showToast("Erro ao salvar configurações.", "error");
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-soft flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-forest to-emerald-950 p-5 sm:p-6 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-300">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold">
                Parametrização do Link de Cadastro
              </h3>
              <p className="text-xs text-emerald-100/70">
                Personalize o formulário público que seus pacientes particulares preenchem
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Abas */}
        <div className="flex border-b border-soft bg-warm/30 px-6 pt-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("gerador")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-all ${
              activeTab === "gerador"
                ? "border-emerald-600 text-emerald-800 bg-white rounded-t-xl"
                : "border-transparent text-forest/70 hover:text-forest"
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Gerador de Link Inteligente</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("configuracoes")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-all ${
              activeTab === "configuracoes"
                ? "border-emerald-600 text-emerald-800 bg-white rounded-t-xl"
                : "border-transparent text-forest/70 hover:text-forest"
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Configurações do Formulário</span>
          </button>
        </div>

        {/* Conteúdo Scrollável */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {activeTab === "gerador" ? (
            <div className="space-y-5">
              <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 text-xs text-emerald-950 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Gere links personalizados para enviar diretamente aos seus pacientes ou colocar na sua bio.
                  Ao abrir o link, o formulário já virá <strong>pré-preenchido</strong> com as condições acordadas (como valor da sessão e modalidade).
                </p>
              </div>

              {/* Grid de Parâmetros */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-forest mb-1">
                    Valor da Sessão (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-forest/50">
                      R$
                    </span>
                    <input
                      type="text"
                      value={valorSessao}
                      onChange={(e) => setValorSessao(e.target.value)}
                      placeholder="Ex: 150,00 (ou em branco)"
                      className="w-full pl-9 pr-3 py-2 bg-white border border-soft rounded-xl text-xs sm:text-sm text-forest focus:outline-none focus:border-emerald-500 font-semibold"
                    />
                  </div>
                  <span className="text-[10px] text-forest/60 mt-0.5 block">
                    Deixe em branco para o valor não ser exibido ou a combinar.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-forest mb-1">
                    Modalidade do Atendimento
                  </label>
                  <select
                    value={modalidade}
                    onChange={(e) => setModalidade(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-soft rounded-xl text-xs sm:text-sm text-forest focus:outline-none focus:border-emerald-500 font-semibold cursor-pointer"
                  >
                    <option value="online">Online (Videochamada)</option>
                    <option value="presencial">Presencial (Consultório)</option>
                    <option value="ambas">Ambas (Permitir paciente escolher)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-forest mb-1">
                    Frequência Sugerida
                  </label>
                  <select
                    value={frequencia}
                    onChange={(e) => setFrequencia(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-soft rounded-xl text-xs sm:text-sm text-forest focus:outline-none focus:border-emerald-500 font-semibold cursor-pointer"
                  >
                    <option value="semanal">Semanal (1x por semana)</option>
                    <option value="quinzenal">Quinzenal</option>
                    <option value="2x por semana">2x por semana</option>
                    <option value="mensal">Mensal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-forest mb-1">
                    Origem / Canal de Divulgação
                  </label>
                  <select
                    value={origem}
                    onChange={(e) => setOrigem(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-soft rounded-xl text-xs sm:text-sm text-forest focus:outline-none focus:border-emerald-500 font-semibold cursor-pointer"
                  >
                    <option value="Instagram">Instagram (Link da Bio)</option>
                    <option value="WhatsApp">WhatsApp Direto</option>
                    <option value="Google">Google / Meu Negócio</option>
                    <option value="Indicacao">Indicação</option>
                    <option value="Site">Site Pessoal</option>
                    <option value="Outro">Outro Canal Personalizado</option>
                  </select>
                  {origem === "Outro" && (
                    <input
                      type="text"
                      value={origemCustom}
                      onChange={(e) => setOrigemCustom(e.target.value)}
                      placeholder="Nome do canal ou campanha"
                      className="w-full mt-2 px-3 py-1.5 bg-white border border-soft rounded-lg text-xs text-forest focus:outline-none focus:border-emerald-500"
                    />
                  )}
                </div>
              </div>

              {/* Caixa com o Link Gerado */}
              <div className="p-4 bg-warm/50 rounded-2xl border border-soft flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-forest flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-forest/70" />
                    Link Personalizado Gerado
                  </span>
                  {copiou && (
                    <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Copiado com sucesso!
                    </span>
                  )}
                </div>

                <div className="p-3 bg-white rounded-xl border border-soft font-mono text-xs text-forest/80 break-all select-all">
                  {urlParametrizada}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-4 py-2 bg-forest hover:bg-forest/90 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Link</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="px-4 py-2 bg-[#25D366] hover:bg-[#20b858] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Enviar no WhatsApp</span>
                  </button>

                  <a
                    href={urlParametrizada}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 bg-white hover:bg-warm border border-soft text-forest rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-forest/70" />
                    <span>Testar Formulário</span>
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="p-4 bg-warm/40 rounded-2xl border border-soft text-xs text-forest/80">
                Configure os campos e mensagens padrão que serão exibidos no seu formulário público de pacientes externos.
              </div>

              {/* Título & Mensagem */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-forest mb-1">
                    Título do Formulário
                  </label>
                  <input
                    type="text"
                    value={tituloPersonalizado}
                    onChange={(e) => setTituloPersonalizado(e.target.value)}
                    placeholder="Ex: Consultório de Psicologia • Ficha de Cadastro"
                    className="w-full px-3.5 py-2.5 bg-white border border-soft rounded-xl text-xs sm:text-sm text-forest focus:outline-none focus:border-emerald-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-forest mb-1">
                    Mensagem de Boas-Vindas aos Pacientes
                  </label>
                  <textarea
                    rows={2}
                    value={mensagemBoasVindas}
                    onChange={(e) => setMensagemBoasVindas(e.target.value)}
                    placeholder="Texto de acolhimento que aparecerá no topo do formulário..."
                    className="w-full px-3.5 py-2.5 bg-white border border-soft rounded-xl text-xs sm:text-sm text-forest focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Valores Padrão */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-soft">
                <div>
                  <label className="block text-xs font-bold text-forest mb-1">
                    Valor Padrão da Sessão (R$)
                  </label>
                  <input
                    type="text"
                    value={valorPadraoConfig}
                    onChange={(e) => setValorPadraoConfig(e.target.value)}
                    placeholder="Ex: 150,00"
                    className="w-full px-3.5 py-2.5 bg-white border border-soft rounded-xl text-xs sm:text-sm text-forest focus:outline-none focus:border-emerald-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-forest mb-1">
                    Modalidade Padrão Sugerida
                  </label>
                  <select
                    value={modalidadePadraoConfig}
                    onChange={(e) => setModalidadePadraoConfig(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-soft rounded-xl text-xs sm:text-sm text-forest focus:outline-none focus:border-emerald-500 font-semibold cursor-pointer"
                  >
                    <option value="ambas">Ambas (Online ou Presencial)</option>
                    <option value="online">Exclusivamente Online</option>
                    <option value="presencial">Exclusivamente Presencial</option>
                  </select>
                </div>
              </div>

              {/* Switches de Campos Opcionais */}
              <div className="space-y-3 pt-2 border-t border-soft">
                <span className="block text-xs font-bold text-forest uppercase tracking-wider">
                  Campos Ativos no Formulário
                </span>

                <div className="space-y-2">
                  <label className="flex items-center justify-between p-3 rounded-xl border border-soft bg-warm/20 hover:bg-warm/40 transition-colors cursor-pointer">
                    <span className="text-xs font-semibold text-forest">
                      Solicitar Endereço Residencial (CEP, Rua, Cidade)
                    </span>
                    <input
                      type="checkbox"
                      checked={solicitarEndereco}
                      onChange={(e) => setSolicitarEndereco(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl border border-soft bg-warm/20 hover:bg-warm/40 transition-colors cursor-pointer">
                    <span className="text-xs font-semibold text-forest">
                      Solicitar Queixa Principal / Motivo da Busca
                    </span>
                    <input
                      type="checkbox"
                      checked={solicitarQueixaPrincipal}
                      onChange={(e) => setSolicitarQueixaPrincipal(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl border border-soft bg-warm/20 hover:bg-warm/40 transition-colors cursor-pointer">
                    <span className="text-xs font-semibold text-forest">
                      Solicitar Disponibilidade de Dias e Horários (Turnos)
                    </span>
                    <input
                      type="checkbox"
                      checked={solicitarDisponibilidade}
                      onChange={(e) => setSolicitarDisponibilidade(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl border border-soft bg-warm/20 hover:bg-warm/40 transition-colors cursor-pointer">
                    <span className="text-xs font-semibold text-forest">
                      Solicitar Contato de Emergência
                    </span>
                    <input
                      type="checkbox"
                      checked={solicitarContatoEmergencia}
                      onChange={(e) => setSolicitarContatoEmergencia(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* Botão de Salvar Configurações */}
              <div className="pt-3">
                <button
                  type="button"
                  disabled={savingConfig}
                  onClick={handleSaveConfigs}
                  className="w-full py-3 bg-forest hover:bg-forest/90 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingConfig ? "Salvando..." : "Salvar Configurações do Formulário"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
