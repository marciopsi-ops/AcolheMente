export interface ImportedProfissional {
  nome: string;
  email: string;
  telefone: string;
  crp: string;
  cpf: string;
  cidade: string;
  uf: string;
  especialidade: string;
  abordagem: string;
  anoFormacao: string;
  horasDisponiveis: string;
  publicosExperiencia: string[];
  publicosGosto: string[];
  outrosPublicosExperiencia: string;
  outrosPublicosGosto: string;
  motivacao: string;
}

export interface ParseResult {
  successCount: number;
  errorCount: number;
  data: ImportedProfissional[];
  errors: string[];
}

/**
 * Parses CSV text into raw records (array of string key-value objects)
 */
export function parseCSV(text: string): Record<string, string>[] {
  const lines: string[] = [];
  let currentLine = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === '\r') {
      // Ignore carriage returns
    } else if (char === '\n' && !inQuotes) {
      lines.push(currentLine);
      currentLine = "";
    } else {
      currentLine += char;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }

  if (lines.length < 2) return [];

  // Determine delimiter: , or ;
  const firstLine = lines[0];
  const countCommas = (firstLine.match(/,/g) || []).length;
  const countSemicolons = (firstLine.match(/;/g) || []).length;
  const delimiter = countSemicolons > countCommas ? ';' : ',';

  const splitRow = (row: string): string[] => {
    const result: string[] = [];
    let currentCell = "";
    let cellInQuotes = false;

    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      if (char === '"') {
        cellInQuotes = !cellInQuotes;
      } else if (char === delimiter && !cellInQuotes) {
        result.push(currentCell.trim());
        currentCell = "";
      } else {
        currentCell += char;
      }
    }
    result.push(currentCell.trim());
    return result;
  };

  const headers = splitRow(lines[0]).map(h => h.toLowerCase().trim().replace(/["']/g, ""));
  const records: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cells = splitRow(lines[i]);
    const record: Record<string, string> = {};
    headers.forEach((header, idx) => {
      let val = cells[idx] || "";
      // Remove enclosing quotes if present
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1);
      }
      record[header] = val;
    });
    records.push(record);
  }

  return records;
}

/**
 * Normalizes and maps raw key-value record to ImportedProfissional
 */
export function mapImportedRow(row: Record<string, any>): ImportedProfissional {
  const findValue = (keys: string[]): any => {
    for (const k of keys) {
      if (row[k] !== undefined) return row[k];
      const normalizedK = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      for (const rowKey of Object.keys(row)) {
        const normalizedRowKey = rowKey.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        if (normalizedRowKey === normalizedK) {
          return row[rowKey];
        }
      }
    }
    return undefined;
  };

  const nome = findValue(["nome", "nome completo", "name", "full name"]) || "";
  const email = findValue(["email", "e-mail", "mail"]) || "";
  const telefone = findValue(["telefone", "phone", "celular", "telephone", "contato"]) || "";
  const crp = findValue(["crp", "crm", "registro", "registro profissional"]) || "";
  const cpf = findValue(["cpf", "documento"]) || "";
  const cidade = findValue(["cidade", "city", "municipio"]) || "";
  const uf = findValue(["uf", "estado", "state"]) || "";
  const especialidade = findValue(["especialidade", "specialty", "area", "especialidades"]) || "";
  const abordagem = findValue(["abordagem", "approach", "linha teorica"]) || "";
  const anoFormacao = findValue(["anoFormacao", "ano de formacao", "ano de formação", "formacao", "graduation"]) || "";
  const horasDisponiveis = findValue(["horasDisponiveis", "horas", "disponibilidade", "horas disponiveis", "horas disponíveis"]) || "1 a 3 horas/mês";
  const motivacao = findValue(["motivacao", "motivo", "motivation", "por que"]) || "";

  // Helper to parse array
  const parseArray = (val: any): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    return String(val).split(/[;,|]/).map(s => s.trim()).filter(Boolean);
  };

  const publicosExperiencia = parseArray(findValue(["publicosExperiencia", "publicos experiencia", "públicos experiência", "experiencia"]));
  const publicosGosto = parseArray(findValue(["publicosGosto", "publicos gosto", "públicos gosto", "gosto"]));
  
  const outrosPublicosExperiencia = findValue(["outrosPublicosExperiencia", "outros publicos experiencia", "outros públicos experiência"]) || "";
  const outrosPublicosGosto = findValue(["outrosPublicosGosto", "outros publicos gosto", "outros públicos gosto"]) || "";

  return {
    nome: String(nome).trim(),
    email: String(email).trim(),
    telefone: String(telefone).trim(),
    crp: String(crp).trim(),
    cpf: String(cpf).trim(),
    cidade: String(cidade).trim(),
    uf: String(uf).trim(),
    especialidade: String(especialidade).trim(),
    abordagem: String(abordagem).trim(),
    anoFormacao: String(anoFormacao).trim(),
    horasDisponiveis: String(horasDisponiveis).trim(),
    publicosExperiencia,
    publicosGosto,
    outrosPublicosExperiencia,
    outrosPublicosGosto,
    motivacao: String(motivacao).trim(),
  };
}

/**
 * Parses and validates raw input list (either from JSON or parsed CSV)
 */
export function parseAndValidateData(rawData: any[]): ParseResult {
  const result: ParseResult = {
    successCount: 0,
    errorCount: 0,
    data: [],
    errors: [],
  };

  rawData.forEach((item, index) => {
    const mapped = mapImportedRow(item);
    const lineNum = index + 1;

    if (!mapped.nome) {
      result.errorCount++;
      result.errors.push(`Registro #${lineNum}: Nome está vazio.`);
      return;
    }

    if (!mapped.email) {
      result.errorCount++;
      result.errors.push(`Registro #${lineNum} (${mapped.nome}): E-mail está vazio.`);
      return;
    }

    // Simple email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(mapped.email)) {
      result.errorCount++;
      result.errors.push(`Registro #${lineNum} (${mapped.nome}): E-mail inválido (${mapped.email}).`);
      return;
    }

    result.successCount++;
    result.data.push(mapped);
  });

  return result;
}
