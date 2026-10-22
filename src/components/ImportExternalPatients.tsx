import React, { useState } from "react";
import * as XLSX from "xlsx";
import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Upload, Download } from "lucide-react";

export function ImportExternalPatients({ profUid }: { profUid: string | undefined }) {
  const [loading, setLoading] = useState(false);

  const handleDownloadTemplate = () => {
    const template = [
      { Nome: "Nome Completo", CPF: "000.000.000-00", Telefone: "(00) 00000-0000", Email: "exemplo@email.com" },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo");
    XLSX.writeFile(wb, "modelo_importacao_pacientes.xlsx");
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

        for (const row of json as any[]) {
          await addDoc(collection(db, "pacientes"), {
            nome: row.Nome || "",
            cpf: row.CPF || "",
            telefone: row.Telefone || "",
            email: row.Email || "",
            tipo: "externo",
            profissionalId: profUid,
            createdAt: serverTimestamp(),
          });
        }
        alert("Importação concluída!");
      } catch (err) {
        console.error(err);
        alert("Erro na importação.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="p-4 sm:p-5 bg-white rounded-2xl border border-soft shadow-xs">
      <h3 className="font-serif text-sm font-bold text-forest">Importar Pacientes Externos</h3>
      <p className="text-[11px] text-forest/60 mt-1">
        Faça o upload de uma planilha com os mesmos dados do formulário de cadastro.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="px-3 py-1.5 bg-warm border border-soft rounded-lg text-forest text-[11px] font-semibold flex items-center gap-1.5 hover:bg-warm/80 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Baixar Modelo
        </button>
        <label className="px-3 py-1.5 bg-forest text-white rounded-lg cursor-pointer hover:bg-forest/90 text-[11px] font-bold flex items-center gap-1.5 transition-colors">
          <Upload className="w-3.5 h-3.5" />
          <span>Importar Planilha</span>
          <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} disabled={loading} />
        </label>
      </div>
      {loading && <p className="mt-2 text-[10px] text-forest">Processando dados...</p>}
    </div>
  );
}
