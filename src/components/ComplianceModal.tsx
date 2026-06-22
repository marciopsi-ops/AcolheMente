import React, { useState } from "react";
import { X, Send } from "lucide-react";
import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

interface ComplianceModalProps {
  onClose: () => void;
  userId?: string;
  userRole?: string;
  userName?: string;
  userEmail?: string;
}

export function ComplianceModal({ onClose, userId, userRole, userName, userEmail }: ComplianceModalProps) {
  const [tipo, setTipo] = useState("Sugestão de Melhoria");
  const [mensagem, setMensagem] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mensagem.trim()) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "compliance"), {
        tipo,
        mensagem,
        status: "Pendente",
        userId: userId || "anonimo",
        userRole: userRole || "externo",
        userName: userName || "Anônimo",
        userEmail: userEmail || "",
        createdAt: serverTimestamp(),
      });
      setIsSuccess(true);
    } catch (error) {
      console.error("Erro ao enviar mensagem de compliance:", error);
      alert("Ocorreu um erro ao enviar sua mensagem. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-6 top-6 text-forest/50 hover:text-forest transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="font-serif text-2xl font-bold text-forest mb-2">
          Ouvidoria e Compliance
        </h3>
        <p className="text-forest/70 text-sm mb-6">
          Este é um canal seguro e confidencial. Suas informações serão tratadas com total sigilo pela nossa equipe de gestão.
        </p>

        {isSuccess ? (
          <div className="bg-sand/30 p-6 rounded-2xl text-center">
            <h4 className="font-bold text-forest text-lg mb-2">Mensagem Enviada</h4>
            <p className="text-forest/70 text-sm">
              Sua mensagem foi registrada com sucesso e será analisada pela nossa equipe. Agradecemos sua contribuição!
            </p>
            <button
              onClick={onClose}
              className="mt-6 px-6 py-2 bg-forest text-white rounded-full font-semibold hover:bg-forest/90 transition-colors"
            >
              Fechar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-forest mb-1">
                Tipo de Mensagem
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-sand/30 border-transparent focus:border-forest focus:ring-0 text-forest"
                required
              >
                <option value="Sugestão de Melhoria">Sugestão de Melhoria</option>
                <option value="Reclamação">Reclamação</option>
                <option value="Denúncia">Denúncia</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-forest mb-1">
                Mensagem
              </label>
              <textarea
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-sand/30 border-transparent focus:border-forest focus:ring-0 text-forest resize-none h-32"
                placeholder="Descreva a situação em detalhes..."
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-forest text-white font-semibold py-3 px-6 rounded-xl hover:bg-forest/90 transition-colors flex items-center justify-center gap-2 mt-4"
            >
              {isSubmitting ? "Enviando..." : (
                <>
                  <Send className="w-5 h-5" /> Enviar Mensagem
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
