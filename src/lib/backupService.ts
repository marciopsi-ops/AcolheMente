import {
  collection,
  getDocs,
  doc,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebase";

export interface BackupCollectionSummary {
  name: string;
  count: number;
}

export type PeriodoFiltro = "todos" | "30d" | "90d" | "ano_atual" | "1ano" | "custom";

export interface BackupFilterOptions {
  periodo: PeriodoFiltro;
  dataInicio?: string; // YYYY-MM-DD
  dataFim?: string;    // YYYY-MM-DD
  modulos?: string[];  // e.g. ["acolhimentos", "artigos_blog", "eventos", "servicos"]
  profile?: any;       // Current user profile
  userRole?: string;   // "profissional" | "master" | "triagem"
}

export interface PlatformBackupData {
  version: string;
  createdAt: string;
  createdBy?: string;
  source: string;
  periodoLabel?: string;
  scope?: "profissional" | "gestao";
  profissionalInfo?: {
    uid?: string;
    nome?: string;
    email?: string;
    crp?: string;
  };
  stats: {
    totalDocuments: number;
    collections: Record<string, number>;
  };
  data: {
    acolhimentos?: Array<{ id: string; [key: string]: any }>;
    users?: Array<{ id: string; [key: string]: any }>;
    profissionais_leads?: Array<{ id: string; [key: string]: any }>;
    empresa_leads?: Array<{ id: string; [key: string]: any }>;
    solicitacoes_doacao?: Array<{ id: string; [key: string]: any }>;
    doacoes?: Array<{ id: string; [key: string]: any }>;
    compliance?: Array<{ id: string; [key: string]: any }>;
    artigos_blog?: Array<{ id: string; [key: string]: any }>;
    servicos_profissionais?: Array<{ id: string; [key: string]: any }>;
    eventos?: Array<{ id: string; [key: string]: any }>;
    servicos?: Array<{ id: string; [key: string]: any }>;
    inscricoes?: Array<{ id: string; [key: string]: any }>;
    [key: string]: any;
  };
}

export const BACKUP_COLLECTIONS = [
  { id: "acolhimentos", label: "Pacientes & Triagens" },
  { id: "users", label: "Usuários & Psicólogos" },
  { id: "profissionais_leads", label: "Candidaturas de Profissionais" },
  { id: "empresa_leads", label: "Leads de Empresas" },
  { id: "doacoes", label: "Doações" },
  { id: "solicitacoes_doacao", label: "Solicitações de Doação" },
  { id: "compliance", label: "Mensagens de Compliance / Ouvidoria" },
  { id: "artigos_blog", label: "Artigos do Blog" },
  { id: "servicos_profissionais", label: "Serviços de Profissionais" },
  { id: "eventos", label: "Eventos Institucionais" },
  { id: "servicos", label: "Serviços Institucionais" },
  { id: "inscricoes", label: "Inscrições em Eventos/Serviços" },
];

export const PROFISSIONAL_BACKUP_MODULES = [
  { id: "acolhimentos", label: "Meus Pacientes & Fichas Clínicas", default: true },
  { id: "sessoes", label: "Prontuário & Sessões de Faturamento", default: true },
  { id: "artigos_blog", label: "Meus Artigos do Blog", default: true },
  { id: "eventos_servicos", label: "Eventos & Serviços Ofertados", default: true },
];

/**
 * Calculates date range boundaries based on the selected period filter.
 */
export function calculateDateRange(options: BackupFilterOptions): {
  start: Date | null;
  end: Date | null;
  label: string;
} {
  const now = new Date();
  if (options.periodo === "30d") {
    const start = new Date();
    start.setDate(now.getDate() - 30);
    start.setHours(0, 0, 0, 0);
    return { start, end: now, label: "Últimos 30 dias" };
  }
  if (options.periodo === "90d") {
    const start = new Date();
    start.setDate(now.getDate() - 90);
    start.setHours(0, 0, 0, 0);
    return { start, end: now, label: "Últimos 90 dias" };
  }
  if (options.periodo === "ano_atual") {
    const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
    return { start, end: now, label: `Ano corrente (${now.getFullYear()})` };
  }
  if (options.periodo === "1ano") {
    const start = new Date();
    start.setFullYear(now.getFullYear() - 1);
    start.setHours(0, 0, 0, 0);
    return { start, end: now, label: "Último ano (365 dias)" };
  }
  if (options.periodo === "custom" && options.dataInicio && options.dataFim) {
    const start = new Date(`${options.dataInicio}T00:00:00`);
    const end = new Date(`${options.dataFim}T23:59:59`);
    return {
      start,
      end,
      label: `De ${options.dataInicio.split("-").reverse().join("/")} até ${options.dataFim.split("-").reverse().join("/")}`,
    };
  }
  return { start: null, end: null, label: "Todo o histórico disponível" };
}

/**
 * Verifies if an item's date timestamp is within the specified start/end boundaries.
 */
export function isDateWithinRange(
  dateField: any,
  start: Date | null,
  end: Date | null
): boolean {
  if (!start && !end) return true;
  if (!dateField) return true; // keep if date is missing so we don't accidentally lose records

  let d: Date | null = null;
  if (dateField instanceof Date) {
    d = dateField;
  } else if (dateField instanceof Timestamp || (dateField && typeof dateField.toDate === "function")) {
    d = dateField.toDate();
  } else if (typeof dateField === "string") {
    d = new Date(dateField);
  } else if (typeof dateField === "number") {
    d = new Date(dateField);
  }

  if (!d || isNaN(d.getTime())) return true;
  if (start && d < start) return false;
  if (end && d > end) return false;
  return true;
}

/**
 * Serializes Firestore objects (like Timestamps) into JSON-compatible values.
 */
function serializeFirestoreData(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (obj instanceof Timestamp) {
    return {
      __type: "Timestamp",
      seconds: obj.seconds,
      nanoseconds: obj.nanoseconds,
      iso: obj.toDate().toISOString(),
    };
  }

  if (typeof obj === "object" && typeof obj.toDate === "function") {
    try {
      const d = obj.toDate();
      return {
        __type: "Timestamp",
        seconds: Math.floor(d.getTime() / 1000),
        nanoseconds: (d.getTime() % 1000) * 1000000,
        iso: d.toISOString(),
      };
    } catch {
      // Fallback
    }
  }

  if (obj instanceof Date) {
    return {
      __type: "Date",
      iso: obj.toISOString(),
    };
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => serializeFirestoreData(item));
  }

  if (typeof obj === "object") {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeFirestoreData(value);
    }
    return result;
  }

  return obj;
}

