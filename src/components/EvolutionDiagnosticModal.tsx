import React, { useState } from "react";
import { safeFetchJson } from "../lib/safeFetch";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  HelpCircle,
  Info,
  Loader2,
  Play,
  QrCode,
  Radio,
  RefreshCw,
  Server,
  ShieldCheck,
  Terminal,
  Webhook,
  X,
  Zap,
} from "lucide-react";

export interface DiagnosticStepResult {
  stepId: string;
  name: string;
  category: "connectivity" | "auth" | "instance" | "webhook" | "qrcode" | "local_webhook";
  status: "success" | "warning" | "error" | "skipped";
  durationMs: number;
  httpMethod: string;
  endpoint: string;
  requestHeaders?: Record<string, string>;
  requestBody?: any;
  responseStatus?: number;
  responseStatusText?: string;
  responseHeaders?: Record<string, string>;
  responseBody?: any;
  hasQrCode?: boolean;
  qrCodePreview?: string | null;
  pairingCode?: string | null;
  diagnosis: string;
  recommendation?: string;
}

export interface DiagnosticReport {
  success: boolean;
  timestamp: string;
  configSummary: {
    apiUrl: string;
    instanceName: string;
    maskedApiKey: string;
    webhookUrl: string;
  };
  hasAuthError: boolean;
  has404Instance: boolean;
  isReadyToConnect: boolean;
  capturedQrCode?: string | null;
  capturedPairingCode?: string | null;
  summary: string;
  steps: DiagnosticStepResult[];
}

interface EvolutionDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiUrl: string;
  apiKey: string;
  instanceName: string;
  onQrCodeReceived?: (qrCode: string, pairingCode?: string | null) => void;
  onInstanceCreated?: (instanceName: string) => void;
}

