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

  // Colunas completas refletindo o formulário de cadastro do cliente externo
  const templateColumns = [
    {
      "Nome Completo": "Ex: Maria da Silva",
      "Nome Social": "",
      "E-mail": "maria@email.com",
      "Telefone / WhatsApp": "(11) 99999-9999",
      "Data de Nascimento": "01/01/1990",
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
      "Turno Preferido": "Noturno",
      "Dias Preferidos": "Segunda, Quarta",
      "Fonte de Indicação": "Redes Sociais",
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
      alert("Não há pacientes cadastrados para exportar.");
      return;
    }

    const exportData = pacientesExternos.map((p) => ({
      "Nome Completo": p.nomeCivil || p.nome || "",
      "Nome Social": p.nomeSocial || "",
      "E-mail": p.email || "",
      "Telefone / WhatsApp": p.telefone || "",
      "Data de Nascimento": p.dataNascimento || "",
      "CPF": p.cpf || "",
      "Gênero": p.genero || "",
      "Profissão": p.profissao || "",
      "Menor de Idade (Sim/Não)": p.isMenorIdade ? "Sim" : "Não",
      "Nome Responsável": p.responsavel?.nome || "",
      "Telefone Responsável": p.responsavel?.telefone || "",
      "CPF Responsável": p.responsavel?.cpf || "",
      "E-mail Responsável": p.responsavel?.email || "",
      "Parentesco": p.responsavel?.parentesco || "",
      "CEP": p.endereco?.cep || p.cep || "",
      "Logradouro": p.endereco?.logradouro || "",
      "Número": p.endereco?.numero || "",
      "Complemento": p.endereco?.complemento || "",
      "Bairro": p.endereco?.bairro || "",
      "Cidade": p.endereco?.cidade || p.cidade || "",
      "UF": p.endereco?.uf || p.uf || "",
      "Queixa Principal": p.queixaPrincipal || p.motivo || "",
      "Já fez terapia (Sim/Não)": p.terapiaAnterior || "",
      "Medicação (Sim/Não/Qual)": p.medicacao || "",
      "Contato Emergência Nome": p.contatoEmergencia?.nome || "",
      "Contato Emergência Telefone": p.contatoEmergencia?.telefone || "",
      "Modalidade (Online/Presencial)": p.modalidade || "online",
      "Turno Preferido": p.turnoPreferido || "",
      "Dias Preferidos": Array.isArray(p.diasPreferidos) ? p.diasPreferidos.join(", ") : (p.diasPreferidos || ""),
      "Fonte de Indicação": p.fonteIndicacao || "",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pacientes Externos");
    XLSX.writeFile(wb, `pacientes_externos_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profUid) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        let successCount = 0;
        for (const row of json as any[]) {
          const nome = row["Nome Completo"] || row["Nome"] || "";
          const email = row["E-mail"] || row["Email"] || "";
          const telefone = row["Telefone / WhatsApp"] || row["Telefone"] || "";

          if (!nome && !email) continue;

          const isMenor = String(row["Menor de Idade (Sim/Não)"] || "").toLowerCase().includes("sim");

          await addDoc(collection(db, "pacientes"), {
            nome: String(nome).trim(),
            nomeCivil: String(nome).trim(),
            nomeSocial: String(row["Nome Social"] || "").trim(),
            nomeDesejado: String(row["Nome Social"] || nome).trim(),
            email: String(email).trim(),
            telefone: String(telefone).trim(),
            dataNascimento: String(row["Data de Nascimento"] || "").trim(),
            cpf: String(row["CPF"] || "").trim(),
            genero: String(row["Gênero"] || "").trim(),
            profissao: String(row["Profissão"] || "").trim(),
            isMenorIdade: isMenor,

            responsavel: {
              nome: String(row["Nome Responsável"] || "").trim(),
              telefone: String(row["Telefone Responsável"] || "").trim(),
              cpf: String(row["CPF Responsável"] || "").trim(),
              email: String(row["E-mail Responsável"] || "").trim(),
              parentesco: String(row["Parentesco"] || "").trim(),
            },

            endereco: {
              cep: String(row["CEP"] || "").trim(),
              logradouro: String(row["Logradouro"] || "").trim(),
              numero: String(row["Número"] || "").trim(),
              complemento: String(row["Complemento"] || "").trim(),
              bairro: String(row["Bairro"] || "").trim(),
              cidade: String(row["Cidade"] || "").trim(),
              uf: String(row["UF"] || "").trim(),
            },
            cep: String(row["CEP"] || "").trim(),
            cidade: String(row["Cidade"] || "").trim(),
            uf: String(row["UF"] || "").trim(),
            cidadeEstado: row["Cidade"] ? `${row["Cidade"]} - ${row["UF"] || ""}` : "",

            queixaPrincipal: String(row["Queixa Principal"] || "").trim(),
            motivo: String(row["Queixa Principal"] || "").trim(),
            terapiaAnterior: String(row["Já fez terapia (Sim/Não)"] || "").trim(),
            medicacao: String(row["Medicação (Sim/Não/Qual)"] || "").trim(),
            contatoEmergencia: {
              nome: String(row["Contato Emergência Nome"] || "").trim(),
              telefone: String(row["Contato Emergência Telefone"] || "").trim(),
            },

            modalidade: String(row["Modalidade (Online/Presencial)"] || "online").toLowerCase(),
            turnoPreferido: String(row["Turno Preferido"] || "").trim(),
            diasPreferidos: String(row["Dias Preferidos"] || "").split(",").map(s => s.trim()).filter(Boolean),
            fonteIndicacao: String(row["Fonte de Indicação"] || "Planilha Importada").trim(),

            tipo: "externo",
            profissionalId: profUid,
            createdAt: serverTimestamp(),
          });
          successCount++;
        }
        alert(`Importação concluída com sucesso! ${successCount} paciente(s) importado(s).`);
      } catch (err) {
        console.error("Erro na importação da planilha:", err);
        alert("Erro ao processar planilha. Verifique se o formato está correto.");
      } finally {
        setLoading(false);
        // Reset file input
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
