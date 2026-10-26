import React from "react";

export type SocialNetworkKey =
  | "instagram"
  | "linkedin"
  | "lattes"
  | "youtube"
  | "tiktok"
  | "facebook"
  | "site";

export interface EnderecoPresencialData {
  cep?: string;
  nomeEspaco?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  referencia?: string;
}

export function normalizeSocialUrl(network: SocialNetworkKey, raw?: string): string {
  if (!raw) return "";
  const val = raw.trim();
  if (!val) return "";

  if (/^https?:\/\//i.test(val)) {
    return val;
  }

  if (network === "instagram") {
    const clean = val
      .replace(/^@/, "")
      .replace(/^(www\.)?instagram\.com\//i, "")
      .replace(/\/+$/, "");
    return clean ? `https://www.instagram.com/${clean}` : "";
  }

  if (network === "tiktok") {
    if (/^(www\.)?tiktok\.com\//i.test(val)) {
      return `https://${val}`;
    }
    const clean = val.replace(/^@/, "").replace(/\/+$/, "");
    return clean ? `https://www.tiktok.com/@${clean}` : "";
  }

  if (network === "youtube") {
    if (val.startsWith("@")) {
      return `https://www.youtube.com/${val}`;
    }
    if (/^(www\.)?(youtube\.com|youtu\.be)\//i.test(val)) {
      return `https://${val}`;
    }
    return `https://www.youtube.com/@${val.replace(/^@/, "")}`;
  }

  if (network === "linkedin") {
    if (/^(www\.|br\.)?linkedin\.com\//i.test(val)) {
      return `https://${val}`;
    }
    return `https://www.linkedin.com/in/${val.replace(/^@/, "").replace(/^\/+/, "")}`;
  }

  if (network === "facebook") {
    if (/^(www\.)?facebook\.com\//i.test(val)) {
      return `https://${val}`;
    }
    return `https://www.facebook.com/${val.replace(/^@/, "").replace(/^\/+/, "")}`;
  }

  if (network === "lattes") {
    return `https://${val.replace(/^\/+/, "")}`;
  }

  return `https://${val}`;
}

export function buildMapSearchQuery(endereco?: EnderecoPresencialData | null): string {
  if (!endereco) return "";
  const streetPart = [endereco.logradouro?.trim(), endereco.numero?.trim()]
    .filter(Boolean)
    .join(", ");
  const parts = [
    streetPart,
    endereco.bairro?.trim(),
    endereco.cidade?.trim(),
    endereco.uf?.trim(),
    "Brasil",
  ].filter(Boolean);

  // Require at least street or city so we don't map just "Brasil"
  if (!endereco.logradouro?.trim() && !endereco.cidade?.trim()) {
    return "";
  }
  return parts.join(", ");
}

export function buildMapsUrls(endereco?: EnderecoPresencialData | null) {
  const query = buildMapSearchQuery(endereco);
  if (!query) {
    return { query: "", embedUrl: "", googleMapsUrl: "", wazeUrl: "" };
  }
  const encoded = encodeURIComponent(query);
  return {
    query,
    embedUrl: `https://maps.google.com/maps?q=${encoded}&t=&z=16&ie=UTF8&iwloc=&output=embed`,
    googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encoded}`,
    wazeUrl: `https://waze.com/ul?q=${encoded}&navigate=yes`,
  };
}

export function WhatsAppBrandIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.031 2c-5.516 0-9.969 4.453-9.969 9.968 0 1.758.459 3.474 1.332 4.988L2 22l5.188-1.361a9.927 9.927 0 0 0 4.841 1.258h.004c5.515 0 9.967-4.453 9.967-9.968A9.908 9.908 0 0 0 19.08 4.92 9.905 9.905 0 0 0 12.031 2Zm5.815 14.262c-.246.693-1.434 1.326-1.988 1.409-.508.076-1.15.108-1.856-.116-.428-.136-.977-.318-1.682-.622-2.961-1.278-4.894-4.26-5.042-4.457-.147-.197-1.204-1.602-1.204-3.056 0-1.454.762-2.169 1.032-2.465.271-.296.59-.37.787-.37.196 0 .393.002.565.01.181.009.424-.069.663.507.246.591.836 2.045.909 2.193.074.148.123.321.025.518-.099.197-.148.32-.295.493-.148.172-.311.385-.443.517-.148.148-.302.309-.13.604.172.296.764 1.261 1.641 2.043 1.128 1.005 2.078 1.317 2.373 1.465.295.148.468.123.64-.074.172-.197.738-.862.935-1.158.196-.296.393-.246.664-.148.271.099 1.721.812 2.016.96.295.148.492.222.566.345.074.123.074.715-.172 1.408Z" />
    </svg>
  );
}

