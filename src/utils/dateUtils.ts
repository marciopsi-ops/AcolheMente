/**
 * Utilitários oficiais de padronização de datas (formato brasileiro DD/MM/AAAA)
 * e cálculo exato de idade por data de nascimento em toda a plataforma.
 */

/**
 * Calcula a idade exata a partir de uma data de nascimento em formato:
 * - YYYY-MM-DD (ISO)
 * - DD/MM/AAAA ou DD-MM-AAAA (BR)
 * - Timestamp numérico ou objeto Date
 */
export function calculateAge(dobStrOrDate?: string | Date | number | null): number | null {
  if (!dobStrOrDate) return null;
  let dob: Date;

  if (dobStrOrDate instanceof Date) {
    dob = dobStrOrDate;
  } else if (typeof dobStrOrDate === "number") {
    dob = new Date(dobStrOrDate);
  } else {
    const str = String(dobStrOrDate).trim();
    if (!str) return null;

    if (str.includes("/")) {
      const parts = str.split("/");
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        dob = new Date(year, month, day);
      } else {
        dob = new Date(str);
      }
    } else if (str.includes("-")) {
      const parts = str.split("-");
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          // Formato ISO: YYYY-MM-DD
          dob = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        } else {
          // Formato BR: DD-MM-YYYY
          dob = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
        }
      } else {
        dob = new Date(str);
      }
    } else if (/^\d{8}$/.test(str)) {
      // DDMMAAAA
      const day = parseInt(str.slice(0, 2), 10);
      const month = parseInt(str.slice(2, 4), 10) - 1;
      const year = parseInt(str.slice(4, 8), 10);
      dob = new Date(year, month, day);
    } else {
      dob = new Date(str);
    }
  }

  if (isNaN(dob.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  return age >= 0 && age <= 130 ? age : null;
}

/**
 * Retorna a idade formatada para exibição (ex: "34 anos", "1 ano") a partir dos dados do paciente.
 * Dá prioridade estrita ao cálculo pela data de nascimento, conforme solicitado.
 */
export function getPatientAgeDisplay(patientOrCard: any): string | null {
  if (!patientOrCard) return null;

  const birthDate =
    patientOrCard.dataNascimento ||
    patientOrCard.nascimento ||
    patientOrCard.pacienteDataNascimento ||
    patientOrCard.colaboradorDataNascimento;

  if (birthDate) {
    const calculated = calculateAge(birthDate);
    if (calculated !== null) {
      return `${calculated} ${calculated === 1 ? "ano" : "anos"}`;
    }
  }

  // Fallback caso a data de nascimento não tenha sido informada mas exista campo idade
  if (patientOrCard.idade) {
    const raw = String(patientOrCard.idade).trim();
    const num = parseInt(raw.replace(/\D/g, ""), 10);
    if (!isNaN(num) && num > 0 && num <= 130) {
      return `${num} ${num === 1 ? "ano" : "anos"}`;
    }
    return raw.includes("ano") ? raw : `${raw} anos`;
  }

  return null;
}

/**
 * Formata qualquer valor de data com segurança para o formato padrão brasileiro DD/MM/AAAA.
 */
export function formatDateBR(val: any, fallback = "-"): string {
  if (!val) return fallback;
  try {
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (!trimmed) return fallback;

      // Já está em DD/MM/AAAA
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
        return trimmed;
      }

      // DD-MM-AAAA -> DD/MM/AAAA
      if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
        return trimmed.replace(/-/g, "/");
      }

      // YYYY-MM-DD (ISO) -> DD/MM/AAAA
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const [y, m, d] = trimmed.split("-");
        return `${d}/${m}/${y}`;
      }

      // ISO com Timestamp (YYYY-MM-DDTHH:mm:ss...)
      if (trimmed.includes("T")) {
        const datePart = trimmed.split("T")[0];
        if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
          const [y, m, d] = datePart.split("-");
          return `${d}/${m}/${y}`;
        }
      }

      // DDMMAAAA
      if (/^\d{8}$/.test(trimmed)) {
        return `${trimmed.slice(0, 2)}/${trimmed.slice(2, 4)}/${trimmed.slice(4, 8)}`;
      }
    }

    // Se for Firestore Timestamp ou Date
    let dateObj: Date;
    if (typeof val?.toDate === "function") {
      dateObj = val.toDate();
    } else if (typeof val?.toMillis === "function") {
      dateObj = new Date(val.toMillis());
    } else if (typeof val === "number") {
      dateObj = new Date(val);
    } else {
      dateObj = new Date(val);
    }

    if (isNaN(dateObj.getTime())) return fallback;

    const day = String(dateObj.getDate()).padStart(2, "0");
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return fallback;
  }
}

/**
 * Formata data e hora para o padrão brasileiro DD/MM/AAAA às HH:mm.
 */
export function formatDateTimeBR(val: any, fallback = "-"): string {
  if (!val) return fallback;
  try {
    const dateStr = formatDateBR(val, fallback);
    if (dateStr === fallback) return fallback;

    let d: Date;
    if (typeof val?.toDate === "function") {
      d = val.toDate();
    } else if (typeof val?.toMillis === "function") {
      d = new Date(val.toMillis());
    } else if (typeof val === "number") {
      d = new Date(val);
    } else {
      d = new Date(val);
    }

    if (isNaN(d.getTime())) return dateStr;

    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");

    // Se não tiver componente horário relevante
    if (
      (hours === "00" && minutes === "00") ||
      (typeof val === "string" && !val.includes("T") && !val.includes(":"))
    ) {
      return dateStr;
    }

    return `${dateStr} às ${hours}:${minutes}`;
  } catch {
    return fallback;
  }
}
