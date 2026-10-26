import React, { useState, useEffect } from "react";
import {
  User,
  Building2,
  Banknote,
  Plus,
  Edit3,
  Trash2,
  Check,
  X,
  Star,
  ShieldCheck,
  EyeOff,
  Landmark,
  AlertCircle,
} from "lucide-react";
import {
  PerfilFaturamentoItem,
  SubtipoPerfilFaturamento,
  ViaFaturamento,
} from "../types/faturamento";
import { formatCnpj, isValidCnpj, getCnpjValidationError } from "../utils/formatters";

interface PerfisFaturamentoPanelProps {
  perfis: PerfilFaturamentoItem[];
  onSavePerfis: (novosPerfis: PerfilFaturamentoItem[]) => Promise<void> | void;
  profissionalNomePadrao?: string;
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
  compact?: boolean;
}

const CNAE_SUGESTOES = [
  { codigo: "8650-0/03", label: "8650-0/03 — Psicologia e Psicanálise" },
  { codigo: "8599-6/04", label: "8599-6/04 — Treinamento e Desenvolvimento Profissional" },
  { codigo: "7020-4/00", label: "7020-4/00 — Consultoria em Gestão Empresarial" },
  { codigo: "8690-9/01", label: "8690-9/01 — Práticas Integrativas e Complementares" },
];

