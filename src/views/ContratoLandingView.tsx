import React, { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Leaf, Heart, CheckCircle2 } from "lucide-react";

export function ContratoLandingView({
  contratoId,
  onBack,
}: {
  contratoId: string;
  onBack: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [signed, setSigned] = useState(false);

  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    cpf: "",
    menorIdade: false,
    nomeMenor: "",
  });

  useEffect(() => {
    const fetchAcolhimento = async () => {
      try {
        const docSnap = await getDoc(doc(db, "acolhimentos", contratoId));
        if (docSnap.exists()) {
          const docData = docSnap.data();
          setData(docData);
          setFormData((prev) => ({
            ...prev,
            nome: docData.nome || "",
            email: docData.email || "",
          }));
          if (docData.contratoAssinado) {
            setSigned(true);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAcolhimento();
  }, [contratoId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.email || !formData.cpf) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    try {
      setLoading(true);
      await updateDoc(doc(db, "acolhimentos", contratoId), {
        contratoAssinado: true,
        dadosContrato: formData,
      });
      setSigned(true);
    } catch (err) {
      console.error(err);
      alert("Erro ao assinar contrato.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warm">
        <div className="animate-pulse text-forest font-semibold">Carregando...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-warm">
        <h2 className="text-2xl font-serif text-forest mb-4">Contrato não encontrado</h2>
        <button onClick={onBack} className="text-sun-dark hover:underline">Voltar</button>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="min-h-screen bg-warm flex flex-col items-center py-20 px-6">
        <div className="bg-white rounded-[2.5rem] shadow-xl p-12 max-w-lg w-full flex flex-col items-center text-center border border-soft slide-up">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="font-serif text-3xl text-forest mb-4">Contrato Assinado!</h2>
          <p className="text-forest/70 mb-8 leading-relaxed">
            Agradecemos a sua assinatura. Seu contrato foi registrado com sucesso em nossa plataforma.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm flex flex-col selection:bg-sun-dark/30">
      <nav className="p-6 md:px-12 flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-50 border-b border-soft">
        <div className="flex items-center gap-3 cursor-pointer" onClick={onBack}>
          <div className="w-10 h-10 bg-sun-dark rounded-xl flex items-center justify-center rotate-3 shadow-sm">
            <Leaf className="w-5 h-5 text-forest -rotate-3" />
          </div>
          <span className="font-serif text-2xl font-medium tracking-tight text-forest">
            Acolhe
          </span>
        </div>
      </nav>

      <main className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full gap-12 p-6 md:p-12">
        <div className="flex-1 lg:max-w-2xl flex flex-col justify-center slide-up">
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-forest font-medium leading-[1.1] mb-6">
            Assinatura de Contrato
          </h1>
          <p className="text-lg md:text-xl text-forest/70 leading-relaxed font-light mb-8 max-w-xl">
            Leia atentamente as cláusulas do contrato abaixo. Para darmos continuidade ao seu atendimento, por favor, preencha os dados e confirme sua assinatura.
          </p>

          <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-soft mb-8">
            <h3 className="font-serif text-xl text-forest mb-4">Termos do Contrato</h3>
            <div className="text-sm text-forest/80 whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto pr-4 custom-scrollbar">
              {data.contratoText || "O contrato ainda não foi disponibilizado. Entre em contato com o profissional."}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-xl border border-soft flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-forest">Nome Completo</label>
              <input
                type="text"
                required
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="w-full bg-warm/50 text-base text-forest border border-soft rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-sun-dark transition-all"
                placeholder="Seu nome completo"
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-forest">E-mail</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-warm/50 text-base text-forest border border-soft rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-sun-dark transition-all"
                placeholder="seu@email.com"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-forest">CPF</label>
              <input
                type="text"
                required
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                className="w-full bg-warm/50 text-base text-forest border border-soft rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-sun-dark transition-all"
                placeholder="000.000.000-00"
              />
            </div>

            <label className="flex items-center gap-3 p-4 bg-warm/30 rounded-2xl border border-soft/50 cursor-pointer hover:bg-warm/50 transition-colors">
              <input
                type="checkbox"
                checked={formData.menorIdade}
                onChange={(e) => setFormData({ ...formData, menorIdade: e.target.checked })}
                className="w-5 h-5 rounded border-soft text-sun-dark focus:ring-sun-dark/20 accent-sun-dark"
              />
              <span className="text-forest font-medium">O paciente é menor de idade?</span>
            </label>

            {formData.menorIdade && (
              <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
                <label className="text-sm font-semibold text-forest">Nome do Menor</label>
                <input
                  type="text"
                  required={formData.menorIdade}
                  value={formData.nomeMenor}
                  onChange={(e) => setFormData({ ...formData, nomeMenor: e.target.value })}
                  className="w-full bg-warm/50 text-base text-forest border border-soft rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-sun-dark transition-all"
                  placeholder="Nome completo do menor de idade"
                />
              </div>
            )}

            <label className="flex items-start gap-3 mt-2 cursor-pointer group">
              <input 
                type="checkbox" 
                required 
                className="mt-1 w-5 h-5 rounded border-soft text-sun-dark focus:ring-sun-dark/20 accent-sun-dark cursor-pointer"
              />
              <span className="text-xs text-forest/70 leading-relaxed">
                <strong>Privacidade e LGPD:</strong> Estou ciente e concordo que os dados pessoais fornecidos serão tratados de forma sigilosa e segura para fins terapêuticos e administrativos, conforme a Lei Geral de Proteção de Dados (LGPD).
              </span>
            </label>

            <button
              type="submit"
              className="mt-4 w-full bg-forest text-white hover:bg-forest/90 py-4 rounded-full font-semibold text-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              Assinar Contrato
            </button>
          </form>
        </div>

        <div className="flex-1 hidden lg:flex flex-col justify-center items-center">
          <div className="w-full max-w-md aspect-square bg-sun/20 rounded-[3rem] relative overflow-hidden flex items-center justify-center">
             <Heart className="w-32 h-32 text-sun-dark opacity-50" />
             <div className="absolute inset-0 bg-gradient-to-tr from-sun-dark/20 to-transparent mix-blend-overlay"></div>
          </div>
        </div>
      </main>

      <footer className="w-full max-w-7xl mx-auto p-6 md:p-12 text-center text-xs text-forest/50 mt-auto">
        <p>Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), garantimos o sigilo absoluto, a segurança e a transparência no tratamento de dados sensíveis.</p>
      </footer>
    </div>
  );
}
