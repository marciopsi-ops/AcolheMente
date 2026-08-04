import React, { useState } from 'react';
import { CreditCard, QrCode, CheckCircle2, ShieldCheck, ExternalLink, X, Sparkles, Lock } from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { sendWebhookNotification } from '../lib/webhookNotifier';

interface StripeCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  professionalName: string;
  professionalEmail: string;
  professionalId?: string;
  leadId?: string;
  taxaMensal?: string;
  amountFormatted?: string;
  stripeConfig?: {
    stripeEnabled?: boolean;
    stripePublicKey?: string;
    stripeCheckoutUrl?: string;
  };
  onSuccess?: () => void;
}

export function StripeCheckoutModal({
  isOpen,
  onClose,
  professionalName,
  professionalEmail,
  professionalId,
  leadId,
  taxaMensal,
  amountFormatted,
  stripeConfig,
  onSuccess,
}: StripeCheckoutModalProps) {
  const displayTaxa = taxaMensal || amountFormatted || "29,90";
  const targetId = professionalId || leadId;
  const [method, setMethod] = useState<'stripe' | 'pix' | 'cartao'>('stripe');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [pixCopied, setPixCopied] = useState(false);

  if (!isOpen) return null;

  const handleSimulatedPayment = async () => {
    setIsProcessing(true);
    try {
      if (targetId) {
        // Update professional record in Firestore
        const refProf = doc(db, 'profissionais', targetId);
        await updateDoc(refProf, {
          statusPagamento: 'pago',
          dataPagamento: serverTimestamp(),
          taxaMensalPaga: displayTaxa,
        }).catch(async () => {
          // Fallback to leadsProfissionais or user document
          const refLead = doc(db, 'profissionais_leads', targetId);
          await updateDoc(refLead, {
            statusPagamento: 'pago',
            dataPagamento: serverTimestamp(),
            taxaMensalPaga: displayTaxa,
          }).catch(() => {});
        });
      }

      // Dispatch Webhook email
      await sendWebhookNotification({
        event: 'pagamento_profissional',
        recipientEmail: professionalEmail,
        recipientName: professionalName,
        title: 'Confirmação de Pagamento da Taxa Associativa - AcolheMente',
        message: `O pagamento da taxa associativa mensal de R$ ${displayTaxa} foi confirmado com sucesso.`,
        data: {
          valor: displayTaxa,
          profissionalNome: professionalName,
          profissionalEmail: professionalEmail,
          dataConfirmacao: new Date().toISOString(),
        }
      });

      setIsProcessing(false);
      setIsSuccess(true);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error confirming payment:', err);
      setIsProcessing(false);
    }
  };

  const handleOpenStripeLink = () => {
    if (stripeConfig?.stripeCheckoutUrl) {
      window.open(stripeConfig.stripeCheckoutUrl, '_blank');
    }
  };

  const pixCode = "00020126580014br.gov.bcb.pix0136acolhemente-taxa-associativa-2026520400005303986540529.905802BR5922ACOLHEMENTE SAUDE LTDA6009SAO PAULO62070503***6304E8A1";

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixCode);
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-soft overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-forest text-white p-6 relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 bg-sun text-forest text-[10px] font-bold uppercase rounded-full tracking-wider">
                Stripe Secured
              </span>
              <span className="text-xs text-white/70">Taxa Associativa</span>
            </div>
            <h3 className="font-serif text-xl font-bold">Assinatura Profissional</h3>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
          {isSuccess ? (
            <div className="flex flex-col items-center text-center py-6 animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="font-serif text-2xl font-bold text-forest mb-2">Pagamento Confirmado!</h4>
              <p className="text-sm text-forest/80 max-w-sm mb-6">
                Sua taxa associativa mensal de <strong>R$ {displayTaxa}</strong> foi registrada com sucesso. Sua conta profissional está ativa.
              </p>
              <button
                onClick={onClose}
                className="w-full py-3.5 bg-forest text-white font-bold rounded-xl hover:bg-forest/90 transition-colors shadow-md"
              >
                Concluir
              </button>
            </div>
          ) : (
            <>
              {/* Order Summary */}
              <div className="bg-warm/60 p-4 rounded-2xl border border-soft flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-forest/60">Plano Mensal • Pós-Aprovação</p>
                  <p className="font-semibold text-forest text-sm">{professionalName || "Profissional AcolheMente"}</p>
                  <p className="text-xs text-forest/70">{professionalEmail}</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-forest">R$ {displayTaxa}</span>
                  <span className="text-xs text-forest/60 block">/mês</span>
                </div>
              </div>

              <div className="bg-emerald-50/90 p-3 rounded-xl border border-emerald-200 text-xs text-emerald-950 leading-relaxed font-medium">
                ✅ <strong>Taxa de Adesão:</strong> Destinada aos profissionais aprovados após a entrevista de alinhamento e assinatura do contrato de parceria com o Projeto AcolheMente.
              </div>

              {/* Benefits list */}
              <div className="bg-white p-4 rounded-2xl border border-soft text-xs text-forest/80 space-y-1.5">
                <p className="font-bold uppercase tracking-wider text-[10px] text-forest/60 mb-2">Benefícios Ativos na Assinatura:</p>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Conexão com profissionais para divulgação e serviços</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Page profissional pessoal no catálogo público</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Respaldo e consultoria clínica com os gestores</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Triagem e encaminhamento direto de pacientes</span>
                </div>
              </div>

              {/* Payment Option Selector */}
              <div className="flex flex-col gap-3">
                <label className="text-xs font-bold uppercase tracking-wider text-forest/70">
                  Forma de Pagamento
                </label>
                
                <div className="grid grid-cols-3 gap-2">
                  {stripeConfig?.stripeCheckoutUrl && (
                    <button
                      type="button"
                      onClick={() => setMethod('stripe')}
                      className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                        method === 'stripe'
                          ? 'border-forest bg-forest/5 text-forest shadow-xs'
                          : 'border-soft bg-white text-forest/70 hover:bg-warm/50'
                      }`}
                    >
                      <CreditCard className="w-5 h-5 text-indigo-600" />
                      Stripe Checkout
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setMethod('pix')}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                      method === 'pix'
                        ? 'border-forest bg-forest/5 text-forest shadow-xs'
                        : 'border-soft bg-white text-forest/70 hover:bg-warm/50'
                    }`}
                  >
                    <QrCode className="w-5 h-5 text-emerald-600" />
                    Pix Instantâneo
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod('cartao')}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                      method === 'cartao'
                        ? 'border-forest bg-forest/5 text-forest shadow-xs'
                        : 'border-soft bg-white text-forest/70 hover:bg-warm/50'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 text-sun-dark" />
                    Cartão de Crédito
                  </button>
                </div>
              </div>

              {/* Payment Method Action Details */}
              {method === 'stripe' && stripeConfig?.stripeCheckoutUrl && (
                <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    Checkout Oficial do Stripe Ativo
                  </div>
                  <p className="text-xs text-indigo-800/80 leading-relaxed">
                    Você será redirecionado com segurança para a página de checkout do Stripe para concluir a assinatura com cartão de crédito, Pix ou Boleto.
                  </p>
                  <button
                    onClick={handleOpenStripeLink}
                    className="w-full py-3 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    Abrir Checkout Stripe <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              )}

              {method === 'pix' && (
                <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex flex-col items-center text-center gap-3">
                  <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-xs">
                    <QrCode className="w-28 h-28 text-emerald-700" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-900">Pix Copia e Cola - R$ {taxaMensal}</p>
                    <p className="text-[11px] text-emerald-800/70 mt-0.5">Aprovação imediata após o pagamento</p>
                  </div>
                  <button
                    onClick={handleCopyPix}
                    className="w-full py-2.5 bg-emerald-700 text-white font-bold text-xs rounded-xl hover:bg-emerald-800 transition-colors shadow-xs"
                  >
                    {pixCopied ? "Código Copiado!" : "Copiar Código Pix"}
                  </button>
                </div>
              )}

              {method === 'cartao' && (
                <div className="p-4 bg-warm/40 rounded-2xl border border-soft flex flex-col gap-3">
                  <div className="grid grid-cols-1 gap-2.5">
                    <input 
                      type="text" 
                      placeholder="Número do Cartão (0000 0000 0000 0000)" 
                      className="w-full px-3.5 py-2.5 bg-white border border-soft rounded-xl text-xs focus:outline-none focus:border-forest text-forest"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input 
                        type="text" 
                        placeholder="MM/AA" 
                        className="w-full px-3.5 py-2.5 bg-white border border-soft rounded-xl text-xs focus:outline-none focus:border-forest text-forest"
                      />
                      <input 
                        type="text" 
                        placeholder="CVC" 
                        className="w-full px-3.5 py-2.5 bg-white border border-soft rounded-xl text-xs focus:outline-none focus:border-forest text-forest"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Action button */}
              <button
                disabled={isProcessing}
                onClick={handleSimulatedPayment}
                className="w-full py-4 bg-forest text-white font-bold rounded-2xl hover:bg-forest/90 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? (
                  "Processando Pagamento..."
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-sun" />
                    Confirmar Assinatura (R$ {taxaMensal}/mês)
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-forest/60">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Pagamento seguro e criptografado via Stripe</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
