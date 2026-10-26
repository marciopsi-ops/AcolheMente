/**
 * Utilitários de formatação e padronização de dados para o AcolheMente.
 */

/**
 * Padroniza o nome do profissional em Title Case inteligente com normas da língua portuguesa:
 * - Converte nomes inteiros em caixa alta ou baixa para iniciais maiúsculas
 * - Mantém preposições em minúsculas (de, da, do, das, dos, e, em)
 * - Padroniza e preserva títulos como Dr., Dra., Prof., etc.
 * - Trata nomes compostos com hífen ou apóstrofo (ex: D'Ávila, Maria-Eduarda)
 */
export function formatProfessionalName(name: string | null | undefined): string {
  if (!name || typeof name !== "string") return "";

  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";

  const LOWERCASE_WORDS = new Set([
    "de",
    "da",
    "do",
    "das",
    "dos",
    "e",
    "em",
    "di",
    "du",
    "del",
    "della",
  ]);

  const SPECIAL_TITLES: Record<string, string> = {
    dr: "Dr.",
    "dr.": "Dr.",
    dra: "Dra.",
    "dra.": "Dra.",
    drª: "Dra.",
    "drª.": "Dra.",
    prof: "Prof.",
    "prof.": "Prof.",
    profa: "Profa.",
    "profa.": "Profa.",
    profª: "Profª.",
    "profª.": "Profª.",
    me: "Me.",
    "me.": "Me.",
    ms: "Ms.",
    "ms.": "Ms.",
    esp: "Esp.",
    "esp.": "Esp.",
  };

  const words = trimmed.split(" ");
  const formattedWords = words.map((word, index) => {
    const lower = word.toLowerCase();

    // Títulos honoríficos e acadêmicos comuns
    if (SPECIAL_TITLES[lower]) {
      return SPECIAL_TITLES[lower];
    }

    // Preposições devem ficar em minúsculo (exceto se for a primeiríssima palavra)
    if (index > 0 && LOWERCASE_WORDS.has(lower)) {
      return lower;
    }

    // Trata apóstrofo (ex: D'Ávila)
    if (lower.includes("'") || lower.includes("’")) {
      const parts = lower.split(/['’]/);
      return parts
        .map((p, i) =>
          i === 0 && LOWERCASE_WORDS.has(p) && index > 0
            ? p
            : p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
        )
        .join("'");
    }

    // Trata palavras com hífen (ex: Maria-Eduarda)
    if (lower.includes("-")) {
      return lower
        .split("-")
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
        .join("-");
    }

    // Palavra regular: Primeira letra maiúscula e restante minúscula
    return lower.charAt(0).toUpperCase() + lower.slice(1).toLowerCase();
  });

  return formattedWords.join(" ");
}

/**
 * Aplica máscara progressiva de CNPJ no padrão oficial 00.000.000/0000-00.
 */
export function formatCnpj(value: string | null | undefined): string {
  if (!value) return "";
  const digits = String(value).replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  }
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

/**
 * Valida formato (14 dígitos), sequências repetidas inválidas e os dois dígitos verificadores (Módulo 11) do CNPJ.
 */
export function isValidCnpj(value: string | null | undefined): boolean {
  if (!value) return false;
  const digits = String(value).replace(/\D/g, "");
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum1 = 0;
  for (let i = 0; i < 12; i++) {
    sum1 += Number(digits[i]) * weights1[i];
  }
  const rem1 = sum1 % 11;
  const checkDigit1 = rem1 < 2 ? 0 : 11 - rem1;
  if (checkDigit1 !== Number(digits[12])) return false;

  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum2 = 0;
  for (let i = 0; i < 13; i++) {
    sum2 += Number(digits[i]) * weights2[i];
  }
  const rem2 = sum2 % 11;
  const checkDigit2 = rem2 < 2 ? 0 : 11 - rem2;
  return checkDigit2 === Number(digits[13]);
}

/**
 * Retorna mensagem de erro amigável para validação de CNPJ ou null quando válido.
 */
export function getCnpjValidationError(
  value: string | null | undefined,
  required = true
): string | null {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 0) {
    return required ? "Informe o CNPJ da empresa." : null;
  }
  if (digits.length < 14) {
    return "Formato incompleto: digite os 14 números do CNPJ (00.000.000/0000-00).";
  }
  if (!isValidCnpj(digits)) {
    return "CNPJ inválido: verifique os dígitos informados.";
  }
  return null;
}

