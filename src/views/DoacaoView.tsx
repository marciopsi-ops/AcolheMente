import { Footer } from '../components/Footer';
import { ArrowLeft, CheckCircle2, HeartHandshake, QrCode, ClipboardList, HandHeart } from "lucide-react";
import { FormEvent, useState } from "react";
import { collection, addDoc, serverTimestamp, getDocs, query, where } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";

import doacaoHero from '../assets/images/doacao_hero_photo_1781024105563.png';
import logoImage from '../assets/images/logo_acolhe.jpeg';

export function DoacaoView({ onNavigate }: { onNavigate: (view: 'landing' | 'acolhimento' | 'dashboard' | 'profile' | 'empresa' | 'doacao') => void }) {
  const [activeTab, setActiveTab] = useState<'intro' | 'doar' | 'preciso'>('intro');
  
  // Doacao Flow State
  const [doacaoForm, setDoacaoForm] = useState({ nome: '', email: '', telefone: '', comprovanteBase64: '', valor: 50 });
  const [isDoacaoSubmitting, setIsDoacaoSubmitting] = useState(false);
  const [doacaoStep, setDoacaoStep] = useState<'form' | 'pix' | 'success'>('form');
  const [doacaoError, setDoacaoError] = useState('');

  // Solicitacao Flow State
  const [solForm, setSolForm] = useState({ nome: '', email: '', telefone: '', motivo: '' });
  const [isSolSubmitting, setIsSolSubmitting] = useState(false);
  const [solStep, setSolStep] = useState<'form' | 'success'>('form');
  const [solError, setSolError] = useState('');

  const handleDoacaoSubmit = (e: FormEvent) => {
    e.preventDefault();
    setDoacaoStep('pix');
  };

  const confirmPixPayment = async () => {
    setIsDoacaoSubmitting(true);
    setDoacaoError('');
    try {
      await addDoc(collection(db, "doacoes"), {
        ...doacaoForm,
        status: 'Pago',
        createdAt: serverTimestamp()
      });
      setDoacaoStep('success');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "doacoes");
      setDoacaoError("Ocorreu um erro ao processar a doação.");
    } finally {
      setIsDoacaoSubmitting(false);
    }
  };

  const handleSolSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSolSubmitting(true);
    setSolError('');
    try {
      const q = query(collection(db, "solicitacoes_doacao"), where("email", "==", solForm.email));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setSolError("Este email já aparece em nossa triagem ou em nosso banco de dados.");
        setIsSolSubmitting(false);
        return;
      }

      await addDoc(collection(db, "solicitacoes_doacao"), {
        ...solForm,
        status: 'Aguardando',
        createdAt: serverTimestamp()
      });
      setSolStep('success');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "solicitacoes_doacao");
      setSolError("Ocorreu um erro ao processar a solicitação.");
    } finally {
      setIsSolSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-warm overflow-y-auto">
      <nav className="h-20 bg-white/50 backdrop-blur-md border-b border-soft px-6 md:px-12 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button onClick={() => onNavigate('landing')} className="text-forest/70 hover:text-forest transition-colors p-2 -ml-2 rounded-full hover:bg-forest/5">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
               <img src={logoImage} alt="AcolheMente Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-serif text-2xl font-semibold tracking-tight text-forest">AcolheMente <span className="text-forest/70 font-medium opacity-70">Apoio Solidário</span></span>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center pb-16">
        {activeTab === 'intro' && (
          <section className="w-full px-6 md:px-12 py-12 flex justify-center fade-in">
            <div className="max-w-[1200px] w-full flex flex-col lg:flex-row items-center justify-between gap-8">
              <div className="w-full lg:w-1/2 flex flex-col items-center lg:items-start text-center lg:text-left gap-8">
                <div className="w-20 h-20 bg-[#F0EAD6] rounded-full flex items-center justify-center text-[#D4A373]">
                  <HeartHandshake className="w-10 h-10" />
                </div>
                <h1 className="font-serif text-5xl md:text-6xl text-forest font-medium">A empatia que transforma vidas</h1>
                <p className="text-lg md:text-xl text-forest/70/80 leading-relaxed max-w-xl">
                  Muitas pessoas enfrentam momentos de profunda angústia, mas não têm condições financeiras para buscar ajuda profissional. O custo de uma única sessão pode ser a barreira entre o sofrimento isolado e o início da cura. 
                </p>
                <p className="text-lg md:text-xl text-forest/70/80 leading-relaxed max-w-xl">
                  Seu apoio pode ser a ponte. Uma sessão doada é um abraço na alma de quem mais precisa. Juntos, fazemos do cuidado mental um direito, não um privilégio.
                </p>

                <div className="flex flex-col sm:flex-row gap-6 mt-8 w-full justify-center lg:justify-start">
                  <button 
                    onClick={() => setActiveTab('doar')}
                    className="px-8 py-5 bg-forest text-white rounded-full font-semibold shadow-lg hover:bg-forest/90 transition-all flex items-center justify-center gap-3 md:text-lg"
                  >
                    <HandHeart className="w-5 h-5" />
                    Quero Doar
                  </button>
                  <button 
                    onClick={() => setActiveTab('preciso')}
                    className="px-8 py-5 border-2 border-sun-dark text-forest/70 rounded-full font-semibold bg-white/50 hover:bg-white transition-all flex items-center justify-center gap-3 md:text-lg"
                  >
                    <ClipboardList className="w-5 h-5" />
                    Preciso de uma Sessão
                  </button>
                </div>
              </div>
              <div className="w-full lg:w-1/2 flex justify-center lg:justify-end">
                <img src={doacaoHero} alt="Ilustração de solidariedade" className="w-full max-w-lg object-contain rounded-3xl mix-blend-multiply" referrerPolicy="no-referrer" />
              </div>
            </div>
          </section>
        )}

        {/* FLUXO DE DOAÇÃO */}
        {activeTab === 'doar' && (
          <section className="w-full px-6 md:px-12 py-8 flex justify-center slide-up">
            <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl shadow-forest/5 p-8 md:p-12 border border-soft relative">
              <button 
                onClick={() => { setActiveTab('intro'); setDoacaoStep('form'); }}
                className="absolute top-8 left-8 text-forest/70/50 hover:text-forest/70 transition-colors"
                title="Voltar"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>

              {doacaoStep === 'form' && (
                <div className="flex flex-col gap-6 mt-8">
                  <div className="text-center mb-4">
                    <h2 className="font-serif text-3xl font-medium text-forest mb-2">Sua Contribuição</h2>
                    <p className="text-forest/70/80 text-sm">Escolha ou digite o valor. Qualquer quantia ajuda a construir novos inícios.</p>
                  </div>

                  <form onSubmit={handleDoacaoSubmit} className="flex flex-col gap-5">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-forest/70 ml-2">Nome completo ou prefiro usar um apelido</label>
                      <input 
                        required 
                        value={doacaoForm.nome}
                        onChange={e => setDoacaoForm({...doacaoForm, nome: e.target.value})}
                        className="px-5 py-4 bg-warm/50 border border-soft rounded-2xl focus:outline-none focus:border-sun-dark focus:bg-white transition-all text-sm text-forest" 
                        placeholder="Seu nome ou apelido" 
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-forest/70 ml-2">Telefone / WhatsApp</label>
                      <input 
                        required 
                        type="tel"
                        value={doacaoForm.telefone}
                        onChange={e => setDoacaoForm({...doacaoForm, telefone: e.target.value})}
                        className="px-5 py-4 bg-warm/50 border border-soft rounded-2xl focus:outline-none focus:border-sun-dark focus:bg-white transition-all text-sm text-forest" 
                        placeholder="(00) 00000-0000" 
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-forest/70 ml-2">E-mail (opcional)</label>
                      <input 
                        type="email"
                        value={doacaoForm.email}
                        onChange={e => setDoacaoForm({...doacaoForm, email: e.target.value})}
                        className="px-5 py-4 bg-warm/50 border border-soft rounded-2xl focus:outline-none focus:border-sun-dark focus:bg-white transition-all text-sm text-forest" 
                        placeholder="Para enviarmos atualizações" 
                      />
                    </div>
                    <div className="flex flex-col gap-1 mt-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-forest/70 mx-auto mb-2">Valor da Doação (R$)</label>
                      <div className="flex justify-between gap-3 mb-4">
                        {[30, 50, 100].map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setDoacaoForm({...doacaoForm, valor: val})}
                            className={`flex-1 py-3 rounded-xl border font-bold transition-all ${doacaoForm.valor === val ? 'bg-forest text-white border-forest' : 'bg-white text-forest/70 border-soft hover:border-sun-dark/50'}`}
                          >
                            R$ {val}
                          </button>
                        ))}
                      </div>
                      <input 
                        type="number"
                        min="10"
                        required
                        value={doacaoForm.valor || ''}
                        onChange={e => setDoacaoForm({...doacaoForm, valor: Number(e.target.value)})}
                        className="px-5 py-4 bg-warm/50 border border-soft rounded-2xl focus:outline-none focus:border-sun-dark focus:bg-white transition-all text-lg font-medium text-forest text-center" 
                        placeholder="Outro valor..." 
                      />
                    </div>

                    <button 
                      type="submit" 
                      className="w-full py-5 px-8 mt-2 bg-forest text-white rounded-full font-semibold shadow-md hover:bg-forest/90 transition-all"
                    >
                      Avançar para Pagamento
                    </button>
                  </form>
                </div>
              )}

              {doacaoStep === 'pix' && (
                <div className="flex flex-col items-center gap-6 mt-8 zoom-in">
                  <div className="text-center">
                    <h2 className="font-serif text-3xl font-medium text-forest mb-2">Doação via PIX</h2>
                    <p className="text-forest/70/80 text-sm">Escaneie o QR Code abaixo ou copie a chave.</p>
                  </div>
                  
                  <div className="w-56 h-56 bg-warm rounded-3xl border border-soft flex flex-col items-center justify-center p-4">
                    <QrCode className="w-32 h-32 text-forest/70 mb-2" />
                    <span className="text-xs text-forest/70/60 uppercase font-bold tracking-widest">QR CODE SIMULADO</span>
                  </div>

                  <div className="flex flex-col items-center gap-2 w-full">
                    <span className="text-xs font-bold uppercase tracking-wider text-forest/70">Valor</span>
                    <span className="text-2xl font-serif text-forest font-bold">R$ {doacaoForm.valor.toFixed(2)}</span>
                  </div>

                  <div className="flex flex-col items-center gap-2 w-full mt-4">
                    <label className="text-xs font-bold uppercase tracking-wider text-forest/70">Comprovante de Pagamento (Opcional)</label>
                    <input 
                      type="file" 
                      accept="image/*,.pdf"
                      onChange={(e) => {
                         const file = e.target.files?.[0];
                         if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              if (typeof reader.result === 'string') {
                                 setDoacaoForm({...doacaoForm, comprovanteBase64: reader.result});
                              }
                            };
                            reader.readAsDataURL(file);
                         }
                      }}
                      className="w-full text-sm text-forest/70 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-sun-dark file:text-forest hover:file:bg-sun-dark/80 cursor-pointer"
                    />
                    {doacaoForm.comprovanteBase64 && (
                      <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-3 py-1 rounded-full mt-2">Comprovante anexado!</span>
                    )}
                  </div>

                  {doacaoError && (
                    <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm text-center w-full">
                      {doacaoError}
                    </div>
                  )}

                  <button 
                    disabled={isDoacaoSubmitting}
                    onClick={confirmPixPayment}
                    className="w-full py-5 px-8 bg-forest text-white rounded-full font-semibold shadow-md hover:bg-forest/90 transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                  >
                    {isDoacaoSubmitting ? 'Confirmando...' : 'Já realizei o pagamento'}
                  </button>
                </div>
              )}

              {doacaoStep === 'success' && (
                <div className="flex flex-col items-center text-center gap-6 mt-8 py-6 zoom-in">
                  <div className="w-20 h-20 bg-sun-dark-light/30 rounded-full flex items-center justify-center mb-2">
                    <CheckCircle2 className="w-10 h-10 text-forest/70" />
                  </div>
                  <h2 className="font-serif text-3xl text-forest">Muito Obrigado!</h2>
                  <p className="text-forest/70/80 max-w-sm mx-auto text-lg leading-relaxed">
                    Sua doação de <strong>R$ {doacaoForm.valor.toFixed(2)}</strong> foi recebida com sucesso. 
                    <br/><br/>
                    Em breve ela se transformará em acolhimento para quem precisa.
                  </p>
                  <button 
                    onClick={() => { setActiveTab('intro'); setDoacaoStep('form'); }}
                    className="mt-4 px-8 py-4 bg-sun-dark text-forest rounded-full font-semibold shadow-md hover:bg-sun-dark-dark transition-all"
                  >
                    Voltar ao Início
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* FLUXO DE SOLICITAÇÃO */}
        {activeTab === 'preciso' && (
          <section className="w-full px-6 md:px-12 py-8 flex justify-center slide-up">
            <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl shadow-forest/5 p-8 md:p-12 border border-soft relative">
              <button 
                onClick={() => { setActiveTab('intro'); setSolStep('form'); }}
                className="absolute top-8 left-8 text-forest/70/50 hover:text-forest/70 transition-colors"
                title="Voltar"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>

              {solStep === 'form' && (
                <div className="flex flex-col gap-6 mt-8">
                  <div className="text-center mb-6">
                    <h2 className="font-serif text-3xl font-medium text-forest mb-2">Solicitar Acolhimento</h2>
                    <p className="text-forest/70/80 text-sm">Preencha com seus dados para entrar na fila do programa solidário.</p>
                  </div>

                  {solError && (
                    <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm text-center">
                      {solError}
                    </div>
                  )}

                  <form onSubmit={handleSolSubmit} className="flex flex-col gap-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-forest/70 ml-2">Nome Completo *</label>
                        <input 
                          required 
                          value={solForm.nome}
                          onChange={e => setSolForm({...solForm, nome: e.target.value})}
                          className="px-5 py-4 bg-warm/50 border border-soft rounded-2xl focus:outline-none focus:border-sun-dark focus:bg-white transition-all text-sm text-forest" 
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-forest/70 ml-2">Telefone com DDD *</label>
                        <input 
                          required 
                          type="tel"
                          value={solForm.telefone}
                          onChange={e => setSolForm({...solForm, telefone: e.target.value})}
                          className="px-5 py-4 bg-warm/50 border border-soft rounded-2xl focus:outline-none focus:border-sun-dark focus:bg-white transition-all text-sm text-forest" 
                        />
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-forest/70 ml-2">E-mail *</label>
                      <input 
                        required 
                        type="email"
                        value={solForm.email}
                        onChange={e => setSolForm({...solForm, email: e.target.value})}
                        className="px-5 py-4 bg-warm/50 border border-soft rounded-2xl focus:outline-none focus:border-sun-dark focus:bg-white transition-all text-sm text-forest" 
                      />
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-forest/70 ml-2">Descreva brevemente por que precisa desse apoio *</label>
                      <textarea 
                        required 
                        rows={4}
                        value={solForm.motivo}
                        onChange={e => setSolForm({...solForm, motivo: e.target.value})}
                        className="px-5 py-4 bg-warm/50 border border-soft rounded-2xl focus:outline-none focus:border-sun-dark focus:bg-white transition-all text-sm text-forest resize-none" 
                        placeholder="Conte pra gente, de forma breve, o que te trouxe até aqui..." 
                      />
                    </div>

                    <button 
                      disabled={isSolSubmitting}
                      type="submit" 
                      className="w-full py-5 px-8 mt-4 bg-forest text-white rounded-full font-semibold shadow-md hover:bg-forest/90 transition-all flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isSolSubmitting ? 'Enviando...' : 'Enviar Solicitação'}
                    </button>
                    <p className="text-center text-[11px] text-forest/70/60 uppercase tracking-widest font-semibold mt-1">
                      Manteremos seus dados em sigilo.
                    </p>
                  </form>
                </div>
              )}

              {solStep === 'success' && (
                <div className="flex flex-col items-center text-center gap-6 mt-8 py-6 zoom-in">
                  <div className="w-20 h-20 bg-sun-dark-light/30 rounded-full flex items-center justify-center mb-2">
                    <CheckCircle2 className="w-10 h-10 text-forest/70" />
                  </div>
                  <h2 className="font-serif text-3xl text-forest">Sua solicitação foi registrada</h2>
                  <p className="text-forest/70/80 max-w-sm mx-auto text-lg leading-relaxed">
                    Nossa equipe avaliará seu pedido com muito carinho e entrará em contato assim que tivermos um profissional disponível através do fundo solidário.
                  </p>
                  <button 
                    onClick={() => onNavigate('landing')}
                    className="mt-4 px-8 py-4 bg-forest text-white rounded-full font-semibold shadow-md hover:bg-forest/90 transition-all"
                  >
                    Voltar ao Início
                  </button>
                </div>
              )}
            </div>
          </section>
        )}
      </main>
      <Footer onNavigate={onNavigate} />
    </div>
  );
}