export const EvolutionDiagnosticModal: React.FC<EvolutionDiagnosticModalProps> = ({
  isOpen,
  onClose,
  apiUrl,
  apiKey,
  instanceName,
  onQrCodeReceived,
  onInstanceCreated,
}) => {
  const [activeTab, setActiveTab] = useState<"steps" | "terminal" | "guide">("steps");
  const [isRunning, setIsRunning] = useState(false);
  const [isCreatingInstance, setIsCreatingInstance] = useState(false);
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  if (!isOpen) return null;

  const currentInstance = (instanceName || "acolhemente").trim();
  const currentUrl = (apiUrl || "").trim();

  const handleRunDiagnosis = async () => {
    setIsRunning(true);
    setActionFeedback(null);
    try {
      const res = await safeFetchJson<DiagnosticReport>("/api/whatsapp/evolution/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiUrl: currentUrl,
          apiKey,
          instanceName: currentInstance,
          webhookUrl: `${window.location.origin}/api/whatsapp/webhook`,
        }),
      });

      const data = res.data;
      if (res.ok && data && data.success) {
        setReport(data);
        // Expand the first error or the webhook step for easy review
        const errorStep = data.steps.find((s: DiagnosticStepResult) => s.status === "error");
        if (errorStep) {
          setExpandedStepId(errorStep.stepId);
        } else {
          setExpandedStepId(data.steps[3]?.stepId || data.steps[0]?.stepId);
        }

        if (data.capturedQrCode && onQrCodeReceived) {
          onQrCodeReceived(data.capturedQrCode, data.capturedPairingCode);
        }
      } else {
        setActionFeedback({
          type: "error",
          message: (data as any)?.error || res.error || "Erro ao executar diagnóstico.",
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: "error",
        message: err?.message || "Falha de rede ao se comunicar com o backend.",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleCreateInstanceNow = async () => {
    setIsCreatingInstance(true);
    setActionFeedback(null);
    try {
      const res = await safeFetchJson<any>("/api/whatsapp/evolution/create-instance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiUrl: currentUrl,
          apiKey,
          instanceName: currentInstance,
          webhookUrl: `${window.location.origin}/api/whatsapp/webhook`,
        }),
      });

      const data = res.data;
      if (res.ok && data && data.success) {
        setActionFeedback({
          type: "success",
          message: `Instância "${currentInstance}" criada com sucesso! Re-executando diagnóstico...`,
        });
        if (data.base64 && onQrCodeReceived) {
          onQrCodeReceived(data.base64, data.pairingCode);
        }
        if (onInstanceCreated) {
          onInstanceCreated(currentInstance);
        }
        // Auto rerun diagnose
        setTimeout(() => {
          handleRunDiagnosis();
        }, 1200);
      } else {
        setActionFeedback({
          type: "error",
          message: data?.error || res.error || "Não foi possível criar a instância.",
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: "error",
        message: err?.message || "Falha de rede ao criar instância.",
      });
    } finally {
      setIsCreatingInstance(false);
    }
  };

  const handleCopyReport = () => {
    if (!report) return;
    const jsonStr = JSON.stringify(report, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const getStatusBadge = (status: DiagnosticStepResult["status"]) => {
    switch (status) {
      case "success":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Sucesso
          </span>
        );
      case "warning":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-900">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Atenção
          </span>
        );
      case "error":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-800">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            Erro
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-gray-100 text-gray-700">
            Pendente
          </span>
        );
    }
  };

  return (
    <div
      id="evolution-diagnostic-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-forest/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl border border-soft flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-soft bg-warm/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/10 text-emerald-700 flex items-center justify-center font-bold">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-forest">
                  Diagnóstico Avançado da Evolution API
                </h3>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-mono font-bold px-2 py-0.5 rounded">
                  v2.x
                </span>
              </div>
              <p className="text-xs text-forest/70">
                Inspeciona conectividade, chaves, instância e os endpoints{" "}
                <code className="bg-white/80 px-1 py-0.5 rounded text-[11px] font-mono text-emerald-800">
                  /webhook/set
                </code>{" "}
                e{" "}
                <code className="bg-white/80 px-1 py-0.5 rounded text-[11px] font-mono text-emerald-800">
                  /instance/connect
                </code>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-forest/50 hover:text-forest hover:bg-warm/40 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar & Summary */}
        <div className="px-4 sm:px-6 py-3 bg-warm/10 border-b border-soft flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-forest/80">
            <div>
              <span className="text-forest/50 font-sans">URL: </span>
              <span className="font-bold text-forest">{currentUrl || "Não informada"}</span>
            </div>
            <div className="hidden sm:inline text-soft">•</div>
            <div>
              <span className="text-forest/50 font-sans">Instância: </span>
              <span className="font-bold text-emerald-800">{currentInstance}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {report && (
              <button
                type="button"
                onClick={handleCopyReport}
                className="px-3 py-1.5 rounded-xl border border-soft hover:bg-white text-forest text-xs font-semibold transition-all flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5 text-forest/60" />
                <span>{copiedText ? "Copiado!" : "Copiar Relatório"}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleRunDiagnosis}
              disabled={isRunning || !currentUrl}
              className="px-4 py-1.5 rounded-xl bg-forest hover:bg-forest/90 text-white font-bold text-xs transition-all shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-sun" />
                  <span>Testando Endpoints...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-sun fill-sun" />
                  <span>{report ? "Executar Novamente" : "Iniciar Diagnóstico"}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {actionFeedback && (
          <div
            className={`px-6 py-2.5 text-xs font-medium flex items-center justify-between border-b ${
              actionFeedback.type === "success"
                ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                : "bg-rose-50 text-rose-900 border-rose-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {actionFeedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{actionFeedback.message}</span>
            </div>
            <button
              onClick={() => setActionFeedback(null)}
              className="opacity-70 hover:opacity-100 text-xs ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Tabs Bar */}
        <div className="px-6 border-b border-soft flex items-center gap-4 text-xs font-bold text-forest/70">
          <button
            type="button"
            onClick={() => setActiveTab("steps")}
            className={`py-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "steps"
                ? "border-emerald-600 text-emerald-800"
                : "border-transparent hover:text-forest"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Passos do Diagnóstico</span>
            {report && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800">
                {report.steps.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("terminal")}
            className={`py-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "terminal"
                ? "border-emerald-600 text-emerald-800"
                : "border-transparent hover:text-forest"
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Console & Logs Brutos (JSON)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("guide")}
            className={`py-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "guide"
                ? "border-emerald-600 text-emerald-800"
                : "border-transparent hover:text-forest"
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Por que /webhook/set não gera QR Code?</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {!report && !isRunning && (
            <div className="py-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
                <Activity className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-forest">
                Pronto para Testar a Conexão com a Evolution API
              </h4>
              <p className="text-xs text-forest/70 max-w-md mx-auto">
                Clique no botão abaixo para testar sequencialmente a URL base, a chave de
                autenticação, a existência da instância, o endpoint{" "}
                <code className="text-emerald-800 font-bold">/webhook/set</code> e a recuperação do QR
                Code em tempo real.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleRunDiagnosis}
                  disabled={!currentUrl}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-all shadow-md inline-flex items-center gap-2"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Iniciar Diagnóstico Completo</span>
                </button>
              </div>
            </div>
          )}

          {isRunning && (
            <div className="py-12 text-center space-y-3 animate-in fade-in duration-200">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
              <h4 className="text-sm font-bold text-forest">
                Executando Bateria de Testes na Evolution API...
              </h4>
              <p className="text-xs text-forest/60 max-w-sm mx-auto">
                Consultando conectividade, autenticação com API key, status do webhook e gerador de QR
                Code...
              </p>
            </div>
          )}

          {/* TAB: STEPS */}
          {report && !isRunning && activeTab === "steps" && (
            <div className="space-y-4">
              {/* Summary Card */}
              <div
                className={`p-4 rounded-xl border ${
                  report.hasAuthError || report.has404Instance
                    ? "bg-amber-50/80 border-amber-300 text-amber-950"
                    : report.capturedQrCode
                    ? "bg-emerald-50/80 border-emerald-300 text-emerald-950"
                    : "bg-sky-50/80 border-sky-300 text-sky-950"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {report.hasAuthError ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      ) : report.has404Instance ? (
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                      <h4 className="font-bold text-sm">Resumo da Análise Automática</h4>
                    </div>
                    <p className="text-xs leading-relaxed">{report.summary}</p>
                  </div>

                  {report.has404Instance && (
                    <button
                      type="button"
                      onClick={handleCreateInstanceNow}
                      disabled={isCreatingInstance}
                      className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs transition-all shadow-sm shrink-0 flex items-center gap-1.5"
                    >
                      {isCreatingInstance ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Criando...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5" />
                          <span>Criar Instância "{currentInstance}"</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* QR Code Alert Preview if captured */}
              {report.capturedQrCode && (
                <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                  <div className="p-2 bg-white rounded-xl border border-emerald-200 shadow-sm shrink-0">
                    <img
                      src={
                        report.capturedQrCode.startsWith("data:")
                          ? report.capturedQrCode
                          : `data:image/png;base64,${report.capturedQrCode}`
                      }
                      alt="QR Code WhatsApp"
                      className="w-32 h-32 object-contain"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-900">
                      <QrCode className="w-3.5 h-3.5" />
                      <span>QR Code Capturado com Sucesso!</span>
                    </div>
                    <h5 className="font-bold text-forest text-sm">
                      Pronto para conectar seu WhatsApp
                    </h5>
                    <p className="text-xs text-forest/80 leading-relaxed">
                      O teste gerou a imagem base64 diretamente da Evolution API. Abra seu WhatsApp
                      no smartphone &gt; <strong>Aparelhos conectados</strong> &gt;{" "}
                      <strong>Conectar um aparelho</strong> e aponte para a imagem acima.
                    </p>
                    {report.capturedPairingCode && (
                      <p className="text-xs font-mono bg-white p-1.5 rounded border border-emerald-200 text-emerald-900">
                        Código de emparelhamento alternativo: <strong>{report.capturedPairingCode}</strong>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Step by Step List */}
              <div className="space-y-2.5">
                {report.steps.map((step, idx) => {
                  const isExpanded = expandedStepId === step.stepId;
                  return (
                    <div
                      key={step.stepId}
                      className={`border rounded-xl transition-all overflow-hidden ${
                        step.status === "error"
                          ? "border-rose-300 bg-rose-50/30"
                          : step.status === "warning"
                          ? "border-amber-300 bg-amber-50/30"
                          : "border-soft bg-white"
                      }`}
                    >
                      {/* Step Header */}
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedStepId(isExpanded ? null : step.stepId)
                        }
                        className="w-full p-3.5 flex items-center justify-between gap-3 text-left hover:bg-warm/10 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                              step.status === "success"
                                ? "bg-emerald-100 text-emerald-800"
                                : step.status === "error"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {idx + 1}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs text-forest">
                                {step.name}
                              </span>
                              <span className="px-1.5 py-0.2 rounded bg-forest/5 font-mono text-[10px] text-forest/70 font-semibold">
                                {step.httpMethod}
                              </span>
                              {step.responseStatus !== undefined && (
                                <span
                                  className={`px-1.5 py-0.2 rounded font-mono text-[10px] font-bold ${
                                    step.responseStatus >= 200 && step.responseStatus < 300
                                      ? "bg-emerald-100 text-emerald-800"
                                      : step.responseStatus === 404
                                      ? "bg-amber-100 text-amber-900"
                                      : "bg-rose-100 text-rose-800"
                                  }`}
                                >
                                  HTTP {step.responseStatus}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-forest/70 truncate mt-0.5 font-mono">
                              {step.endpoint}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {getStatusBadge(step.status)}
                          <span className="text-[10px] font-mono text-forest/50 flex items-center gap-0.5">
                            <Clock className="w-3 h-3" />
                            {step.durationMs}ms
                          </span>
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-forest/60" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-forest/60" />
                          )}
                        </div>
                      </button>

                      {/* Step Details */}
                      {isExpanded && (
                        <div className="p-4 border-t border-soft/60 space-y-3 bg-warm/15 text-xs text-forest/90">
                          {/* Diagnosis & Recommendation Box */}
                          <div className="space-y-1.5 p-3 rounded-lg bg-white border border-soft">
                            <div className="font-bold text-forest flex items-center gap-1.5">
                              <Info className="w-3.5 h-3.5 text-sky-600" />
                              <span>Diagnóstico & Análise Técnica:</span>
                            </div>
                            <p className="text-xs leading-relaxed text-forest/80">
                              {step.diagnosis}
                            </p>
                            {step.recommendation && (
                              <div className="mt-2 pt-2 border-t border-soft/60 text-[11px] text-emerald-900 bg-emerald-50/60 p-2 rounded">
                                <span className="font-bold">Recomendação: </span>
                                <span>{step.recommendation}</span>
                              </div>
                            )}
                          </div>

                          {/* Request / Response Details Toggle */}
                          <div className="space-y-2">
                            <div className="text-[11px] font-bold text-forest/70 uppercase tracking-wider">
                              Detalhes Técnicos da Requisição
                            </div>

                            {step.requestHeaders && (
                              <div className="space-y-1">
                                <span className="text-[10px] font-semibold text-forest/60">
                                  Headers Enviados:
                                </span>
                                <pre className="p-2 bg-forest/5 rounded border border-soft/60 font-mono text-[10px] text-forest/80 overflow-x-auto">
                                  {JSON.stringify(step.requestHeaders, null, 2)}
                                </pre>
                              </div>
                            )}

                            {step.requestBody && (
                              <div className="space-y-1">
                                <span className="text-[10px] font-semibold text-forest/60">
                                  Body Enviado (Payload):
                                </span>
                                <pre className="p-2 bg-forest/5 rounded border border-soft/60 font-mono text-[10px] text-forest/80 overflow-x-auto">
                                  {JSON.stringify(step.requestBody, null, 2)}
                                </pre>
                              </div>
                            )}

                            {step.responseBody !== undefined && (
                              <div className="space-y-1">
                                <span className="text-[10px] font-semibold text-forest/60">
                                  Resposta Recebida da Evolution API:
                                </span>
                                <pre className="p-2 bg-forest/5 rounded border border-soft/60 font-mono text-[10px] text-forest/80 overflow-x-auto max-h-40">
                                  {JSON.stringify(step.responseBody, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB: TERMINAL / RAW JSON */}
          {report && !isRunning && activeTab === "terminal" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-forest/70">
                  Relatório completo em formato JSON (ideal para depuração ou suporte)
                </span>
                <button
                  type="button"
                  onClick={handleCopyReport}
                  className="px-3 py-1 bg-forest text-white rounded-lg font-bold text-xs flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5 text-sun" />
                  <span>{copiedText ? "Copiado!" : "Copiar JSON"}</span>
                </button>
              </div>
              <pre className="p-4 bg-forest text-emerald-300 rounded-xl font-mono text-[11px] leading-relaxed overflow-x-auto max-h-[500px] border border-forest/80 selection:bg-emerald-600 selection:text-white">
                {JSON.stringify(report, null, 2)}
              </pre>
            </div>
          )}

          {/* TAB: ARCHITECTURAL GUIDE */}
          {activeTab === "guide" && (
            <div className="space-y-4 text-xs text-forest/80 leading-relaxed">
              <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl space-y-2">
                <h5 className="font-bold text-sky-950 text-sm flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-sky-700" />
                  <span>Por que o endpoint /webhook/set/acolhemente não gera o QR Code?</span>
                </h5>
                <p>
                  Na arquitetura da <strong>Evolution API v2</strong>, cada endpoint possui uma
                  responsabilidade estrita e única:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="p-4 rounded-xl border border-soft bg-warm/20 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-forest">
                    <Webhook className="w-4 h-4 text-sky-600" />
                    <span>1. Endpoint /webhook/set/:instance</span>
                  </div>
                  <p className="text-[11px] text-forest/70">
                    <strong>Objetivo:</strong> Apenas cadastrar a URL que receberá notificações em
                    segundo plano (ex: quando alguém envia uma mensagem ou quando o status da conexão
                    muda).
                  </p>
                  <p className="text-[11px] text-rose-700 font-semibold bg-rose-50 p-2 rounded border border-rose-200">
                    ⚠️ Não retorna nenhuma imagem de QR Code na resposta HTTP. Além disso, se a
                    instância não existir previamente, retorna <strong>404 Not Found</strong>.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-soft bg-warm/20 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-forest">
                    <QrCode className="w-4 h-4 text-emerald-600" />
                    <span>2. Endpoint /instance/connect/:instance</span>
                  </div>
                  <p className="text-[11px] text-forest/70">
                    <strong>Objetivo:</strong> Iniciar a conexão do socket WhatsApp (Baileys) e
                    gerar o QR Code para escaneamento.
                  </p>
                  <p className="text-[11px] text-emerald-800 font-semibold bg-emerald-50 p-2 rounded border border-emerald-200">
                    ✅ Retorna o campo <code>base64</code> da imagem do QR Code e opcionalmente o{" "}
                    <code>pairingCode</code> para digitação manual no WhatsApp.
                  </p>
                </div>
              </div>

              {/* Step by step flow */}
              <div className="p-4 rounded-xl border border-soft bg-white space-y-3">
                <h6 className="font-bold text-forest text-xs uppercase tracking-wider">
                  Fluxo Correto de Inicialização e Conexão (3 Passos):
                </h6>
                <div className="space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                      1
                    </span>
                    <div>
                      <strong className="text-forest">Criar a Instância:</strong> Chamar{" "}
                      <code className="bg-forest/5 px-1 rounded text-emerald-800">
                        POST /instance/create
                      </code>{" "}
                      com <code>instanceName: "acolhemente"</code> e <code>qrcode: true</code>.
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                      2
                    </span>
                    <div>
                      <strong className="text-forest">Configurar o Webhook:</strong> Chamar{" "}
                      <code className="bg-forest/5 px-1 rounded text-emerald-800">
                        POST /webhook/set/acolhemente
                      </code>{" "}
                      para que o sistema receba eventos de mensagens e entregas.
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                      3
                    </span>
                    <div>
                      <strong className="text-forest">Solicitar e Exibir o QR Code:</strong> Chamar{" "}
                      <code className="bg-forest/5 px-1 rounded text-emerald-800">
                        GET /instance/connect/acolhemente
                      </code>{" "}
                      e renderizar o atributo <code>base64</code> na tela para o usuário escanear.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-soft bg-warm/20 flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="text-forest/60">
            AcolheMente • Diagnóstico de Conexão WhatsApp Evolution
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-soft hover:bg-white text-forest font-semibold transition-all"
            >
              Fechar
            </button>

            {report?.has404Instance && (
              <button
                type="button"
                onClick={handleCreateInstanceNow}
                disabled={isCreatingInstance}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                {isCreatingInstance ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5" />
                )}
                <span>Criar Instância Agora</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
