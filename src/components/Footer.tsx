import { Map, Mail, Phone, HeartHandshake, Leaf, User } from "lucide-react";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import logoImage from "../assets/images/logo_acolhe.jpeg";
import { ComplianceModal } from "./ComplianceModal";

export function Footer({ onNavigate }: { onNavigate?: (view: any) => void }) {
  const [configs, setConfigs] = useState<any>({
    cidadesRodape: "Brasil • São Paulo • online",
    footerEmail: "contato@acolhemente.com",
    footerTelefone: "(61) 9999-9999",
    footerInstagram: "",
    footerLinkedin: "",
    footerDescricao: "Uma iniciativa focada em democratizar o acesso à saúde mental. Nossa história começa na vontade de criar uma ponte humanizada entre psicoterapeutas qualificados e quem busca acolhimento, ajudando pessoas através de valores acessíveis ou benefícios corporativos.",
    urlTermosUso: "",
    urlPoliticaPrivacidade: "",
    urlContratoPrestacao: "",
  });
  const [showComplianceModal, setShowComplianceModal] = useState(false);

  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const snap = await getDoc(doc(db, "configuracoes", "master"));
        if (snap.exists()) {
          const data = snap.data();
          setConfigs((prev: any) => ({
            ...prev,
            ...data
          }));
        }
      } catch (err: any) {
        if (err.code !== 'permission-denied') {
          console.error("Error fetching configs for footer", err);
        }
      }
    };
    fetchConfigs();
  }, []);

  const handleNav = (view: string) => {
    if (onNavigate) {
      onNavigate(view);
    }
  };

  return (
    <footer className="w-full bg-warm/50 border-t border-soft pt-16 pb-32 md:pb-16 px-6 md:px-12 flex flex-col items-center mt-auto" id="footer-section">
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
            {configs.footerDescricao || "Uma iniciativa focada em democratizar o acesso à saúde mental. Nossa história começa na vontade de criar uma ponte humanizada entre psicoterapeutas qualificados e quem busca acolhimento, ajudando pessoas através de valores acessíveis ou benefícios corporativos."}
          </p>
        </div>

        {/* Quick Links */}
        <div className="flex flex-col gap-4 lg:pl-12" id="footer-col-nav">
          <h4 className="font-serif text-lg font-medium text-forest mb-2">Navegação</h4>
          <ul className="flex flex-col gap-3 text-sm text-forest/70 font-medium tracking-wide">
            <li><button onClick={() => handleNav('landing')} className="hover:text-forest transition-colors">Início</button></li>
            <li><button onClick={() => handleNav('empresa')} className="hover:text-forest transition-colors">Saúde Corporativa</button></li>
            <li><button onClick={() => handleNav('profissional')} className="hover:text-forest transition-colors">Para Psicólogos</button></li>
            <li><button onClick={() => handleNav('doacao')} className="hover:text-forest transition-colors">Doe uma Sessão</button></li>
            <li><button onClick={() => handleNav('dashboard')} className="hover:text-forest transition-colors">Área do Profissional</button></li>
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
              <Phone className="w-4 h-4 text-sun-dark" />
              <span id="footer-contact-phone">{configs.footerTelefone || "(61) 9999-9999"}</span>
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
            <strong>Nota Ética:</strong> Os profissionais cadastrados atuam em conformidade com o Código de Ética Profissional do Psicólogo (Resolução CFP nº 010/2005) e demais resoluções do Conselho Federal de Psicologia (CFP). Todos os psicólogos e terapeutas possuem registro ativo em seus respectivos Conselhos Regionais de Psicologia (CRP) ou associação de classe.
          </p>
          <p>
            <strong>Privacidade e LGPD:</strong> Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), garantimos o sigilo absoluto, a segurança e a transparência no tratamento de dados sensíveis de pacientes e profissionais. O compartilhamento das informações ocorre estritamente para os fins terapêuticos e administrativos informados.
          </p>
        </div>
        <div className="flex md:flex-col items-center md:items-end justify-center gap-1.5 md:gap-1">
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
    </footer>
  );
}
