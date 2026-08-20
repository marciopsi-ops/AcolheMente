import React, { useState, useRef } from "react";
import {
  Download,
  Upload,
  Database,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  FileJson,
  Calendar,
  Layers,
  ArrowRight,
  Info,
  Server,
  Lock,
} from "lucide-react";
import {
  generatePlatformBackup,
  downloadBackupFile,
  parseAndValidateBackup,
  restorePlatformBackup,
  BACKUP_COLLECTIONS,
  PlatformBackupData,
  BackupCollectionSummary,
  RestoreProgress,
} from "../lib/backupService";

interface BackupManagerProps {
  userEmail?: string;
  userRole?: string;
}

export const BackupManager: React.FC<BackupManagerProps> = ({
  userEmail,
  userRole,
}) => {
  // Export State
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{
    label: string;
    current: number;
    total: number;
  } | null>(null);
  const [lastExportTime, setLastExportTime] = useState<string | null>(() => {
    return localStorage.getItem("elo_last_backup_download");
  });

  // Import / Restore State
  const [importedBackup, setImportedBackup] = useState<PlatformBackupData | null>(
    null,
  );
  const [importSummary, setImportSummary] = useState<
    BackupCollectionSummary[] | null
  >(null);
  const [totalImportDocs, setTotalImportDocs] = useState<number>(0);
  const [importFileName, setImportFileName] = useState<string>("");
  const [importError, setImportError] = useState<string | null>(null);

  // Restore Execution State
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState<RestoreProgress | null>(
    null,
  );
  const [restoreSuccess, setRestoreSuccess] = useState<{
    total: number;
  } | null>(null);
  const [restoreErrors, setRestoreErrors] = useState<string[]>([]);
  const [confirmationWord, setConfirmationWord] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Handle Full Export
  const handleExportBackup = async () => {
    setIsExporting(true);
    setExportProgress(null);

    try {
      const backup = await generatePlatformBackup(
        userEmail,
        (label, current, total) => {
          setExportProgress({ label, current, total });
        },
      );

      downloadBackupFile(backup);

      const nowIso = new Date().toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      setLastExportTime(nowIso);
      localStorage.setItem("elo_last_backup_download", nowIso);
    } catch (err: any) {
      alert(`Falha ao gerar backup: ${err.message || "Erro desconhecido"}`);
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  // Handle File Upload & Validation
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setRestoreSuccess(null);
    setRestoreErrors([]);
    setImportFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) {
        setImportError("Não foi possível ler o arquivo selecionado.");
        return;
      }

      const result = parseAndValidateBackup(content);
      if (!result.valid || !result.backup) {
        setImportError(result.error || "Arquivo de backup inválido.");
        setImportedBackup(null);
        setImportSummary(null);
      } else {
        setImportedBackup(result.backup);
        setImportSummary(result.summary || []);
        setTotalImportDocs(result.totalDocs || 0);
      }
    };

    reader.onerror = () => {
      setImportError("Erro ao ler arquivo do computador.");
    };

    reader.readAsText(file);
  };

  // Handle Restore Execution
  const handleExecuteRestore = async () => {
    if (!importedBackup) return;
    setShowConfirmModal(false);
    setIsRestoring(true);
    setRestoreSuccess(null);
    setRestoreErrors([]);
    setRestoreProgress(null);

    try {
      const result = await restorePlatformBackup(importedBackup, {
        onProgress: (progress) => {
          setRestoreProgress(progress);
        },
      });

      if (result.success) {
        setRestoreSuccess({ total: result.totalRestored });
        setImportedBackup(null);
        setImportSummary(null);
        setConfirmationWord("");
      } else {
        setRestoreErrors(result.errors);
      }
    } catch (err: any) {
      setRestoreErrors([`Falha crítica na restauração: ${err.message || String(err)}`]);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Header Banner */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-soft flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-forest/5 flex items-center justify-center text-forest border border-soft shrink-0">
            <Database className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl md:text-2xl font-serif font-bold text-forest">
                Backup & Restauração de Dados
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Seguro
              </span>
            </div>
            <p className="text-sm text-forest/70 mt-1 max-w-2xl">
              Exporte todos os cadastros clínicos, psicólogos, triagens, mensagens e configurações em formato estruturado ou restaure dados a partir de backups anteriores.
            </p>
          </div>
        </div>

        {lastExportTime && (
          <div className="text-xs text-forest/60 bg-warm px-4 py-2 rounded-xl border border-soft flex items-center gap-2 shrink-0">
            <Calendar className="w-4 h-4 text-forest/40" />
            <span>Último backup baixado: <strong>{lastExportTime}</strong></span>
          </div>
        )}
      </div>

      {/* Grid: 2 Cards (Export & Import) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        {/* CARD 1: EXPORT */}
        <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-soft mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sun-dark-light text-forest flex items-center justify-center">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-forest text-base">
                    1. Gerar Backup Geral (Download)
                  </h3>
                  <p className="text-xs text-forest/60">
                    Exportação de todas as {BACKUP_COLLECTIONS.length} coleções
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                JSON Estruturado
              </span>
            </div>

            <p className="text-xs md:text-sm text-forest/70 leading-relaxed mb-4">
              Gera um arquivo completo contendo todos os registros da plataforma, incluindo dados de acolhimentos, históricos clínicos, contatos, profissionais e configurações. O arquivo pode ser guardado com segurança em seu armazenamento local ou na nuvem.
            </p>

            {/* List of included collections preview */}
            <div className="bg-warm/40 p-4 rounded-2xl border border-soft/60 mb-6">
              <span className="text-[10px] font-bold uppercase tracking-wider text-forest/60 block mb-2">
                Coleções incluídas no arquivo:
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs text-forest/80">
                {BACKUP_COLLECTIONS.slice(0, 6).map((c) => (
                  <div key={c.id} className="flex items-center gap-1.5 truncate">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">{c.label}</span>
                  </div>
                ))}
                {BACKUP_COLLECTIONS.slice(6, 12).map((c) => (
                  <div key={c.id} className="flex items-center gap-1.5 truncate">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">{c.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Export Progress Bar */}
            {isExporting && exportProgress && (
              <div className="mb-6 p-4 rounded-2xl bg-sun/10 border border-sun/30">
                <div className="flex justify-between text-xs font-semibold text-forest mb-1.5">
                  <span>Exportando: {exportProgress.label}</span>
                  <span>{exportProgress.current} de {exportProgress.total}</span>
                </div>
                <div className="w-full bg-forest/10 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-forest h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.round((exportProgress.current / exportProgress.total) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleExportBackup}
            disabled={isExporting || isRestoring}
            className="w-full py-4 px-6 rounded-2xl bg-forest hover:bg-forest/90 text-white font-bold text-sm flex items-center justify-center gap-3 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Gerando arquivo de backup...</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span>Baixar Backup Completo da Plataforma (.JSON)</span>
              </>
            )}
          </button>
        </div>

        {/* CARD 2: IMPORT / RESTORE */}
        <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-soft mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-forest text-base">
                    2. Restaurar Dados (Upload)
                  </h3>
                  <p className="text-xs text-forest/60">
                    Importação segura com mesclagem inteligente
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                Ação Crítica
              </span>
            </div>

            <p className="text-xs md:text-sm text-forest/70 leading-relaxed mb-4">
              Faça upload de um arquivo <code className="bg-warm px-1.5 py-0.5 rounded text-forest font-bold">.json</code> de backup gerado anteriormente. Os dados serão lidos, validados e sincronizados com a base de dados oficial.
            </p>

            {/* Hidden Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json,application/json"
              className="hidden"
            />

            {/* Upload Area */}
            {!importedBackup ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-soft hover:border-sun p-6 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-warm/20 hover:bg-sun/5 mb-6"
              >
                <div className="w-12 h-12 rounded-xl bg-white border border-soft flex items-center justify-center text-forest/60 mb-2">
                  <FileJson className="w-6 h-6" />
                </div>
                <span className="text-sm font-bold text-forest">
                  Clique para selecionar o arquivo de backup (.json)
                </span>
                <span className="text-xs text-forest/50 mt-1">
                  ou arraste e solte o arquivo aqui
                </span>
              </div>
            ) : (
              /* Validation Preview Box */
              <div className="bg-emerald-50/70 border border-emerald-200 p-5 rounded-2xl mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <h4 className="font-bold text-emerald-950 text-sm truncate max-w-[200px] md:max-w-xs">
                        {importFileName}
                      </h4>
                      <span className="text-[10px] text-emerald-700">
                        {importedBackup.createdAt
                          ? `Criado em: ${new Date(importedBackup.createdAt).toLocaleString("pt-BR")}`
                          : "Arquivo validado"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setImportedBackup(null);
                      setImportSummary(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="text-xs text-emerald-800 hover:text-red-600 font-semibold underline cursor-pointer"
                  >
                    Trocar arquivo
                  </button>
                </div>

                <div className="border-t border-emerald-200/60 pt-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-emerald-900">
                      Total a restaurar:
                    </span>
                    <span className="text-sm font-bold text-emerald-900 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                      {totalImportDocs} documentos
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto pr-1 custom-scrollbar text-[11px] text-emerald-800">
                    {importSummary?.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center bg-white/70 px-2 py-1 rounded border border-emerald-100"
                      >
                        <span className="truncate">{item.name}:</span>
                        <span className="font-bold ml-1">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {importError && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2 mb-6">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{importError}</span>
              </div>
            )}

            {/* Restore Progress */}
            {isRestoring && restoreProgress && (
              <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200">
                <div className="flex justify-between text-xs font-semibold text-amber-900 mb-1.5">
                  <span>Restaurando: {restoreProgress.currentCollection}</span>
                  <span>
                    {restoreProgress.documentsRestored} de{" "}
                    {restoreProgress.totalDocuments} ({restoreProgress.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-amber-200/50 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-amber-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${restoreProgress.percentage}%` }}
                  />
                </div>
              </div>
            )}

            {/* Restore Success Banner */}
            {restoreSuccess && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2 mb-6">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>
                  <strong>Restauração concluída com sucesso!</strong>{" "}
                  {restoreSuccess.total} documentos foram sincronizados na base.
                </span>
              </div>
            )}

            {/* Restore Errors */}
            {restoreErrors.length > 0 && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex flex-col gap-1 mb-6">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Ocorreram erros durante a restauração:
                </div>
                {restoreErrors.map((err, i) => (
                  <span key={i} className="text-[11px] text-rose-700">
                    • {err}
                  </span>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={!importedBackup || isRestoring || isExporting}
            className="w-full py-4 px-6 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm flex items-center justify-center gap-3 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRestoring ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Sincronizando registros no banco...</span>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                <span>Iniciar Restauração de Dados</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Security Info Card */}
      <div className="bg-warm/50 border border-soft p-5 rounded-2xl flex items-start gap-3">
        <Info className="w-5 h-5 text-forest/70 shrink-0 mt-0.5" />
        <div className="text-xs text-forest/70 leading-relaxed">
          <strong>Boas práticas de segurança:</strong> É altamente recomendável efetuar um backup semanal dos dados da plataforma. Os arquivos baixados contêm dados de triagens e pacientes sob sigilo ético e devem ser mantidos em diretórios protegidos e seguros.
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-soft flex flex-col gap-4 slide-up">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-serif font-bold text-forest">
                Confirmar Restauração de Dados
              </h3>
              <p className="text-xs text-forest/70 mt-1">
                Você está prestes a restaurar <strong>{totalImportDocs} documentos</strong> no banco de dados da plataforma.
              </p>
            </div>

            <div className="bg-warm p-4 rounded-2xl border border-soft text-xs text-forest/80 flex flex-col gap-1.5">
              <span>• Documentos existentes com o mesmo ID serão atualizados.</span>
              <span>• Novos registros contidos no backup serão inseridos.</span>
              <span>• Esta ação não pode ser desfeita automaticamente.</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-forest/60">
                Digite <span className="text-rose-600 font-bold">RESTAURAR</span> para confirmar:
              </label>
              <input
                type="text"
                value={confirmationWord}
                onChange={(e) => setConfirmationWord(e.target.value)}
                placeholder="RESTAURAR"
                className="w-full px-4 py-2.5 rounded-xl border border-soft bg-warm/30 text-forest font-bold text-center focus:outline-hidden focus:border-sun"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmationWord("");
                }}
                className="flex-1 py-3 rounded-xl border border-soft bg-white text-forest/70 font-semibold text-xs hover:bg-warm transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={confirmationWord.trim().toUpperCase() !== "RESTAURAR"}
                onClick={handleExecuteRestore}
                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Confirmar e Restaurar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
