import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error captured by ErrorBoundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearCache = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      
      // Try to unregister service workers if any
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister();
          }
        });
      }
      
      // Perform a hard reload
      window.location.href = window.location.origin;
    } catch (e) {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF6F0] p-6 text-[#1A3020]">
          <div className="w-full max-w-xl bg-white rounded-[2rem] p-8 md:p-10 shadow-xl border border-[#EBE3D5] text-center">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8" />
            </div>
            
            <h2 className="font-serif text-3xl font-medium mb-4 text-[#1A3020]">
              Ops! Algo deu errado.
            </h2>
            
            <p className="text-[#1A3020]/70 mb-6 text-sm max-w-md mx-auto">
              Ocorreu um erro inesperado no aplicativo. Isso pode ser causado por dados antigos em cache ou uma falha temporária de conexão.
            </p>

            {this.state.error && (
              <div className="bg-[#FAF6F0] rounded-2xl p-4 mb-8 text-left border border-[#EBE3D5] max-h-40 overflow-auto">
                <p className="font-mono text-xs text-red-700 break-all font-semibold">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <pre className="font-mono text-[10px] text-[#1A3020]/60 mt-2 whitespace-pre-wrap leading-relaxed">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="px-6 py-3 bg-[#1A3020] text-white rounded-full font-semibold hover:bg-[#1A3020]/90 transition-colors flex items-center justify-center gap-2 text-sm shadow-md cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" /> Recarregar Página
              </button>
              
              <button
                onClick={this.handleClearCache}
                className="px-6 py-3 border border-[#EBE3D5] text-[#1A3020]/80 rounded-full font-semibold hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> Limpar Cache e Reiniciar
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
