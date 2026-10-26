import React, { useState } from "react";
import {
  Sparkles,
  Trash2,
  MapPin,
  Search,
  Loader2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Building2,
  Share2,
  Video,
} from "lucide-react";
import {
  SOCIAL_NETWORKS_META,
  WhatsAppBrandIcon,
  GoogleMapsBrandIcon,
  WazeBrandIcon,
  EnderecoPresencialData,
  buildMapsUrls,
  normalizeSocialUrl,
} from "./SocialBrandIcons";
import { formatCnpj, isValidCnpj, getCnpjValidationError } from "../utils/formatters";

interface WhiteLabelProfileConfigPanelProps {
  profile: any;
  setProfile: (nextProfile: any) => void;
  showToast?: (msg: string, type?: "success" | "error") => void;
}

const UF_LIST = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
  "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
  "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

export function WhiteLabelProfileConfigPanel({
  profile,
  setProfile,
  showToast,
}: WhiteLabelProfileConfigPanelProps) {
  const [cepLoading, setCepLoading] = useState(false);

  const endereco: EnderecoPresencialData = profile.enderecoPresencial || {};

  const updateEndereco = (patch: Partial<EnderecoPresencialData>) => {
    setProfile({
      ...profile,
      enderecoPresencial: {
        ...(profile.enderecoPresencial || {}),
        ...patch,
      },
    });
  };

  const handleLookupCep = async (rawCep: string) => {
    const cleanCep = rawCep.replace(/\D/g, "");
    if (cleanCep.length !== 8) {
      showToast?.("Informe um CEP válido com 8 dígitos.", "error");
      return;
    }
    setCepLoading(true);
    try {
      const resp = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await resp.json();
      if (data?.erro) {
        showToast?.("CEP não encontrado. Preencha o endereço manualmente.", "error");
        return;
      }
      setProfile({
        ...profile,
        enderecoPresencial: {
          ...(profile.enderecoPresencial || {}),
          cep: `${cleanCep.slice(0, 5)}-${cleanCep.slice(5)}`,
          logradouro: data.logradouro || endereco.logradouro || "",
          bairro: data.bairro || endereco.bairro || "",
          cidade: data.localidade || endereco.cidade || "",
          uf: data.uf || endereco.uf || "",
        },
      });
      showToast?.("Endereço preenchido automaticamente pelo CEP!", "success");
    } catch (err) {
      console.error("Erro ao consultar ViaCEP:", err);
      showToast?.("Não foi possível consultar o CEP no momento.", "error");
    } finally {
      setCepLoading(false);
    }
  };

  const mapsPreview = buildMapsUrls(endereco);
  const publicPageUrl = profile?.uid ? `${window.location.origin}?prof=${profile.uid}` : "";

  if (profile.isCortesia || profile.plano !== "avancado") {
    return (
      <div className="p-6 sm:p-8 bg-gradient-to-br from-amber-50 to-warm/60 rounded-3xl border border-amber-200/80 space-y-5 text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shadow-xs">
          <Sparkles className="w-6 h-6" />
        </div>
        <div className="space-y-2">
          <h4 className="font-serif text-lg sm:text-xl font-bold text-forest">
            Desbloqueie sua Página Profissional White-Label (Plano Avançado)
          </h4>
          <p className="text-xs sm:text-sm text-forest/75 max-w-2xl mx-auto leading-relaxed">
            No <strong>Plano Básico</strong>, sua página pública mantém o formato padrão institucional. Ao ativar o{" "}
            <strong>Plano Avançado (White-Label)</strong>, você libera sua página própria independente, sem menção à plataforma, com recursos completos de captação:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto text-left">
          <div className="bg-white/80 border border-amber-200/70 rounded-2xl p-3.5 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-forest/85">
              <strong className="block text-forest">Redes Sociais & Currículo Lattes</strong>
              Ícones oficiais de Instagram, LinkedIn, CV Lattes, YouTube, TikTok, Facebook e Site.
            </div>
          </div>
          <div className="bg-white/80 border border-amber-200/70 rounded-2xl p-3.5 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-forest/85">
              <strong className="block text-forest">Consultório Presencial & Mapa</strong>
              Exiba seu endereço com mapa interativo e botões diretos para Google Maps e Waze.
            </div>
          </div>
          <div className="bg-white/80 border border-amber-200/70 rounded-2xl p-3.5 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-forest/85">
              <strong className="block text-forest">WhatsApp Otimizado & QR Code</strong>
              Botão de alta conversão com saudação personalizada e compartilhamento com QR Code.
            </div>
          </div>
          <div className="bg-white/80 border border-amber-200/70 rounded-2xl p-3.5 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-forest/85">
              <strong className="block text-forest">Marca Própria & Serviços Particulares</strong>
              Cores personalizadas, logotipo/CNPJ e catálogo de serviços com precificação livre.
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setProfile({ ...profile, plano: "avancado", whiteLabelEnabled: true });
            showToast?.(
              "Plano Avançado ativado! Configure sua página White-Label e clique em Salvar ao final.",
              "success",
            );
          }}
          className="px-6 py-3.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer inline-flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4 text-sun" /> Ativar Plano Avançado / White-Label
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-warm/30 p-5 sm:p-6 rounded-3xl border border-soft">
      {/* 5.1 Master Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-soft shadow-2xs">
        <div>
          <h4 className="font-bold text-sm text-forest">Ativar Página White-Label Independente</h4>
          <p className="text-xs text-forest/65 mt-0.5">
            Quando ativada, oculta a marca da plataforma e libera Redes Sociais, CV Lattes, WhatsApp otimizado, QR Code e Endereço com Mapa. Se desativada, exibe a página padrão do Plano Básico.
          </p>
        </div>
        <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
          {publicPageUrl && (
            <a
              href={publicPageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-warm hover:bg-soft text-forest text-[11px] font-bold inline-flex items-center gap-1.5 border border-soft transition-colors"
              title="Abrir página pública em nova aba"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Ver Página
            </a>
          )}
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={profile.whiteLabelEnabled === true}
              onChange={(e) => setProfile({ ...profile, whiteLabelEnabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>
      </div>

      {/* 5.2 Identidade Visual & Cores */}
      <div className="space-y-3 pt-2 border-t border-soft/80">
        <h4 className="font-bold text-xs uppercase tracking-wider text-forest">
          Identidade Visual & Cores da Página
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold text-forest mb-1 block">Cor de Fundo (Background)</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={profile.whiteLabelConfig?.backgroundColor || "#F8FAFC"}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    whiteLabelConfig: {
                      ...(profile.whiteLabelConfig || {}),
                      backgroundColor: e.target.value,
                    },
                  })
                }
                className="w-10 h-10 rounded-xl border border-soft cursor-pointer"
              />
              <input
                type="text"
                value={profile.whiteLabelConfig?.backgroundColor || "#F8FAFC"}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    whiteLabelConfig: {
                      ...(profile.whiteLabelConfig || {}),
                      backgroundColor: e.target.value,
                    },
                  })
                }
                className="flex-1 text-xs font-mono bg-white border border-soft px-3 py-2 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-forest mb-1 block">Cor Primária (Destaques)</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={profile.whiteLabelConfig?.primaryColor || "#0F766E"}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    whiteLabelConfig: {
                      ...(profile.whiteLabelConfig || {}),
                      primaryColor: e.target.value,
                    },
                  })
                }
                className="w-10 h-10 rounded-xl border border-soft cursor-pointer"
              />
              <input
                type="text"
                value={profile.whiteLabelConfig?.primaryColor || "#0F766E"}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    whiteLabelConfig: {
                      ...(profile.whiteLabelConfig || {}),
                      primaryColor: e.target.value,
                    },
                  })
                }
                className="flex-1 text-xs font-mono bg-white border border-soft px-3 py-2 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-forest mb-1 block">Cor Secundária</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={profile.whiteLabelConfig?.secondaryColor || "#06B6D4"}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    whiteLabelConfig: {
                      ...(profile.whiteLabelConfig || {}),
                      secondaryColor: e.target.value,
                    },
                  })
                }
                className="w-10 h-10 rounded-xl border border-soft cursor-pointer"
              />
              <input
                type="text"
                value={profile.whiteLabelConfig?.secondaryColor || "#06B6D4"}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    whiteLabelConfig: {
                      ...(profile.whiteLabelConfig || {}),
                      secondaryColor: e.target.value,
                    },
                  })
                }
                className="flex-1 text-xs font-mono bg-white border border-soft px-3 py-2 rounded-xl"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 5.3 Dados Corporativos & CNPJ */}
      <div className="space-y-3 pt-4 border-t border-soft/80">
        <h4 className="font-bold text-xs uppercase tracking-wider text-forest flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-forest/70" />
          Dados Corporativos & Logotipo (Opcional)
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-forest block mb-1">
              Razão Social / Nome da Clínica ou Consultório
            </label>
            <input
              type="text"
              value={profile.companyData?.razaoSocial || ""}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  companyData: {
                    ...(profile.companyData || {}),
                    razaoSocial: e.target.value,
                  },
                })
              }
              placeholder="Ex: Clínica Integrada de Psicologia Ltda"
              className="w-full text-xs bg-white border border-soft px-3 py-2.5 rounded-xl"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-forest block mb-1">CNPJ</label>
            {(() => {
              const rawCnpj = profile.companyData?.cnpj || "";
              const digits = rawCnpj.replace(/\D/g, "");
              const valid = isValidCnpj(rawCnpj);
              const err = digits.length === 14 ? getCnpjValidationError(rawCnpj, false) : null;
              return (
                <>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={18}
                    value={rawCnpj}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        companyData: {
                          ...(profile.companyData || {}),
                          cnpj: formatCnpj(e.target.value),
                        },
                      })
                    }
                    placeholder="00.000.000/0001-00"
                    className={`w-full text-xs border px-3 py-2.5 rounded-xl font-mono tabular-nums outline-none transition-colors ${
                      err
                        ? "bg-rose-50/50 border-rose-400 focus:border-rose-500"
                        : valid
                        ? "bg-emerald-50/30 border-emerald-400 focus:border-emerald-600"
                        : "bg-white border-soft focus:border-forest"
                    }`}
                  />
                  {err ? (
                    <span className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{err}</span>
                    </span>
                  ) : valid ? (
                    <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1 mt-1">
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                      <span>CNPJ válido</span>
                    </span>
                  ) : null}
                </>
              );
            })()}
          </div>

          <div className="sm:col-span-2">
            <label className="text-[11px] font-semibold text-forest block mb-1">
              URL do Logotipo (Cabeçalho da Página)
            </label>
            <input
              type="url"
              value={profile.companyData?.logoEmpresaUrl || ""}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  companyData: {
                    ...(profile.companyData || {}),
                    logoEmpresaUrl: e.target.value,
                  },
                })
              }
              placeholder="https://exemplo.com/logo.png"
              className="w-full text-xs bg-white border border-soft px-3 py-2.5 rounded-xl font-mono"
            />
          </div>
        </div>
      </div>

      {/* 5.4 Bio Curta, Modalidade & Botão de WhatsApp Otimizado */}
      <div className="space-y-4 pt-4 border-t border-soft/80">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-forest flex items-center gap-1.5">
              <WhatsAppBrandIcon className="w-4 h-4 text-[#25D366]" />
              Coluna Lateral: Bio Curta, Modalidade & Botão WhatsApp
            </h4>
            <p className="text-[11px] text-forest/65 mt-0.5">
              Estes elementos aparecem logo abaixo da sua foto e credenciais na coluna da esquerda.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-forest">
                Bio Curta / Frase de Apresentação (abaixo das credenciais)
              </label>
              <span className="text-[10px] text-forest/50 font-mono">
                {(profile.bioCurta || "").length}/180
              </span>
            </div>
            <input
              type="text"
              maxLength={180}
              value={profile.bioCurta || ""}
              onChange={(e) => setProfile({ ...profile, bioCurta: e.target.value })}
              placeholder="Ex: Psicoterapia clínica com escuta acolhedora baseada em evidências para adultos e casais."
              className="w-full text-xs bg-white border border-soft px-3.5 py-2.5 rounded-xl"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-forest block mb-1">
              Modalidade de Atendimento Exibida
            </label>
            <div className="relative flex items-center">
              <Video className="w-3.5 h-3.5 text-forest/50 absolute left-3 pointer-events-none" />
              <select
                value={profile.modalidadeAtendimento || (profile.atendePresencial ? "hibrido" : "online")}
                onChange={(e) => {
                  const mod = e.target.value;
                  setProfile({
                    ...profile,
                    modalidadeAtendimento: mod,
                    atendePresencial: mod === "presencial" || mod === "hibrido" ? true : profile.atendePresencial,
                  });
                }}
                className="w-full text-xs bg-white border border-soft pl-8 pr-3 py-2.5 rounded-xl font-medium text-forest"
              >
                <option value="online">Atendimento Online</option>
                <option value="hibrido">Online e Presencial</option>
                <option value="presencial">Atendimento Presencial</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-forest block mb-1">
              Texto do Botão Principal de WhatsApp
            </label>
            <input
              type="text"
              maxLength={45}
              value={profile.whatsappBotaoTexto || ""}
              onChange={(e) => setProfile({ ...profile, whatsappBotaoTexto: e.target.value })}
              placeholder="Agendar pelo WhatsApp"
              className="w-full text-xs bg-white border border-soft px-3.5 py-2.5 rounded-xl"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-[11px] font-semibold text-forest block mb-1">
              Mensagem Automática ao Clicar no WhatsApp (Opcional)
            </label>
            <input
              type="text"
              maxLength={220}
              value={profile.whatsappMensagem || ""}
              onChange={(e) => setProfile({ ...profile, whatsappMensagem: e.target.value })}
              placeholder="Olá! Vi sua página profissional e gostaria de informações sobre agendamento de consulta."
              className="w-full text-xs bg-white border border-soft px-3.5 py-2.5 rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* 5.5 Redes Sociais, Currículo Lattes & Site */}
      <div className="space-y-4 pt-4 border-t border-soft/80">
        <div>
          <h4 className="font-bold text-xs uppercase tracking-wider text-forest flex items-center gap-1.5">
            <Share2 className="w-3.5 h-3.5 text-forest/70" />
            Redes Sociais, Currículo Lattes & Site Pessoal
          </h4>
          <p className="text-[11px] text-forest/65 mt-0.5">
            Preencha apenas as redes que desejar exibir. Os logotipos oficiais aparecem automaticamente na sua página White-Label logo abaixo do botão de WhatsApp.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SOCIAL_NETWORKS_META.map(({ key, field, label, placeholder, Icon }) => {
            const rawVal = profile[field] || "";
            const resolvedUrl = normalizeSocialUrl(key, rawVal);
            return (
              <div
                key={key}
                className={`bg-white p-3 rounded-2xl border transition-colors ${
                  rawVal.trim() ? "border-emerald-300/80 shadow-2xs" : "border-soft"
                }`}
              >
                <label className="text-[11px] font-bold text-forest flex items-center justify-between gap-2 mb-1.5">
                  <span className="inline-flex items-center gap-2">
                    <Icon className="w-4 h-4 shrink-0" />
                    {label}
                  </span>
                  {resolvedUrl && (
                    <a
                      href={resolvedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-semibold text-emerald-700 hover:underline inline-flex items-center gap-0.5"
                    >
                      Testar <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </label>
                <input
                  type="text"
                  value={rawVal}
                  onChange={(e) => setProfile({ ...profile, [field]: e.target.value })}
                  placeholder={placeholder}
                  className="w-full text-xs bg-warm/40 border border-soft px-3 py-2 rounded-xl focus:outline-none focus:border-forest/40"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* 5.6 Endereço Presencial & Mapa Incorporado */}
      <div className="space-y-4 pt-4 border-t border-soft/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-soft">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-forest">
                Atendimento Presencial & Mapa na Página
              </h4>
              <p className="text-xs text-forest/65">
                Habilite caso realize atendimentos presenciais em consultório ou clínica.
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer self-end sm:self-center shrink-0">
            <input
              type="checkbox"
              checked={profile.atendePresencial === true}
              onChange={(e) => {
                const checked = e.target.checked;
                setProfile({
                  ...profile,
                  atendePresencial: checked,
                  divulgarEnderecoPresencial: checked
                    ? profile.divulgarEnderecoPresencial ?? true
                    : false,
                  modalidadeAtendimento:
                    checked && (!profile.modalidadeAtendimento || profile.modalidadeAtendimento === "online")
                      ? "hibrido"
                      : profile.modalidadeAtendimento,
                });
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>

        {profile.atendePresencial && (
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-soft space-y-4">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-soft/70">
              <div>
                <span className="font-bold text-xs text-forest block">
                  Divulgar endereço e mapa interativo na minha página pública
                </span>
                <span className="text-[11px] text-forest/60">
                  Aparecerá na coluna da esquerda (após as redes sociais) com mapa incorporado e botões Google Maps e Waze.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={profile.divulgarEnderecoPresencial === true}
                  onChange={(e) =>
                    setProfile({ ...profile, divulgarEnderecoPresencial: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-forest block mb-1">CEP</label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={endereco.cep || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateEndereco({ cep: val });
                      const digits = val.replace(/\D/g, "");
                      if (digits.length === 8) {
                        handleLookupCep(digits);
                      }
                    }}
                    placeholder="00000-000"
                    maxLength={9}
                    className="w-full text-xs bg-warm/40 border border-soft px-3 py-2 rounded-xl font-mono"
                  />
                  <button
                    type="button"
                    disabled={cepLoading}
                    onClick={() => handleLookupCep(endereco.cep || "")}
                    className="px-2.5 py-2 bg-forest text-white rounded-xl text-xs font-bold hover:bg-forest/90 transition-colors cursor-pointer shrink-0 flex items-center justify-center"
                    title="Buscar endereço pelo CEP"
                  >
                    {cepLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Search className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="sm:col-span-4">
                <label className="text-[11px] font-semibold text-forest block mb-1">
                  Nome do Consultório / Clínica / Edifício (Opcional)
                </label>
                <input
                  type="text"
                  value={endereco.nomeEspaco || ""}
                  onChange={(e) => updateEndereco({ nomeEspaco: e.target.value })}
                  placeholder="Ex: Edifício Centro Médico Paulista"
                  className="w-full text-xs bg-warm/40 border border-soft px-3 py-2 rounded-xl"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="text-[11px] font-semibold text-forest block mb-1">
                  Logradouro (Rua / Avenida)
                </label>
                <input
                  type="text"
                  value={endereco.logradouro || ""}
                  onChange={(e) => updateEndereco({ logradouro: e.target.value })}
                  placeholder="Ex: Av. Paulista"
                  className="w-full text-xs bg-warm/40 border border-soft px-3 py-2 rounded-xl"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-forest block mb-1">Número</label>
                <input
                  type="text"
                  value={endereco.numero || ""}
                  onChange={(e) => updateEndereco({ numero: e.target.value })}
                  placeholder="Ex: 1000"
                  className="w-full text-xs bg-warm/40 border border-soft px-3 py-2 rounded-xl"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-forest block mb-1">
                  Complemento (Sala / Conj.)
                </label>
                <input
                  type="text"
                  value={endereco.complemento || ""}
                  onChange={(e) => updateEndereco({ complemento: e.target.value })}
                  placeholder="Ex: Sala 804, Bloco B"
                  className="w-full text-xs bg-warm/40 border border-soft px-3 py-2 rounded-xl"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-forest block mb-1">Bairro</label>
                <input
                  type="text"
                  value={endereco.bairro || ""}
                  onChange={(e) => updateEndereco({ bairro: e.target.value })}
                  placeholder="Ex: Bela Vista"
                  className="w-full text-xs bg-warm/40 border border-soft px-3 py-2 rounded-xl"
                />
              </div>

              <div className="sm:col-span-1">
                <label className="text-[11px] font-semibold text-forest block mb-1">Cidade</label>
                <input
                  type="text"
                  value={endereco.cidade || ""}
                  onChange={(e) => updateEndereco({ cidade: e.target.value })}
                  placeholder="São Paulo"
                  className="w-full text-xs bg-warm/40 border border-soft px-3 py-2 rounded-xl"
                />
              </div>

              <div className="sm:col-span-1">
                <label className="text-[11px] font-semibold text-forest block mb-1">UF</label>
                <select
                  value={endereco.uf || ""}
                  onChange={(e) => updateEndereco({ uf: e.target.value })}
                  className="w-full text-xs bg-warm/40 border border-soft px-2 py-2 rounded-xl"
                >
                  <option value="">UF</option>
                  {UF_LIST.map((sigla) => (
                    <option key={sigla} value={sigla}>
                      {sigla}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-6">
                <label className="text-[11px] font-semibold text-forest block mb-1">
                  Ponto de Referência / Orientações de Chegada (Opcional)
                </label>
                <input
                  type="text"
                  value={endereco.referencia || ""}
                  onChange={(e) => updateEndereco({ referencia: e.target.value })}
                  placeholder="Ex: Próximo à estação Trianon-Masp do Metrô • Estacionamento conveniado no subsolo"
                  className="w-full text-xs bg-warm/40 border border-soft px-3 py-2 rounded-xl"
                />
              </div>
            </div>

            {mapsPreview.embedUrl && (
              <div className="pt-2 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-[11px] font-bold text-forest/80">
                    Pré-visualização do Pino no Mapa:
                  </span>
                  <div className="flex items-center gap-2">
                    <a
                      href={mapsPreview.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-semibold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 transition-colors"
                    >
                      <GoogleMapsBrandIcon className="w-3.5 h-3.5" />
                      Testar Google Maps
                    </a>
                    <a
                      href={mapsPreview.wazeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-semibold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 transition-colors"
                    >
                      <WazeBrandIcon className="w-3.5 h-3.5" />
                      Testar Waze
                    </a>
                  </div>
                </div>
                <div className="rounded-2xl overflow-hidden border border-soft h-44 bg-slate-100">
                  <iframe
                    title="Pré-visualização do Mapa do Consultório"
                    src={mapsPreview.embedUrl}
                    className="w-full h-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5.7 Serviços e Precificação Particular */}
      <div className="space-y-3 pt-4 border-t border-soft/80">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h4 className="font-bold text-xs uppercase tracking-wider text-forest">
            Serviços e Precificação Particular
          </h4>
          <button
            type="button"
            onClick={() => {
              const list = Array.isArray(profile.customServices)
                ? [...profile.customServices]
                : [];
              list.push({
                title: "Psicoterapia Individual",
                description: "Sessão particular de atendimento online ou presencial.",
                duration: "50 min",
                price: "150,00",
              });
              setProfile({ ...profile, customServices: list });
            }}
            className="px-3 py-1.5 bg-forest text-white text-xs font-bold rounded-lg hover:bg-forest/90 transition-colors cursor-pointer"
          >
            + Adicionar Serviço
          </button>
        </div>

        <div className="space-y-2">
          {!profile.customServices || profile.customServices.length === 0 ? (
            <p className="text-xs text-forest/60 italic">
              Nenhum serviço customizado cadastrado. Clique no botão acima para adicionar.
            </p>
          ) : (
            profile.customServices.map((srv: any, idx: number) => (
              <div
                key={`srv-item-${idx}`}
                className="p-3.5 bg-white rounded-2xl border border-soft space-y-2 relative pr-10"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={srv.title || ""}
                    onChange={(e) => {
                      const list = [...profile.customServices];
                      list[idx] = { ...list[idx], title: e.target.value };
                      setProfile({ ...profile, customServices: list });
                    }}
                    placeholder="Nome do Serviço"
                    className="text-xs bg-warm/40 border border-soft px-3 py-2 rounded-xl font-semibold"
                  />
                  <input
                    type="text"
                    value={srv.duration || ""}
                    onChange={(e) => {
                      const list = [...profile.customServices];
                      list[idx] = { ...list[idx], duration: e.target.value };
                      setProfile({ ...profile, customServices: list });
                    }}
                    placeholder="Duração (ex: 50 min)"
                    className="text-xs bg-warm/40 border border-soft px-3 py-2 rounded-xl"
                  />
                  <input
                    type="text"
                    value={srv.price || ""}
                    onChange={(e) => {
                      const list = [...profile.customServices];
                      list[idx] = { ...list[idx], price: e.target.value };
                      setProfile({ ...profile, customServices: list });
                    }}
                    placeholder="Preço (ex: 150,00)"
                    className="text-xs bg-warm/40 border border-soft px-3 py-2 rounded-xl font-bold text-emerald-800"
                  />
                </div>
                <textarea
                  rows={2}
                  value={srv.description || ""}
                  onChange={(e) => {
                    const list = [...profile.customServices];
                    list[idx] = { ...list[idx], description: e.target.value };
                    setProfile({ ...profile, customServices: list });
                  }}
                  placeholder="Descrição detalhada do serviço..."
                  className="w-full text-xs bg-warm/40 border border-soft px-3 py-2 rounded-xl resize-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    const list = [...profile.customServices];
                    list.splice(idx, 1);
                    setProfile({ ...profile, customServices: list });
                  }}
                  className="absolute top-3 right-3 text-red-500 hover:text-red-700 p-1 cursor-pointer"
                  title="Remover Serviço"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