/**
 * Deserializes JSON-compatible values back into Firestore objects.
 */
function deserializeFirestoreData(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === "object" && !Array.isArray(obj)) {
    if (obj.__type === "Timestamp" && typeof obj.seconds === "number") {
      return new Timestamp(obj.seconds, obj.nanoseconds || 0);
    }
    if (obj.__type === "Date" && typeof obj.iso === "string") {
      return new Date(obj.iso);
    }

    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = deserializeFirestoreData(value);
    }
    return result;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deserializeFirestoreData(item));
  }

  return obj;
}

/**
 * Fetches all documents from configured Firestore collections with optional date filtering for Gestão.
 */
export async function generatePlatformBackup(
  userEmail?: string,
  onProgress?: (colLabel: string, current: number, total: number) => void,
  filterOptions?: BackupFilterOptions
): Promise<PlatformBackupData> {
  const { start, end, label } = filterOptions
    ? calculateDateRange(filterOptions)
    : { start: null, end: null, label: "Todo o histórico disponível" };

  const backupData: PlatformBackupData = {
    version: "2.0.0",
    createdAt: new Date().toISOString(),
    createdBy: userEmail || "gestao@elopsicologia.com",
    source: "Instituto Elo Psicologia - Plataforma de Gestão",
    periodoLabel: label,
    scope: "gestao",
    stats: {
      totalDocuments: 0,
      collections: {},
    },
    data: {},
  };

  let totalDocsCount = 0;

  for (let i = 0; i < BACKUP_COLLECTIONS.length; i++) {
    const colInfo = BACKUP_COLLECTIONS[i];
    if (onProgress) {
      onProgress(colInfo.label, i + 1, BACKUP_COLLECTIONS.length);
    }

    try {
      const snap = await getDocs(collection(db, colInfo.id));
      const docsList: Array<{ id: string; [key: string]: any }> = [];

      snap.forEach((docSnap) => {
        const rawData = docSnap.data();

        // Apply date filtering if requested
        if (start || end) {
          const docDate =
            rawData.createdAt ||
            rawData.data ||
            rawData.dataCriacao ||
            rawData.timestamp ||
            rawData.dataSessao;
          if (docDate && !isDateWithinRange(docDate, start, end)) {
            return;
          }
        }

        const serialized = serializeFirestoreData(rawData);
        docsList.push({
          id: docSnap.id,
          ...serialized,
        });
      });

      backupData.data[colInfo.id] = docsList;
      backupData.stats.collections[colInfo.id] = docsList.length;
      totalDocsCount += docsList.length;
    } catch (err) {
      console.error(`Erro ao exportar coleção ${colInfo.id}:`, err);
      handleFirestoreError(err, OperationType.GET, colInfo.id);
    }
  }

  backupData.stats.totalDocuments = totalDocsCount;
  return backupData;
}

