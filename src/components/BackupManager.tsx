import React, { useState, useRef, useEffect, useMemo } from "react";
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
  ExternalLink,
  FileSpreadsheet,
  Cloud,
  Check,
  Clock,
  User,
  Users,
  Archive,
  FolderSync,
} from "lucide-react";
import {
  generatePlatformBackup,
  generateProfissionalBackup,
  generateCSVReport,
  downloadBackupFile,
  downloadCSVReport,
  downloadDualBackupPackage,
  parseAndValidateBackup,
  restorePlatformBackup,
  calculateDateRange,
  BACKUP_COLLECTIONS,
  PlatformBackupData,
  BackupCollectionSummary,
  RestoreProgress,
  PeriodoFiltro,
  BackupFilterOptions,
} from "../lib/backupService";
import {
  connectGoogleDrive,
  getCachedDriveAccessToken,
  getCachedDriveUserEmail,
  disconnectGoogleDrive,
  uploadFileToGoogleDrive,
  GoogleDriveUploadResult,
} from "../lib/googleDriveService";

interface BackupManagerProps {
  userEmail?: string;
  userRole?: string;
  profile?: any;
}

export const BackupManager: React.FC<BackupManagerProps> = ({
  userEmail,
  userRole = "profissional",
  profile,
}) => {
  const isGestao = userRole === "master" || userRole === "triagem";

  // Tab State (for Gestão)
  const [activeMode, setActiveMode] = useState<"backup" | "restaurar">("backup");

  // Filter State
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("todos");
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");

  // Export Progress State
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{
    label: string;
    current: number;
    total: number;
  } | null>(null);
  const [lastExportTime, setLastExportTime] = useState<string | null>(() => {
    return localStorage.getItem("elo_last_backup_download");
  });

  // Google Drive State
  const [driveEmail, setDriveEmail] = useState<string | null>(() => getCachedDriveUserEmail());
  const [isConnectingDrive, setIsConnectingDrive] = useState(false);
  const [isUploadingDrive, setIsUploadingDrive] = useState(false);
  const [driveUploadSuccess, setDriveUploadSuccess] = useState<GoogleDriveUploadResult[] | null>(null);
  const [driveUploadError, setDriveUploadError] = useState<string | null>(null);
  const [driveOptions, setDriveOptions] = useState<{ json: boolean; csv: boolean }>({
    json: true,
    csv: true,
  });

  // Import / Restore State (Gestão)
  const [importedBackup, setImportedBackup] = useState<PlatformBackupData | null>(null);
  const [importSummary, setImportSummary] = useState<BackupCollectionSummary[] | null>(null);
  const [totalImportDocs, setTotalImportDocs] = useState<number>(0);
  const [importFileName, setImportFileName] = useState<string>("");
  const [importError, setImportError] = useState<string | null>(null);

  // Restore Execution State
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState<RestoreProgress | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState<{ total: number } | null>(null);
  const [restoreErrors, setRestoreErrors] = useState<string[]>([]);
  const [confirmationWord, setConfirmationWord] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Current calculated range
  const filterOptions: BackupFilterOptions = useMemo(
    () => ({
      periodo,
      dataInicio,
      dataFim,
      profile,
      userRole,
    }),
    [periodo, dataInicio, dataFim, profile, userRole]
  );

  const calculatedRange = useMemo(() => calculateDateRange(filterOptions), [filterOptions]);

  // Handle Google Drive Connection
  const handleConnectGoogleDrive = async () => {
    setIsConnectingDrive(true);
    setDriveUploadError(null);
    try {
      const { email } = await connectGoogleDrive();
      setDriveEmail(email);
    } catch (err: any) {
      console.error("Erro ao conectar Google Drive:", err);
      setDriveUploadError(err.message || "Não foi possível conectar a conta Google.");
    } finally {
      setIsConnectingDrive(false);
    }
  };

  const handleDisconnectGoogleDrive = () => {
    disconnectGoogleDrive();
    setDriveEmail(null);
    setDriveUploadSuccess(null);
    setDriveUploadError(null);
  };

  // Build the Backup Object based on active role & filter
  const buildCurrentBackupData = async (): Promise<PlatformBackupData> => {
    if (isGestao) {
      return await generatePlatformBackup(
        userEmail,
        (label, current, total) => setExportProgress({ label, current, total }),
        filterOptions
      );
    } else {
      return await generateProfissionalBackup(
        profile,
        filterOptions,
        (label, current, total) => setExportProgress({ label, current, total })
      );
    }
  };

  // Mark completion timestamp
  const recordBackupSuccess = () => {
    const nowIso = new Date().toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    setLastExportTime(nowIso);
    localStorage.setItem("elo_last_backup_download", nowIso);
  };

  // Export Handlers (Physical Downloads)
  const handleDownloadDualPackage = async () => {
    setIsExporting(true);
    setExportProgress(null);
    try {
      const backup = await buildCurrentBackupData();
      downloadDualBackupPackage(backup);
      recordBackupSuccess();
    } catch (err: any) {
      alert(`Falha ao gerar pacote de backup: ${err.message || "Erro desconhecido"}`);
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  const handleDownloadJsonOnly = async () => {
    setIsExporting(true);
    setExportProgress(null);
    try {
      const backup = await buildCurrentBackupData();
      downloadBackupFile(backup);
      recordBackupSuccess();
    } catch (err: any) {
      alert(`Falha ao gerar backup JSON: ${err.message || "Erro desconhecido"}`);
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  const handleDownloadCsvOnly = async () => {
    setIsExporting(true);
    setExportProgress(null);
    try {
      const backup = await buildCurrentBackupData();
      const csv = generateCSVReport(backup);
      downloadCSVReport(csv);
      recordBackupSuccess();
    } catch (err: any) {
      alert(`Falha ao gerar relatório CSV: ${err.message || "Erro desconhecido"}`);
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  // Send to Google Drive
  const handleUploadToGoogleDrive = async () => {
    setDriveUploadError(null);
    setDriveUploadSuccess(null);

    let token = getCachedDriveAccessToken();
    if (!token) {
      try {
        const connected = await connectGoogleDrive();
        token = connected.accessToken;
        setDriveEmail(connected.email);
      } catch (err: any) {
        setDriveUploadError("Por favor, conecte sua conta Google Drive para prosseguir.");
        return;
      }
    }

    if (!driveOptions.json && !driveOptions.csv) {
      setDriveUploadError("Selecione pelo menos um formato (JSON ou Planilha CSV) para salvar no Drive.");
      return;
    }

    setIsUploadingDrive(true);
    setExportProgress(null);

    try {
      const backup = await buildCurrentBackupData();
      const formattedDate = new Date().toISOString().slice(0, 10);
      const prefix = isGestao ? "backup-plataforma-elo" : "custodia-profissional";
      const uploadedFiles: GoogleDriveUploadResult[] = [];

      // Upload JSON if selected
      if (driveOptions.json) {
        setExportProgress({ label: "Enviando arquivo JSON para o Google Drive...", current: 1, total: 2 });
        const jsonFilename = `${prefix}-${formattedDate}.json`;
        const jsonContent = JSON.stringify(backup, null, 2);
        const jsonRes = await uploadFileToGoogleDrive(token, jsonFilename, jsonContent, "application/json");
        uploadedFiles.push(jsonRes);
      }

      // Upload CSV if selected
      if (driveOptions.csv) {
        setExportProgress({ label: "Enviando relatório de prontuários CSV...", current: 2, total: 2 });
        const csvFilename = `${prefix}-relatorio-prontuarios-${formattedDate}.csv`;
        const csvContent = generateCSVReport(backup);
        const csvRes = await uploadFileToGoogleDrive(token, csvFilename, csvContent, "text/csv");
        uploadedFiles.push(csvRes);
      }

      setDriveUploadSuccess(uploadedFiles);
      recordBackupSuccess();
    } catch (err: any) {
      console.error("Erro no upload para Google Drive:", err);
      setDriveUploadError(err.message || "Falha ao enviar arquivo para o Google Drive.");
    } finally {
      setIsUploadingDrive(false);
      setExportProgress(null);
    }
  };

  // Handle File Upload & Validation (Restore)
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
      } else {
        setRestoreErrors(result.errors);
      }
    } catch (err: any) {
      setRestoreErrors([err.message || "Erro fatal ao restaurar backup."]);
    } finally {
      setIsRestoring(false);
      setConfirmationWord("");
    }
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Compact Standard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-soft">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-serif font-bold text-forest">
              {isGestao ? "Backup & Custódia da Plataforma" : "Backup & Custódia Documental"}
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              CFP / LGPD
            </span>
          </div>
          <p className="text-xs text-forest/70 mt-0.5">
            {isGestao
              ? "Custódia integral da base de dados, relatórios e sincronização na nuvem."
              : "Proteja seus pacientes, evoluções de prontuários e faturamentos com cópia física ou Google Drive."}
          </p>
        </div>

        {/* Tab switcher for Gestão */}
        {isGestao && (
          <div className="flex items-center p-1 bg-warm rounded-xl border border-soft shrink-0">
            <button
              onClick={() => setActiveMode("backup")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeMode === "backup" ? "bg-white text-forest shadow-xs" : "text-forest/70 hover:text-forest"
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar & Nuvem</span>
            </button>
            <button
              onClick={() => setActiveMode("restaurar")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeMode === "restaurar" ? "bg-white text-amber-900 shadow-xs" : "text-forest/70 hover:text-forest"
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Restauração</span>
            </button>
          </div>
        )}
      </div>

      {activeMode === "backup" ? (
        <div className="flex flex-col gap-6">
          {/* Status & Last Backup Info Bar */}
          <div className="bg-white rounded-2xl border border-soft p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-forest/5 text-forest flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-forest/60 block">
                  Status de Custódia
                </span>
                <span className="text-xs sm:text-sm font-semibold text-forest">
                  {lastExportTime ? `Última exportação realizada em ${lastExportTime}` : "Nenhum backup baixado nesta sessão"}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-forest/70 bg-warm/80 px-2.5 py-1 rounded-lg border border-soft flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-forest/60" />
                <span>Período Selecionado: <strong>{calculatedRange.label}</strong></span>
              </span>
              {!isGestao && profile?.crp && (
                <span className="text-[11px] text-forest/70 bg-warm/80 px-2.5 py-1 rounded-lg border border-soft">
                  CRP: <strong>{profile.crp}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Period Filter Card */}
          <div className="bg-white rounded-2xl border border-soft p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-forest/70" />
                <span className="text-xs font-bold text-forest uppercase tracking-wider">
                  Filtrar por Período de Atendimentos
                </span>
              </div>
              <span className="text-[11px] text-forest/60">
                Escolha o intervalo para o relatório e arquivos de custódia
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  { id: "todos", label: "Todo o Histórico" },
                  { id: "30d", label: "Últimos 30 Dias" },
                  { id: "90d", label: "Últimos 90 Dias" },
                  { id: "ano_atual", label: "Ano Atual" },
                  { id: "1ano", label: "Último Ano (365d)" },
                  { id: "custom", label: "Personalizado" },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriodo(p.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    periodo === p.id
                      ? "bg-forest text-white shadow-xs"
                      : "bg-warm/60 text-forest/80 hover:bg-warm border border-soft"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom Date Pickers */}
            {periodo === "custom" && (
              <div className="mt-3 pt-3 border-t border-soft flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-forest/70 font-semibold">Data Inicial:</label>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-soft text-xs text-forest bg-warm/30 focus:outline-hidden focus:border-forest"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-forest/70 font-semibold">Data Final:</label>
                  <input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-soft text-xs text-forest bg-warm/30 focus:outline-hidden focus:border-forest"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Grid: Physical Backup vs Google Drive Cloud */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CARD 1: BACKUP FÍSICO (DOWNLOAD) */}
            <div className="bg-white rounded-3xl border border-soft p-5 sm:p-6 shadow-2xs flex flex-col justify-between gap-5 relative overflow-hidden">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-forest/5 text-forest flex items-center justify-center shrink-0">
                    <Download className="w-5 h-5 text-forest" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-forest">
                      1. Backup Físico (Download Direto)
                    </h3>
                    <p className="text-[11px] text-forest/60">
                      Geração local e instantânea no seu computador ou pendrive.
                    </p>
                  </div>
                </div>

                <div className="bg-warm/60 p-3.5 rounded-2xl border border-soft text-xs text-forest/80 space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <span>
                      <strong>Pacote Duplo Completo:</strong> Inclui arquivo JSON estruturado para integridade e planilha CSV formatada legível.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <span>
                      <strong>Conformidade CFP:</strong> Planilha com histórico cronológico de sessões, presenças e notas de atendimento.
                    </span>
                  </div>
                </div>
              </div>

              {/* Download Buttons */}
              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleDownloadDualPackage}
                  disabled={isExporting || isUploadingDrive}
                  className="w-full py-3 px-4 rounded-xl bg-forest hover:bg-forest/90 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isExporting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Gerando pacote ({exportProgress?.label || "Coletando dados..."})...</span>
                    </>
                  ) : (
                    <>
                      <Archive className="w-4 h-4" />
                      <span>Baixar Pacote Duplo (JSON + Relatório CSV)</span>
                    </>
                  )}
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadJsonOnly}
                    disabled={isExporting || isUploadingDrive}
                    className="py-2.5 px-3 rounded-xl border border-soft bg-warm/40 hover:bg-warm text-forest font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <FileJson className="w-3.5 h-3.5 text-forest/70" />
                    <span>Apenas JSON</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadCsvOnly}
                    disabled={isExporting || isUploadingDrive}
                    className="py-2.5 px-3 rounded-xl border border-soft bg-warm/40 hover:bg-warm text-forest font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Planilha CSV</span>
                  </button>
                </div>
              </div>
            </div>

            {/* CARD 2: BACKUP NA NUVEM (GOOGLE DRIVE) */}
            <div className="bg-white rounded-3xl border border-soft p-5 sm:p-6 shadow-2xs flex flex-col justify-between gap-5 relative overflow-hidden">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                    <Cloud className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm sm:text-base font-bold text-forest">
                        2. Backup na Nuvem (Google Drive)
                      </h3>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                        Custo Zero
                      </span>
                    </div>
                    <p className="text-[11px] text-forest/60">
                      Sincronização direta na sua conta Google pessoal/profissional.
                    </p>
                  </div>
                </div>

                {/* Drive Connection Status */}
                {driveEmail ? (
                  <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="truncate text-xs">
                        <span className="text-forest/70 text-[10px] block">Conectado ao Google:</span>
                        <strong className="text-forest truncate">{driveEmail}</strong>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleDisconnectGoogleDrive}
                      className="text-[10px] text-forest/60 hover:text-rose-700 font-bold shrink-0 underline cursor-pointer"
                    >
                      Trocar conta
                    </button>
                  </div>
                ) : (
                  <div className="bg-warm/60 border border-soft rounded-2xl p-3 flex items-center justify-between gap-3">
                    <div className="text-xs text-forest/80">
                      Vincule sua conta Google para enviar backups com 1 clique.
                    </div>
                    <button
                      type="button"
                      onClick={handleConnectGoogleDrive}
                      disabled={isConnectingDrive}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-warm border border-soft text-xs font-bold text-forest flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      {isConnectingDrive ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin text-forest" />
                          <span>Conectando...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                            <path
                              fill="#4285F4"
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                              fill="#34A853"
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                            />
                            <path
                              fill="#EA4335"
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                            />
                          </svg>
                          <span>Conectar Drive</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* File Choices */}
                <div className="flex items-center gap-4 text-xs text-forest/80 px-1">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={driveOptions.json}
                      onChange={(e) => setDriveOptions((prev) => ({ ...prev, json: e.target.checked }))}
                      className="rounded accent-forest"
                    />
                    <span>Arquivo JSON</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={driveOptions.csv}
                      onChange={(e) => setDriveOptions((prev) => ({ ...prev, csv: e.target.checked }))}
                      className="rounded accent-forest"
                    />
                    <span>Planilha CSV</span>
                  </label>
                </div>

                {/* Upload Success Notice */}
                {driveUploadSuccess && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Arquivos salvos com sucesso no Google Drive!</span>
                    </div>
                    {driveUploadSuccess.map((f, i) => (
                      <div key={i} className="flex items-center justify-between text-[11px] pl-5">
                        <span className="truncate">{f.name}</span>
                        {f.webViewLink && (
                          <a
                            href={f.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-700 font-bold hover:underline flex items-center gap-1 shrink-0 ml-2"
                          >
                            <span>Abrir</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Error Notice */}
                {driveUploadError && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{driveUploadError}</span>
                  </div>
                )}
              </div>

              {/* Upload to Drive Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleUploadToGoogleDrive}
                  disabled={isUploadingDrive || isExporting}
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isUploadingDrive ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Enviando para o Google Drive...</span>
                    </>
                  ) : (
                    <>
                      <Cloud className="w-4 h-4" />
                      <span>Salvar Backup no Google Drive</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Legal / Ethical Compliance Banner */}
          <div className="bg-warm/40 border border-soft p-4 sm:p-5 rounded-2xl flex items-start gap-3">
            <Info className="w-5 h-5 text-forest/70 shrink-0 mt-0.5" />
            <div className="text-xs text-forest/70 leading-relaxed">
              <strong>Guarda Obrigatória & Resoluções CFP 001/2009 e 004/2020:</strong> Os registros e prontuários
              psicológicos devem ser mantidos pelo profissional por um período mínimo de 5 (cinco) anos. Manter uma cópia
              física periódica ou no seu Google Drive pessoal garante a conformidade com o Conselho Regional de
              Psicologia e a custódia autônoma dos seus prontuários em caso de auditoria.
            </div>
          </div>
        </div>
      ) : (
        /* MODE: RESTAURAÇÃO (PARA GESTÃO) */
        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-3xl border border-soft p-6 shadow-2xs flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                <Upload className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-forest">Restauração de Base a partir de Backup JSON</h3>
                <p className="text-xs text-forest/60">
                  Carregue um arquivo JSON gerado pela plataforma para sincronizar ou recuperar dados.
                </p>
              </div>
            </div>

            {/* Upload Zone */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json,application/json"
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-soft hover:border-forest/40 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-warm/20 hover:bg-warm/40 flex flex-col items-center gap-2"
            >
              <FileJson className="w-8 h-8 text-forest/50" />
              <span className="text-xs font-bold text-forest">
                {importFileName ? `Arquivo selecionado: ${importFileName}` : "Clique para selecionar o arquivo .JSON"}
              </span>
              <span className="text-[11px] text-forest/60">
                Apenas arquivos de backup válidos exportados pelo Instituto Elo
              </span>
            </div>

            {/* Summary Preview */}
            {importSummary && (
              <div className="bg-warm/40 rounded-2xl p-4 border border-soft flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs font-bold text-forest">
                  <span>Resumo do Arquivo Carregado:</span>
                  <span className="text-emerald-700">{totalImportDocs} documentos identificados</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {importSummary.map((c, i) => (
                    <div key={i} className="bg-white p-2.5 rounded-xl border border-soft text-[11px]">
                      <span className="text-forest/70 block truncate">{c.name}:</span>
                      <strong className="text-forest">{c.count} registros</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error Banner */}
            {importError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            {/* Progress */}
            {isRestoring && restoreProgress && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                <div className="flex justify-between text-xs font-semibold text-amber-900 mb-1.5">
                  <span>Restaurando: {restoreProgress.currentCollection}</span>
                  <span>
                    {restoreProgress.documentsRestored} de {restoreProgress.totalDocuments} ({restoreProgress.percentage}%)
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

            {/* Success */}
            {restoreSuccess && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>
                  <strong>Restauração concluída!</strong> {restoreSuccess.total} documentos sincronizados com sucesso.
                </span>
              </div>
            )}

            {/* Errors */}
            {restoreErrors.length > 0 && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex flex-col gap-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Erros durante a restauração:
                </div>
                {restoreErrors.map((err, i) => (
                  <span key={i} className="text-[11px] text-rose-700">
                    • {err}
                  </span>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              disabled={!importedBackup || isRestoring || isExporting}
              className="w-full py-3.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRestoring ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sincronizando registros no banco...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Iniciar Restauração de Dados</span>
                </>
              )}
            </button>
          </div>

          {/* Confirm Modal */}
          {showConfirmModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest/60 backdrop-blur-xs p-4">
              <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-soft flex flex-col gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-6 h-6" />
                </div>

                <div className="text-center">
                  <h3 className="text-base font-serif font-bold text-forest">Confirmar Restauração de Dados</h3>
                  <p className="text-xs text-forest/70 mt-1">
                    Você está prestes a restaurar <strong>{totalImportDocs} documentos</strong> na plataforma.
                  </p>
                </div>

                <div className="bg-warm p-4 rounded-2xl border border-soft text-xs text-forest/80 flex flex-col gap-1.5">
                  <span>• Documentos existentes com o mesmo ID serão mesclados/atualizados.</span>
                  <span>• Novos registros contidos no backup serão inseridos.</span>
                  <span>• Esta ação modifica a base de dados ativa.</span>
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
                    className="w-full px-4 py-2 rounded-xl border border-soft bg-warm/30 text-forest font-bold text-center focus:outline-hidden focus:border-forest text-xs"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowConfirmModal(false);
                      setConfirmationWord("");
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-soft bg-white text-forest/70 font-semibold text-xs hover:bg-warm transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={confirmationWord.trim().toUpperCase() !== "RESTAURAR"}
                    onClick={handleExecuteRestore}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Confirmar e Restaurar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
