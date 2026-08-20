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

export interface PlatformBackupData {
  version: string;
  createdAt: string;
  createdBy?: string;
  source: string;
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
      // Fallback if toDate fails
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
 * Fetches all documents from all configured Firestore collections and generates a structured backup payload.
 */
export async function generatePlatformBackup(
  userEmail?: string,
  onProgress?: (colLabel: string, current: number, total: number) => void,
): Promise<PlatformBackupData> {
  const backupData: PlatformBackupData = {
    version: "1.0.0",
    createdAt: new Date().toISOString(),
    createdBy: userEmail || "gestao@elopsicologia.com",
    source: "Instituto Elo Psicologia - Plataforma de Gestão",
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
 * Triggers browser download of the backup JSON file.
 */
export function downloadBackupFile(backup: PlatformBackupData, filename?: string) {
  const formattedDate = new Date()
    .toISOString()
    .slice(0, 19)
    .replace(/[:T]/g, "-");
  const finalFilename =
    filename || `backup-elo-psicologia-${formattedDate}.json`;

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
  } = {},
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

    // Process in batches of 450 documents (Firestore limit is 500)
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