/**
 * Generates an isolated, secure backup specifically for the professional's patients, clinical records, and productions.
 * Adheres to CFP (Federal Council of Psychology) and LGPD confidentiality rules.
 */
export async function generateProfissionalBackup(
  profile: any,
  filterOptions: BackupFilterOptions,
  onProgress?: (stepLabel: string, current: number, total: number) => void
): Promise<PlatformBackupData> {
  const { start, end, label } = calculateDateRange(filterOptions);
  const profUid = profile?.uid;
  const profName = (profile?.name || profile?.nome || "").trim().toLowerCase();
  const profEmail = (profile?.email || "").trim().toLowerCase();

  const backupData: PlatformBackupData = {
    version: "2.0.0",
    createdAt: new Date().toISOString(),
    createdBy: profile?.email || "profissional@elopsicologia.com",
    source: "Instituto Elo Psicologia - Custódia Documental do Profissional",
    periodoLabel: label,
    scope: "profissional",
    profissionalInfo: {
      uid: profUid,
      nome: profile?.name || profile?.nome,
      email: profile?.email,
      crp: profile?.crp,
    },
    stats: {
      totalDocuments: 0,
      collections: {},
    },
    data: {},
  };

  const steps = [
    { id: "acolhimentos", label: "Pacientes e Prontuários Clínicos" },
    { id: "artigos_blog", label: "Artigos e Publicações Autorais" },
    { id: "eventos", label: "Eventos Institucionais e Parcerias" },
    { id: "servicos", label: "Serviços e Workshops" },
  ];

  let totalDocsCount = 0;

  // 1. Pacientes do Profissional (Acolhimentos)
  if (onProgress) onProgress("Buscando Pacientes e Histórico Clínico...", 1, steps.length);
  try {
    const acolhimentosSnap = await getDocs(collection(db, "acolhimentos"));
    const meusPacientes: Array<{ id: string; [key: string]: any }> = [];

    acolhimentosSnap.forEach((docSnap) => {
      const data = docSnap.data();

      // Check assignment to this professional
      const isAssigned =
        (profUid && (data.profissionalId === profUid || data.profissionalUid === profUid)) ||
        (profName && data.profissionalNome && data.profissionalNome.trim().toLowerCase() === profName) ||
        (profEmail && data.profissionalEmail && data.profissionalEmail.trim().toLowerCase() === profEmail);

      if (!isAssigned) return;

      // Filter by period if specified
      if (start || end) {
        const itemDate = data.createdAt || data.dataInicio || data.dataAtribuicao;
        const hasSessionInRange = Array.isArray(data.historicoSessoes) && data.historicoSessoes.some((s: any) => {
          if (!s.data) return false;
          return isDateWithinRange(s.data, start, end);
        });

        if (!isDateWithinRange(itemDate, start, end) && !hasSessionInRange) {
          return;
        }
      }

      meusPacientes.push({
        id: docSnap.id,
        ...serializeFirestoreData(data),
      });
    });

    backupData.data.acolhimentos = meusPacientes;
    backupData.stats.collections.acolhimentos = meusPacientes.length;
    totalDocsCount += meusPacientes.length;
  } catch (err) {
    console.error("Erro ao buscar acolhimentos do profissional:", err);
  }

  // 2. Artigos do Blog autorais
  if (onProgress) onProgress("Buscando Artigos Autorais...", 2, steps.length);
  try {
    const blogSnap = await getDocs(collection(db, "artigos_blog"));
    const meusArtigos: Array<{ id: string; [key: string]: any }> = [];

    blogSnap.forEach((docSnap) => {
      const data = docSnap.data();
      const isAuthor =
        (profUid && (data.autorId === profUid || data.autorUid === profUid)) ||
        (profName && data.autor && data.autor.trim().toLowerCase() === profName) ||
        (profEmail && data.autorEmail && data.autorEmail.trim().toLowerCase() === profEmail);

      if (isAuthor) {
        if (start || end) {
          const postDate = data.createdAt || data.dataPublicacao;
          if (!isDateWithinRange(postDate, start, end)) return;
        }
        meusArtigos.push({
          id: docSnap.id,
          ...serializeFirestoreData(data),
        });
      }
    });

    backupData.data.artigos_blog = meusArtigos;
    backupData.stats.collections.artigos_blog = meusArtigos.length;
    totalDocsCount += meusArtigos.length;
  } catch (err) {
    console.warn("Aviso ao carregar artigos do profissional:", err);
  }

  // 3. Eventos e Serviços criados
  if (onProgress) onProgress("Buscando Eventos e Ofertas...", 3, steps.length);
  try {
    const eventosSnap = await getDocs(collection(db, "eventos"));
    const meusEventos: Array<{ id: string; [key: string]: any }> = [];
    eventosSnap.forEach((docSnap) => {
      const data = docSnap.data();
      if ((profUid && data.criadorUid === profUid) || (profEmail && data.criadorEmail === profEmail)) {
        meusEventos.push({ id: docSnap.id, ...serializeFirestoreData(data) });
      }
    });
    backupData.data.eventos = meusEventos;
    backupData.stats.collections.eventos = meusEventos.length;
    totalDocsCount += meusEventos.length;
  } catch (err) {
    console.warn("Aviso ao carregar eventos:", err);
  }

  // 4. Serviços cadastrados
  if (onProgress) onProgress("Finalizando Coleta...", 4, steps.length);
  try {
    const servicosSnap = await getDocs(collection(db, "servicos"));
    const meusServicos: Array<{ id: string; [key: string]: any }> = [];
    servicosSnap.forEach((docSnap) => {
      const data = docSnap.data();
      if ((profUid && data.criadorUid === profUid) || (profEmail && data.criadorEmail === profEmail)) {
        meusServicos.push({ id: docSnap.id, ...serializeFirestoreData(data) });
      }
    });
    backupData.data.servicos = meusServicos;
    backupData.stats.collections.servicos = meusServicos.length;
    totalDocsCount += meusServicos.length;
  } catch (err) {
    console.warn("Aviso ao carregar serviços:", err);
  }

  backupData.stats.totalDocuments = totalDocsCount;
  return backupData;
}

