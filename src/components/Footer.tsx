import { Map, Mail, Phone, HeartHandshake, Leaf, User } from "lucide-react";

export function Footer({ onNavigate }: { onNavigate?: (view: any) => void }) {
  const handleNav = (view: string) => {
    if (onNavigate) {
      onNavigate(view);
    }
  };

  return (
    <footer className="w-full bg-warm/50 border-t border-soft pt-16 pb-32 md:pb-16 px-6 md:px-12 flex flex-col items-center mt-auto">
      <div className="w-full max-w-[1440px] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
        
        {/* Brand & History */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-sun rounded-full flex items-center justify-center text-forest overflow-hidden">
              <img src="/logo.png" alt="AcolheMente Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-serif text-2xl font-semibold tracking-tight text-forest">AcolheMente</span>
          </div>
          <p className="text-forest/80 text-sm leading-relaxed">
            Uma iniciativa focada em democratizar o acesso à saúde mental. Nossa história começa na vontade de criar uma ponte humanizada entre psicoterapeutas qualificados e quem busca acolhimento, ajudando pessoas através de valores acessíveis ou benefícios corporativos.
          </p>
        </div>

        {/* Quick Links */}
        <div className="flex flex-col gap-4 lg:pl-12">
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
        <div className="flex flex-col gap-4 lg:pl-8">
          <h4 className="font-serif text-lg font-medium text-forest mb-2">Legal</h4>
          <ul className="flex flex-col gap-3 text-sm text-forest/70 font-medium tracking-wide">
            <li><a href="#" onClick={(e) => e.preventDefault()} className="hover:text-forest transition-colors">Termos de Uso</a></li>
            <li><a href="#" onClick={(e) => e.preventDefault()} className="hover:text-forest transition-colors">Política de Privacidade</a></li>
            <li><a href="#" onClick={(e) => e.preventDefault()} className="hover:text-forest transition-colors">Contrato de Prestação</a></li>
            <li><a href="#" onClick={(e) => e.preventDefault()} className="hover:text-forest transition-colors">Compliance e NR1</a></li>
          </ul>
        </div>

        {/* Contato */}
        <div className="flex flex-col gap-4">
          <h4 className="font-serif text-lg font-medium text-forest mb-2">Contato</h4>
          <ul className="flex flex-col gap-3 text-sm text-forest/70 font-medium">
            <li className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-sun-dark" />
              <span>contato@acolhemente.com</span>
            </li>
            <li className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-sun-dark" />
              <span>(61) 9999-9999</span>
            </li>
            <li className="flex items-center gap-2 mt-4 text-forest/50 font-bold uppercase tracking-wider text-[10px]">
              Siga nas redes sociais
            </li>
            <li className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-forest/5 flex items-center justify-center hover:bg-sun hover:text-forest text-forest/50 cursor-pointer transition-colors font-serif italic text-lg shadow-sm border border-soft">
                in
              </div>
              <div className="w-10 h-10 rounded-full bg-forest/5 flex items-center justify-center hover:bg-sun hover:text-forest text-forest/50 cursor-pointer transition-colors font-serif italic text-lg shadow-sm border border-soft">
                ig
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="w-full max-w-[1440px] border-t border-soft pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-forest/50 uppercase tracking-[0.2em] font-bold text-center md:text-left">
        <div>© {new Date().getFullYear()} AcolheMente • Plataforma de Cuidado Acessível</div>
        <div>Feito por profissionais de saúde para pessoas</div>
        <div>Brasília • São Paulo • Remoto</div>
      </div>
    </footer>
  );
}
