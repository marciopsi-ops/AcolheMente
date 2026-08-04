import { useEffect, useState } from "react";
import { User, HeartHandshake, X, Quote } from "lucide-react";
import { collection, doc, onSnapshot, query } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";

export interface ProfissionalCard {
  id: string;
  name: string;
  foto: string;
  profissao: string;
  crp?: string;
  motivacaoProjeto?: string;
}

const FALLBACK_PROFISSIONAIS: ProfissionalCard[] = [
  {
    id: "f1",
    name: "Dra. Ana Carolina Silva",
    foto: "https://images.unsplash.com/photo-1594824813566-78a9c33fd908?w=400&auto=format&fit=crop&q=80",
    profissao: "Psicóloga Clínica - TCC",
    crp: "CRP 06/145892",
    motivacaoProjeto: "Acredito na democratização da saúde mental com acolhimento humano, ético e acessível a todos.",
  },
  {
    id: "f2",
    name: "Dr. Marcos Vinícius Santos",
    foto: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80",
    profissao: "Psicanalista",
    crp: "CRP 05/887412",
    motivacaoProjeto: "Oferecer escuta qualificada e um espaço seguro para quem busca profunda transformação pessoal.",
  },
  {
    id: "f3",
    name: "Dra. Juliana Mendes",
    foto: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80",
    profissao: "Terapeuta Holística",
    crp: "",
    motivacaoProjeto: "Acolher a dor emocional com sensibilidade, empatia e respeito absoluto ao tempo de cada ser.",
  },
  {
    id: "f4",
    name: "Dr. Eduardo Costa",
    foto: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&auto=format&fit=crop&q=80",
    profissao: "Psicólogo Humanista",
    crp: "CRP 06/112390",
    motivacaoProjeto: "Promover o autoconhecimento e a autonomia emocional ao alcance de todas as camadas sociais.",
  },
  {
    id: "f5",
    name: "Dra. Beatriz Lima",
    foto: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80",
    profissao: "Terapeuta Cognitiva",
    crp: "CRP 04/774812",
    motivacaoProjeto: "Contribuir com cuidado psicológico de alta qualidade focado na resiliência e no bem-estar.",
  },
  {
    id: "f6",
    name: "Dr. Rafael Oliveira",
    foto: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop&q=80",
    profissao: "Psicólogo Clínico",
    crp: "CRP 06/134990",
    motivacaoProjeto: "Estar presente com dedicação na jornada de fortalecimento mental daqueles que mais necessitam.",
  },
];

