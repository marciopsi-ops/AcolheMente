import React, { useState, useEffect } from "react";
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, orderBy, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Plus, Trash2, Edit3, Briefcase, X, Check, Users, DollarSign, Info } from "lucide-react";

interface UserProfile {
  id?: string;
  uid?: string;
  name?: string;
  email?: string;
  role?: string;
  [key: string]: any;
}

interface CadastroServicosProps {
  profile: UserProfile;
}

interface ServicoProfissional {
  id?: string;
  profissionalId: string;
  profissionalNome: string;
  nome: string;
  publicoAlvo: "Para pessoas" | "Para Psicólogos" | "Para Psicólogos e Terapeutas" | "Para Empresas";
  orcamentoAcessivel: boolean;
  createdAt?: any;
}

export function CadastroServicos({ profile }: CadastroServicosProps) {
  const [servicos, setServicos] = useState<ServicoProfissional[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [form, setForm] = useState({
    nome: "",
    publicoAlvo: "Para pessoas" as ServicoProfissional["publicoAlvo"],
    orcamentoAcessivel: false,
  });

  const profUid = profile.uid || profile.id;

  useEffect(() => {
    if (!profUid) return;

    const q = query(
      collection(db, "servicos_profissionais"),
      where("profissionalId", "==", profUid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: ServicoProfissional[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as ServicoProfissional);
        });
        setServicos(list);
        setLoading(false);
      },
      (error) => {
        console.error("Erro ao carregar serviços do profissional:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [profUid]);

  const handleOpenCreate = () => {
    setForm({
      nome: "",
      publicoAlvo: "Para pessoas",
      orcamentoAcessivel: false,
    });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (svc: ServicoProfissional) => {
    setForm({
      nome: svc.nome,
      publicoAlvo: svc.publicoAlvo,
      orcamentoAcessivel: svc.orcamentoAcessivel,
    });
    setEditingId(svc.id || null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) return;

    try {
      const payload = {
        profissionalId: profUid,
        profissionalNome: profile.name || "Profissional",
        nome: form.nome.trim(),
        publicoAlvo: form.publicoAlvo,
        orcamentoAcessivel: form.orcamentoAcessivel,
        updatedAt: serverTimestamp(),
      };

      if (editingId) {
        await updateDoc(doc(db, "servicos_profissionais", editingId), payload);
      } else {
        await addDoc(collection(db, "servicos_profissionais"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }

      setIsModalOpen(false);
      setForm({ nome: "", publicoAlvo: "Para pessoas", orcamentoAcessivel: false });
      setEditingId(null);
    } catch (error) {
      console.error("Erro ao salvar serviço profissional:", error);
      alert("Houve um erro ao salvar o serviço. Por favor, tente novamente.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir este serviço de sua grade?")) return;
    try {
      await deleteDoc(doc(db, "servicos_profissionais", id));
    } catch (error) {
      console.error("Erro ao excluir serviço profissional:", error);
      alert("Erro ao excluir serviço.");
    }
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Header card */}
      <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-soft flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-serif text-2xl text-forest flex items-center gap-3">
            <Briefcase className="w-6 h-6 text-sun-dark" />
            Meus Serviços Oferecidos
          </h2>
          <p className="text-xs text-forest/60">
            Cadastre os serviços que você realiza para que fiquem visíveis no seu perfil público e para a equipe de triagem.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="w-full sm:w-auto px-5 py-3 bg-sun text-forest hover:bg-sun-dark text-sm font-semibold rounded-full transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Cadastrar Novo Serviço
        </button>
      </div>

      {/* Services List */}
      <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-soft">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-8 h-8 border-3 border-forest border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-forest/60">Carregando seus serviços...</p>
          </div>
        ) : servicos.length === 0 ? (
          <div className="text-center py-12 flex flex-col items-center justify-center gap-4 bg-warm/20 rounded-2xl border border-dashed border-soft/80">
            <div className="w-12 h-12 rounded-full bg-warm flex items-center justify-center text-lg">💼</div>
            <div className="max-w-md">
              <h4 className="font-serif text-lg font-medium text-forest">Nenhum serviço cadastrado</h4>
              <p className="text-xs text-forest/60 mt-1">
                Você ainda não cadastrou nenhum serviço específico. Clique no botão acima para adicionar suas especialidades, mentorias ou atendimentos.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-soft text-forest/50 text-[10px] uppercase font-bold tracking-wider">
                  <th className="pb-3 pl-2">Nome do Serviço</th>
                  <th className="pb-3">Público-Alvo</th>
                  <th className="pb-3">Orçamento Acessível</th>
                  <th className="pb-3 text-right pr-2">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-soft/50 text-sm">
                {servicos.map((svc) => (
                  <tr key={svc.id} className="hover:bg-warm/10 transition-colors">
                    <td className="py-4 pl-2 font-serif font-semibold text-forest text-base">
                      {svc.nome}
                    </td>
                    <td className="py-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-warm rounded-full text-xs font-semibold text-forest">
                        <Users className="w-3.5 h-3.5 text-sun-dark" />
                        {svc.publicoAlvo}
                      </span>
                    </td>
                    <td className="py-4">
                      {svc.orcamentoAcessivel ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <Check className="w-3.5 h-3.5" /> Sim
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-50 text-gray-500 border border-gray-100">
                          Não
                        </span>
                      )}
                    </td>
                    <td className="py-4 text-right pr-2">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(svc)}
                          className="p-1.5 text-forest/70 hover:text-sun-dark hover:bg-warm rounded-lg transition-all"
                          title="Editar"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => svc.id && handleDelete(svc.id)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Cadastro/Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-forest/25 backdrop-blur-xs py-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-soft overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-6 py-4 flex justify-between items-center border-b border-soft bg-warm/50">
              <h3 className="font-serif text-xl text-forest font-semibold">
                {editingId ? "Editar Serviço" : "Cadastrar Novo Serviço"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-forest/5 rounded-full text-forest/60 hover:text-forest transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
              {/* Nome do Serviço */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs uppercase font-bold tracking-wider text-forest/60">
                  Nome do Serviço <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Psicoterapia Individual, Palestra de Saúde Mental"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-all text-forest"
                />
              </div>

              {/* Público-alvo */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs uppercase font-bold tracking-wider text-forest/60">
                  Público Alvo <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.publicoAlvo}
                  onChange={(e) => setForm({ ...form, publicoAlvo: e.target.value as any })}
                  className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-all text-forest"
                >
                  <option value="Para pessoas">Para pessoas</option>
                  <option value="Para Psicólogos">Para Psicólogos</option>
                  <option value="Para Psicólogos e Terapeutas">Para Psicólogos e Terapeutas</option>
                  <option value="Para Empresas">Para Empresas</option>
                </select>
              </div>

              {/* Orçamento Acessível */}
              <div className="p-4 bg-warm/30 border border-soft/60 rounded-2xl flex items-start gap-3">
                <input
                  type="checkbox"
                  id="orcamentoAcessivel"
                  checked={form.orcamentoAcessivel}
                  onChange={(e) => setForm({ ...form, orcamentoAcessivel: e.target.checked })}
                  className="mt-1 h-4.5 w-4.5 rounded-sm border-soft text-forest focus:ring-forest cursor-pointer"
                />
                <div className="flex flex-col gap-1 cursor-pointer">
                  <label htmlFor="orcamentoAcessivel" className="text-sm font-semibold text-forest select-none cursor-pointer">
                    Disponibilizar serviço para orçamento acessível ao público da plataforma
                  </label>
                  <p className="text-[11px] text-forest/60">
                    Ao ativar esta opção, o público geral da plataforma poderá solicitar orçamentos sociais ou acessíveis para este serviço específico.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 border border-soft hover:bg-warm rounded-xl font-semibold text-sm text-forest transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!form.nome.trim()}
                  className="flex-1 py-3 bg-sun hover:bg-sun-dark text-forest font-bold rounded-xl text-sm transition-colors disabled:opacity-50"
                >
                  {editingId ? "Salvar Alterações" : "Cadastrar Serviço"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
