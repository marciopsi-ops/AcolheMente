import React, { useState } from "react";
import * as XLSX from "xlsx";
import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Upload, Download, FileSpreadsheet } from "lucide-react";

interface ImportExternalPatientsProps {
  profUid: string | undefined;
  pacientesExternos?: any[];
}

export function ImportExternalPatients({ profUid, pacientesExternos = [] }: ImportExternalPatientsProps) {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  const extractEmergenciaParts = (p: any): { nome: string; telefone: string } => {
    if (p?.contatoEmergenciaObj && typeof p.contatoEmergenciaObj === "object") {
      return {
        nome: String(p.contatoEmergenciaObj.nome || "").trim(),
        telefone: String(p.contatoEmergenciaObj.telefone || "").trim(),
      };
    }
    const raw = p?.contatoEmergencia;
    if (raw && typeof raw === "object") {
      return {
        nome: String(raw.nome || "").trim(),
        telefone: String(raw.telefone || "").trim(),
      };
    }
    if (typeof raw === "string" && raw.trim()) {
      const m = raw.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
      if (m) {
        return { nome: m[1].trim(), telefone: m[2].trim() };
      }
      return { nome: raw.trim(), telefone: "" };
    }
    return { nome: "", telefone: "" };
  };

  // Colunas completas refletindo o formulário de cadastro do cliente externo
  const templateColumns = [
    {
      "Nome Completo": "Ex: Maria da Silva",
      "Nome Social": "",
      "E-mail": "maria@email.com",
      "Telefone / WhatsApp": "(11) 99999-9999",
      "Data de Nascimento": "1990-01-01",
      "CPF": "000.000.000-00",
      "Gênero": "Feminino",
      "Profissão": "Professora",
      "Menor de Idade (Sim/Não)": "Não",
      "Nome Responsável": "",
      "Telefone Responsável": "",
      "CPF Responsável": "",
      "E-mail Responsável": "",
      "Parentesco": "",
      "CEP": "01001-000",
      "Logradouro": "Rua Exemplo",
      "Número": "123",
      "Complemento": "Apto 42",
      "Bairro": "Centro",
      "Cidade": "São Paulo",
      "UF": "SP",
      "Queixa Principal": "Ansiedade e estresse no trabalho",
      "Já fez terapia (Sim/Não)": "Sim",
      "Medicação (Sim/Não/Qual)": "Não",
      "Contato Emergência Nome": "João Silva",
      "Contato Emergência Telefone": "(11) 98888-8888",
      "Modalidade (Online/Presencial)": "Online",
      "Turno Preferido": "Noite (18h às 21h)",
      "Dias Preferidos": "Segunda, Quarta",
      "Fonte de Indicação": "Instagram / Redes Sociais",
    },
  ];

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet(templateColumns);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo Cadastro Externo");
    XLSX.writeFile(wb, "modelo_cadastro_pacientes_externos.xlsx");
  };

  const handleExportPatients = () => {
    if (!pacientesExternos || pacientesExternos.length === 0) {
      setFeedback({ type: "info", text: "Não há pacientes cadastrados na carteira externa para exportar." });
      return;
    }

    const exportData = pacientesExternos.map((p) => {
      const emerg = extractEmergenciaParts(p);
      return {
        "Nome Completo": p.nomeCivil || p.nome || "",
        "Nome Social": p.nomeSocial || "",
        "E-mail": p.email || "",
        "Telefone / WhatsApp": p.telefone || "",
        "Data de Nascimento": p.dataNascimento || "",
        "CPF": p.cpf || "",
        "Gênero": p.genero || "",
        "Profissão": p.profissao || "",
        "Menor de Idade (Sim/Não)": p.isMenorIdade || p.menorIdade ? "Sim" : "Não",
        "Nome Responsável": p.responsavel?.nome || p.responsavelNome || "",
        "Telefone Responsável": p.responsavel?.telefone || p.responsavelTelefone || "",
        "CPF Responsável": p.responsavel?.cpf || p.responsavelCpf || "",
        "E-mail Responsável": p.responsavel?.email || p.responsavelEmail || "",
        "Parentesco": p.responsavel?.parentesco || p.responsavelParentesco || "",
        "CEP": p.endereco?.cep || p.cep || "",
        "Logradouro": p.endereco?.logradouro || p.logradouro || "",
        "Número": p.endereco?.numero || p.numero || "",
        "Complemento": p.endereco?.complemento || p.complemento || "",
        "Bairro": p.endereco?.bairro || p.bairro || "",
        "Cidade": p.endereco?.cidade || p.cidade || "",
        "UF": p.endereco?.uf || p.uf || "",
        "Queixa Principal": p.queixaPrincipal || p.motivo || "",
        "Já fez terapia (Sim/Não)": p.terapiaAnterior || "",
        "Medicação (Sim/Não/Qual)": p.medicacao || "",
        "Contato Emergência Nome": emerg.nome,
        "Contato Emergência Telefone": emerg.telefone,
        "Modalidade (Online/Presencial)": p.modalidade || "online",
        "Turno Preferido": p.turnoPreferido || "",
        "Dias Preferidos": Array.isArray(p.diasPreferidos)
          ? p.diasPreferidos.join(", ")
          : p.diasPreferidos || "",
        "Fonte de Indicação": p.fonteIndicacao || "",
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pacientes Externos");
    XLSX.writeFile(wb, `pacientes_externos_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
    setFeedback({
      type: "success",
      text: `Planilha exportada com ${pacientesExternos.length} paciente(s).`,
    });
  };

  const normalizeImportedDate = (raw: any): string => {
    const s = String(raw || "").trim();
    if (!s) return "";
    const brMatch = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (brMatch) {
      return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
    }
    return s;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profUid) return;

    setLoading(true);
    setFeedback(null);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        let successCount = 0;
        for (const row of json as any[]) {
          const nome = String(row["Nome Completo"] || row["Nome"] || "").trim();
          const email = String(row["E-mail"] || row["Email"] || "").trim();
          const telefone = String(row["Telefone / WhatsApp"] || row["Telefone"] || "").trim();

          if (!nome && !email) continue;

          const isMenor = String(row["Menor de Idade (Sim/Não)"] || "")
            .toLowerCase()
            .includes("sim");

          const cep = String(row["CEP"] || "").trim();
          const logradouro = String(row["Logradouro"] || "").trim();
          const numero = String(row["Número"] || "").trim();
          const complemento = String(row["Complemento"] || "").trim();
          const bairro = String(row["Bairro"] || "").trim();
          const cidade = String(row["Cidade"] || "").trim();
          const uf = String(row["UF"] || "").trim().toUpperCase();

          const enderecoCompleto = [
            logradouro ? `${logradouro}${numero ? `, ${numero}` : ""}` : "",
            complemento,
            bairro,
            cidade ? `${cidade}${uf ? ` - ${uf}` : ""}` : "",
          ]
            .filter(Boolean)
            .join(", ");

          const emergNome = String(row["Contato Emergência Nome"] || "").trim();
          const emergTel = String(row["Contato Emergência Telefone"] || "").trim();
          const contatoEmergenciaStr = emergNome
            ? emergTel
              ? `${emergNome} (${emergTel})`
              : emergNome
            : emergTel;

          const turnoPreferido = String(row["Turno Preferido"] || "").trim();
          const diasPreferidos = String(row["Dias Preferidos"] || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          const disponibilidade = [
            turnoPreferido ? `Turno: ${turnoPreferido}` : "",
            diasPreferidos.length > 0 ? `Dias: ${diasPreferidos.join(", ")}` : "",
          ]
            .filter(Boolean)
            .join(" | ");

          const respNome = String(row["Nome Responsável"] || "").trim();
          const respTel = String(row["Telefone Responsável"] || "").trim();
          const respCpf = String(row["CPF Responsável"] || "").trim();
          const respEmail = String(row["E-mail Responsável"] || "").trim();
          const respParentesco = String(row["Parentesco"] || "").trim();

          const rawModalidade = String(row["Modalidade (Online/Presencial)"] || "online")
            .trim()
            .toLowerCase();
          const modalidade = rawModalidade.includes("presencial") ? "presencial" : "online";

          await addDoc(collection(db, "pacientes"), {
            nome,
            nomeCivil: nome,
            nomeSocial: String(row["Nome Social"] || "").trim(),
            nomeDesejado: String(row["Nome Social"] || nome).trim(),
            email,
            telefone,
            dataNascimento: normalizeImportedDate(row["Data de Nascimento"]),
            cpf: String(row["CPF"] || "").trim(),
            genero: String(row["Gênero"] || "").trim(),
            profissao: String(row["Profissão"] || "").trim(),
            isMenorIdade: isMenor,
            menorIdade: isMenor,

            responsavel: {
              nome: respNome,
              telefone: respTel,
              cpf: respCpf,
              email: respEmail,
              parentesco: respParentesco,
            },
            responsavelNome: respNome,
            responsavelTelefone: respTel,
            responsavelCpf: respCpf,
            responsavelEmail: respEmail,
            responsavelParentesco: respParentesco,

            endereco: {
              cep,
              logradouro,
              numero,
              complemento,
              bairro,
              cidade,
              uf,
            },
            enderecoDetalhado: {
              cep,
              logradouro,
              numero,
              complemento,
              bairro,
              cidade,
              uf,
            },
            cep,
            logradouro,
            numero,
            complemento,
            bairro,
            cidade,
            uf,
            enderecoCompleto,
            cidadeEstado: cidade ? `${cidade}${uf ? ` - ${uf}` : ""}` : "",

            queixaPrincipal: String(row["Queixa Principal"] || "").trim(),
            motivo: String(row["Queixa Principal"] || "").trim(),
            terapiaAnterior: String(row["Já fez terapia (Sim/Não)"] || "").trim(),
            medicacao: String(row["Medicação (Sim/Não/Qual)"] || "").trim(),
            contatoEmergencia: contatoEmergenciaStr,
            contatoEmergenciaObj: {
              nome: emergNome,
              telefone: emergTel,
            },

            modalidade,
            turnoPreferido,
            diasPreferidos,
            disponibilidade,
            fonteIndicacao: String(row["Fonte de Indicação"] || "Planilha Importada").trim(),

            tipo: "externo",
            viaAcesso: "Carteira Externa",
            origem: "importacao_excel",
            status: "Em Atendimento",
            statusTratamento: "Em Atendimento",
            atribuicaoStatus: "Aceito",
            profissionalId: profUid,
            prontuarioClinico: [],
            historicoSessoes: [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          successCount++;
        }
        setFeedback({
          type: "success",
          text: `Importação concluída com sucesso! ${successCount} paciente(s) importado(s).`,
        });
      } catch (err) {
        console.error("Erro na importação da planilha:", err);
        setFeedback({
          type: "error",
          text: "Erro ao processar planilha. Verifique se as colunas seguem o modelo.",
        });
      } finally {
        setLoading(false);
        e.target.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="p-4 sm:p-5 bg-white rounded-2xl border border-soft shadow-xs flex flex-col gap-3">
      <div>
        <h3 className="font-serif text-sm font-bold text-forest">Importação & Exportação Completa de Pacientes</h3>
        <p className="text-[11px] text-forest/60 mt-0.5">
          A planilha reflete exatamente os mesmos campos do formulário de cadastro do cliente externo (dados pessoais, responsável, endereço, clínica, emergência e preferências).
        </p>
      </div>

      {feedback && (
        <div
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : feedback.type === "error"
              ? "bg-rose-50 text-rose-800 border-rose-200"
              : "bg-amber-50 text-amber-900 border-amber-200"
          }`}
        >
          {feedback.text}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="px-3 py-1.5 bg-warm border border-soft rounded-xl text-forest text-[11px] font-semibold flex items-center gap-1.5 hover:bg-warm/80 transition-colors cursor-pointer"
          title="Baixar modelo em branco com todas as colunas do formulário"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Baixar Modelo</span>
        </button>

        <button
          type="button"
          onClick={handleExportPatients}
          className="px-3 py-1.5 bg-warm border border-soft rounded-xl text-forest text-[11px] font-semibold flex items-center gap-1.5 hover:bg-warm/80 transition-colors cursor-pointer"
          title="Exportar pacientes cadastrados em formato compatível"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Exportar Planilha ({pacientesExternos.length})</span>
        </button>

        <label className="px-3 py-1.5 bg-forest text-white rounded-xl cursor-pointer hover:bg-forest/90 text-[11px] font-bold flex items-center gap-1.5 transition-colors shadow-xs">
          <Upload className="w-3.5 h-3.5" />
          <span>Importar Planilha</span>
          <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} disabled={loading} />
        </label>
      </div>

      {loading && <p className="text-[10px] text-forest font-medium animate-pulse">Processando planilha e gravando dados...</p>}
    </div>
  );
}