export function ProfissionaisCarousel() {
  const [carrosselAtivo, setCarrosselAtivo] = useState(true);
  const [profissionais, setProfissionais] = useState<ProfissionalCard[]>([]);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [isPaused, setIsPaused] = useState(false);
  const [selectedProfModal, setSelectedProfModal] = useState<ProfissionalCard | null>(null);

  // Escuta as configurações globais para saber se o carrossel está ativo no Painel de Gestão
  useEffect(() => {
    let unsub: (() => void) | undefined;
    try {
      unsub = onSnapshot(doc(db, "configuracoes", "master"), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.carrosselProfissionaisAtivo !== undefined) {
            setCarrosselAtivo(!!data.carrosselProfissionaisAtivo);
          }
        }
      });
    } catch (err) {
      console.error("Erro ao carregar configuracoes do carrossel:", err);
    }
    return () => {
      if (unsub) unsub();
    };
  }, []);

  // Escuta a coleção de usuários e filtra estritamente profissionais com foto cadastrada em 'Meu Perfil'
  useEffect(() => {
    let unsub: (() => void) | undefined;
    try {
      const q = query(collection(db, "users"));
      unsub = onSnapshot(
        q,
        (snapshot) => {
          const loadedProfs: ProfissionalCard[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const rolesArray = Array.isArray(data.roles) ? data.roles : [];
            const isProfissional =
              data.role === "profissional" || rolesArray.includes("profissional");

            if (isProfissional && data.ativo !== false) {
              // Foto que o profissional insere no 'Meu perfil' (photoUrl, foto ou photoURL)
              const foto =
                data.photoUrl ||
                data.foto ||
                data.photoURL ||
                data.photo ||
                data.avatar ||
                data.imagemUrl ||
                "";

              // REGRA SOLICITADA: Exibe no carrossel SOMENTE os profissionais que estiverem com suas fotos de perfil inseridas
              if (!foto || typeof foto !== "string" || !foto.trim()) {
                return;
              }

              const name =
                data.name ||
                data.nome ||
                data.displayName ||
                "Profissional Parceiro(a)";

              const profissao =
                data.profissao ||
                (data.especialidade
                  ? `Profissional - ${data.especialidade}`
                  : "Profissional de Saúde");

              const crp = data.crp ? `CRP ${data.crp}` : undefined;

              const motivacaoProjeto =
                data.motivacaoProjeto ||
                data.motivacao ||
                "";

              loadedProfs.push({
                id: docSnap.id,
                name,
                foto,
                profissao,
                crp,
                motivacaoProjeto,
              });
            }
          });

          if (loadedProfs.length > 0) {
            setProfissionais(loadedProfs);
          } else {
            // Se nenhum profissional do Firestore cadastrou foto ainda, mantemos o fallback demonstrativo
            setProfissionais(FALLBACK_PROFISSIONAIS);
          }
        },
        (error) => {
          console.error("Erro ao carregar profissionais para o carrossel:", error);
          setProfissionais(FALLBACK_PROFISSIONAIS);
          try {
            handleFirestoreError(error, OperationType.GET, "users");
          } catch (e) {
            // Ignora erro para manter experiência fluida com fallback
          }
        }
      );
    } catch (err) {
      console.error(err);
      setProfissionais(FALLBACK_PROFISSIONAIS);
    }

    return () => {
      if (unsub) unsub();
    };
  }, []);

  // Se desativado no Painel de Gestão, não renderiza nada
  if (!carrosselAtivo) {
    return null;
  }

  const displayList =
    profissionais.length > 0 ? profissionais : FALLBACK_PROFISSIONAIS;

  // Repete a lista de cards 3 vezes para permitir rolagem contínua sem quebras
  const carouselItems = [...displayList, ...displayList, ...displayList];

  return (
    <section className="w-full bg-warm/60 py-16 md:py-20 flex flex-col items-center border-t border-soft/60 overflow-hidden">
      <div className="w-full max-w-[1200px] px-6 md:px-12 mb-10 text-center flex flex-col items-center gap-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sun/20 border border-sun/40 text-forest text-xs font-semibold uppercase tracking-wider">
          <HeartHandshake className="w-3.5 h-3.5 text-forest shrink-0" />
          <span>Nosso Corpo Clínico</span>
        </div>
        <h2 className="font-serif text-3xl md:text-4xl text-forest">
          Profissionais no AcolheMente
        </h2>
        <p className="text-forest/75 text-sm md:text-base max-w-xl leading-relaxed">
          Pessoas reais dedicadas a promover saúde mental e acolhimento ético e humano.
        </p>
      </div>

      {/* Container do Carrossel com evento de hover para pausar */}
      <div
        className="w-full relative flex overflow-x-hidden group"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Sombreamento lateral em degradê para suavizar as bordas */}
        <div className="absolute inset-y-0 left-0 w-12 sm:w-28 bg-gradient-to-r from-warm to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-12 sm:w-28 bg-gradient-to-l from-warm to-transparent z-10 pointer-events-none" />

        <div
          className="flex whitespace-nowrap gap-5 py-4 px-4 min-w-max animate-carousel-scroll"
          style={{
            animationPlayState: isPaused ? "paused" : "running",
            animationDuration: `${Math.max(45, displayList.length * 8)}s`,
          }}
        >
          {carouselItems.map((prof, index) => {
            const itemKey = `${prof.id}-${index}`;
            const hasError = imageErrors[itemKey];

            return (
              <div
                key={itemKey}
                className="w-[270px] sm:w-[300px] min-h-[350px] sm:min-h-[380px] shrink-0 p-5 sm:p-6 rounded-2xl bg-white border border-soft/80 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col items-center justify-between text-center overflow-hidden select-none box-border whitespace-normal"
              >
                {/* 1. Foto com formato circular */}
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 border-sun/60 shadow-inner bg-warm/80 flex items-center justify-center shrink-0 relative mb-1">
                  {prof.foto && !hasError ? (
                    <img
                      src={prof.foto}
                      alt={prof.name}
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setImageErrors((prev) => ({ ...prev, [itemKey]: true }))
                      }
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-forest/10 flex items-center justify-center text-forest/60">
                      <User className="w-10 h-10 stroke-[1.5]" />
                    </div>
                  )}
                </div>

                {/* Container principal dos dados centralizados */}
                <div className="w-full flex flex-col items-center justify-center my-auto gap-0.5">
                  {/* 2. Nome */}
                  <h3
                    className="font-serif font-bold text-base text-forest w-full line-clamp-1 leading-tight px-1 text-center break-words"
                    title={prof.name}
                  >
                    {prof.name}
                  </h3>

                  {/* 3. Profissão */}
                  <p
                    className="text-xs text-forest/75 font-semibold tracking-wide w-full line-clamp-1 px-1 text-center leading-snug break-words"
                    title={prof.profissao}
                  >
                    {prof.profissao}
                  </p>

                  {/* 4. Registro (se houver) */}
                  {prof.crp ? (
                    <span className="mt-1 text-[10px] font-semibold text-forest/70 bg-warm/90 px-3 py-0.5 rounded-full border border-soft/70 max-w-full truncate shrink-0">
                      {prof.crp}
                    </span>
                  ) : null}
                </div>

                {/* 5. Frase editada em "Por que faço parte desse projeto" */}
                {prof.motivacaoProjeto ? (
                  <div className="mt-3 pt-2.5 border-t border-soft/60 w-full flex flex-col items-center justify-center gap-1">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-forest/50">
                      Por que faço parte
                    </span>
                    <p className="text-xs text-forest/80 italic font-serif leading-tight px-1 text-center line-clamp-2 break-words">
                      “{prof.motivacaoProjeto}”
                    </p>
                    <button
                      onClick={() => setSelectedProfModal(prof)}
                      className="text-[11px] font-bold text-forest hover:text-sun-dark underline decoration-sun-dark/40 underline-offset-2 transition-colors mt-0.5 cursor-pointer"
                    >
                      Ler mais
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal para leitura completa do depoimento do profissional */}
      {selectedProfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-soft relative flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedProfModal(null)}
              className="absolute top-4 right-4 p-2 text-forest/60 hover:text-forest hover:bg-warm rounded-full transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Foto no Modal */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 border-sun/60 shadow-inner bg-warm/80 flex items-center justify-center shrink-0 mb-3">
              {selectedProfModal.foto ? (
                <img
                  src={selectedProfModal.foto}
                  alt={selectedProfModal.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-10 h-10 text-forest/60" />
              )}
            </div>

            <h3 className="font-serif font-bold text-lg sm:text-xl text-forest">
              {selectedProfModal.name}
            </h3>
            <p className="text-xs sm:text-sm font-semibold text-forest/75 mt-0.5">
              {selectedProfModal.profissao}
            </p>
            {selectedProfModal.crp && (
              <span className="mt-2 text-xs font-semibold text-forest/70 bg-warm px-3.5 py-1 rounded-full border border-soft">
                {selectedProfModal.crp}
              </span>
            )}

            <div className="mt-5 pt-4 border-t border-soft/80 w-full flex flex-col items-center gap-2 bg-warm/40 p-4 rounded-2xl">
              <span className="text-[10px] font-bold uppercase tracking-widest text-forest/60 flex items-center gap-1.5">
                <Quote className="w-3.5 h-3.5 text-sun-dark" /> Por que faço parte do projeto
              </span>
              <p className="text-xs sm:text-sm text-forest/90 italic font-serif leading-relaxed text-center whitespace-pre-line">
                “{selectedProfModal.motivacaoProjeto}”
              </p>
            </div>

            <button
              onClick={() => setSelectedProfModal(null)}
              className="mt-6 px-6 py-2.5 bg-forest text-white text-xs sm:text-sm font-semibold rounded-xl hover:bg-forest/90 transition-colors shadow-xs cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
