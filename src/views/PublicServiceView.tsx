import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Clock,
  CreditCard,
  User,
  Phone,
  Mail,
  CheckCircle2,
  Share2,
  Heart,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  ZoomIn,
  X,
  Check,
} from "lucide-react";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  addDoc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { BrandLogo } from "../components/BrandLogo";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { hasIntegrarFeatures } from "../types/planosProfissionais";
import { formatProfessionalName } from "../utils/formatters";
import { formatEventDateDisplay } from "../utils/eventImageHelper";

interface PublicServiceViewProps {
  serviceId?: string | null;
  eventId?: string | null;
  returnProfUid?: string | null;
  onBack: () => void;
  onGoHome?: () => void;
  onSelectProf?: (profUid: string) => void;
}

export function PublicServiceView({
  serviceId,
  eventId,
  returnProfUid,
  onBack,
  onGoHome,
  onSelectProf,
}: PublicServiceViewProps) {
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<any>(null);
  const [creatorProf, setCreatorProf] = useState<any>(null);
  const [isEvent, setIsEvent] = useState(false);
  const [showInscribeForm, setShowInscribeForm] = useState(true);
  const [inscribed, setInscribed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [heroImgError, setHeroImgError] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [guestForm, setGuestForm] = useState({
    nomeCompleto: "",
    whatsapp: "",
    email: "",
    profissao: "",
    mensagem: "",
  });

  const handleGoHome = () => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    if (onGoHome) {
      onGoHome();
    } else if (onBack) {
      onBack();
    } else {
      window.location.href = window.location.origin;
    }
  };

  const handleNavigateToProf = (targetProfUid: string) => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    try {
      const cleanUrl = `${window.location.origin}${window.location.pathname}?prof=${targetProfUid}`;
      window.history.pushState({}, "", cleanUrl);
    } catch (e) {
      console.error(e);
    }
    if (onSelectProf) {
      onSelectProf(targetProfUid);
    } else {
      window.location.href = `${window.location.origin}?prof=${targetProfUid}`;
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen]);

  useEffect(() => {
    async function fetchItemAndCreator() {
      setLoading(true);
      setHeroImgError(false);
      try {
        const id = serviceId || eventId;
        if (!id) return;

        const isEv = !!eventId;
        setIsEvent(isEv);

        const collectionName = isEv ? "eventos" : "servicos";
        const docRef = doc(db, collectionName, id);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
          const itemData: any = { id: snap.id, ...snap.data() };
          setItem(itemData);

          if (itemData.criadorId) {
            try {
              const profSnap = await getDoc(doc(db, "users", itemData.criadorId));
              if (profSnap.exists()) {
                setCreatorProf({ uid: profSnap.id, ...profSnap.data() });
              }
            } catch (profErr) {
              console.warn("Não foi possível carregar dados complementares do organizador:", profErr);
            }
          }
        }
      } catch (err) {
        console.error("Erro ao carregar detalhes públicos:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchItemAndCreator();
  }, [serviceId, eventId]);

  useEffect(() => {
    const id = serviceId || eventId;
    if (!id) return;

    const q = query(collection(db, "inscricoes"), where("itemId", "==", id));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setSubscribers(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (error) => {
        console.error("Erro ao carregar inscritos em tempo real:", error);
        handleFirestoreError(error, OperationType.GET, "inscricoes");
      },
    );

    return () => unsubscribe();
  }, [serviceId, eventId]);

  const isCreatorWhiteLabel = Boolean(
    creatorProf &&
      creatorProf.whiteLabelEnabled === true &&
      hasIntegrarFeatures(creatorProf),
  );

  const creatorDisplayName = formatProfessionalName(
    creatorProf?.name || creatorProf?.nome || item?.criadorNome || "Profissional Responsável",
  );

  // Atualiza dinamicamente título da aba e meta tags (respeitando White-Label sem citar AcolheMente)
  useEffect(() => {
    if (!item) return;
    const originalTitle = document.title;
    const pageTitle = isCreatorWhiteLabel
      ? `${item.titulo} | ${creatorDisplayName}`
      : `${item.titulo} | Projeto AcolheMente`;
    document.title = pageTitle;

    const descText = item.descricao
      ? String(item.descricao).slice(0, 155) + (String(item.descricao).length > 155 ? "..." : "")
      : isCreatorWhiteLabel
        ? `Confira os detalhes e inscreva-se: ${item.titulo} — organizado por ${creatorDisplayName}.`
        : `Confira os detalhes e inscreva-se: ${item.titulo} no Projeto AcolheMente.`;

    const metaMap: Record<string, { attr: string; val: string }> = {
      description: { attr: "name", val: descText },
      "og:title": { attr: "property", val: pageTitle },
      "og:description": { attr: "property", val: descText },
      "twitter:title": { attr: "name", val: pageTitle },
      "twitter:description": { attr: "name", val: descText },
    };

    const previewImg = item.imagemUrl || creatorProf?.photoUrl || item.criadorFoto;
    if (previewImg && !String(previewImg).startsWith("data:")) {
      metaMap["og:image"] = { attr: "property", val: previewImg };
      metaMap["twitter:image"] = { attr: "name", val: previewImg };
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
  }, [item, isCreatorWhiteLabel, creatorDisplayName, creatorProf?.photoUrl]);

  const totalInscritos = subscribers.length;
  const hasVagas = item && item.vagas && !isNaN(Number(item.vagas));
  const maxVagas = hasVagas ? Number(item.vagas) : null;
  const isFull = maxVagas !== null && totalInscritos >= maxVagas;
  const restamVagas = maxVagas !== null ? Math.max(0, maxVagas - totalInscritos) : null;

  const getContactLink = (targetItem: any) => {
    const isWhatsapp = targetItem.contatoPreferencial === "whatsapp";
    if (isWhatsapp) {
      const rawPhone = targetItem.contatoTelefone || targetItem.criadorContato || "";
      const cleanPhone = rawPhone.replace(/\D/g, "");
      const phoneWithCountry =
        cleanPhone.length === 11 || cleanPhone.length === 10
          ? `55${cleanPhone}`
          : cleanPhone;
      const text = encodeURIComponent(
        isCreatorWhiteLabel
          ? `Olá! Gostaria de me inscrever ou saber mais sobre "${targetItem.titulo}".`
          : `Olá! Gostaria de me inscrever ou saber mais sobre "${targetItem.titulo}" que vi no AcolheMente.`,
      );
      return `https://wa.me/${phoneWithCountry}?text=${text}`;
    } else {
      const email = targetItem.contatoEmail || targetItem.criadorContato || "";
      const subject = encodeURIComponent(`Inscrição: ${targetItem.titulo}`);
      const body = encodeURIComponent(
        isCreatorWhiteLabel
          ? `Olá, gostaria de realizar minha inscrição ou saber mais sobre "${targetItem.titulo}".`
          : `Olá, gostaria de realizar minha inscrição em "${targetItem.titulo}" anunciado no AcolheMente.`,
      );
      return `mailto:${email}?subject=${subject}&body=${body}`;
    }
  };

  const handleShare = () => {
    const isEv = !!eventId;
    const baseUrl = isEv
      ? `${window.location.origin}${window.location.pathname}?evento=${eventId}`
      : `${window.location.origin}${window.location.pathname}?servico=${serviceId}`;

    navigator.clipboard
      .writeText(baseUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      })
      .catch((err) => {
        console.error("Erro ao copiar link:", err);
      });
  };

  const handleInscribeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (
      !guestForm.nomeCompleto.trim() ||
      !guestForm.whatsapp.trim() ||
      !guestForm.email.trim() ||
      !guestForm.profissao.trim()
    ) {
      setFormError("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    try {
      await addDoc(collection(db, "inscricoes"), {
        itemId: item.id,
        itemTitulo: item.titulo,
        itemTipo: isEvent ? "evento" : "servico",
        criadorId: item.criadorId || "",
        nomeCompleto: guestForm.nomeCompleto.trim(),
        whatsapp: guestForm.whatsapp.trim(),
        email: guestForm.email.trim(),
        profissao: guestForm.profissao.trim(),
        mensagem: guestForm.mensagem.trim(),
        createdAt: serverTimestamp(),
      });
      setInscribed(true);
    } catch (err) {
      console.error("Erro ao realizar inscrição:", err);
      setFormError("Não foi possível registrar sua inscrição no momento. Tente novamente.");
      handleFirestoreError(err, OperationType.CREATE, "inscricoes");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FCFBF7] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 border-4 border-forest border-t-transparent rounded-full animate-spin" />
          <p className="text-forest/70 font-medium">Carregando detalhes...</p>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-[#FCFBF7] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white rounded-[2rem] p-8 shadow-xl border border-soft text-center">
          <Heart className="w-12 h-12 text-forest/40 mx-auto mb-4" />
          <h2 className="font-serif text-2xl font-medium text-forest mb-2">
            Publicação não encontrada
          </h2>
          <p className="text-forest/70 text-sm mb-6">
            Este serviço ou evento não está disponível ou já foi encerrado.
          </p>
          <button
            onClick={
              returnProfUid
                ? () => handleNavigateToProf(returnProfUid)
                : handleGoHome
            }
            className="w-full py-3 bg-forest text-white rounded-full font-semibold hover:bg-forest/90 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
        </div>
      </div>
    );
  }

  const wlConfig = creatorProf?.whiteLabelConfig || {};
  const company = creatorProf?.companyData || {};
  const wlBgColor = wlConfig.backgroundColor || "#F8FAFC";
  const wlPrimaryColor = wlConfig.primaryColor || "#0F766E";
  const effectiveProfBackUid = returnProfUid || item.criadorId || null;

  const renderHeroImage = () => {
    if (!item.imagemUrl || heroImgError) return null;
    const isCartaz = item.imagemModoExibicao === "cartaz";
    const focusY = typeof item.imagemPosicaoY === "number" ? item.imagemPosicaoY : 50;

    return (
      <div
        onClick={() => setLightboxOpen(true)}
        className="w-full relative overflow-hidden bg-slate-900/5 border-b border-black/5 cursor-zoom-in group"
      >
        {isCartaz ? (
          <div className="w-full max-h-[460px] min-h-[240px] relative flex items-center justify-center overflow-hidden p-3 sm:p-5">
            <img
              src={item.imagemUrl}
              alt=""
              aria-hidden="true"
              referrerPolicy="no-referrer"
              onError={() => setHeroImgError(true)}
              className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-45 pointer-events-none"
            />
            <img
              src={item.imagemUrl}
              alt={item.titulo}
              referrerPolicy="no-referrer"
              onError={() => setHeroImgError(true)}
              className="relative z-10 max-h-[420px] w-auto max-w-full object-contain rounded-xl shadow-md transition-transform duration-200 group-hover:scale-[1.01]"
            />
          </div>
        ) : (
          <div className="w-full aspect-[16/9] overflow-hidden relative">
            <img
              src={item.imagemUrl}
              alt={item.titulo}
              referrerPolicy="no-referrer"
              onError={() => setHeroImgError(true)}
              style={{ objectPosition: `50% ${focusY}%` }}
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.01]"
            />
          </div>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setLightboxOpen(true);
          }}
          className="absolute bottom-3 right-3 z-20 px-3 py-1.5 rounded-xl bg-black/65 hover:bg-black/80 text-white text-[11px] font-semibold backdrop-blur-xs inline-flex items-center gap-1.5 transition-opacity cursor-pointer"
        >
          <ZoomIn className="w-3.5 h-3.5" />
          <span>{isCartaz ? "Ampliar cartaz" : "Ampliar imagem"}</span>
        </button>
      </div>
    );
  };

  return (
    <div
      className={`min-h-screen p-4 sm:p-6 md:p-8 flex flex-col items-center ${
        isCreatorWhiteLabel ? "text-slate-800" : "bg-[#FCFBF7] text-forest"
      }`}
      style={isCreatorWhiteLabel ? { backgroundColor: wlBgColor } : undefined}
    >
      {/* Top Bar: White-Label Independente vs Institucional AcolheMente */}
      {isCreatorWhiteLabel ? (
        <header className="w-full max-w-3xl flex items-center justify-between mb-7 sm:mb-9 gap-4 flex-wrap">
          {effectiveProfBackUid ? (
            <button
              type="button"
              onClick={() => handleNavigateToProf(effectiveProfBackUid)}
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-slate-950 bg-white px-3.5 py-2 rounded-xl border border-slate-200/90 shadow-2xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-4 h-4" style={{ color: wlPrimaryColor }} />
              <span>Página de {creatorDisplayName}</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2.5">
            {company.logoEmpresaUrl ? (
              <div
                onClick={() =>
                  effectiveProfBackUid && handleNavigateToProf(effectiveProfBackUid)
                }
                className="flex items-center gap-2.5 bg-white px-3.5 py-1.5 rounded-xl shadow-2xs border border-slate-200/90 cursor-pointer"
              >
                <img
                  src={company.logoEmpresaUrl}
                  alt={company.razaoSocial || creatorDisplayName}
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
                onClick={() =>
                  effectiveProfBackUid && handleNavigateToProf(effectiveProfBackUid)
                }
                className="text-sm font-serif font-bold text-slate-900 hover:opacity-80 transition-opacity cursor-pointer whitespace-nowrap"
              >
                {company.razaoSocial || creatorDisplayName}
              </button>
            )}
          </div>
        </header>
      ) : (
        <>
          <header className="w-full max-w-4xl flex items-center justify-between mb-8 sm:mb-10 gap-3 flex-wrap">
            <button
              onClick={
                returnProfUid
                  ? () => handleNavigateToProf(returnProfUid)
                  : handleGoHome
              }
              className="text-forest/70 hover:text-forest transition-colors p-2 -ml-2 rounded-full hover:bg-forest/5 cursor-pointer shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold"
              aria-label="Voltar"
              title="Voltar"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              {returnProfUid && (
                <span className="hidden sm:inline">Voltar ao perfil</span>
              )}
            </button>
            <BrandLogo size="md" badge="Parceiro" onClick={handleGoHome} />
          </header>

          <Breadcrumbs
            items={[
              { label: "Início", onClick: handleGoHome },
              ...(returnProfUid
                ? [
                    {
                      label: creatorDisplayName,
                      onClick: () => handleNavigateToProf(returnProfUid),
                    },
                  ]
                : []),
              {
                label: item ? item.titulo : isEvent ? "Evento" : "Serviço",
                active: true,
              },
            ]}
            className="max-w-3xl px-0 mb-6 w-full"
          />
        </>
      )}

      {/* Main Content Card */}
      <main
        className={`w-full max-w-3xl bg-white rounded-[2rem] overflow-hidden flex flex-col slide-up ${
          isCreatorWhiteLabel
            ? "border border-slate-200/90 shadow-sm"
            : "border border-soft shadow-lg"
        }`}
      >
        {/* Thematic Image / Flyer Hero */}
        {renderHeroImage()}

        {/* Offer Header */}
        <div
          className={`p-6 sm:p-9 border-b flex flex-col gap-3.5 ${
            isCreatorWhiteLabel
              ? "bg-white border-slate-100"
              : "bg-warm/35 border-soft"
          }`}
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span
                style={
                  isCreatorWhiteLabel ? { color: wlPrimaryColor } : undefined
                }
                className={
                  isCreatorWhiteLabel
                    ? "uppercase tracking-wider font-bold"
                    : "uppercase tracking-wider font-bold text-forest/75"
                }
              >
                {isEvent ? item.tipo || "Evento" : item.tipo || "Serviço"}
              </span>
              {(!isEvent || item.isGratuito || item.valor) && (
                <>
                  <span aria-hidden="true" className="text-slate-300">
                    ·
                  </span>
                  <span
                    className={
                      item.isGratuito
                        ? "text-emerald-700 font-bold"
                        : "text-slate-600 font-semibold tabular-nums"
                    }
                  >
                    {item.isGratuito
                      ? "Gratuito"
                      : item.valor || "Sob consulta"}
                  </span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={handleShare}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                isCreatorWhiteLabel
                  ? "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                  : "bg-white hover:bg-forest hover:text-white border-soft text-forest/80"
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Link copiado!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Compartilhar</span>
                </>
              )}
            </button>
          </div>

          <h1
            className={`font-serif text-2xl sm:text-3xl md:text-4xl font-semibold leading-tight tracking-tight [text-wrap:balance] ${
              isCreatorWhiteLabel ? "text-slate-900" : "text-forest"
            }`}
          >
            {item.titulo}
          </h1>

          {/* Clean Metadata Bar (Tabular Numerals, Unboxed) */}
          <div
            className={`flex items-center gap-x-4 gap-y-2 flex-wrap text-xs sm:text-sm pt-1 tabular-nums ${
              isCreatorWhiteLabel ? "text-slate-600" : "text-forest/75"
            }`}
          >
            {item.data && (
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Calendar className="w-4 h-4 opacity-60 shrink-0" />
                {formatEventDateDisplay(item.data)}
              </span>
            )}
            {item.hora && (
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Clock className="w-4 h-4 opacity-60 shrink-0" />
                {item.hora}
              </span>
            )}
            {!isEvent && (
              <span className="inline-flex items-center gap-1.5 font-medium">
                <CreditCard className="w-4 h-4 opacity-60 shrink-0" />
                <span className={item.isGratuito ? "text-emerald-700 font-bold" : ""}>
                  {item.isGratuito ? "Gratuito" : item.valor || "Sob consulta"}
                </span>
              </span>
            )}
            {maxVagas !== null ? (
              <span
                className={`inline-flex items-center gap-1.5 font-semibold ${
                  isFull ? "text-red-700" : "text-emerald-700"
                }`}
              >
                <User className="w-4 h-4 shrink-0" />
                {totalInscritos} de {maxVagas} vagas preenchidas
                {isFull ? " (Esgotado)" : ""}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                <User className="w-4 h-4 shrink-0" />
                {totalInscritos}{" "}
                {totalInscritos === 1 ? "inscrito" : "inscritos"}
              </span>
            )}
          </div>
        </div>

        {/* Dynamic Body Description */}
        <div className="p-6 sm:p-9 flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <h3
              className={`text-xs uppercase tracking-wider font-bold border-b pb-2 ${
                isCreatorWhiteLabel
                  ? "text-slate-400 border-slate-100"
                  : "text-forest/50 border-soft"
              }`}
            >
              Sobre {isEvent ? "o Evento" : "a Oportunidade"}
            </h3>
            <p
              className={`text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-sans ${
                isCreatorWhiteLabel ? "text-slate-700" : "text-forest/85"
              }`}
            >
              {item.descricao}
            </p>
          </div>

          {item.requisitos && (
            <div className="flex flex-col gap-2 p-4 bg-amber-50/40 border border-amber-200/70 rounded-2xl">
              <h4 className="text-[11px] uppercase font-bold tracking-wider text-amber-900">
                Requisitos para Participação
              </h4>
              <p className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
                {item.requisitos}
              </p>
            </div>
          )}

          {/* Publisher block */}
          <div
            className={`p-5 rounded-2xl border flex items-center justify-between gap-4 flex-wrap ${
              isCreatorWhiteLabel
                ? "bg-slate-50/80 border-slate-200/90"
                : "bg-[#FDFBF7] border-soft"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 border-2 flex items-center justify-center shrink-0"
                style={{
                  borderColor: isCreatorWhiteLabel ? wlPrimaryColor : "#FCD34D",
                }}
              >
                {creatorProf?.photoUrl || item.criadorFoto ? (
                  <img
                    src={creatorProf?.photoUrl || item.criadorFoto}
                    alt={creatorDisplayName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-6 h-6 text-slate-400" />
                )}
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] opacity-60 leading-none uppercase font-bold tracking-wider mb-1">
                  Organização / Responsável
                </span>
                <span className="font-serif font-semibold text-sm sm:text-base leading-snug block truncate">
                  {creatorDisplayName}
                </span>
                {creatorProf?.profissao && (
                  <span className="text-xs opacity-70 block truncate">
                    {creatorProf.profissao}
                    {creatorProf.crp ? ` · CRP ${creatorProf.crp}` : ""}
                  </span>
                )}
              </div>
            </div>

            {item.criadorId && (
              <button
                type="button"
                onClick={() => handleNavigateToProf(item.criadorId)}
                className={`px-3.5 py-2 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer whitespace-nowrap ${
                  isCreatorWhiteLabel
                    ? "bg-white hover:bg-slate-100 text-slate-800 border-slate-200"
                    : "bg-white hover:bg-forest hover:text-white text-forest border-soft"
                }`}
              >
                <span>Ver Página Profissional</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {(item.contatoEmail || item.contatoTelefone) && (
            <div
              className={`p-5 rounded-2xl border flex flex-col gap-2 ${
                isCreatorWhiteLabel
                  ? "bg-slate-50/50 border-slate-200/80"
                  : "bg-warm/15 border-soft/60"
              }`}
            >
              <h4 className="text-[11px] uppercase font-bold tracking-wider opacity-60">
                Contato Direto do Organizador
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mt-1 tabular-nums">
                {item.contatoEmail && (
                  <div>
                    <span className="text-xs opacity-65 block">E-mail</span>
                    <span className="font-medium select-all font-mono text-xs">
                      {item.contatoEmail}
                    </span>
                  </div>
                )}
                {item.contatoTelefone && (
                  <div>
                    <span className="text-xs opacity-65 block">
                      WhatsApp / Telefone
                    </span>
                    <span className="font-medium select-all font-mono text-xs">
                      {item.contatoTelefone}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Subscription Section */}
          <div
            className={`mt-2 pt-6 border-t flex flex-col gap-4 ${
              isCreatorWhiteLabel ? "border-slate-100" : "border-soft"
            }`}
          >
            {/* Real-time Vacancies & Subscribers Info */}
            <div
              className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 tabular-nums ${
                isFull
                  ? "bg-red-50/50 border-red-200/80"
                  : "bg-emerald-50/35 border-emerald-200/70"
              }`}
            >
              <div>
                <span className="block text-[10px] opacity-60 uppercase font-bold tracking-wider leading-none mb-1">
                  Inscrições Confirmadas
                </span>
                <span className="font-serif font-semibold text-sm sm:text-base leading-snug">
                  {totalInscritos}{" "}
                  {totalInscritos === 1
                    ? "pessoa inscrita"
                    : "pessoas inscritas"}
                </span>
              </div>

              {maxVagas !== null && (
                <div className="sm:text-right">
                  <span
                    className={`text-xs font-bold ${
                      isFull ? "text-red-800" : "text-emerald-800"
                    }`}
                  >
                    {isFull
                      ? "Vagas esgotadas"
                      : `${restamVagas} ${restamVagas === 1 ? "vaga disponível" : "vagas disponíveis"}`}
                  </span>
                </div>
              )}
            </div>

            {item.modoInscricao === "contato" ? (
              <div
                className={`flex flex-col gap-3 text-center p-6 rounded-2xl border ${
                  isCreatorWhiteLabel
                    ? "bg-slate-50 border-slate-200"
                    : "bg-warm/15 border-soft"
                }`}
              >
                <p className="text-xs opacity-75">
                  As inscrições e informações são realizadas diretamente via{" "}
                  {item.contatoPreferencial === "whatsapp"
                    ? "WhatsApp"
                    : "E-mail"}
                  . Clique abaixo para falar com o responsável:
                </p>
                <a
                  href={getContactLink(item)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={
                    isCreatorWhiteLabel
                      ? { backgroundColor: wlPrimaryColor }
                      : undefined
                  }
                  className={`w-full py-4 text-white rounded-xl font-serif font-semibold text-base transition-opacity hover:opacity-95 shadow-sm flex items-center justify-center gap-2 ${
                    isCreatorWhiteLabel ? "" : "bg-forest"
                  }`}
                >
                  {item.contatoPreferencial === "whatsapp"
                    ? "Entrar em contato via WhatsApp"
                    : "Enviar e-mail para inscrição"}
                </a>
              </div>
            ) : isFull ? (
              <div className="flex flex-col gap-2 text-center bg-red-50/40 p-6 rounded-2xl border border-red-200/70">
                <p className="text-sm text-red-900 font-serif font-semibold">
                  Inscrições Esgotadas
                </p>
                <p className="text-xs text-red-800/85">
                  Todas as {maxVagas} vagas para este{" "}
                  {isEvent ? "evento" : "serviço"} foram preenchidas. Entre em
                  contato com o organizador caso deseje entrar na lista de
                  espera para próximas edições.
                </p>
              </div>
            ) : !inscribed ? (
              <>
                {!showInscribeForm ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (item.linkInscricao) {
                        window.location.href = item.linkInscricao;
                      } else {
                        setShowInscribeForm(true);
                      }
                    }}
                    style={
                      isCreatorWhiteLabel
                        ? { backgroundColor: wlPrimaryColor }
                        : undefined
                    }
                    className={`w-full py-4 text-white rounded-xl font-serif font-semibold text-base transition-opacity hover:opacity-95 shadow-sm flex items-center justify-center gap-2 cursor-pointer ${
                      isCreatorWhiteLabel ? "" : "bg-forest"
                    }`}
                  >
                    {item.linkInscricao
                      ? "Acessar Página de Inscrição"
                      : "Realizar Minha Inscrição"}
                  </button>
                ) : (
                  <form
                    onSubmit={handleInscribeSubmit}
                    className={`border p-6 sm:p-8 rounded-2xl flex flex-col gap-4 ${
                      isCreatorWhiteLabel
                        ? "bg-slate-50/70 border-slate-200"
                        : "bg-warm/20 border-soft"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-serif text-lg font-bold">
                        Formulário de Inscrição
                      </h4>
                      {item.linkInscricao && (
                        <a
                          href={item.linkInscricao}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold underline inline-flex items-center gap-1"
                        >
                          Link externo <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    <p className="text-xs opacity-70">
                      Preencha seus dados abaixo para confirmar seu interesse e
                      garantir sua inscrição com o organizador.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <label className="text-[11px] uppercase font-bold tracking-wider opacity-65">
                          Seu Nome Completo *
                        </label>
                        <input
                          type="text"
                          required
                          value={guestForm.nomeCompleto}
                          onChange={(e) =>
                            setGuestForm((prev) => ({
                              ...prev,
                              nomeCompleto: e.target.value,
                            }))
                          }
                          placeholder="Ex: Larissa Mello"
                          className="w-full p-3 bg-white border border-slate-200 text-sm rounded-xl focus:outline-none focus:border-slate-400"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] uppercase font-bold tracking-wider opacity-65">
                          Seu Telefone / WhatsApp *
                        </label>
                        <input
                          type="text"
                          required
                          value={guestForm.whatsapp}
                          onChange={(e) =>
                            setGuestForm((prev) => ({
                              ...prev,
                              whatsapp: e.target.value,
                            }))
                          }
                          placeholder="(11) 98765-4321"
                          className="w-full p-3 bg-white border border-slate-200 text-sm rounded-xl focus:outline-none focus:border-slate-400 tabular-nums"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] uppercase font-bold tracking-wider opacity-65">
                          Seu E-mail *
                        </label>
                        <input
                          type="email"
                          required
                          value={guestForm.email}
                          onChange={(e) =>
                            setGuestForm((prev) => ({
                              ...prev,
                              email: e.target.value,
                            }))
                          }
                          placeholder="larissa@email.com"
                          className="w-full p-3 bg-white border border-slate-200 text-sm rounded-xl focus:outline-none focus:border-slate-400"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <label className="text-[11px] uppercase font-bold tracking-wider opacity-65">
                          Sua Profissão / Área *
                        </label>
                        <input
                          type="text"
                          required
                          value={guestForm.profissao}
                          onChange={(e) =>
                            setGuestForm((prev) => ({
                              ...prev,
                              profissao: e.target.value,
                            }))
                          }
                          placeholder="Ex: Psicólogo(a), Estudante, Gestor de RH..."
                          className="w-full p-3 bg-white border border-slate-200 text-sm rounded-xl focus:outline-none focus:border-slate-400"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <label className="text-[11px] uppercase font-bold tracking-wider opacity-65">
                          Observação ou Dúvida (Opcional)
                        </label>
                        <textarea
                          value={guestForm.mensagem}
                          onChange={(e) =>
                            setGuestForm((prev) => ({
                              ...prev,
                              mensagem: e.target.value,
                            }))
                          }
                          placeholder="Escreva alguma observação caso deseje..."
                          rows={2}
                          className="w-full p-3 bg-white border border-slate-200 text-sm rounded-xl focus:outline-none focus:border-slate-400 resize-y"
                        />
                      </div>
                    </div>

                    {formError && (
                      <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
                        {formError}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={
                        !guestForm.nomeCompleto.trim() ||
                        !guestForm.whatsapp.trim() ||
                        !guestForm.email.trim().includes("@") ||
                        !guestForm.profissao.trim()
                      }
                      style={
                        isCreatorWhiteLabel
                          ? { backgroundColor: wlPrimaryColor }
                          : undefined
                      }
                      className={`w-full py-3.5 px-6 text-white rounded-xl font-serif font-semibold text-base transition-opacity hover:opacity-95 disabled:opacity-45 shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed ${
                        isCreatorWhiteLabel ? "" : "bg-forest"
                      }`}
                    >
                      Confirmar Inscrição
                    </button>
                  </form>
                )}
              </>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-6 rounded-2xl flex flex-col gap-4 text-center items-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                <div>
                  <h4 className="font-serif text-lg font-bold">
                    Inscrição Registrada com Sucesso!
                  </h4>
                  <p className="text-xs mt-1 text-emerald-800 max-w-md mx-auto leading-relaxed">
                    {item.solicitarComprovante
                      ? "Sua pré-inscrição foi salva. Envie o comprovante ou documento solicitado diretamente ao responsável pelo botão abaixo:"
                      : "Sua inscrição foi registrada. Caso deseje falar diretamente com o organizador ou enviar comprovante, utilize o botão abaixo:"}
                  </p>
                </div>

                <div className="bg-white/90 p-4 rounded-xl border border-emerald-200/80 text-left w-full max-w-md text-xs text-slate-800 flex flex-col gap-1.5 font-mono tabular-nums">
                  <span className="font-bold block">Dados para Contato:</span>
                  <div>
                    • Responsável:{" "}
                    <span className="font-bold select-all">
                      {item.criadorContato || creatorDisplayName}
                    </span>
                  </div>
                  {!item.isGratuito && (item.criadorPixKey || item.valor) && (
                    <div className="mt-1.5 text-amber-900 bg-amber-50/70 p-2.5 border border-amber-200 rounded-lg">
                      <span className="font-bold block text-[10px] uppercase tracking-wider mb-1">
                        Informações para Pagamento:
                      </span>
                      • Investimento:{" "}
                      <span className="font-bold">
                        {item.valor || "A combinar"}
                      </span>
                      {item.criadorPixKey && (
                        <>
                          <br />• Chave PIX:{" "}
                          <span className="font-bold select-all">
                            {item.criadorPixKey}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <a
                  href={getContactLink(item)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={
                    isCreatorWhiteLabel
                      ? { backgroundColor: wlPrimaryColor }
                      : undefined
                  }
                  className={`w-full max-w-md py-3.5 px-5 text-white rounded-xl font-serif font-medium text-sm transition-opacity hover:opacity-95 shadow-sm flex items-center justify-center gap-2 ${
                    isCreatorWhiteLabel ? "" : "bg-forest"
                  }`}
                >
                  {item.contatoPreferencial === "whatsapp" ? (
                    <>
                      <Phone className="w-4 h-4 shrink-0" />
                      <span>Falar no WhatsApp</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 shrink-0" />
                      <span>Enviar E-mail de Confirmação</span>
                    </>
                  )}
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setInscribed(false);
                    setShowInscribeForm(true);
                    setGuestForm({
                      nomeCompleto: "",
                      whatsapp: "",
                      email: "",
                      profissao: "",
                      mensagem: "",
                    });
                  }}
                  className="text-xs text-emerald-800 font-bold underline hover:text-emerald-950 mt-1 cursor-pointer"
                >
                  Realizar outra inscrição
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Rodapé: White-Label Limpo (Plano Integrar) vs Institucional (Plano Acolher) */}
      {isCreatorWhiteLabel ? (
        <footer className="w-full max-w-3xl text-center py-10 text-slate-500 text-xs flex flex-col items-center gap-1.5 mt-4">
          <p className="font-medium text-slate-600">
            {company.razaoSocial || creatorDisplayName}
            {company.cnpj ? ` • CNPJ: ${company.cnpj}` : ""}
            {creatorProf?.crp ? ` • Registro: ${creatorProf.crp}` : ""}
          </p>
          {company.enderecoEmpresa && <p>{company.enderecoEmpresa}</p>}
          {company.telefoneEmpresa && <p>Contato: {company.telefoneEmpresa}</p>}
        </footer>
      ) : (
        <>
          <div className="w-full max-w-3xl mt-8 bg-gradient-to-br from-forest to-forest/90 text-white rounded-[2rem] p-6 sm:p-8 shadow-lg border border-forest/10 flex flex-col md:flex-row items-center justify-between gap-6 slide-up">
            <div className="flex items-start gap-4 text-left">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border border-white/20 mt-0.5">
                <Sparkles className="w-6 h-6 text-sun" />
              </div>
              <div>
                <h4 className="font-serif text-lg font-bold text-white leading-snug">
                  Você é Psicólogo ou Terapeuta?
                </h4>
                <p className="text-xs text-white/85 mt-1.5 max-w-md leading-relaxed font-sans">
                  Conheça nosso ecossistema e torne-se um associado para divulgar
                  seus próprios eventos, workshops e serviços clínicos.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                window.location.href =
                  window.location.origin + "?view=profissional";
              }}
              className="w-full md:w-auto px-6 py-3 bg-white hover:bg-sun text-forest font-bold rounded-xl text-xs uppercase tracking-wider transition-colors shrink-0 flex items-center justify-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap"
            >
              <span>Conhecer a Rede</span>
              <ArrowRight className="w-4 h-4 text-forest" />
            </button>
          </div>

          <footer className="mt-8 pb-4 flex items-center gap-2 text-[11px] text-forest/45">
            <ShieldCheck className="w-4 h-4 text-forest/35" />
            <span>
              AcolheMente Plataforma Acessível • Ambiente Seguro e Auditado
            </span>
          </footer>
        </>
      )}

      {/* Lightbox para Ampliar Imagem Temática / Cartaz em Tela Cheia */}
      {lightboxOpen && item.imagemUrl && !heroImgError && (
        <div
          onClick={() => setLightboxOpen(false)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 sm:p-8"
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2.5 rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
            aria-label="Fechar visualização ampliada"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={item.imagemUrl}
            alt={item.titulo}
            referrerPolicy="no-referrer"
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-[88vh] object-contain rounded-xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