export function InstagramBrandIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="ig-grad" cx="30%" cy="107%" r="150%">
          <stop offset="0%" stopColor="#fdf497" />
          <stop offset="5%" stopColor="#fdf497" />
          <stop offset="45%" stopColor="#fd5949" />
          <stop offset="60%" stopColor="#d6249f" />
          <stop offset="90%" stopColor="#285AEB" />
        </radialGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5.5" fill="url(#ig-grad)" />
      <path
        fill="#fff"
        d="M12 7.2A4.8 4.8 0 1 0 16.8 12 4.805 4.805 0 0 0 12 7.2Zm0 7.9A3.1 3.1 0 1 1 15.1 12 3.103 3.103 0 0 1 12 15.1Zm6.12-8.09a1.12 1.12 0 1 1-1.12-1.12 1.12 1.12 0 0 1 1.12 1.12Z"
      />
    </svg>
  );
}

export function LinkedInBrandIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="4" fill="#0A66C2" />
      <path
        fill="#fff"
        d="M8.34 18.34H5.67V9.75h2.67v8.59ZM7 8.58a1.55 1.55 0 1 1 0-3.1 1.55 1.55 0 0 1 0 3.1Zm11.34 9.76h-2.66v-4.18c0-1-.02-2.28-1.39-2.28-1.39 0-1.6 1.08-1.6 2.21v4.25h-2.67V9.75h2.56v1.17h.04a2.81 2.81 0 0 1 2.53-1.39c2.7 0 3.2 1.78 3.2 4.09v4.72Z"
      />
    </svg>
  );
}

export function YouTubeBrandIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#FF0000"
        d="M21.58 7.19a2.51 2.51 0 0 0-1.77-1.78C18.25 5 12 5 12 5s-6.25 0-7.81.41a2.51 2.51 0 0 0-1.77 1.78C2 8.76 2 12 2 12s0 3.24.42 4.81a2.51 2.51 0 0 0 1.77 1.78C5.75 19 12 19 12 19s6.25 0 7.81-.41a2.51 2.51 0 0 0 1.77-1.78C22 15.24 22 12 22 12s0-3.24-.42-4.81Z"
      />
      <path fill="#fff" d="m10 15 5.19-3L10 9v6Z" />
    </svg>
  );
}

export function TikTokBrandIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" fill="#111827" />
      <path
        fill="#25F4EE"
        d="M15.6 8.3a3.7 3.7 0 0 1-2.1-2.3h-2.1v8.2a1.85 1.85 0 1 1-1.3-1.77V10.3a3.95 3.95 0 1 0 3.4 3.91V9.9a5.7 5.7 0 0 0 3.3 1.07V8.9a3.7 3.7 0 0 1-1.2-.6Z"
      />
      <path
        fill="#FE2C55"
        d="M16.1 8.6a3.7 3.7 0 0 1-2.1-2.3h-1.8v8.2a1.85 1.85 0 1 1-1.6-1.83v-2.1a3.95 3.95 0 1 0 3.7 3.94v-4.3a5.7 5.7 0 0 0 3.3 1.07V9.2c-.55 0-1.06-.2-1.5-.6Z"
      />
      <path
        fill="#fff"
        d="M15.8 8.5a3.7 3.7 0 0 1-1.9-2.2h-2v8.1a1.85 1.85 0 1 1-1.45-1.8v-2a3.95 3.95 0 1 0 3.55 3.92V10.1a5.7 5.7 0 0 0 3.2 1.04V9.05c-.5-.05-.98-.24-1.4-.55Z"
      />
    </svg>
  );
}

export function FacebookBrandIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" fill="#1877F2" />
      <path
        fill="#fff"
        d="M15.12 13.02l.44-2.89h-2.77V8.25c0-.79.39-1.56 1.63-1.56h1.26V4.23s-1.14-.2-2.24-.2c-2.29 0-3.78 1.39-3.78 3.9v2.2H7.12v2.89h2.54V20h3.13v-6.98h2.33Z"
      />
    </svg>
  );
}

export function LattesBrandIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" fill="#0F2D5C" />
      <path
        fill="#F59E0B"
        d="M12 5.2 5.5 8.5 12 11.8l5.3-2.69V13h1.2V8.5L12 5.2Z"
      />
      <path
        fill="#fff"
        d="M8.1 11.35v3.15c0 1.45 1.75 2.65 3.9 2.65s3.9-1.2 3.9-2.65v-3.15L12 13.3l-3.9-1.95Z"
      />
    </svg>
  );
}

export function WebsiteBrandIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" fill="#334155" />
      <circle cx="12" cy="12" r="6.5" fill="none" stroke="#fff" strokeWidth="1.5" />
      <ellipse cx="12" cy="12" rx="3" ry="6.5" fill="none" stroke="#fff" strokeWidth="1.3" />
      <line x1="5.7" y1="12" x2="18.3" y2="12" stroke="#fff" strokeWidth="1.3" />
    </svg>
  );
}

