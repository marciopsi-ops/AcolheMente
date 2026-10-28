import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  User,
  Phone,
  MapPin,
  Calendar,
  Award,
  Heart,
  CheckCircle2,
  Share2,
  BookOpen,
  QrCode,
  Copy,
  Check,
  X,
  ExternalLink,
  Video,
  Building2,
  ShieldCheck,
  Clock,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  increment,
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { BrandLogo } from "../components/BrandLogo";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { ArtigoBlog } from "../types/blog";
import { BlogCard } from "../components/BlogCard";
import { formatProfessionalName } from "../utils/formatters";
import { formatEventDateDisplay } from "../utils/eventImageHelper";
import {
  hasIntegrarFeatures,
  isTestUserCredential,
} from "../types/planosProfissionais";
import {
  SOCIAL_NETWORKS_META,
  WhatsAppBrandIcon,
  GoogleMapsBrandIcon,
  WazeBrandIcon,
  normalizeSocialUrl,
  buildMapsUrls,
  EnderecoPresencialData,
} from "../components/SocialBrandIcons";

export function PublicProfProfileView({ 
  profUid, 
  initialArtigoId,
  onBack,
  onGoHome,
  onReadArtigo,
  onOpenPublicItem,
  hideMotivacaoProjeto,
}: { 
  profUid: string; 
  initialArtigoId?: string | null;
  onBack: () => void;
  onGoHome?: () => void;
  onReadArtigo?: (artigoId: string) => void;
  onOpenPublicItem?: (kind: "evento" | "servico", itemId: string, fromProfUid: string) => void;
  hideMotivacaoProjeto?: boolean;
}) {
  const [prof, setProf] = useState<any>(null);
  const [servicos, setServicos] = useState<any[]>([]);
  const [eventosCriados, setEventosCriados] = useState<any[]>([]);
  const [servicosRedeCriados, setServicosRedeCriados] = useState<any[]>([]);
  const [artigosProfissional, setArtigosProfissional] = useState<ArtigoBlog[]>([]);
  const [selectedWlArtigo, setSelectedWlArtigo] = useState<ArtigoBlog | null>(null);
  const [wlArtigoCopied, setWlArtigoCopied] = useState(false);
  const [wlArtigoLiked, setWlArtigoLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const handleGoHome = () => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    try {
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.pushState({}, "", cleanUrl);
    } catch (e) {
      console.error(e);
    }
    if (onGoHome) {
      onGoHome();
    } else if (onBack) {
      onBack();
    } else {
      window.location.href = window.location.origin;
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const snap = await getDoc(doc(db, "users", profUid));
        if (snap.exists()) {
          const data = snap.data();
          const rolesArr = Array.isArray(data.roles) ? data.roles : [];
          const isProfRole = data.role === "profissional" || rolesArr.includes("profissional");
          const isTestAccount = isTestUserCredential(data);
          // Contas de Usuário Teste ficam ocultas para visitantes externos, mas o próprio usuário autenticado ou gestão pode pré-visualizar
          const canViewTestAccount = !isTestAccount || Boolean(auth.currentUser);
          if (isProfRole && data.ativo !== false && canViewTestAccount) {
            const rawName = data.name || data.nome || data.displayName || "Profissional";
            setProf({
              ...data,
              name: formatProfessionalName(rawName),
            });
          }
        }
      } catch (err) {
        console.error("Erro ao carregar perfil público do profissional:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [profUid]);

  useEffect(() => {
    if (!prof) return;

    const originalTitle = document.title;
    const formattedName = formatProfessionalName(prof.name);
    const profissaoOuTitulo = prof.profissao || (prof.especialidade ? `Profissional - ${prof.especialidade}` : "Profissional de Saúde");
    const wlActive = prof.whiteLabelEnabled === true && hasIntegrarFeatures(prof);
    const formattedTitle = wlActive
      ? `${formattedName} | ${profissaoOuTitulo}`
      : `${formattedName} | ${profissaoOuTitulo} - Projeto AcolheMente`;

    document.title = formattedTitle;

    // Atualiza meta tags dinamicamente para compartilhamento e preview em redes sociais / WhatsApp
    const descriptionText =
      (wlActive && prof.bioCurta) ||
      (prof.biografia
        ? prof.biografia.slice(0, 150) + "..."
        : wlActive
          ? `Conheça a página profissional de ${formattedName} (${profissaoOuTitulo}).`
          : `Conheça o perfil profissional de ${formattedName} (${profissaoOuTitulo}) no Projeto AcolheMente Saúde.`);

    const metaMap: Record<string, { attr: string; val: string }> = {
      description: { attr: "name", val: descriptionText },
      "og:title": { attr: "property", val: `${formattedName} - ${profissaoOuTitulo}` },
      "og:description": { attr: "property", val: descriptionText },
      "og:type": { attr: "property", val: "profile" },
      "twitter:title": { attr: "name", val: `${formattedName} - ${profissaoOuTitulo}` },
      "twitter:description": { attr: "name", val: descriptionText },
    };

    if (prof.photoUrl) {
      metaMap["og:image"] = { attr: "property", val: prof.photoUrl };
      metaMap["twitter:image"] = { attr: "name", val: prof.photoUrl };
    }

    const createdElements: HTMLMetaElement[] = [];

    Object.entries(metaMap).forEach(([key, { attr, val }]) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
        createdElements.push(el);
      }
      el.setAttribute("content", val);
    });

    return () => {
      document.title = originalTitle;
      createdElements.forEach((el) => el.remove());
    };
  }, [prof]);

  useEffect(() => {
    if (!profUid) return;
    const q = query(
      collection(db, "servicos_profissionais"),
      where("profissionalId", "==", profUid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setServicos(list);
    }, (err) => {
      console.error("Erro ao carregar serviços do profissional:", err);
    });
    return () => unsubscribe();
  }, [profUid]);

  // Carregar artigos publicados deste profissional
  useEffect(() => {
    if (!profUid) return;
    const qArtigos = query(
      collection(db, "artigos_blog"),
      where("autorUid", "==", profUid)
    );
    const unsubscribe = onSnapshot(
      qArtigos,
      (snapshot) => {
        const list: ArtigoBlog[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as any;
          if (data.status === "publicado") {
            list.push({
              id: docSnap.id,
              ...data,
            });
          }
        });
        setArtigosProfissional(list);
      },
      (err) => {
        console.error("Erro ao carregar artigos do profissional:", err);
      }
    );
    return () => unsubscribe();
  }, [profUid]);

  // Carregar eventos e serviços/parcerias criados por este profissional
  useEffect(() => {
    if (!profUid) return;
    const qEv = query(collection(db, "eventos"), where("criadorId", "==", profUid));
    const unsubEv = onSnapshot(
      qEv,
      (snap) => {
        setEventosCriados(
          snap.docs.map((d) => ({ id: d.id, _kind: "evento", ...d.data() })),
        );
      },
      (err) => console.error("Erro ao carregar eventos do profissional:", err),
    );

    const qSvc = query(collection(db, "servicos"), where("criadorId", "==", profUid));
    const unsubSvc = onSnapshot(
      qSvc,
      (snap) => {
        setServicosRedeCriados(
          snap.docs.map((d) => ({ id: d.id, _kind: "servico", ...d.data() })),
        );
      },
      (err) => console.error("Erro ao carregar serviços da rede do profissional:", err),
    );

    return () => {
      unsubEv();
      unsubSvc();
    };
  }, [profUid]);

  // Sincroniza leitura de artigo via URL (?prof=...&artigo=...)
  useEffect(() => {
    if (!initialArtigoId || !prof) return;
    const wlActive = Boolean(prof.whiteLabelEnabled && hasIntegrarFeatures(prof));
    if (!wlActive) {
      if (onReadArtigo) onReadArtigo(initialArtigoId);
      return;
    }
    const found = artigosProfissional.find((a) => a.id === initialArtigoId);
    if (found) {
      setSelectedWlArtigo(found);
    }
  }, [initialArtigoId, prof, artigosProfissional, onReadArtigo]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FCFBF7] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 border-4 border-forest border-t-transparent rounded-full animate-spin"></div>
          <p className="text-forest/70 font-medium">Carregando apresentação do profissional...</p>
        </div>
      </div>
    );
  }

  if (!prof) {
    return (
      <div className="min-h-screen bg-[#FCFBF7] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl border border-soft text-center">
          <Heart className="w-12 h-12 text-forest/40 mx-auto mb-4" />
          <h2 className="font-serif text-2xl font-medium text-forest mb-2">Perfil Indisponível</h2>
          <p className="text-forest/70 text-sm mb-6">Este profissional não está disponível ou o link está incorreto.</p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={handleGoHome}
              className="w-full py-3 bg-forest text-white rounded-full font-semibold hover:bg-forest/90 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar para Home / Tela Inicial
            </button>
            <button
              onClick={handleGoHome}
              className="w-full py-2.5 text-xs text-forest/70 hover:text-forest font-semibold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Conhecer o AcolheMente
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Pre-filled text for WhatsApp
  const cleanPhone = prof.telefone ? prof.telefone.replace(/\D/g, "") : "";
  const whatsAppNumber = cleanPhone
    ? cleanPhone.startsWith("55") && cleanPhone.length >= 12
      ? cleanPhone
      : `55${cleanPhone}`
    : "";
  const whatsAppUrl = whatsAppNumber
    ? `https://api.whatsapp.com/send?phone=${whatsAppNumber}&text=${encodeURIComponent(
        "Olá, conheci seu perfil profissional e gostaria de agendar uma consulta / atendimento!",
      )}`
    : "";

  const isWhiteLabel = Boolean(prof.whiteLabelEnabled && hasIntegrarFeatures(prof));

  const oportunidadesPublicadas = [...eventosCriados, ...servicosRedeCriados].sort(
    (a, b) => {
      const tA = a.createdAt?.toMillis?.() || 0;
      const tB = b.createdAt?.toMillis?.() || 0;
      return tB - tA;
    },
  );

  const showEventosNaPagina =
    prof.exibirEventosPaginaPublica !== false && oportunidadesPublicadas.length > 0;
  const showArtigosNaPagina =
    prof.exibirArtigosPaginaPublica !== false && artigosProfissional.length > 0;

  const handleOpenOportunidade = (op: any) => {
    const kind: "evento" | "servico" = op._kind === "servico" ? "servico" : "evento";
    try {
      const nextUrl = `${window.location.origin}${window.location.pathname}?${kind}=${op.id}&fromProf=${profUid}`;
      window.history.pushState({}, "", nextUrl);
    } catch (e) {
      console.error(e);
    }
    if (onOpenPublicItem) {
      onOpenPublicItem(kind, op.id, profUid);
    } else {
      window.location.href = `${window.location.origin}?${kind}=${op.id}&fromProf=${profUid}`;
    }
  };

  const handleOpenWlArtigo = (art: ArtigoBlog) => {
    setSelectedWlArtigo(art);
    setWlArtigoLiked(false);
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("prof", profUid);
      if (art.id) url.searchParams.set("artigo", art.id);
      window.history.pushState({}, "", url.toString());
    } catch (e) {
      console.error(e);
    }
    if (art.id && !art.id.includes("seeds")) {
      updateDoc(doc(db, "artigos_blog", art.id), {
        visualizacoes: increment(1),
      }).catch(() => {});
    }
  };

  const handleCloseWlArtigo = () => {
    setSelectedWlArtigo(null);
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("artigo");
      url.searchParams.set("prof", profUid);
      window.history.pushState({}, "", url.toString());
    } catch (e) {
      console.error(e);
    }
  };

  const renderInlineArticleText = (str: string) => {
    const parts = str.split(/(\*\*.*?\*\*|\*.*?\*|<u>.*?<\/u>)/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={index} className="font-bold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("*") && part.endsWith("*")) {
        return (
          <em key={index} className="italic text-slate-800">
            {part.slice(1, -1)}
          </em>
        );
      }
      if (part.startsWith("<u>") && part.endsWith("</u>")) {
        return <u key={index}>{part.slice(3, -4)}</u>;
      }
      return part;
    });
  };

  const renderWlArticleBody = (conteudo: string) => {
    const lines = (conteudo || "").split("\n");
    return (
      <div className="space-y-5 text-slate-700 leading-relaxed font-sans text-base sm:text-lg">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={idx} className="h-2" />;
          if (trimmed.startsWith("## ")) {
            return (
              <h2
                key={idx}
                className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 pt-5 pb-2 border-b border-slate-100"
              >
                {trimmed.replace(/^##\s+/, "")}
              </h2>
            );
          }
          if (trimmed.startsWith("### ")) {
            return (
              <h3
                key={idx}
                className="font-serif text-xl sm:text-2xl font-semibold text-slate-900 pt-3"
              >
                {trimmed.replace(/^###\s+/, "")}
              </h3>
            );
          }
          if (trimmed.startsWith("> ")) {
            return (
              <blockquote
                key={idx}
                className="bg-slate-50 border border-slate-200 p-5 rounded-2xl italic text-slate-800 font-serif text-lg leading-relaxed my-5"
              >
                {trimmed.replace(/^>\s+/, "")}
              </blockquote>
            );
          }
          if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
            return (
              <li key={idx} className="ml-6 list-disc text-slate-700">
                {renderInlineArticleText(trimmed.replace(/^[-*]\s+/, ""))}
              </li>
            );
          }
          if (/^\d+\.\s+/.test(trimmed)) {
            return (
              <li key={idx} className="ml-6 list-decimal text-slate-700">
                {renderInlineArticleText(trimmed.replace(/^\d+\.\s+/, ""))}
              </li>
            );
          }
          if (trimmed === "---" || trimmed === "***") {
            return <hr key={idx} className="my-7 border-slate-200" />;
          }
          return <p key={idx}>{renderInlineArticleText(line)}</p>;
        })}
      </div>
    );
  };

  if (isWhiteLabel) {
    const wlConfig = prof.whiteLabelConfig || {};
    const company = prof.companyData || {};
    const customServices = prof.customServices || [];
    const bgColor = wlConfig.backgroundColor || "#F8FAFC";
    const primaryColor = wlConfig.primaryColor || "#0F766E";
    const secondaryColor = wlConfig.secondaryColor || "#06B6D4";

    const pageUrl = `${window.location.origin}?prof=${profUid}`;
    const formattedName = formatProfessionalName(prof.name);
    const profissaoTitulo =
      prof.profissao || prof.especialidade || "Profissional Especializado";
    const shareTitle = `${formattedName} — ${profissaoTitulo}`;
    const shareDescription = prof.bioCurta
      ? `${shareTitle}\n"${prof.bioCurta}"`
      : `Conheça a página profissional de ${formattedName} (${profissaoTitulo}):`;

    const customWaGreeting =
      (prof.whatsappMensagem || "").trim() ||
      `Olá ${formattedName}, vi sua página profissional e gostaria de agendar um atendimento!`;
    const whatsAppWhiteLabelUrl = whatsAppNumber
      ? `https://api.whatsapp.com/send?phone=${whatsAppNumber}&text=${encodeURIComponent(
          customWaGreeting,
        )}`
      : "";
    const whatsAppCtaLabel =
      (prof.whatsappBotaoTexto || "").trim() || "Agendar pelo WhatsApp";

    const activeSocialLinks = SOCIAL_NETWORKS_META.map((item) => {
      const raw = prof[item.field];
      const url = normalizeSocialUrl(item.key, raw);
      return url ? { ...item, url } : null;
    }).filter(Boolean) as Array<
      (typeof SOCIAL_NETWORKS_META)[number] & { url: string }
    >;

    const endereco: EnderecoPresencialData = prof.enderecoPresencial || {};
    const showPresencialAddress =
      prof.atendePresencial === true && prof.divulgarEnderecoPresencial === true;
    const mapsInfo = showPresencialAddress
      ? buildMapsUrls(endereco)
      : { query: "", embedUrl: "", googleMapsUrl: "", wazeUrl: "" };

    const modalidade =
      prof.modalidadeAtendimento ||
      (prof.atendePresencial ? "hibrido" : "online");
    const modalidadeLabel =
      modalidade === "presencial"
        ? "Atendimento Presencial"
        : modalidade === "hibrido"
          ? "Atendimento Online & Presencial"
          : "Atendimento Online";

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(
      pageUrl,
    )}`;

    const handleCopyPageLink = () => {
      navigator.clipboard
        .writeText(pageUrl)
        .then(() => {
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 3000);
        })
        .catch((err) => console.error(err));
    };

    // MODO LEITURA DE ARTIGO 100% WHITE-LABEL (Zero referência ao AcolheMente)
    if (selectedWlArtigo) {
      const wlArticleShareUrl = `${window.location.origin}${window.location.pathname}?prof=${profUid}&artigo=${selectedWlArtigo.id || ""}`;
      return (
        <div
          className="min-h-screen text-slate-800 p-4 sm:p-6 md:p-8 flex flex-col items-center"
          style={{ backgroundColor: bgColor }}
        >
          <header className="w-full max-w-4xl flex items-center justify-between mb-8 gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleCloseWlArtigo}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200/90 shadow-2xs text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
            >
              <ArrowLeft className="w-4 h-4" style={{ color: primaryColor }} />
              <span>Voltar para a página de {formattedName}</span>
            </button>

            <div className="flex items-center gap-2.5">
              {company.logoEmpresaUrl ? (
                <div
                  onClick={handleCloseWlArtigo}
                  className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-xl border border-slate-200/90 shadow-2xs cursor-pointer"
                >
                  <img
                    src={company.logoEmpresaUrl}
                    alt={company.razaoSocial || formattedName}
                    referrerPolicy="no-referrer"
                    className="h-7 max-w-[120px] object-contain"
                  />
                  {company.razaoSocial && (
                    <span className="text-xs font-bold text-slate-800 hidden sm:inline">
                      {company.razaoSocial}
                    </span>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleCloseWlArtigo}
                  className="font-serif text-sm font-bold text-slate-900 hover:opacity-80 cursor-pointer whitespace-nowrap"
                >
                  {company.razaoSocial || formattedName}
                </button>
              )}
            </div>
          </header>

          <article className="w-full max-w-3xl flex flex-col gap-6 pb-12">
            <div className="bg-white p-6 sm:p-10 rounded-[2rem] border border-slate-200/90 shadow-sm flex flex-col gap-6">
              <div className="flex items-center justify-between gap-3 flex-wrap text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span
                    className="font-bold uppercase tracking-wider"
                    style={{ color: primaryColor }}
                  >
                    {selectedWlArtigo.categoria || "Artigo"}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {selectedWlArtigo.tempoLeitura || "4 min de leitura"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (wlArtigoLiked) return;
                      setWlArtigoLiked(true);
                      if (selectedWlArtigo.id) {
                        updateDoc(doc(db, "artigos_blog", selectedWlArtigo.id), {
                          curtidas: increment(1),
                        }).catch(() => {});
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                      wlArtigoLiked
                        ? "bg-rose-50 text-rose-600 border-rose-200"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${wlArtigoLiked ? "fill-rose-500 text-rose-500" : ""}`}
                    />
                    <span className="tabular-nums">
                      {(selectedWlArtigo.curtidas || 0) + (wlArtigoLiked ? 1 : 0)}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard
                        .writeText(wlArticleShareUrl)
                        .then(() => {
                          setWlArtigoCopied(true);
                          setTimeout(() => setWlArtigoCopied(false), 2500);
                        })
                        .catch(() => {});
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {wlArtigoCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Compartilhar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <h1 className="font-serif text-2xl sm:text-4xl font-bold text-slate-900 leading-tight [text-wrap:balance]">
                {selectedWlArtigo.titulo}
              </h1>

              {selectedWlArtigo.resumo && (
                <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
                  {selectedWlArtigo.resumo}
                </p>
              )}

              <div className="flex items-center gap-3 py-4 border-y border-slate-100">
                <div
                  className="w-11 h-11 rounded-full overflow-hidden bg-slate-100 border-2 flex items-center justify-center shrink-0"
                  style={{ borderColor: primaryColor }}
                >
                  {prof.photoUrl || selectedWlArtigo.autorFoto ? (
                    <img
                      src={prof.photoUrl || selectedWlArtigo.autorFoto}
                      alt={formattedName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                <div>
                  <span className="font-serif font-bold text-sm text-slate-900 block">
                    {formattedName}
                  </span>
                  <span className="text-xs text-slate-500 block">
                    {profissaoTitulo}
                    {prof.crp ? ` · Registro ${prof.crp}` : ""}
                  </span>
                </div>
              </div>

              {selectedWlArtigo.capaUrl && (
                <div className="w-full aspect-[16/9] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/80">
                  <img
                    src={selectedWlArtigo.capaUrl}
                    alt={selectedWlArtigo.titulo}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="pt-2">{renderWlArticleBody(selectedWlArtigo.conteudo)}</div>
            </div>

            {/* Card de Contato Direto do Autor no Rodapé do Artigo */}
            <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-5">
              <div className="flex items-center gap-4 text-center sm:text-left flex-col sm:flex-row">
                <div
                  className="w-14 h-14 rounded-full overflow-hidden bg-slate-100 border-2 flex items-center justify-center shrink-0"
                  style={{ borderColor: primaryColor }}
                >
                  {prof.photoUrl ? (
                    <img
                      src={prof.photoUrl}
                      alt={formattedName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-slate-900">
                    {formattedName}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {profissaoTitulo}
                    {prof.crp ? ` • Registro: ${prof.crp}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2.5 w-full sm:w-auto">
                {whatsAppWhiteLabelUrl && (
                  <a
                    href={whatsAppWhiteLabelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-4 bg-[#1FAF5A] hover:bg-[#19964B] text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-colors whitespace-nowrap"
                  >
                    <WhatsAppBrandIcon className="w-4 h-4" />
                    <span>{whatsAppCtaLabel}</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={handleCloseWlArtigo}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
                >
                  Ver Página Completa
                </button>
              </div>
            </div>
          </article>

          <footer className="w-full max-w-4xl text-center py-8 text-slate-500 text-xs flex flex-col items-center gap-1.5">
            <p className="font-medium text-slate-600">
              {company.razaoSocial || formattedName}
              {company.cnpj ? ` • CNPJ: ${company.cnpj}` : ""}
              {prof.crp ? ` • Registro: ${prof.crp}` : ""}
            </p>
            {company.enderecoEmpresa && <p>{company.enderecoEmpresa}</p>}
            {company.telefoneEmpresa && <p>Contato: {company.telefoneEmpresa}</p>}
          </footer>
        </div>
      );
    }

    return (
      <div
        className="min-h-screen text-slate-800 p-4 sm:p-6 md:p-8 flex flex-col items-center"
        style={{ backgroundColor: bgColor }}
      >
        {/* Top Bar: Brand + Share Action */}
        <header className="w-full max-w-5xl flex items-center justify-between mb-8 sm:mb-10 gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            {company.logoEmpresaUrl ? (
              <div className="flex items-center gap-2.5 bg-white px-4 py-2 rounded-2xl shadow-xs border border-slate-200/90">
                <img
                  src={company.logoEmpresaUrl}
                  alt={company.razaoSocial || formattedName}
                  className="h-8 max-w-[130px] object-contain"
                />
                {company.razaoSocial && (
                  <span className="text-xs font-bold text-slate-800">
                    {company.razaoSocial}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs font-bold px-3.5 py-2 rounded-xl bg-white border border-slate-200/90 text-slate-800 shadow-xs">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: primaryColor }}
                />
                <span>{company.razaoSocial || formattedName}</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShareModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200/90 shadow-xs hover:shadow-sm transition-all flex items-center gap-2 text-xs font-bold cursor-pointer"
          >
            <Share2 className="w-4 h-4" style={{ color: primaryColor }} />
            <span>Compartilhar Página</span>
            <QrCode className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
          </button>
        </header>

        {/* Two-Column Main Layout */}
        <main className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 gap-7 items-start">
          {/* LEFT COLUMN: 1. Foto -> 2. Credenciais -> 3. Bio -> 4. WhatsApp -> 5. Redes Sociais -> 6. Endereço + Mapa */}
          <aside className="md:col-span-5 lg:col-span-4 bg-white p-6 sm:p-7 rounded-[2rem] border border-slate-200/90 shadow-sm flex flex-col items-center text-center gap-5">
            {/* 1. FOTO */}
            <div
              className="w-40 h-40 sm:w-44 sm:h-44 rounded-full overflow-hidden border-4 shadow-md relative bg-slate-100 flex-shrink-0 flex items-center justify-center"
              style={{ borderColor: primaryColor }}
            >
              {prof.photoUrl ? (
                <img
                  src={prof.photoUrl}
                  alt={formattedName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-20 h-20 text-slate-400" />
              )}
            </div>

            {/* 2. CREDENCIAIS */}
            <div className="flex flex-col gap-1.5 items-center w-full">
              <h1 className="font-serif text-2xl font-semibold text-slate-900 leading-tight">
                {formattedName}
              </h1>
              <span
                className="text-xs uppercase tracking-wider font-bold"
                style={{ color: primaryColor }}
              >
                {profissaoTitulo}
              </span>

              {prof.especialidade &&
                prof.profissao &&
                prof.especialidade !== prof.profissao && (
                  <span className="text-xs text-slate-600 font-medium">
                    {prof.especialidade}
                  </span>
                )}

              <div className="flex flex-wrap items-center justify-center gap-1.5 mt-1.5">
                {prof.crp && (
                  <span className="text-[11px] font-mono px-2.5 py-1 bg-slate-100 rounded-lg text-slate-700 border border-slate-200 font-medium">
                    Registro: {prof.crp}
                  </span>
                )}
                {company.cnpj && (
                  <span className="text-[11px] font-mono px-2.5 py-1 bg-slate-50 rounded-lg text-slate-600 border border-slate-200">
                    CNPJ: {company.cnpj}
                  </span>
                )}
              </div>

              <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 bg-slate-50 border border-slate-200/80 px-3 py-1 rounded-lg mt-1">
                {modalidade === "presencial" ? (
                  <Building2 className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                ) : (
                  <Video className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                )}
                <span>{modalidadeLabel}</span>
              </div>
            </div>

            {/* 3. BIO CURTA */}
            {prof.bioCurta && (
              <div className="w-full border-t border-slate-100 pt-4">
                <p className="text-sm text-slate-600 leading-relaxed italic px-1">
                  "{prof.bioCurta}"
                </p>
              </div>
            )}

            {/* 4. BOTÃO DO WHATSAPP OTIMIZADO (+ COMPARTILHAR) */}
            <div className="w-full flex flex-col gap-2.5 pt-1">
              {whatsAppWhiteLabelUrl && (
                <a
                  href={whatsAppWhiteLabelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group w-full py-3.5 px-4 bg-[#1FAF5A] hover:bg-[#19964B] text-white rounded-2xl shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3 cursor-pointer ring-4 ring-[#1FAF5A]/15"
                >
                  <span className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <WhatsAppBrandIcon className="w-5 h-5 text-white" />
                  </span>
                  <span className="flex flex-col items-start text-left leading-tight">
                    <span className="font-bold text-sm tracking-tight">
                      {whatsAppCtaLabel}
                    </span>
                    <span className="text-[11px] text-white/85 font-medium">
                      Falar diretamente no WhatsApp
                    </span>
                  </span>
                </a>
              )}

              <button
                type="button"
                onClick={() => setShareModalOpen(true)}
                className="w-full py-2.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Compartilhar Cartão / QR Code</span>
              </button>
            </div>

            {/* 5. REDES SOCIAIS & CURRÍCULO LATTES */}
            {activeSocialLinks.length > 0 && (
              <div className="w-full border-t border-slate-100 pt-4 flex flex-col gap-2.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Redes & Currículo
                </span>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {activeSocialLinks.map(({ key, shortLabel, label, url, Icon }) => (
                    <a
                      key={key}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={label}
                      className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-white border border-slate-200/90 hover:border-slate-300 shadow-2xs hover:shadow-sm hover:-translate-y-0.5 transition-all inline-flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-slate-950"
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{shortLabel}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* 6. ENDEREÇO PRESENCIAL + MAPA INCORPORADO */}
            {showPresencialAddress && (endereco.logradouro || endereco.cidade) && (
              <div className="w-full border-t border-slate-100 pt-5 flex flex-col gap-3 text-left">
                <div className="flex items-start gap-2.5">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                    style={{
                      backgroundColor: `${primaryColor}15`,
                      color: primaryColor,
                    }}
                  >
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Atendimento Presencial
                    </span>
                    {endereco.nomeEspaco && (
                      <h3 className="text-xs font-bold text-slate-900 mt-0.5 leading-snug">
                        {endereco.nomeEspaco}
                      </h3>
                    )}
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {[
                        endereco.logradouro,
                        endereco.numero ? `, ${endereco.numero}` : "",
                        endereco.complemento ? ` — ${endereco.complemento}` : "",
                      ].join("")}
                      {(endereco.bairro || endereco.cidade || endereco.uf) && (
                        <span className="block text-slate-500 mt-0.5">
                          {[
                            endereco.bairro,
                            [endereco.cidade, endereco.uf]
                              .filter(Boolean)
                              .join("/"),
                          ]
                            .filter(Boolean)
                            .join(" • ")}
                          {endereco.cep ? ` • CEP ${endereco.cep}` : ""}
                        </span>
                      )}
                    </p>
                    {endereco.referencia && (
                      <p className="text-[11px] text-slate-500 italic mt-1">
                        {endereco.referencia}
                      </p>
                    )}
                  </div>
                </div>

                {mapsInfo.embedUrl && (
                  <>
                    <div className="w-full h-48 rounded-2xl overflow-hidden border border-slate-200 shadow-2xs bg-slate-100">
                      <iframe
                        title={`Localização de atendimento de ${formattedName}`}
                        src={mapsInfo.embedUrl}
                        className="w-full h-full border-0"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={mapsInfo.googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2 px-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700 hover:text-slate-950 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <GoogleMapsBrandIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>Google Maps</span>
                      </a>
                      <a
                        href={mapsInfo.wazeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2 px-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700 hover:text-slate-950 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <WazeBrandIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>Ir com Waze</span>
                      </a>
                    </div>
                  </>
                )}
              </div>
            )}
          </aside>

          {/* RIGHT COLUMN: Sobre Mim, Serviços Particulares & Artigos */}
          <div className="md:col-span-7 lg:col-span-8 flex flex-col gap-6">
            <section className="bg-white p-6 sm:p-9 rounded-[2rem] border border-slate-200/90 shadow-sm flex flex-col gap-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <Heart
                    className="w-6 h-6 shrink-0"
                    style={{ color: primaryColor }}
                  />
                  <h2 className="font-serif text-xl sm:text-2xl font-semibold text-slate-900">
                    Sobre Mim & Abordagem
                  </h2>
                </div>
                {prof.abordagem && (
                  <span
                    className="text-xs font-semibold px-3 py-1 rounded-lg border"
                    style={{
                      borderColor: `${secondaryColor}40`,
                      backgroundColor: `${secondaryColor}12`,
                      color: primaryColor,
                    }}
                  >
                    {prof.abordagem}
                  </span>
                )}
              </div>

              {prof.biografia ? (
                <div className="text-sm sm:text-base leading-relaxed text-slate-700 whitespace-pre-line">
                  {prof.biografia}
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic py-4">
                  Apresentação profissional em atualização.
                </p>
              )}
            </section>

            <section className="bg-white p-6 sm:p-9 rounded-[2rem] border border-slate-200/90 shadow-sm flex flex-col gap-5">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <Award
                  className="w-6 h-6 shrink-0"
                  style={{ color: primaryColor }}
                />
                <h2 className="font-serif text-xl sm:text-2xl font-semibold text-slate-900">
                  Serviços & Consultas Particulares
                </h2>
              </div>

              {customServices.length === 0 &&
              (!prof.servicosOferecidos ||
                prof.servicosOferecidos.length === 0) ? (
                <p className="text-sm text-slate-400 italic py-4">
                  Entre em contato pelo WhatsApp para consultar modalidades e disponibilidade de horários.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {customServices.map((srv: any, idx: number) => {
                    const srvTitle = srv.title || srv.titulo || "Atendimento";
                    const srvWaUrl = whatsAppNumber
                      ? `https://api.whatsapp.com/send?phone=${whatsAppNumber}&text=${encodeURIComponent(
                          `Olá ${formattedName}! Gostaria de agendar / saber mais sobre: ${srvTitle}.`,
                        )}`
                      : "";
                    return (
                      <div
                        key={`cust-srv-${idx}`}
                        className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/90 flex flex-col justify-between gap-3 hover:bg-white hover:shadow-sm transition-all"
                      >
                        <div>
                          <h4 className="font-serif text-base font-bold text-slate-900">
                            {srvTitle}
                          </h4>
                          {srv.description && (
                            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                              {srv.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-slate-200/70 text-xs gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            {srv.duration && (
                              <span className="text-slate-500 font-medium">
                                {srv.duration}
                              </span>
                            )}
                            {srv.price && (
                              <span className="font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                                R$ {srv.price}
                              </span>
                            )}
                          </div>
                          {srvWaUrl && (
                            <a
                              href={srvWaUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-bold text-[#19964B] hover:underline inline-flex items-center gap-1"
                            >
                              <WhatsAppBrandIcon className="w-3.5 h-3.5" />
                              Agendar
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {customServices.length === 0 &&
                    prof.servicosOferecidos &&
                    prof.servicosOferecidos.map((srv: string, idx: number) => (
                      <div
                        key={`std-srv-${idx}`}
                        className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/90 flex items-center justify-between gap-2"
                      >
                        <h4 className="font-serif text-base font-bold text-slate-900">
                          {srv === "Outros"
                            ? prof.outrosServicos || "Atendimento Especializado"
                            : srv}
                        </h4>
                        <span className="text-xs font-semibold text-slate-500 shrink-0">
                          Particular
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </section>

            {/* Vitrine Opcional: Eventos, Workshops & Oportunidades (White-Label) */}
            {showEventosNaPagina && (
              <section className="bg-white p-6 sm:p-9 rounded-[2rem] border border-slate-200/90 shadow-sm flex flex-col gap-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <Sparkles
                      className="w-6 h-6 shrink-0"
                      style={{ color: primaryColor }}
                    />
                    <div>
                      <h2 className="font-serif text-xl sm:text-2xl font-semibold text-slate-900">
                        Eventos, Workshops & Oportunidades
                      </h2>
                      <p className="text-xs text-slate-500">
                         Encontros, grupos, supervisões e parcerias organizadas por{" "}
                        {formattedName}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {oportunidadesPublicadas.map((op) => {
                    const isCartaz = op.imagemModoExibicao === "cartaz";
                    const posY =
                      typeof op.imagemPosicaoY === "number"
                        ? op.imagemPosicaoY
                        : 50;
                    return (
                      <div
                        key={`${op._kind}-${op.id}`}
                        onClick={() => handleOpenOportunidade(op)}
                        className="rounded-2xl border border-slate-200/90 bg-slate-50/60 hover:bg-white hover:shadow-sm transition-all overflow-hidden flex flex-col justify-between cursor-pointer group"
                      >
                        <div>
                          {op.imagemUrl && (
                            <div className="w-full aspect-[16/9] bg-slate-100 relative overflow-hidden border-b border-slate-200/70">
                              {isCartaz ? (
                                <>
                                  <img
                                    src={op.imagemUrl}
                                    alt=""
                                    aria-hidden="true"
                                    referrerPolicy="no-referrer"
                                    className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-45 pointer-events-none"
                                  />
                                  <img
                                    src={op.imagemUrl}
                                    alt={op.titulo}
                                    referrerPolicy="no-referrer"
                                    className="relative z-10 w-full h-full object-contain p-2"
                                  />
                                </>
                              ) : (
                                <img
                                  src={op.imagemUrl}
                                  alt={op.titulo}
                                  referrerPolicy="no-referrer"
                                  style={{ objectPosition: `50% ${posY}%` }}
                                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                                />
                              )}
                            </div>
                          )}

                          <div className="p-5 flex flex-col gap-2">
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 flex-wrap tabular-nums">
                              <span
                                className="font-bold uppercase tracking-wider"
                                style={{ color: primaryColor }}
                              >
                                {op.tipo ||
                                  (op._kind === "evento" ? "Evento" : "Serviço")}
                              </span>
                              {op.data && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span>{formatEventDateDisplay(op.data)}</span>
                                </>
                              )}
                              {op.hora && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span>{op.hora}</span>
                                </>
                              )}
                              {(op.isGratuito || op.valor) && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span
                                    className={
                                      op.isGratuito
                                        ? "text-emerald-700 font-bold"
                                        : "font-semibold text-slate-700"
                                    }
                                  >
                                    {op.isGratuito ? "Gratuito" : op.valor}
                                  </span>
                                </>
                              )}
                            </div>

                            <h3 className="font-serif text-base sm:text-lg font-bold text-slate-900 leading-snug">
                              {op.titulo}
                            </h3>

                            {op.descricao && (
                              <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                                {op.descricao}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="px-5 pb-4 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs font-bold">
                          <span style={{ color: primaryColor }}>
                            Ver detalhes e inscrição
                          </span>
                          <ArrowRight
                            className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
                            style={{ color: primaryColor }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {showArtigosNaPagina && (
              <section className="bg-white p-6 sm:p-9 rounded-[2rem] border border-slate-200/90 shadow-sm flex flex-col gap-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <BookOpen
                      className="w-6 h-6 shrink-0"
                      style={{ color: primaryColor }}
                    />
                    <div>
                      <h2 className="font-serif text-xl sm:text-2xl font-semibold text-slate-900">
                        Artigos & Publicações
                      </h2>
                      <p className="text-xs text-slate-500">
                        Conteúdos e reflexões escritas por {formattedName}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {artigosProfissional.map((artigo) => (
                    <BlogCard
                      key={artigo.id || artigo.titulo}
                      artigo={artigo}
                      whiteLabelMode={true}
                      shareUrlOverride={`${window.location.origin}${window.location.pathname}?prof=${profUid}&artigo=${artigo.id || ""}`}
                      onRead={(art) => handleOpenWlArtigo(art)}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        </main>

        <footer className="w-full max-w-5xl text-center py-10 text-slate-500 text-xs flex flex-col items-center gap-1.5 mt-4">
          <p className="font-medium text-slate-600">
            {company.razaoSocial || formattedName}
            {company.cnpj ? ` • CNPJ: ${company.cnpj}` : ""}
            {prof.crp ? ` • Registro: ${prof.crp}` : ""}
          </p>
          {company.enderecoEmpresa && <p>{company.enderecoEmpresa}</p>}
          {company.telefoneEmpresa && <p>Contato: {company.telefoneEmpresa}</p>}
        </footer>

        {/* Share & QR Code Modal */}
        {shareModalOpen && (
          <div
            className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setShareModalOpen(false)}
          >
            <div
              className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setShareModalOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Fechar janela de compartilhamento"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center space-y-1 pr-6 sm:pr-0">
                <h3 className="font-serif text-xl font-bold text-slate-900">
                  Compartilhar Página Profissional
                </h3>
                <p className="text-xs text-slate-500">
                  {formattedName} • {profissaoTitulo}
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center gap-2.5">
                <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
                  <img
                    src={qrCodeUrl}
                    alt={`QR Code da página de ${formattedName}`}
                    className="w-44 h-44 object-contain"
                  />
                </div>
                <span className="text-[11px] text-slate-500 text-center">
                  Aponte a câmera do celular para abrir esta página diretamente
                </span>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <span className="text-xs font-mono text-slate-600 truncate flex-1 select-all">
                  {pageUrl}
                </span>
                <button
                  type="button"
                  onClick={handleCopyPageLink}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
                >
                  {copySuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copiar
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                    `${shareDescription}\n${pageUrl}`,
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 px-4 rounded-xl bg-[#1FAF5A] hover:bg-[#19964B] text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-xs"
                >
                  <WhatsAppBrandIcon className="w-4 h-4" />
                  Enviar no WhatsApp
                </a>

                {typeof navigator !== "undefined" && !!navigator.share ? (
                  <button
                    type="button"
                    onClick={() => {
                      navigator
                        .share({
                          title: shareTitle,
                          text: shareDescription,
                          url: pageUrl,
                        })
                        .catch(() => {});
                    }}
                    className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    Mais Opções
                  </button>
                ) : (
                  <a
                    href={qrCodeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Abrir QR Code
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCFBF7] text-forest p-4 sm:p-6 md:p-8 flex flex-col items-center">
      {/* Header Banner */}
      <header className="w-full max-w-4xl flex items-center justify-between mb-8 sm:mb-12 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button 
            onClick={handleGoHome}
            className="text-forest/70 hover:text-forest transition-colors p-2 -ml-2 rounded-full hover:bg-forest/5 cursor-pointer shrink-0"
            aria-label="Voltar para a página inicial"
            title="Voltar para a página inicial"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <BrandLogo 
          size="md"
          badge="Parceiro"
          onClick={handleGoHome}
        />
      </header>
      
      <Breadcrumbs 
        items={[
          { label: "Início", onClick: handleGoHome }, 
          { label: "Profissionais", onClick: handleGoHome },
          { label: prof ? `${prof.profissao || "Profissional"} ${formatProfessionalName(prof.name)}` : "Perfil do Profissional", active: true }
        ]} 
        className="max-w-4xl px-0 mb-6 w-full" 
      />

      {/* Main Showcase Layout */}
      <main className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Column: Avatar and Quick Details */}
        <div className="md:col-span-1 bg-white p-6 sm:p-8 rounded-[2rem] border border-soft shadow-sm flex flex-col items-center text-center gap-6 h-fit">
          <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full overflow-hidden border-4 border-sun shadow-md relative bg-forest/10 flex-shrink-0 flex items-center justify-center">
            {prof.photoUrl ? (
              <>
                <img src={prof.photoUrl} alt={formatProfessionalName(prof.name)} className="w-full h-full object-cover" />
                {/* Esmaecimento no pé da foto */}
                <div className="absolute inset-x-0 bottom-0 h-10 sm:h-12 bg-gradient-to-t from-white/90 via-white/40 to-transparent pointer-events-none" />
              </>
            ) : (
              <User className="w-20 h-20 text-forest/70" />
            )}
          </div>
          
          <div className="flex flex-col gap-1 items-center w-full">
            <h1 className="font-serif text-2xl font-semibold leading-tight">{formatProfessionalName(prof.name)}</h1>
            <span className="text-xs uppercase tracking-wider font-bold text-sun-dark mt-1">
              {prof.profissao || "Profissional de Saúde"}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 mt-1.5 rounded-full bg-sun-light/80 text-forest border border-sun-dark/30 text-[10px] font-bold uppercase tracking-wider shadow-2xs">
              <ShieldCheck className="w-3 h-3 text-sun-dark" />
              Selo Profissional Sênior
            </span>
            
            <div className="flex gap-4 mt-4 items-center justify-center">
              <button 
                onClick={() => {
                  const url = `${window.location.origin}?prof=${profUid}`;
                  const formattedName = formatProfessionalName(prof.name);
                  const profissaoOuTitulo = prof.profissao || (prof.especialidade ? `Profissional - ${prof.especialidade}` : "Profissional de Saúde");
                  const shareTitle = `${formattedName} - ${profissaoOuTitulo}`;
                  const shareText = `Conheça o perfil profissional de ${formattedName} (${profissaoOuTitulo}) no Projeto AcolheMente Saúde.`;

                  if (navigator.share) {
                    navigator.share({
                      title: shareTitle,
                      text: shareText,
                      url: url,
                    }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(url).then(() => {
                      setCopySuccess(true);
                      setTimeout(() => setCopySuccess(false), 3000);
                    }).catch(e => console.error(e));
                  }
                }}
                className="p-2 bg-warm rounded-full text-forest/70 hover:text-forest hover:bg-soft transition-colors shadow-sm cursor-pointer relative" 
                title="Compartilhar Perfil"
              >
                <Share2 className="w-4 h-4" />
                {copySuccess && (
                  <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-forest text-white text-[10px] px-2 py-0.5 rounded shadow whitespace-nowrap z-20 animate-fade-in">
                    Link copiado!
                  </span>
                )}
              </button>
            </div>

            {prof.crp && (
              <span className="text-[10px] tracking-wide font-mono px-2.5 py-1 bg-warm rounded-md text-forest/70 border border-soft mt-3">
                CRP {prof.crp}
              </span>
            )}
          </div>

          <div className="w-full border-t border-soft/60 pt-4 flex flex-col gap-3 text-left self-start text-xs text-forest/80">
            {prof.especialidade && (
              <div className="flex items-start gap-2.5">
                <Award className="w-4 h-4 text-sun-dark shrink-0 mt-0.5" />
                <div>
                  <span className="block text-[9px] font-bold uppercase text-forest/50">Abordagem / Especialidade</span>
                  <span className="font-medium">{prof.especialidade}</span>
                </div>
              </div>
            )}
            
            {(prof.cidade || prof.uf) && (
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-sun-dark shrink-0 mt-0.5" />
                <div>
                  <span className="block text-[9px] font-bold uppercase text-forest/50">Localidade</span>
                  <span className="font-medium">{prof.cidade || ''}{prof.cidade && prof.uf ? `, ` : ''}{prof.uf || ''}</span>
                </div>
              </div>
            )}

            {prof.horasDisponiveis && (
              <div className="flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-sun-dark shrink-0 mt-0.5" />
                <div>
                  <span className="block text-[9px] font-bold uppercase text-forest/50">Disponibilidade</span>
                  <span className="font-medium">{prof.horasDisponiveis}</span>
                </div>
              </div>
            )}
          </div>

          {whatsAppUrl ? (
            <a 
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 px-2 bg-[#34A853] text-white rounded-xl font-bold uppercase tracking-wider text-[11px] shadow-md hover:bg-[#2e9449] hover:shadow-lg transition-all flex items-center justify-center gap-2 mt-4 text-center leading-tight cursor-pointer"
            >
              <Phone className="w-5 h-5 shrink-0" /> Entre em contato e agende sua primeira sessão
            </a>
          ) : (
            <button
              onClick={() => {
                handleGoHome();
              }}
              className="w-full py-3.5 px-2 bg-forest text-white rounded-xl font-bold uppercase tracking-wider text-[11px] shadow-md hover:bg-forest/90 transition-all flex items-center justify-center gap-2 mt-4 text-center leading-tight cursor-pointer"
            >
              <Phone className="w-4 h-4 shrink-0" /> Iniciar Acolhimento pelo Projeto
            </button>
          )}
        </div>

        {/* Right Columns: Bio & Experience */}
        <div className="md:col-span-2 flex flex-col gap-6">
          
          {/* Main Biography Section */}
          <div className="bg-white p-6 sm:p-10 rounded-[2rem] border border-soft shadow-sm flex flex-col gap-6">
            <div className="flex items-center gap-3 border-b border-soft/60 pb-4">
              <Heart className="w-6 h-6 text-sun-dark shrink-0" />
              <h2 className="font-serif text-xl sm:text-2xl font-semibold">Sobre mim & Abordagem Técnica</h2>
            </div>
            
            {prof.biografia ? (
              <div className="text-sm sm:text-base leading-relaxed text-forest/80 whitespace-pre-line space-y-4">
                {prof.biografia}
              </div>
            ) : (
              <p className="text-sm text-forest/50 italic py-6">O profissional ainda não incluiu um mini-currículo.</p>
            )}

            {!hideMotivacaoProjeto && prof.motivacaoProjeto && (
              <>
                <div className="mt-4 flex items-center gap-3 border-b border-soft/60 pb-4">
                  <h2 className="font-serif text-xl sm:text-2xl font-semibold text-forest">Porque faço parte desse projeto?</h2>
                </div>
                <div className="text-sm sm:text-base leading-relaxed text-forest/80 whitespace-pre-line space-y-4">
                  {prof.motivacaoProjeto}
                </div>
              </>
            )}

            <div className="mt-6 pt-6 border-t border-soft/60 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex gap-3 items-start bg-warm/30 p-4 rounded-2xl border border-soft">
                <CheckCircle2 className="w-5 h-5 text-sun-dark shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-forest">Apoio Acolhedor</h4>
                  <p className="text-xs text-forest/70 mt-1">Sessões estruturadas para acolhimento preventivo, com escuta atenta e livre de julgamentos.</p>
                </div>
              </div>
              
              <div className="flex gap-3 items-start bg-warm/30 p-4 rounded-2xl border border-soft">
                <CheckCircle2 className="w-5 h-5 text-sun-dark shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-forest">Ética Profissional</h4>
                  <p className="text-xs text-forest/70 mt-1">Todos os atendimentos seguem as diretrizes éticas e de sigilo absoluto do Conselho de Psicologia.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Services Section */}
          <div className="bg-white p-6 sm:p-10 rounded-[2rem] border border-soft shadow-sm flex flex-col gap-6">
            <div className="flex items-center gap-3 border-b border-soft/60 pb-4">
              <Award className="w-6 h-6 text-sun-dark shrink-0" />
              <h2 className="font-serif text-xl sm:text-2xl font-semibold">Serviços Oferecidos</h2>
            </div>
            {(!prof.servicosOferecidos || prof.servicosOferecidos.length === 0) && servicos.length === 0 ? (
              <p className="text-sm text-forest/50 italic py-4">Este profissional ainda não especificou seus serviços individuais.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Serviços selecionados no formulário */}
                {prof.servicosOferecidos && prof.servicosOferecidos.map((srv: string) => {
                  return (
                    <div key={`std-svc-${srv}`} className="p-5 rounded-2xl bg-warm/20 border border-soft/60 flex items-center hover:shadow-md transition-all">
                      <h4 className="font-serif text-base sm:text-lg font-bold text-forest leading-tight">
                        {srv === "Outros" ? `Outros: ${prof.outrosServicos || "Especifique"}` : srv}
                      </h4>
                    </div>
                  );
                })}

                {/* Serviços da coleção legado se houver */}
                {servicos.map((svc) => (
                  <div key={svc.id} className="p-5 rounded-2xl bg-warm/20 border border-soft/60 flex items-center hover:shadow-md transition-all">
                    <h4 className="font-serif text-base sm:text-lg font-bold text-forest leading-tight">{svc.nome}</h4>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Seção Opcional: Eventos, Workshops & Oportunidades (Página Institucional) */}
          {showEventosNaPagina && (
            <div className="bg-white p-6 sm:p-10 rounded-[2rem] border border-soft shadow-sm flex flex-col gap-6">
              <div className="flex items-center justify-between border-b border-soft/60 pb-4 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-sun-dark shrink-0" />
                  <div>
                    <h2 className="font-serif text-xl sm:text-2xl font-semibold">
                      Eventos, Workshops & Oportunidades
                    </h2>
                    <p className="text-xs text-forest/60">
                      Encontros, supervisões e serviços divulgados por este profissional
                    </p>
                  </div>
                </div>
                <span className="text-xs text-forest/60 font-medium tabular-nums">
                  {oportunidadesPublicadas.length}{" "}
                  {oportunidadesPublicadas.length === 1
                    ? "publicação ativa"
                    : "publicações ativas"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {oportunidadesPublicadas.map((op) => {
                  const isCartaz = op.imagemModoExibicao === "cartaz";
                  const posY =
                    typeof op.imagemPosicaoY === "number"
                      ? op.imagemPosicaoY
                      : 50;
                  return (
                    <div
                      key={`std-op-${op._kind}-${op.id}`}
                      onClick={() => handleOpenOportunidade(op)}
                      className="rounded-2xl border border-soft bg-warm/20 hover:bg-white hover:shadow-md transition-all overflow-hidden flex flex-col justify-between cursor-pointer group"
                    >
                      <div>
                        {op.imagemUrl && (
                          <div className="w-full aspect-[16/9] bg-forest/5 relative overflow-hidden border-b border-soft/70">
                            {isCartaz ? (
                              <>
                                <img
                                  src={op.imagemUrl}
                                  alt=""
                                  aria-hidden="true"
                                  referrerPolicy="no-referrer"
                                  className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-45 pointer-events-none"
                                />
                                <img
                                  src={op.imagemUrl}
                                  alt={op.titulo}
                                  referrerPolicy="no-referrer"
                                  className="relative z-10 w-full h-full object-contain p-2"
                                />
                              </>
                            ) : (
                              <img
                                src={op.imagemUrl}
                                alt={op.titulo}
                                referrerPolicy="no-referrer"
                                style={{ objectPosition: `50% ${posY}%` }}
                                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                              />
                            )}
                          </div>
                        )}

                        <div className="p-5 flex flex-col gap-2">
                          <div className="flex items-center gap-1.5 text-[11px] text-forest/65 flex-wrap tabular-nums">
                            <span className="font-bold uppercase tracking-wider text-forest">
                              {op.tipo ||
                                (op._kind === "evento" ? "Evento" : "Serviço")}
                            </span>
                            {op.data && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>{formatEventDateDisplay(op.data)}</span>
                              </>
                            )}
                            {op.hora && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>{op.hora}</span>
                              </>
                            )}
                            {(op.isGratuito || op.valor) && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span
                                  className={
                                    op.isGratuito
                                      ? "text-emerald-700 font-bold"
                                      : "font-semibold text-forest"
                                  }
                                >
                                  {op.isGratuito ? "Gratuito" : op.valor}
                                </span>
                              </>
                            )}
                          </div>

                          <h3 className="font-serif text-base sm:text-lg font-bold text-forest leading-snug">
                            {op.titulo}
                          </h3>

                          {op.descricao && (
                            <p className="text-xs text-forest/75 leading-relaxed line-clamp-2">
                              {op.descricao}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="px-5 pb-4 pt-2 border-t border-soft/60 flex items-center justify-between text-xs font-bold text-forest">
                        <span>Ver detalhes e inscrição</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Seção Opcional: Artigos & Publicações do Profissional */}
          {showArtigosNaPagina && (
            <div className="bg-white p-6 sm:p-10 rounded-[2rem] border border-soft shadow-sm flex flex-col gap-6">
              <div className="flex items-center justify-between border-b border-soft/60 pb-4 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-6 h-6 text-sun-dark shrink-0" />
                  <div>
                    <h2 className="font-serif text-xl sm:text-2xl font-semibold">Artigos & Publicações</h2>
                    <p className="text-xs text-forest/60">Textos informativos e reflexões escritas por este profissional</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-forest/60 tabular-nums">
                  {artigosProfissional.length} {artigosProfissional.length === 1 ? "artigo publicado" : "artigos publicados"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {artigosProfissional.map((artigo) => (
                  <BlogCard
                    key={artigo.id || artigo.titulo}
                    artigo={artigo}
                    onRead={(art) => {
                      try {
                        const url = new URL(window.location.href);
                        url.searchParams.set("artigo", art.id || "");
                        url.searchParams.delete("prof");
                        window.history.pushState({}, "", url.toString());
                      } catch (e) {
                        console.error(e);
                      }
                      if (onReadArtigo && art.id) {
                        onReadArtigo(art.id);
                      } else {
                        window.location.href = `${window.location.origin}?artigo=${art.id}`;
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Call-to-Action Footer for Platform */}
          <div className="bg-forest text-white p-6 sm:p-8 rounded-[2rem] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="font-serif text-lg sm:text-xl font-semibold mb-1">Dúvidas sobre o acolhimento?</h3>
              <p className="text-xs text-white/80 max-w-md">O Projeto AcolheMente conecta você a profissionais dedicados com escuta qualificada e valores acessíveis.</p>
            </div>
            <button 
              onClick={handleGoHome}
              className="py-3.5 px-6 bg-white text-forest font-bold uppercase tracking-wider text-xs rounded-xl hover:bg-sun hover:text-forest hover:scale-[1.02] active:scale-[0.98] transition-all whitespace-nowrap cursor-pointer shadow-md"
            >
              Conhecer o AcolheMente
            </button>
          </div>
          
        </div>

      </main>
      
      {/* Mini Branding Footer */}
      <footer className="w-full max-w-4xl text-center py-12 text-forest/60 text-xs flex flex-col items-center gap-2">
        <p>© {new Date().getFullYear()} Projeto AcolheMente Saúde - Uma iniciativa de Elo Soluções Humanas. Todos os direitos reservados.</p>
        <button 
          onClick={handleGoHome}
          className="text-xs text-forest/75 hover:text-forest font-medium underline underline-offset-4 cursor-pointer transition-colors"
        >
          Voltar para a página inicial do projeto
        </button>
      </footer>
    </div>
  );
}