export const PerfisFaturamentoPanel: React.FC<PerfisFaturamentoPanelProps> = ({
  perfis,
  onSavePerfis,
  profissionalNomePadrao = "",
  showToast,
  compact = false,
}) => {
  const [listaLocal, setListaLocal] = useState<PerfilFaturamentoItem[]>(perfis);
  const [abaAtiva, setAbaAtiva] = useState<"PF" | "PJ">("PF");
  const [editandoItem, setEditandoItem] = useState<PerfilFaturamentoItem | null>(null);
  const [criandoNovo, setCriandoNovo] = useState<boolean>(false);
  const [salvando, setSalvando] = useState<boolean>(false);
  const [itemParaExcluir, setItemParaExcluir] = useState<PerfilFaturamentoItem | null>(null);

  useEffect(() => {
    setListaLocal(perfis);
  }, [perfis]);

  const perfisPF = listaLocal.filter((p) => p.via === "PF");
  const perfisPJ = listaLocal.filter((p) => p.via === "PJ");
  const jaTemCaixaFisico = perfisPF.some((p) => p.subtipo === "dinheiro_fisico");

  const formatCpfMask = (raw: string) => {
    const d = raw.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  };

  const formatCnpjMask = (raw: string) => formatCnpj(raw);

  const iniciarNovoPerfil = (via: ViaFaturamento, subtipo: SubtipoPerfilFaturamento) => {
    setAbaAtiva(via);
    setCriandoNovo(true);
    if (subtipo === "dinheiro_fisico") {
      setEditandoItem({
        id: `pf_caixa_${Date.now()}`,
        via: "PF",
        subtipo: "dinheiro_fisico",
        apelido: "Caixa / Dinheiro Físico",
        padrao: listaLocal.length === 0,
        declararIr: false,
        titularNome: profissionalNomePadrao,
        cpf: "",
        chavePix: "",
      });
    } else if (via === "PF") {
      setEditandoItem({
        id: `pf_${Date.now()}`,
        via: "PF",
        subtipo: "conta_cpf",
        apelido: perfisPF.length === 0 ? "CPF Principal" : `Conta CPF ${perfisPF.length + 1}`,
        padrao: listaLocal.length === 0,
        declararIr: true,
        titularNome: profissionalNomePadrao,
        cpf: "",
        chavePix: "",
        bancoNome: "",
      });
    } else {
      setEditandoNovoPJ();
    }
  };

  const setEditandoNovoPJ = () => {
    setEditandoItem({
      id: `pj_${Date.now()}`,
      via: "PJ",
      subtipo: "empresa_cnpj",
      apelido: perfisPJ.length === 0 ? "Clínica / Empresa Principal" : `Empresa ${perfisPJ.length + 1}`,
      padrao: listaLocal.length === 0,
      declararIr: false,
      razaoSocial: "",
      nomeFantasia: "",
      cnpj: "",
      inscricaoMunicipal: "",
      cnae: "8650-0/03",
      enderecoPJ: "",
      chavePixPJ: "",
      bancoNome: "",
      bancoAgencia: "",
      bancoConta: "",
    });
  };

  const persistirLista = async (novaLista: PerfilFaturamentoItem[], msgSucesso?: string) => {
    if (novaLista.length > 0 && !novaLista.some((p) => p.padrao)) {
      novaLista[0] = { ...novaLista[0], padrao: true };
    }
    setListaLocal(novaLista);
    setSalvando(true);
    try {
      await onSavePerfis(novaLista);
      if (msgSucesso) showToast(msgSucesso, "success");
    } catch (err) {
      console.error("Erro ao salvar perfis de faturamento:", err);
      showToast("Erro ao salvar perfis de faturamento.", "error");
    } finally {
      setSalvando(false);
    }
  };

  const handleSalvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editandoItem) return;

    if (!editandoItem.apelido?.trim()) {
      showToast("Informe uma identificação para este perfil.", "info");
      return;
    }

    if (editandoItem.via === "PJ" && !editandoItem.razaoSocial?.trim() && !editandoItem.cnpj?.trim()) {
      showToast("Para perfil PJ, informe ao menos a Razão Social ou o CNPJ.", "info");
      return;
    }

    if (editandoItem.via === "PJ" && editandoItem.cnpj?.trim()) {
      const cnpjErr = getCnpjValidationError(editandoItem.cnpj, false);
      if (cnpjErr) {
        showToast(cnpjErr, "error");
        return;
      }
    }

    const normalizado: PerfilFaturamentoItem = {
      ...editandoItem,
      apelido: editandoItem.apelido.trim(),
      cnpj: editandoItem.via === "PJ" && editandoItem.cnpj?.trim() ? formatCnpj(editandoItem.cnpj) : editandoItem.cnpj,
      declararIr: editandoItem.via === "PJ" ? false : Boolean(editandoItem.declararIr),
      nomeFantasia:
        editandoItem.via === "PJ"
          ? editandoItem.nomeFantasia?.trim() || editandoItem.apelido.trim()
          : undefined,
    };

    let novaLista: PerfilFaturamentoItem[];
    if (criandoNovo) {
      novaLista = [...listaLocal, normalizado];
    } else {
      novaLista = listaLocal.map((item) => (item.id === normalizado.id ? normalizado : item));
    }

    if (normalizado.padrao) {
      novaLista = novaLista.map((item) => ({
        ...item,
        padrao: item.id === normalizado.id,
      }));
    }

    await persistirLista(
      novaLista,
      criandoNovo ? "Novo perfil de faturamento adicionado!" : "Perfil de faturamento atualizado!"
    );
    setEditandoItem(null);
    setCriandoNovo(false);
  };

  const handleDefinirPadrao = async (id: string) => {
    const novaLista = listaLocal.map((item) => ({
      ...item,
      padrao: item.id === id,
    }));
    await persistirLista(novaLista, "Perfil padrão de faturamento atualizado!");
  };

  const handleToggleIrDireto = async (id: string) => {
    const novaLista = listaLocal.map((item) => {
      if (item.id !== id || item.via === "PJ") return item;
      return { ...item, declararIr: !item.declararIr };
    });
    await persistirLista(novaLista, "Regra de base IRPF atualizada neste perfil!");
  };

  const handleConfirmarExclusao = async () => {
    if (!itemParaExcluir) return;
    if (listaLocal.length <= 1) {
      showToast("É necessário manter ao menos um perfil de faturamento ativo.", "info");
      setItemParaExcluir(null);
      return;
    }
    const filtrada = listaLocal.filter((p) => p.id !== itemParaExcluir.id);
    if (!filtrada.some((p) => p.padrao) && filtrada.length > 0) {
      filtrada[0] = { ...filtrada[0], padrao: true };
    }
    await persistirLista(filtrada, `Perfil "${itemParaExcluir.apelido}" removido.`);
    setItemParaExcluir(null);
  };

  return (
    <div className="space-y-4">
      {/* Seletor de Via + Ações Rápidas */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="inline-flex items-center gap-1 p-1 bg-warm/70 rounded-xl border border-soft">
          <button
            type="button"
            onClick={() => {
              setAbaAtiva("PF");
              setEditandoItem(null);
              setCriandoNovo(false);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
              abaAtiva === "PF"
                ? "bg-white text-forest shadow-2xs border border-soft"
                : "text-forest/65 hover:text-forest"
            }`}
          >
            <User className="w-3.5 h-3.5 text-emerald-700" />
            <span>Via CPF & Espécie ({perfisPF.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAbaAtiva("PJ");
              setEditandoItem(null);
              setCriandoNovo(false);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
              abaAtiva === "PJ"
                ? "bg-white text-forest shadow-2xs border border-soft"
                : "text-forest/65 hover:text-forest"
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-blue-700" />
            <span>Via CNPJ / Empresas ({perfisPJ.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {abaAtiva === "PF" ? (
            <>
              {!jaTemCaixaFisico && (
                <button
                  type="button"
                  onClick={() => iniciarNovoPerfil("PF", "dinheiro_fisico")}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Banknote className="w-3.5 h-3.5 text-amber-700" />
                  <span>+ Caixa Dinheiro Físico (Sem IR)</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => iniciarNovoPerfil("PF", "conta_cpf")}
                className="px-3 py-1.5 bg-forest hover:bg-forest/90 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5 text-sun" />
                <span>+ Nova Conta CPF</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => iniciarNovoPerfil("PJ", "empresa_cnpj")}
              className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Nova Empresa (CNPJ)</span>
            </button>
          )}
        </div>
      </div>

      {/* Formulário Inline de Criação / Edição */}
      {editandoItem && (
        <form
          onSubmit={handleSalvarEdicao}
          className="p-4 sm:p-5 bg-warm/35 rounded-2xl border border-soft space-y-4 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between pb-2.5 border-b border-soft">
            <div className="flex items-center gap-2">
              {editandoItem.via === "PJ" ? (
                <Building2 className="w-4 h-4 text-blue-700" />
              ) : editandoItem.subtipo === "dinheiro_fisico" ? (
                <Banknote className="w-4 h-4 text-amber-700" />
              ) : (
                <User className="w-4 h-4 text-emerald-700" />
              )}
              <h4 className="font-bold text-xs sm:text-sm text-forest">
                {criandoNovo ? "Novo Perfil de Recebimento" : `Editar Perfil: ${editandoItem.apelido}`}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditandoItem(null);
                setCriandoNovo(false);
              }}
              className="p-1 text-forest/50 hover:text-forest rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {editandoItem.via === "PF" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-forest/75 mb-1">
                  Nome / Apelido do Perfil *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: CPF Nubank, Conta Secundária, Caixa Espécie..."
                  value={editandoItem.apelido || ""}
                  onChange={(e) =>
                    setEditandoItem({ ...editandoItem, apelido: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-soft rounded-xl text-forest focus:border-forest outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-forest/75 mb-1">
                  Subtipo de Recebimento
                </label>
                <select
                  value={editandoItem.subtipo}
                  onChange={(e) => {
                    const novoSub = e.target.value as SubtipoPerfilFaturamento;
                    setEditandoItem({
                      ...editandoItem,
                      subtipo: novoSub,
                      declararIr: novoSub === "dinheiro_fisico" ? false : editandoItem.declararIr,
                    });
                  }}
                  className="w-full px-3 py-2 bg-white border border-soft rounded-xl text-forest focus:border-forest outline-none"
                >
                  <option value="conta_cpf">Conta Bancária / Pix (CPF)</option>
                  <option value="dinheiro_fisico">Dinheiro Físico / Espécie (Caixa)</option>
                </select>
              </div>

              {editandoItem.subtipo === "conta_cpf" && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-forest/75 mb-1">
                      Nome do Titular da Conta
                    </label>
                    <input
                      type="text"
                      placeholder="Nome completo do titular deste CPF"
                      value={editandoItem.titularNome || ""}
                      onChange={(e) =>
                        setEditandoItem({ ...editandoItem, titularNome: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-white border border-soft rounded-xl text-forest focus:border-forest outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-forest/75 mb-1">
                      CPF Vinculado
                    </label>
                    <input
                      type="text"
                      placeholder="000.000.000-00"
                      value={editandoItem.cpf || ""}
                      onChange={(e) =>
                        setEditandoItem({
                          ...editandoItem,
                          cpf: formatCpfMask(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-soft rounded-xl text-forest font-mono tabular-nums focus:border-forest outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-forest/75 mb-1">
                      Chave Pix desta Conta
                    </label>
                    <input
                      type="text"
                      placeholder="CPF, celular, e-mail ou chave aleatória"
                      value={editandoItem.chavePix || ""}
                      onChange={(e) =>
                        setEditandoItem({ ...editandoItem, chavePix: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-white border border-soft rounded-xl text-forest focus:border-forest outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-forest/75 mb-1">
                      Instituição / Banco (opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Itaú, Nubank, Banco do Brasil..."
                      value={editandoItem.bancoNome || ""}
                      onChange={(e) =>
                        setEditandoItem({ ...editandoItem, bancoNome: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-white border border-soft rounded-xl text-forest focus:border-forest outline-none"
                    />
                  </div>
                </>
              )}

              {/* Controle de Declaração no IRPF / Receita Saúde */}
              <div className="sm:col-span-2 p-3 bg-white rounded-xl border border-soft flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="font-bold text-forest block text-xs">
                    Considerar na base de IRPF / Receita Saúde (Carnê-Leão)?
                  </span>
                  <span className="text-[11px] text-forest/65 block">
                    {editandoItem.declararIr
                      ? "Ativado: sessões recebidas por este perfil entram na apuração do Receita Saúde / IRPF."
                      : "Desativado: valores somam no seu Caixa Gerencial real, mas ficam fora da exportação de IRPF."}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setEditandoItem({
                      ...editandoItem,
                      declararIr: !editandoItem.declararIr,
                    })
                  }
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                    editandoItem.declararIr
                      ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                      : "bg-amber-50 text-amber-900 border-amber-300"
                  }`}
                >
                  {editandoItem.declararIr ? (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Sim • Declarar no IR</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5 text-amber-700" />
                      <span>Não • Controle Interno (Sem IR)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-forest/75 mb-1">
                  Nome Fantasia / Identificação Curta *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Clínica Silva • Consultoria Silva B2B"
                  value={editandoItem.apelido || ""}
                  onChange={(e) =>
                    setEditandoItem({
                      ...editandoItem,
                      apelido: e.target.value,
                      nomeFantasia: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-white border border-soft rounded-xl text-forest focus:border-forest outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-forest/75 mb-1">
                  CNPJ *
                </label>
                {(() => {
                  const rawCnpj = editandoItem.cnpj || "";
                  const digits = rawCnpj.replace(/\D/g, "");
                  const valid = isValidCnpj(rawCnpj);
                  const err = digits.length === 14 ? getCnpjValidationError(rawCnpj, false) : null;
                  return (
                    <>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={18}
                        placeholder="00.000.000/0001-00"
                        value={rawCnpj}
                        onChange={(e) =>
                          setEditandoItem({
                            ...editandoItem,
                            cnpj: formatCnpjMask(e.target.value),
                          })
                        }
                        className={`w-full px-3 py-2 border rounded-xl text-forest font-mono tabular-nums outline-none transition-colors ${
                          err
                            ? "bg-rose-50/50 border-rose-400 focus:border-rose-500"
                            : valid
                            ? "bg-emerald-50/30 border-emerald-400 focus:border-emerald-600"
                            : "bg-white border-soft focus:border-forest"
                        }`}
                      />
                      {err ? (
                        <span className="text-[11px] text-rose-600 font-medium block mt-1">{err}</span>
                      ) : valid ? (
                        <span className="text-[11px] text-emerald-700 font-medium block mt-1">CNPJ válido</span>
                      ) : null}
                    </>
                  );
                })()}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-forest/75 mb-1">
                  Razão Social Completa *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Silva Psicologia e Treinamentos Corporativos LTDA"
                  value={editandoItem.razaoSocial || ""}
                  onChange={(e) =>
                    setEditandoItem({ ...editandoItem, razaoSocial: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-soft rounded-xl text-forest focus:border-forest outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-forest/75 mb-1">
                  Inscrição Municipal (IM)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 123456-7"
                  value={editandoItem.inscricaoMunicipal || ""}
                  onChange={(e) =>
                    setEditandoItem({
                      ...editandoItem,
                      inscricaoMunicipal: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-white border border-soft rounded-xl text-forest font-mono tabular-nums focus:border-forest outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-forest/75 mb-1">
                  CNAE Principal de Faturamento
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="8650-0/03"
                    value={editandoItem.cnae || ""}
                    onChange={(e) =>
                      setEditandoItem({ ...editandoItem, cnae: e.target.value })
                    }
                    className="w-28 px-2.5 py-2 bg-white border border-soft rounded-xl text-forest font-mono tabular-nums focus:border-forest outline-none shrink-0"
                  />
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        setEditandoItem({ ...editandoItem, cnae: e.target.value });
                      }
                    }}
                    className="flex-1 px-2 py-2 bg-white border border-soft rounded-xl text-forest/80 focus:border-forest outline-none min-w-0"
                  >
                    <option value="">Sugestões CNAE...</option>
                    {CNAE_SUGESTOES.map((c) => (
                      <option key={c.codigo} value={c.codigo}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-forest/75 mb-1">
                  Chave Pix PJ
                </label>
                <input
                  type="text"
                  placeholder="CNPJ, e-mail financeiro ou chave aleatória"
                  value={editandoItem.chavePixPJ || ""}
                  onChange={(e) =>
                    setEditandoItem({ ...editandoItem, chavePixPJ: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-soft rounded-xl text-forest focus:border-forest outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-forest/75 mb-1">
                  Endereço Fiscal / Cidade-UF
                </label>
                <input
                  type="text"
                  placeholder="Ex: Av. Paulista, 1000 - São Paulo/SP"
                  value={editandoItem.enderecoPJ || ""}
                  onChange={(e) =>
                    setEditandoItem({ ...editandoItem, enderecoPJ: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-soft rounded-xl text-forest focus:border-forest outline-none"
                />
              </div>

              <div className="sm:col-span-2 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-forest/55 flex items-center gap-1.5 mb-2">
                  <Landmark className="w-3.5 h-3.5 text-forest/50" />
                  Dados Bancários para Faturas Corporativas TED / Boleto (Opcional)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    placeholder="Banco (ex: 341 - Itaú, Cora, Inter)"
                    value={editandoItem.bancoNome || ""}
                    onChange={(e) =>
                      setEditandoItem({ ...editandoItem, bancoNome: e.target.value })
                    }
                    className="px-3 py-2 bg-white border border-soft rounded-xl text-forest focus:border-forest outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Agência (ex: 0001)"
                    value={editandoItem.bancoAgencia || ""}
                    onChange={(e) =>
                      setEditandoItem({ ...editandoItem, bancoAgencia: e.target.value })
                    }
                    className="px-3 py-2 bg-white border border-soft rounded-xl text-forest font-mono tabular-nums focus:border-forest outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Conta Corrente (ex: 12345-6)"
                    value={editandoItem.bancoConta || ""}
                    onChange={(e) =>
                      setEditandoItem({ ...editandoItem, bancoConta: e.target.value })
                    }
                    className="px-3 py-2 bg-white border border-soft rounded-xl text-forest font-mono tabular-nums focus:border-forest outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-soft">
            <label className="inline-flex items-center gap-2 text-xs text-forest cursor-pointer select-none">
              <input
                type="checkbox"
                checked={Boolean(editandoItem.padrao)}
                onChange={(e) =>
                  setEditandoItem({ ...editandoItem, padrao: e.target.checked })
                }
                className="rounded border-soft text-forest focus:ring-forest"
              />
              <span className="font-medium">Definir como perfil padrão para novos cadastros</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditandoItem(null);
                  setCriandoNovo(false);
                }}
                className="px-3.5 py-2 text-xs font-semibold text-forest/70 hover:text-forest rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="px-4 py-2 bg-forest hover:bg-forest/90 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{salvando ? "Salvando..." : "Salvar Perfil"}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Listagem de Perfis da Via Selecionada */}
      {abaAtiva === "PF" ? (
        perfisPF.length === 0 ? (
          <div className="p-6 text-center bg-white rounded-2xl border border-dashed border-soft space-y-2">
            <p className="text-xs font-semibold text-forest/75">
              Nenhum perfil Via CPF ou Dinheiro Físico cadastrado.
            </p>
            <button
              type="button"
              onClick={() => iniciarNovoPerfil("PF", "conta_cpf")}
              className="px-3.5 py-1.5 bg-forest text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              + Cadastrar Conta CPF
            </button>
          </div>
        ) : (
          <div className={`grid grid-cols-1 ${compact ? "" : "md:grid-cols-2"} gap-3`}>
            {perfisPF.map((p) => {
              const isCaixa = p.subtipo === "dinheiro_fisico";
              return (
                <div
                  key={p.id}
                  className="p-3.5 sm:p-4 bg-white rounded-2xl border border-soft hover:border-forest/30 transition-colors flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isCaixa
                            ? "bg-amber-50 text-amber-800 border border-amber-200"
                            : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        }`}
                      >
                        {isCaixa ? (
                          <Banknote className="w-4 h-4" />
                        ) : (
                          <User className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="font-bold text-xs sm:text-sm text-forest truncate">
                            {p.apelido}
                          </h5>
                          {p.padrao && (
                            <span className="text-[11px] font-semibold text-emerald-800">
                              · Padrão
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-forest/65 flex items-center gap-1.5 flex-wrap mt-0.5 tabular-nums">
                          {isCaixa ? (
                            <span>Recebimento em espécie no consultório</span>
                          ) : (
                            <>
                              <span>{p.titularNome || "Titular não informado"}</span>
                              {p.cpf && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="font-mono">CPF {p.cpf}</span>
                                </>
                              )}
                            </>
                          )}
                        </div>
                        {p.chavePix && !isCaixa && (
                          <p className="text-[11px] text-forest/60 mt-1 truncate">
                            Pix: <span className="font-mono text-forest/85">{p.chavePix}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setCriandoNovo(false);
                          setEditandoItem({ ...p });
                        }}
                        className="p-1.5 text-forest/60 hover:text-forest hover:bg-warm rounded-lg transition-colors cursor-pointer"
                        title="Editar este perfil"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {listaLocal.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setItemParaExcluir(p)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Remover este perfil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-soft/70 flex items-center justify-between gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => handleToggleIrDireto(p.id)}
                      className={`font-semibold flex items-center gap-1 cursor-pointer hover:underline ${
                        p.declararIr ? "text-emerald-800" : "text-amber-800"
                      }`}
                      title="Clique para alternar se este perfil compõe a base do Receita Saúde / IRPF"
                    >
                      {p.declararIr ? (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Entra no IRPF / Receita Saúde</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5 text-amber-700" />
                          <span>Fora do IRPF (Caixa Gerencial)</span>
                        </>
                      )}
                    </button>

                    {!p.padrao && (
                      <button
                        type="button"
                        onClick={() => handleDefinirPadrao(p.id)}
                        className="text-forest/60 hover:text-forest font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Star className="w-3 h-3" />
                        <span>Tornar padrão</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : perfisPJ.length === 0 ? (
        <div className="p-6 text-center bg-white rounded-2xl border border-dashed border-soft space-y-2.5">
          <Building2 className="w-7 h-7 text-blue-700/40 mx-auto" />
          <p className="text-xs font-semibold text-forest">
            Nenhuma empresa (CNPJ) cadastrada ainda.
          </p>
          <p className="text-[11px] text-forest/60 max-w-md mx-auto">
            Cadastre uma ou mais empresas para emitir espelhos de NFS-e, recibos PJ e separar faturamentos clínicos e corporativos B2B.
          </p>
          <button
            type="button"
            onClick={() => iniciarNovoPerfil("PJ", "empresa_cnpj")}
            className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            + Cadastrar Primeira Empresa (CNPJ)
          </button>
        </div>
      ) : (
        <div className={`grid grid-cols-1 ${compact ? "" : "md:grid-cols-2"} gap-3`}>
          {perfisPJ.map((p) => (
            <div
              key={p.id}
              className="p-3.5 sm:p-4 bg-white rounded-2xl border border-soft hover:border-blue-300 transition-colors flex flex-col justify-between gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h5 className="font-bold text-xs sm:text-sm text-forest truncate">
                        {p.apelido}
                      </h5>
                      {p.padrao && (
                        <span className="text-[11px] font-semibold text-blue-800">
                          · Padrão
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-forest/75 truncate mt-0.5">
                      {p.razaoSocial || "Razão Social pendente"}
                    </p>
                    <div className="text-[11px] text-forest/60 flex items-center gap-1.5 flex-wrap mt-0.5 font-mono tabular-nums">
                      <span>CNPJ {p.cnpj || "Não informado"}</span>
                      {p.cnae && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>CNAE {p.cnae}</span>
                        </>
                      )}
                    </div>
                    {p.chavePixPJ && (
                      <p className="text-[11px] text-forest/60 mt-1 truncate">
                        Pix PJ: <span className="font-mono text-forest/85">{p.chavePixPJ}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setCriandoNovo(false);
                      setEditandoItem({ ...p });
                    }}
                    className="p-1.5 text-forest/60 hover:text-forest hover:bg-warm rounded-lg transition-colors cursor-pointer"
                    title="Editar esta empresa"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  {listaLocal.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setItemParaExcluir(p)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Remover esta empresa"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-2.5 border-t border-soft/70 flex items-center justify-between gap-2 text-[11px]">
                <span className="text-blue-900/80 font-medium">
                  Tributação PJ (NFS-e) · Fora do Carnê-Leão PF
                </span>
                {!p.padrao && (
                  <button
                    type="button"
                    onClick={() => handleDefinirPadrao(p.id)}
                    className="text-forest/60 hover:text-forest font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Star className="w-3 h-3" />
                    <span>Tornar padrão</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal In-App de Confirmação de Exclusão */}
      {itemParaExcluir && (
        <div className="fixed inset-0 z-[90] bg-forest/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-soft shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-serif font-bold text-base text-forest">
                  Remover perfil "{itemParaExcluir.apelido}"?
                </h4>
                <p className="text-xs text-forest/70 mt-1 leading-relaxed">
                  Os lançamentos antigos permanecerão íntegros no histórico, passando a usar o perfil padrão da via correspondente caso reimpressos.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-soft">
              <button
                type="button"
                onClick={() => setItemParaExcluir(null)}
                className="px-4 py-2 text-xs font-semibold text-forest/70 hover:text-forest rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarExclusao}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Confirmar Remoção
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface PerfisFaturamentoManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  perfis: PerfilFaturamentoItem[];
  onSavePerfis: (novosPerfis: PerfilFaturamentoItem[]) => Promise<void> | void;
  profissionalNomePadrao?: string;
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
}

export const PerfisFaturamentoManagerModal: React.FC<PerfisFaturamentoManagerModalProps> = ({
  isOpen,
  onClose,
  perfis,
  onSavePerfis,
  profissionalNomePadrao,
  showToast,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-forest/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-soft shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 bg-forest text-white flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-serif font-bold text-base sm:text-lg text-white">
              Perfis de Faturamento & Recebimento (CPF / Caixa / CNPJ)
            </h3>
            <p className="text-xs text-white/75 mt-0.5">
              Gerencie múltiplas contas CPF, caixa em dinheiro físico (sem IR) e empresas CNPJ
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto flex-1 bg-warm/20">
          <PerfisFaturamentoPanel
            perfis={perfis}
            onSavePerfis={onSavePerfis}
            profissionalNomePadrao={profissionalNomePadrao}
            showToast={showToast}
          />
        </div>

        <div className="px-6 py-3.5 bg-white border-t border-soft flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-forest hover:bg-forest/90 text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            Concluído
          </button>
        </div>
      </div>
    </div>
  );
};