export function GoogleMapsBrandIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 2a7.5 7.5 0 0 0-6.5 3.76L9.7 9.3A3.1 3.1 0 0 1 12 8.4c1.71 0 3.1 1.39 3.1 3.1 0 .68-.22 1.31-.59 1.82l4.26-3.57A7.47 7.47 0 0 0 12 2Z"
      />
      <path
        fill="#4285F4"
        d="M5.5 5.76A7.47 7.47 0 0 0 4.5 9.5c0 2.18.92 4.16 2.38 5.98l2.82-2.37a3.08 3.08 0 0 1-.8-2.08c0-.66.21-1.27.56-1.76L5.5 5.76Z"
      />
      <path
        fill="#FBBC04"
        d="M14.51 13.32a3.09 3.09 0 0 1-2.51 1.28c-.92 0-1.75-.4-2.32-1.04l-2.8 2.36c1.41 1.72 3.18 3.56 4.49 5.48.31.46.95.46 1.26 0 1.98-2.91 5.14-6.08 6.14-8.89l-4.26 0.81Z"
      />
      <path
        fill="#34A853"
        d="M18.77 9.75l-4.26 3.57c-.57.8-1.5 1.28-2.51 1.28-.35 0-.69-.06-1-.17l-2.3 3.92c1.14 1.38 2.27 2.82 2.67 3.41.31.46.95.46 1.26 0 2.52-3.68 6.87-7.25 6.87-12.26 0-.9-.16-1.76-.46-2.56l-.27.81Z"
      />
      <circle cx="12" cy="9.5" r="2.7" fill="#fff" />
    </svg>
  );
}

export function WazeBrandIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" fill="#33CCFF" />
      <path
        fill="#fff"
        stroke="#1E293B"
        strokeWidth="1.2"
        d="M18.5 12.2c0-3.3-2.8-5.9-6.2-5.9-3.4 0-6.1 2.5-6.1 5.7 0 1.3.4 2.4 1.1 3.3-.4.6-1.1 1-1.9 1.1.7.9 2 1.4 3.5 1.3.9.3 2 .5 3.2.5 3.5 0 6.4-2.6 6.4-6Z"
      />
      <circle cx="10.3" cy="11.2" r="0.9" fill="#1E293B" />
      <circle cx="14.3" cy="11.2" r="0.9" fill="#1E293B" />
      <path
        d="M10.3 13.7c.6.7 1.4 1 2.2 1s1.6-.3 2.2-1"
        fill="none"
        stroke="#1E293B"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <circle cx="9.2" cy="18" r="1.4" fill="#1E293B" />
      <circle cx="15.2" cy="18" r="1.4" fill="#1E293B" />
    </svg>
  );
}

export const SOCIAL_NETWORKS_META: Array<{
  key: SocialNetworkKey;
  field: string;
  label: string;
  shortLabel: string;
  placeholder: string;
  Icon: React.FC<{ className?: string }>;
}> = [
  {
    key: "instagram",
    field: "instagramUrl",
    label: "Instagram",
    shortLabel: "Instagram",
    placeholder: "@seuusuario ou https://instagram.com/seuusuario",
    Icon: InstagramBrandIcon,
  },
  {
    key: "linkedin",
    field: "linkedinUrl",
    label: "LinkedIn",
    shortLabel: "LinkedIn",
    placeholder: "https://linkedin.com/in/seuperfil",
    Icon: LinkedInBrandIcon,
  },
  {
    key: "lattes",
    field: "lattesUrl",
    label: "Currículo Lattes (CNPq)",
    shortLabel: "CV Lattes",
    placeholder: "http://lattes.cnpq.br/0000000000000000",
    Icon: LattesBrandIcon,
  },
  {
    key: "youtube",
    field: "youtubeUrl",
    label: "YouTube",
    shortLabel: "YouTube",
    placeholder: "@seucanal ou https://youtube.com/@seucanal",
    Icon: YouTubeBrandIcon,
  },
  {
    key: "tiktok",
    field: "tiktokUrl",
    label: "TikTok",
    shortLabel: "TikTok",
    placeholder: "@seuusuario ou https://tiktok.com/@seuusuario",
    Icon: TikTokBrandIcon,
  },
  {
    key: "facebook",
    field: "facebookUrl",
    label: "Facebook",
    shortLabel: "Facebook",
    placeholder: "https://facebook.com/suapagina",
    Icon: FacebookBrandIcon,
  },
  {
    key: "site",
    field: "siteUrl",
    label: "Site ou Blog Pessoal",
    shortLabel: "Site",
    placeholder: "https://seusiteprofissional.com.br",
    Icon: WebsiteBrandIcon,
  },
];