/**
 * Generates an audit-ready, human-readable CSV spreadsheet report containing clinical sessions and patient summaries.
 * Uses UTF-8 BOM (\uFEFF) to open flawlessly with special characters in Excel and Numbers.
 */
export function generateCSVReport(backup: PlatformBackupData): string {
  const sanitize = (val: any): string => {
    if (val === null || val === undefined) return '""';
    const s = String(val).replace(/"/g, '""').replace(/\r?\n/g, " ");
    return `"${s}"`;
  };

  const lines: string[] = [];

  // File Header
  lines.push(`"INSTITUTO ELO PSICOLOGIA - RELATÓRIO DE CUSTÓDIA E PRONTUÁRIOS CLÍNICOS"`);
  lines.push(`"Gerado em:",${sanitize(new Date(backup.createdAt).toLocaleString("pt-BR"))}`);
  lines.push(`"Gerado por:",${sanitize(backup.createdBy || "")}`);
  lines.push(`"Período:",${sanitize(backup.periodoLabel || "Todo o histórico")}`);
  if (backup.profissionalInfo?.nome) {
    lines.push(`"Profissional Responsável:",${sanitize(backup.profissionalInfo.nome)},"CRP:",${sanitize(backup.profissionalInfo.crp || "Não informado")}`);
  }
  lines.push("");

  // SECTION 1: PACIENTES E ATENDIMENTOS
  lines.push(`"=== 1. PACIENTES E FICHAS DE ATENDIMENTO ==="`);
  lines.push(
    [
      "ID Paciente",
      "Nome Completo",
      "E-mail",
      "Telefone",
      "CPF",
      "Status Atendimento",
      "Valor da Sessão (R$)",
      "Frequência",
      "Via de Acesso",
      "Motivo Principal",
      "Responsável (se menor)",
      "Data de Cadastro",
    ]
      .map(sanitize)
      .join(",")
  );

  const pacientes = backup.data.acolhimentos || [];
  pacientes.forEach((p) => {
    let createdAtFormatted = "";
    if (p.createdAt?.iso) {
      createdAtFormatted = new Date(p.createdAt.iso).toLocaleDateString("pt-BR");
    } else if (typeof p.createdAt === "string") {
      createdAtFormatted = p.createdAt.slice(0, 10);
    }

    lines.push(
      [
        p.id,
        p.nome || "",
        p.email || "",
        p.telefone || "",
        p.cpf || p.dadosContrato?.cpf || "",
        p.status || "",
        p.valorSessao || "",
        p.frequenciaSessoes || "",
        p.viaAcesso || "",
        p.motivo || "",
        p.responsavelNome || "",
        createdAtFormatted,
      ]
        .map(sanitize)
        .join(",")
    );
  });

  lines.push("");

  // SECTION 2: SESSÕES DE FATURAMENTO E EVOLUÇÕES CLÍNICAS
  lines.push(`"=== 2. HISTÓRICO DE SESSÕES, PRONTUÁRIO E FATURAMENTO ==="`);
  lines.push(
    [
      "ID Paciente",
      "Nome Paciente",
      "Nº Sessão",
      "Data da Sessão",
      "Horário",
      "Modalidade",
      "Status do Atendimento",
      "Valor (R$)",
      "Status Pagamento",
      "Data Pagamento",
      "Forma Pagamento",
      "Anotações Clínicas / Observações",
    ]
      .map(sanitize)
      .join(",")
  );

  let totalSessoesContabilizadas = 0;
  pacientes.forEach((p) => {
    const sessoes = Array.isArray(p.historicoSessoes) ? p.historicoSessoes : [];
    sessoes.forEach((s: any) => {
      totalSessoesContabilizadas++;
      lines.push(
        [
          p.id,
          p.nome || "",
          s.numeroSessao || "",
          s.data ? s.data.split("-").reverse().join("/") : "",
          s.horario || "",
          s.modalidade || "online",
          s.statusAtendimento || "realizada",
          s.valor ? Number(s.valor).toFixed(2) : "0.00",
          s.statusPagamento || "pendente",
          s.dataPagamento || "",
          s.formaPagamento || "",
          s.observacoes || "",
        ]
          .map(sanitize)
          .join(",")
      );
    });
  });

  if (totalSessoesContabilizadas === 0) {
    lines.push(`"Nenhuma sessão individual registrada no histórico dos pacientes para o período selecionado."`);
  }

  lines.push("");

  // SECTION 3: ARTIGOS AUTORAIS
  if (Array.isArray(backup.data.artigos_blog) && backup.data.artigos_blog.length > 0) {
    lines.push(`"=== 3. ARTIGOS E PRODUÇÕES DO BLOG ==="`);
    lines.push(["ID", "Título", "Categoria", "Status", "Visualizações", "Data de Criação"].map(sanitize).join(","));
    backup.data.artigos_blog.forEach((a) => {
      lines.push(
        [
          a.id,
          a.titulo || "",
          a.categoria || "",
          a.status || "",
          a.visualizacoes || 0,
          a.createdAt?.iso ? new Date(a.createdAt.iso).toLocaleDateString("pt-BR") : "",
        ]
          .map(sanitize)
          .join(",")
      );
    });
  }

  // Prepend UTF-8 BOM so Excel opens with correct encoding and special characters
  return "\uFEFF" + lines.join("\r\n");
}

/**
 * Triggers browser download of a JSON backup file.
 */
export function downloadBackupFile(backup: PlatformBackupData, filename?: string) {
  const formattedDate = new Date()
    .toISOString()
    .slice(0, 19)
    .replace(/[:T]/g, "-");

  const scopePrefix = backup.scope === "profissional" ? "backup-profissional" : "backup-plataforma-elo";
  const finalFilename = filename || `${scopePrefix}-${formattedDate}.json`;

  const jsonString = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonString], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = finalFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Triggers browser download of a CSV spreadsheet report.
 */
export function downloadCSVReport(csvString: string, filename?: string) {
  const formattedDate = new Date()
    .toISOString()
    .slice(0, 19)
    .replace(/[:T]/g, "-");

  const finalFilename = filename || `relatorio-custodia-prontuarios-${formattedDate}.csv`;
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = finalFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Downloads both JSON and CSV files simultaneously (Dual Package).
 */
export function downloadDualBackupPackage(backup: PlatformBackupData, baseName?: string) {
  const formattedDate = new Date()
    .toISOString()
    .slice(0, 10);

  const prefix = baseName || (backup.scope === "profissional" ? "custodia-profissional" : "backup-elo");
  const jsonName = `${prefix}-${formattedDate}.json`;
  const csvName = `${prefix}-relatorio-prontuarios-${formattedDate}.csv`;

  downloadBackupFile(backup, jsonName);

  setTimeout(() => {
    const csvContent = generateCSVReport(backup);
    downloadCSVReport(csvContent, csvName);
  }, 400);
}

/**
 * Parses and validates an uploaded backup file.
 */
export function parseAndValidateBackup(jsonString: string): {
  valid: boolean;
  error?: string;
  backup?: PlatformBackupData;
  summary?: BackupCollectionSummary[];
  totalDocs?: number;
} {
  try {
    const parsed = JSON.parse(jsonString);

    if (!parsed || typeof parsed !== "object" || !parsed.data || typeof parsed.data !== "object") {
      return {
        valid: false,
        error: "Estrutura do arquivo de backup inválida: campo 'data' ausente.",
      };
    }

    const summary: BackupCollectionSummary[] = [];
    let totalDocs = 0;

    for (const [colName, docs] of Object.entries(parsed.data)) {
      if (Array.isArray(docs)) {
        const foundConfig = BACKUP_COLLECTIONS.find((c) => c.id === colName);
        summary.push({
          name: foundConfig ? foundConfig.label : colName,
          count: docs.length,
        });
        totalDocs += docs.length;
      }
    }

    return {
      valid: true,
      backup: parsed as PlatformBackupData,
      summary,
      totalDocs,
    };
  } catch (err: any) {
    return {
      valid: false,
      error: `Erro ao processar arquivo JSON: ${err.message || "Formato inválido"}`,
    };
  }
}

export interface RestoreProgress {
  currentCollection: string;
  collectionsProcessed: number;
  totalCollections: number;
  documentsRestored: number;
  totalDocuments: number;
  percentage: number;
}

/**
 * Restores the backup data into Firestore using batched writes (up to 450 operations per batch).
 */
export async function restorePlatformBackup(
  backup: PlatformBackupData,
  options: {
    selectedCollections?: string[];
    onProgress?: (progress: RestoreProgress) => void;
  } = {}
): Promise<{ success: boolean; totalRestored: number; errors: string[] }> {
  const collectionsToRestore =
    options.selectedCollections && options.selectedCollections.length > 0
      ? options.selectedCollections
      : Object.keys(backup.data);

  let totalDocsToRestore = 0;
  collectionsToRestore.forEach((colId) => {
    const list = backup.data[colId];
    if (Array.isArray(list)) {
      totalDocsToRestore += list.length;
    }
  });

  let totalRestored = 0;
  let colsProcessed = 0;
  const errors: string[] = [];

  for (const colId of collectionsToRestore) {
    const docsList = backup.data[colId];
    if (!Array.isArray(docsList) || docsList.length === 0) {
      colsProcessed++;
      continue;
    }

    const colConfig = BACKUP_COLLECTIONS.find((c) => c.id === colId);
    const colLabel = colConfig ? colConfig.label : colId;

    const BATCH_SIZE = 450;
    for (let i = 0; i < docsList.length; i += BATCH_SIZE) {
      const chunk = docsList.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);

      for (const item of chunk) {
        if (!item || !item.id) continue;
        const { id, ...dataFields } = item;
        const deserialized = deserializeFirestoreData(dataFields);
        const docRef = doc(db, colId, String(id));
        batch.set(docRef, deserialized, { merge: true });
      }

      try {
        await batch.commit();
        totalRestored += chunk.length;

        if (options.onProgress) {
          const percentage = totalDocsToRestore > 0 ? Math.round((totalRestored / totalDocsToRestore) * 100) : 100;
          options.onProgress({
            currentCollection: colLabel,
            collectionsProcessed: colsProcessed,
            totalCollections: collectionsToRestore.length,
            documentsRestored: totalRestored,
            totalDocuments: totalDocsToRestore,
            percentage,
          });
        }
      } catch (err: any) {
        console.error(`Erro ao restaurar lote na coleção ${colId}:`, err);
        errors.push(`Erro na coleção ${colLabel}: ${err.message || String(err)}`);
      }
    }

    colsProcessed++;
  }

  return {
    success: errors.length === 0,
    totalRestored,
    errors,
  };
}
