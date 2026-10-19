import { Map, Mail, Phone, HeartHandshake, Leaf, User, LifeBuoy, PhoneCall, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import logoImage from "../assets/images/logo_acolhe.jpeg";
import { ComplianceModal } from "./ComplianceModal";
import { ApoioImediatoModal } from "./ApoioImediatoModal";

export function Footer({ onNavigate }: { onNavigate?: (view: any) => void }) {
  const [configs, setConfigs] = useState<any>({
    cidadesRodape: "Brasil • São Paulo • online",
    footerEmail: "contato@acolhemente.com",
    footerTelefone: "(61) 9999-9999",
    footerInstagram: "",
    footerLinkedin: "",
    footerDescricao: "Uma iniciativa focada em democratizar o acesso à saúde mental. Nossa história começa na vontade de criar uma ponte humanizada entre psicólogos, psicanalistas e terapeutas qualificados e quem busca acolhimento, ajudando pessoas através de valores acessíveis ou benefícios corporativos.",
    urlTermosUso: "",
    urlPoliticaPrivacidade: "",
    urlContratoPrestacao: "",
  });
  const [showComplianceModal, setShowComplianceModal] = useState(false);
  const [showCvvModal, setShowCvvModal] = useState(false);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    try {
      unsub = onSnapshot(
        doc(db, "configuracoes", "master"),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setConfigs((prev: any) => ({
              ...prev,
              ...data,
            }));
          }
        },
        (err) => {
          // Gracefully keep default configs if offline or temporarily unreachable
          if (err.code !== "permission-denied" && !err.message?.includes("offline")) {
            console.warn("Could not fetch realtime configs for footer:", err.message);
          }
        }
      );
    } catch (err: any) {
      console.warn("Error setting up configs listener for footer:", err);
    }
    return () => {
      if (unsub) unsub();
    };
  }, []);

  const handleNav = (view: string) => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    if (onNavigate) {
      onNavigate(view);
    }
  };

  return (
    <footer className="w-full bg-warm/50 border-t border-soft pt-12 pb-32 md:pb-16 px-6 md:px-12 flex flex-col items-center mt-auto" id="footer-section">
      {/* Bloco Fixo de Apoio Imediato 188 no Rodapé */}
      <div className="w-full max-w-[1440px] mb-12 p-6 sm:p-8 rounded-3xl bg-amber-50/95 border border-amber-200/90 shadow-xs flex flex-col items-center text-center gap-3.5 text-amber-950">
        {/* 1. Ícone */}
        <div className="w-12 h-12 rounded-2xl bg-amber-200/90 flex items-center justify-center shrink-0 text-amber-950 shadow-2xs">
          <LifeBuoy className="w-6 h-6" />
        </div>

        {/* 2. Selo de acolhimento suporte 24 horas */}
        <div className="flex items-center justify-center">
          <span className="text-[11px] font-bold uppercase tracking-wider bg-amber-200/90 text-amber-950 px-3.5 py-1 rounded-full shadow-2xs">
            Acolhimento & Suporte 24 Horas
          </span>
        </div>

        {/* 3. A pergunta */}
        <h4 className="font-serif text-lg sm:text-2xl font-bold text-amber-950 max-w-2xl leading-snug">
          Precisa de apoio emocional urgente? Ligue para o CVV 188
        </h4>

        {/* 4. A descrição */}
        <p className="text-xs sm:text-sm text-amber-900/85 max-w-2xl leading-relaxed">
          O Centro de Valorização da Vida realiza apoio emocional voluntário, gratuito, anônimo e sigiloso 24 horas por dia por telefone e chat. Você não precisa passar por isso sozinho.
        </p>

        {/* 5. Os botões abaixo */}
        <div className="flex items-center flex-wrap sm:flex-nowrap gap-3 pt-2 justify-center w-full sm:w-auto">
          <a
            href="tel:188"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#14342B] hover:bg-[#1C4539] text-white font-bold text-xs rounded-full shadow-xs transition-all hover:scale-[1.02] whitespace-nowrap cursor-pointer"
            title="Ligar grátis para o CVV no 188"
            id="footer-call-188-btn"
          >
            <PhoneCall className="w-4 h-4 text-amber-300" />
            <span>Ligar Grátis: 188</span>
          </a>
          <button
            onClick={() => setShowCvvModal(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-3 bg-white hover:bg-amber-100/90 text-amber-950 border border-amber-300 font-bold text-xs rounded-full shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
            title="Ver canais de apoio imediato e emergência"
            id="footer-open-cvv-btn"
          >
            <ExternalLink className="w-4 h-4 text-amber-800" />
            <span>Canais de Apoio</span>
          </button>
        </div>
      </div>

      <div className="w-full max-w-[1440px] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
        
        {/* Brand & History */}
        <div className="flex flex-col gap-4" id="footer-col-brand">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-14 h-14 bg-sun rounded-full flex items-center justify-center text-forest overflow-hidden shadow-sm">
              <img src={logoImage} alt="AcolheMente Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-serif text-2xl font-semibold tracking-tight text-forest">AcolheMente</span>
          </div>
          <p className="text-forest/80 text-sm leading-relaxed" id="footer-brand-description">
            {configs.footerDescricao || "Uma iniciativa focada em democratizar o acesso à saúde mental. Nossa história começa na vontade de criar uma ponte humanizada entre psicólogos, psicanalistas e terapeutas qualificados e quem busca acolhimento, ajudando pessoas através de valores acessíveis ou benefícios corporativos."}
          </p>
        </div>

        {/* Quick Links */}
        <div className="flex flex-col gap-4 lg:pl-12" id="footer-col-nav">
          <h4 className="font-serif text-lg font-medium text-forest mb-2">Navegação</h4>
          <ul className="flex flex-col gap-3 text-sm text-forest/70 font-medium tracking-wide">
            <li><button onClick={() => handleNav('landing')} className="hover:text-forest transition-colors cursor-pointer">Início</button></li>
            <li>
              <button
                onClick={() => {
                  handleNav('landing');
                  setTimeout(() => {
                    const el = document.getElementById("jornada");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }, 100);
                }}
                className="hover:text-forest transition-colors cursor-pointer"
              >
                Como Funciona
              </button>
            </li>
            <li><button onClick={() => handleNav('blog')} className="hover:text-forest transition-colors cursor-pointer font-semibold text-forest/90">Blog & Artigos</button></li>
            <li><button onClick={() => handleNav('empresa')} className="hover:text-forest transition-colors cursor-pointer">Saúde Corporativa</button></li>
            <li><button onClick={() => handleNav('profissional')} className="hover:text-forest transition-colors cursor-pointer">Para Profissionais</button></li>
            <li><button onClick={() => handleNav('doacao')} className="hover:text-forest transition-colors cursor-pointer">Doe uma Sessão</button></li>
            <li><button onClick={() => handleNav('dashboard')} className="hover:text-forest transition-colors cursor-pointer">Área do Profissional</button></li>
          </ul>
        </div>

        {/* Resources */}
        <div className="flex flex-col gap-4 lg:pl-8" id="footer-col-legal">
          <h4 className="font-serif text-lg font-medium text-forest mb-2">Legal</h4>
          <ul className="flex flex-col gap-3 text-sm text-forest/70 font-medium tracking-wide">
            <li>
              <a
                href={configs.urlTermosUso || "#"}
                target={configs.urlTermosUso ? "_blank" : undefined}
                rel="noopener noreferrer"
                onClick={configs.urlTermosUso ? undefined : (e) => e.preventDefault()}
                className="hover:text-forest transition-colors"
                id="footer-terms-link"
              >
                Termos de Uso
              </a>
            </li>
            <li>
              <a
                href={configs.urlPoliticaPrivacidade || "#"}
                target={configs.urlPoliticaPrivacidade ? "_blank" : undefined}
                rel="noopener noreferrer"
                onClick={configs.urlPoliticaPrivacidade ? undefined : (e) => e.preventDefault()}
                className="hover:text-forest transition-colors"
                id="footer-privacy-link"
              >
                Política de Privacidade
              </a>
            </li>
            <li>
              <a
                href={configs.urlContratoPrestacao || "#"}
                target={configs.urlContratoPrestacao ? "_blank" : undefined}
                rel="noopener noreferrer"
                onClick={configs.urlContratoPrestacao ? undefined : (e) => e.preventDefault()}
                className="hover:text-forest transition-colors"
                id="footer-contract-link"
              >
                Contrato de Prestação
              </a>
            </li>
            <li>
              <button onClick={() => setShowComplianceModal(true)} className="hover:text-forest transition-colors text-left">
                Ouvidoria e Compliance
              </button>
            </li>
          </ul>
        </div>

        {/* Contato */}
        <div className="flex flex-col gap-4" id="footer-col-contact">
          <h4 className="font-serif text-lg font-medium text-forest mb-2" id="footer-contact-title">Contato</h4>
          <ul className="flex flex-col gap-3 text-sm text-forest/70 font-medium">
            <li className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-sun-dark" />
              <span id="footer-contact-email">{configs.footerEmail || "contato@acolhemente.com"}</span>
            </li>
            <li className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-sun-dark shrink-0" />
              {(() => {
                const rawPhone = configs.footerTelefone || configs.telefoneSuporte || "(61) 9999-9999";
                let cleanPhone = rawPhone.replace(/\D/g, "");
                if (!cleanPhone) cleanPhone = "556199999999";
                if (cleanPhone.length === 10 || cleanPhone.length === 11) {
                  cleanPhone = `55${cleanPhone}`;
                }
                const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent("Olá! Gostaria de falar com o atendimento do AcolheMente.")}`;
                return (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline hover:text-forest transition-colors"
                    id="footer-contact-phone-link"
                  >
                    <span id="footer-contact-phone">{configs.footerTelefone || configs.telefoneSuporte || "(61) 9999-9999"}</span>
                  </a>
                );
              })()}
            </li>
            <li className="flex items-center gap-2 mt-4 text-forest/50 font-bold uppercase tracking-wider text-[10px]" id="footer-social-title">
              Siga nas redes sociais
            </li>
            <li className="flex gap-4">
              <a
                href={configs.footerLinkedin || "#"}
                target={configs.footerLinkedin ? "_blank" : undefined}
                rel="noopener noreferrer"
                onClick={configs.footerLinkedin ? undefined : (e) => e.preventDefault()}
                className="w-10 h-10 rounded-full bg-forest/5 flex items-center justify-center hover:bg-sun hover:text-forest text-forest/50 cursor-pointer transition-colors font-serif italic text-lg shadow-sm border border-soft"
                id="footer-linkedin-link"
              >
                in
              </a>
              <a
                href={configs.footerInstagram || "#"}
                target={configs.footerInstagram ? "_blank" : undefined}
                rel="noopener noreferrer"
                onClick={configs.footerInstagram ? undefined : (e) => e.preventDefault()}
                className="w-10 h-10 rounded-full bg-forest/5 flex items-center justify-center hover:bg-sun hover:text-forest text-forest/50 cursor-pointer transition-colors font-serif italic text-lg shadow-sm border border-soft"
                id="footer-instagram-link"
              >
                ig
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Informações Éticas e LGPD */}
      <div className="w-full max-w-[1440px] border-t border-soft pt-8 mb-8 flex flex-col md:flex-row justify-between gap-6 text-xs text-forest/60" id="footer-regulatory-info">
        <div className="max-w-3xl leading-relaxed flex flex-col gap-3">
          <p>
            <strong className="block text-forest/80 font-bold mb-1">Nota Ética:</strong>
            Os profissionais cadastrados atuam em conformidade com o Código de Ética Profissional do Psicólogo (Resolução CFP nº 010/2005) e demais resoluções do Conselho Federal de Psicologia (CFP). Todos os psicólogos e terapeutas possuem registro ativo em seus respectivos Conselhos Regionais de Psicologia (CRP) ou associação de classe.
          </p>
          <p>
            <strong className="block text-forest/80 font-bold mb-1">Privacidade e LGPD:</strong>
            Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), garantimos o sigilo absoluto, a segurança e a transparência no tratamento de dados sensíveis de pacientes e profissionais. O compartilhamento das informações ocorre estritamente para os fins terapêuticos e administrativos informados.
          </p>
        </div>
        <div className="flex flex-col items-start md:items-end justify-center gap-1">
          <span className="font-semibold text-forest/80 uppercase tracking-[0.25em] text-[10px]">Uma iniciativa de</span>
          <span className="font-bold text-forest tracking-wide">ELO Soluções Humanas</span>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="w-full max-w-[1440px] border-t border-soft pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-forest/50 uppercase tracking-[0.2em] font-bold text-center md:text-left" id="footer-copyright-row">
        <div>© {new Date().getFullYear()} AcolheMente • Plataforma de Cuidado Acessível</div>
        <div>Feito por profissionais de saúde para pessoas</div>
        <div id="footer-cities-span">{configs.cidadesRodape || "Brasil • São Paulo • online"}</div>
      </div>

      {showComplianceModal && (
        <ComplianceModal onClose={() => setShowComplianceModal(false)} />
      )}

      <ApoioImediatoModal
        isOpen={showCvvModal}
        onClose={() => setShowCvvModal(false)}
        onNavigateAcolhimento={() => handleNav("acolhimento")}
        campanhaNome="Apoio Emocional Imediato 24h"
        lacoEmoji="🎗️"
      />
    </footer>
  );
}
