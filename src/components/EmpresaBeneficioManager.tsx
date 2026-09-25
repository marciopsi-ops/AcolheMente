import React, { useState } from "react";
import { 
  Building2, 
  KeyRound, 
  Upload, 
  Sparkles, 
  Copy, 
  Check, 
  Trash2, 
  RefreshCw, 
  Share2, 
  ExternalLink,
  MessageCircle,
  Save,
  Loader2,
  CheckCircle2,
  DollarSign,
  Plus,
  Layers,
  Calendar,
  Briefcase
} from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { 
  CargoEmpresa, 
  ServicoCorporativoConfig, 
  DEFAULT_CARGOS_EMPRESA, 
  DEFAULT_SERVICOS_CORPORATIVOS 
} from "../types/corporativo";

interface EmpresaBeneficioManagerProps {
  empresa: {
    id: string;
    nomeEmpresa?: string;
    codigoAcesso?: string;
    logoUrl?: string;
    slogan?: string;
    beneficioConfig?: {
      cargos?: CargoEmpresa[];
      servicos?: ServicoCorporativoConfig[];
    };
    [key: string]: any;
  };
  onUpdateSuccess?: (updatedData: any) => void;
}

export function EmpresaBeneficioManager({ empresa, onUpdateSuccess }: EmpresaBeneficioManagerProps) {
  const [codigoAcesso, setCodigoAcesso] = useState(empresa.codigoAcesso || "");
  const [logoUrl, setLogoUrl] = useState(empresa.logoUrl || "");
  const [slogan, setSlogan] = useState(
    empresa.slogan || `Cuidando do bem-estar e da saúde mental da equipe ${empresa.nomeEmpresa || "parceira"} em parceria com a AcolheMente.`
  );

  // Cargos e Matriz de Serviços x Cargos
  const [cargos, setCargos] = useState<CargoEmpresa[]>(
    empresa.beneficioConfig?.cargos && empresa.beneficioConfig.cargos.length > 0
      ? empresa.beneficioConfig.cargos
      : DEFAULT_CARGOS_EMPRESA
  );
  const [servicos, setServicos] = useState<ServicoCorporativoConfig[]>(
    empresa.beneficioConfig?.servicos && empresa.beneficioConfig.servicos.length > 0
      ? empresa.beneficioConfig.servicos
      : DEFAULT_SERVICOS_CORPORATIVOS
  );

  const [novoCargoNome, setNovoCargoNome] = useState("");
  const [selectedServicoTab, setSelectedServicoTab] = useState<string>(
    servicos[0]?.servicoId || "terapia_individual_adulto"
  );

  const [isSaving, setIsSaving] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const generateRandomCode = () => {
    const prefix = (empresa.nomeEmpresa || "EMP")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z]/g, "")
      .slice(0, 4)
      .toUpperCase() || "CORP";
    
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const newCode = `${prefix}-${randomNum}`;
    setCodigoAcesso(newCode);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("A imagem selecionada é muito grande. Por favor escolha uma imagem de até 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      if (base64) {
        setLogoUrl(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCopyCode = () => {
    if (!codigoAcesso) return;
    navigator.clipboard.writeText(codigoAcesso);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const getColaboradorShareMessage = () => {
    const code = codigoAcesso || empresa.codigoAcesso || "";
    const corporateLink = code 
      ? `${window.location.origin}/?view=acolhimento&via=corporativo&convenio=${encodeURIComponent(code)}`
      : `${window.location.origin}/?view=acolhimento&via=corporativo`;
    return `Olá, time! 🎉\n\nÉ com muita alegria que informamos que a ${empresa.nomeEmpresa || "nossa empresa"} firmou parceria oficial com o Projeto AcolheMente para oferecer apoio psicológico e cuidado à saúde mental de todos os nossos colaboradores!\n\n🔑 Seu Código de Acesso Corporativo: *${code || "SEU-CODIGO"}*\n\n🔗 Link direto de Acolhimento Corporativo:\n${corporateLink}\n\nComo iniciar seu acolhimento de forma 100% sigilosa e online:\n1. Acesse o link corporativo acima (já com o código do convênio pré-preenchido)\n2. Escolha o profissional e serviço desejado\n3. Inicie seu atendimento com sigilo ético absoluto!\n\nCuidar da sua mente é uma prioridade para nós! 💚`;
  };

  const handleCopyShareMessage = () => {
    navigator.clipboard.writeText(getColaboradorShareMessage());
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2500);
  };

  const handleAddCargo = () => {
    const nome = novoCargoNome.trim();
    if (!nome) return;
    const id = nome
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "_");

    if (cargos.some((c) => c.id === id || c.nome.toLowerCase() === nome.toLowerCase())) {
      alert("Este cargo já está cadastrado.");
      return;
    }

    const newCargo: CargoEmpresa = { id, nome };
    setCargos((prev) => [...prev, newCargo]);
    setNovoCargoNome("");

    // Initialize default prices for this new cargo across all services
    setServicos((prev) =>
      prev.map((s) => ({
        ...s,
        precosPorCargo: {
          ...s.precosPorCargo,
          [id]: {
            valorSessao: 80,
            frequenciaRecomendada: "Semanal (4 sessões/mês)",
            sessoesMesEstimadas: 4,
          },
        },
      }))
    );
  };

  const handleRemoveCargo = (cargoId: string) => {
    if (cargos.length <= 1) {
      alert("A empresa precisa ter ao menos um cargo cadastrado.");
      return;
    }
    if (!confirm("Deseja remover este cargo da tabela de benefícios da empresa?")) return;

    setCargos((prev) => prev.filter((c) => c.id !== cargoId));
    setServicos((prev) =>
      prev.map((s) => {
        const copy = { ...s.precosPorCargo };
        delete copy[cargoId];
        return { ...s, precosPorCargo: copy };
      })
    );
  };

  const handleUpdatePreco = (
    servicoId: string,
    cargoId: string,
    valorSessao: number,
    frequenciaRecomendada: string,
    sessoesMesEstimadas: number
  ) => {
    setServicos((prev) =>
      prev.map((s) => {
        if (s.servicoId !== servicoId) return s;
        return {
          ...s,
          precosPorCargo: {
            ...s.precosPorCargo,
            [cargoId]: {
              valorSessao,
              frequenciaRecomendada,
              sessoesMesEstimadas,
            },
          },
        };
      })
    );
  };

  const handleSave = async () => {
    if (!empresa.id) return;
    setIsSaving(true);
    setFeedback(null);

    try {
      const cleanCode = codigoAcesso.trim().toUpperCase();
      const updates = {
        codigoAcesso: cleanCode,
        logoUrl: logoUrl.trim(),
        slogan: slogan.trim(),
        beneficioCorporativoAtivo: true,
        beneficioConfig: {
          cargos,
          servicos,
        },
      };

      await updateDoc(doc(db, "empresa_leads", empresa.id), updates);
      
      setFeedback("Configurações do benefício corporativo salvas com sucesso!");
      if (onUpdateSuccess) {
        onUpdateSuccess(updates);
      }
      setTimeout(() => setFeedback(null), 3500);
    } catch (err) {
      console.error("Erro ao salvar benefício corporativo da empresa:", err);
      alert("Erro ao salvar dados do benefício. Verifique a conexão.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="bg-white p-6 rounded-2xl border border-soft shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-soft pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sun-light flex items-center justify-center text-forest shadow-2xs">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-serif text-lg font-bold text-forest">
              Benefício Corporativo & Acesso de Colaboradores
            </h4>
            <p className="text-xs text-forest/70">
              Configure o código, logo e frase para o formulário personalizado de acolhimento dos colaboradores.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="px-5 py-2.5 bg-forest hover:bg-forest/90 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-sun" />
              <span>Salvando...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4 text-sun" />
              <span>Salvar Alterações</span>
            </>
          )}
        </button>
      </div>

      {feedback && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-medium flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Grid de Configurações */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 1. Código de Acesso da Empresa */}
        <div className="space-y-3 bg-warm/30 p-4 rounded-2xl border border-soft">
          <label className="text-xs font-bold uppercase tracking-wider text-forest/80 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-forest/60" /> Código Alfanumérico da Empresa
            </span>
            <button
              type="button"
              onClick={generateRandomCode}
              className="text-[10px] font-bold text-sun-dark hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" /> Gerar Automático
            </button>
          </label>

          <div className="flex gap-2">
            <input 
              type="text"
              value={codigoAcesso}
              onChange={(e) => setCodigoAcesso(e.target.value.toUpperCase())}
              placeholder="Ex: EMP-1234 ou NOME-CORP"
              className="flex-1 font-mono font-bold text-sm tracking-wider uppercase px-4 py-2.5 bg-white border border-soft rounded-xl focus:outline-none focus:border-sun-dark text-forest"
            />
            <button
              type="button"
              onClick={handleCopyCode}
              disabled={!codigoAcesso}
              title="Copiar Código"
              className="px-3.5 py-2.5 bg-white border border-soft hover:bg-warm rounded-xl text-forest transition-colors flex items-center justify-center cursor-pointer disabled:opacity-40"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-forest/60">
            Este código é repassado aos funcionários da empresa para desbloquear o formulário corporativo exclusivo.
          </p>
        </div>

        {/* 2. Logo da Empresa */}
        <div className="space-y-3 bg-warm/30 p-4 rounded-2xl border border-soft">
          <label className="text-xs font-bold uppercase tracking-wider text-forest/80 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-forest/60" /> Logo da Empresa Parceira
            </span>
            {logoUrl && (
              <button
                type="button"
                onClick={() => setLogoUrl("")}
                className="text-[10px] text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" /> Remover Logo
              </button>
            )}
          </label>

          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white border border-soft flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt="Logo preview" 
                  className="w-full h-full object-contain p-1" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Building2 className="w-6 h-6 text-forest/30" />
              )}
            </div>

            <div className="flex-1 space-y-1.5">
              <label className="inline-block px-3 py-1.5 bg-white border border-soft hover:bg-warm text-forest text-xs font-bold rounded-xl cursor-pointer shadow-2xs transition-colors">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                  className="hidden" 
                />
                Selecionar Imagem do Logo
              </label>
              <input 
                type="text"
                value={logoUrl.startsWith("data:") ? "(Imagem em Base64 carregada)" : logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="Ou cole a URL direta da imagem..."
                className="w-full text-xs px-3 py-1.5 bg-white border border-soft rounded-lg focus:outline-none focus:border-sun-dark text-forest truncate"
              />
            </div>
          </div>
          <p className="text-[11px] text-forest/60">
            Aparecerá no topo da página de acolhimento quando o colaborador digitar o código da empresa.
          </p>
        </div>

      </div>

      {/* 3. Slogan e Frase de Parceria */}
      <div className="space-y-3 bg-warm/30 p-4 rounded-2xl border border-soft">
        <label className="text-xs font-bold uppercase tracking-wider text-forest/80 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-forest/60" /> Frase de Parceria / Slogan de Boas-Vindas
        </label>
        
        <textarea
          rows={2}
          value={slogan}
          onChange={(e) => setSlogan(e.target.value)}
          placeholder="Ex: Cuidando do bem-estar e da mente de quem faz nossa empresa crescer todos os dias."
          className="w-full text-xs p-3 bg-white border border-soft rounded-xl focus:outline-none focus:border-sun-dark text-forest resize-none"
        />

        <div className="flex flex-wrap gap-2 pt-1">
          <span className="text-[10px] font-bold text-forest/50 self-center">Sugestões rápidas:</span>
          {[
            `Cuidando da saúde emocional da equipe ${empresa.nomeEmpresa || "parceira"}.`,
            "Sua mente em primeiro lugar. Um benefício exclusivo para nosso time.",
            "Apoio psicológico de qualidade para sua jornada pessoal e profissional."
          ].map((sug, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSlogan(sug)}
              className="text-[10px] bg-white border border-soft hover:bg-warm px-2.5 py-1 rounded-lg text-forest/80 transition-colors cursor-pointer"
            >
              {sug.slice(0, 45)}...
            </button>
          ))}
        </div>
      </div>

      {/* 4. Matriz de Cargos e Faixas de Valor por Serviço (Personalizado por Empresa) */}
      <div className="space-y-5 bg-white p-5 rounded-2xl border border-soft shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-soft pb-3">
          <div>
            <h5 className="font-serif text-base font-bold text-forest flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-sun-dark" />
              Faixas de Valor & Frequência por Cargo
            </h5>
            <p className="text-xs text-forest/70">
              Personalize os valores de coparticipação e frequência sugerida para cada cargo e serviço oferecido pela empresa.
            </p>
          </div>
          <span className="px-2.5 py-1 bg-sun-light/60 text-forest text-[11px] font-bold rounded-lg self-start sm:self-auto">
            {cargos.length} cargos ativos
          </span>
        </div>

        {/* Gestão de Cargos da Empresa */}
        <div className="p-4 bg-warm/30 rounded-xl border border-soft space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-forest/80 flex items-center gap-1.5">
            <Briefcase className="w-4 h-4 text-forest/60" /> Cargos / Níveis Cadastrados para esta Empresa:
          </label>

          <div className="flex flex-wrap gap-2 items-center">
            {cargos.map((c) => (
              <div
                key={c.id}
                className="px-3 py-1.5 bg-white border border-soft rounded-xl text-xs font-semibold text-forest flex items-center gap-2 shadow-2xs"
              >
                <span>{c.nome}</span>
                {cargos.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveCargo(c.id)}
                    title="Remover cargo"
                    className="text-forest/40 hover:text-red-500 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-1 max-w-md">
            <input
              type="text"
              value={novoCargoNome}
              onChange={(e) => setNovoCargoNome(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddCargo()}
              placeholder="Adicionar novo cargo (Ex: Estagiário, Especialista)..."
              className="flex-1 text-xs px-3 py-2 bg-white border border-soft rounded-xl focus:outline-none focus:border-sun-dark text-forest"
            />
            <button
              type="button"
              onClick={handleAddCargo}
              disabled={!novoCargoNome.trim()}
              className="px-3.5 py-2 bg-forest text-white rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-forest/90 disabled:opacity-40 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar
            </button>
          </div>
        </div>

        {/* Abas dos Serviços */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-forest/80 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-forest/60" /> Selecione o Serviço para configurar a Tabela:
          </label>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {servicos.map((serv) => {
              const isActive = selectedServicoTab === serv.servicoId;
              return (
                <button
                  key={serv.servicoId}
                  type="button"
                  onClick={() => setSelectedServicoTab(serv.servicoId)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "bg-forest text-white shadow-xs"
                      : "bg-warm/60 text-forest/70 hover:bg-warm hover:text-forest border border-soft"
                  }`}
                >
                  {serv.nome}
                </button>
              );
            })}
          </div>

          {/* Tabela de Preços do Serviço Ativo */}
          {(() => {
            const currentServ = servicos.find((s) => s.servicoId === selectedServicoTab) || servicos[0];
            if (!currentServ) return null;

            return (
              <div className="border border-soft rounded-xl overflow-hidden bg-white shadow-2xs">
                <div className="p-3.5 bg-warm/20 border-b border-soft flex items-center justify-between">
                  <div className="text-xs">
                    <span className="font-bold text-forest">{currentServ.nome}</span>
                    <span className="text-forest/60 ml-2 text-[11px]">— {currentServ.descricao}</span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-warm/40 text-forest/80 font-bold uppercase tracking-wider border-b border-soft text-[10px]">
                      <tr>
                        <th className="py-2.5 px-4">Cargo / Função</th>
                        <th className="py-2.5 px-4">Valor por Sessão</th>
                        <th className="py-2.5 px-4">Frequência Recomendada</th>
                        <th className="py-2.5 px-4">Sessões / Mês</th>
                        <th className="py-2.5 px-4">Previsão Mensal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-soft/60">
                      {cargos.map((cargo) => {
                        const precoInfo = currentServ.precosPorCargo[cargo.id] || {
                          valorSessao: 80,
                          frequenciaRecomendada: "Semanal (4 sessões/mês)",
                          sessoesMesEstimadas: 4,
                        };
                        const totalMes = precoInfo.valorSessao * precoInfo.sessoesMesEstimadas;

                        return (
                          <tr key={cargo.id} className="hover:bg-warm/10 transition-colors">
                            <td className="py-3 px-4 font-bold text-forest">
                              {cargo.nome}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1">
                                <span className="text-forest/60 font-medium">R$</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="5"
                                  value={precoInfo.valorSessao}
                                  onChange={(e) => {
                                    const val = Math.max(0, Number(e.target.value) || 0);
                                    handleUpdatePreco(
                                      currentServ.servicoId,
                                      cargo.id,
                                      val,
                                      precoInfo.frequenciaRecomendada,
                                      precoInfo.sessoesMesEstimadas
                                    );
                                  }}
                                  className="w-20 px-2 py-1 border border-soft rounded-lg bg-white font-bold text-forest text-xs focus:outline-none focus:border-sun-dark"
                                />
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <select
                                value={precoInfo.frequenciaRecomendada}
                                onChange={(e) => {
                                  const freq = e.target.value;
                                  const sessoes = freq.toLowerCase().includes("quinzenal") ? 2 : 4;
                                  handleUpdatePreco(
                                    currentServ.servicoId,
                                    cargo.id,
                                    precoInfo.valorSessao,
                                    freq,
                                    sessoes
                                  );
                                }}
                                className="px-2 py-1 border border-soft rounded-lg bg-white text-forest text-xs focus:outline-none focus:border-sun-dark cursor-pointer font-medium"
                              >
                                <option value="Semanal (4 sessões/mês)">Semanal (4 sessões/mês)</option>
                                <option value="Quinzenal (2 sessões/mês)">Quinzenal (2 sessões/mês)</option>
                                <option value="Conforme indicação clínica">Conforme indicação clínica</option>
                              </select>
                            </td>
                            <td className="py-3 px-4">
                              <input
                                type="number"
                                min="1"
                                max="10"
                                value={precoInfo.sessoesMesEstimadas}
                                onChange={(e) => {
                                  const sessoes = Math.max(1, Number(e.target.value) || 1);
                                  handleUpdatePreco(
                                    currentServ.servicoId,
                                    cargo.id,
                                    precoInfo.valorSessao,
                                    precoInfo.frequenciaRecomendada,
                                    sessoes
                                  );
                                }}
                                className="w-14 px-2 py-1 border border-soft rounded-lg bg-white font-bold text-forest text-xs text-center focus:outline-none focus:border-sun-dark"
                              />
                            </td>
                            <td className="py-3 px-4 font-bold text-forest">
                              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs">
                                R$ {totalMes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* 5. Divulgação para Colaboradores (WhatsApp / RH) */}
      <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h5 className="font-bold text-xs text-emerald-950 flex items-center gap-2">
            <Share2 className="w-4 h-4 text-emerald-700" />
            Divulgação Rápida para o RH e Colaboradores
          </h5>
          <p className="text-[11px] text-emerald-900/80 leading-relaxed max-w-lg">
            Copie o comunicado com as instruções prontas para compartilhar por e-mail ou WhatsApp com o setor de RH ou diretamente com os colaboradores.
          </p>
        </div>

        <button
          type="button"
          onClick={handleCopyShareMessage}
          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 shrink-0 cursor-pointer"
        >
          {copiedMsg ? (
            <>
              <Check className="w-4 h-4" />
              <span>Copiado com Sucesso!</span>
            </>
          ) : (
            <>
              <MessageCircle className="w-4 h-4" />
              <span>Copiar Mensagem de Divulgação</span>
            </>
          )}
        </button>
      </div>
    </section>
  );
}
