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
