import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Sparkles, 
  Check, 
  Move, 
  RefreshCw,
  Loader2,
  Sliders
} from "lucide-react";
import { detectFace, loadImage } from "../lib/imageAutoFaceCrop";

interface PhotoCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onSave: (croppedDataUrl: string) => void;
  title?: string;
}

export function PhotoCropModal({
  isOpen,
  onClose,
  imageSrc,
  onSave,
  title = "Enquadramento da Foto de Perfil",
}: PhotoCropModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Imagem original
  const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);

  // Transformações do Crop
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Drag state
  const isDragging = useRef(false);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const startOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Dimensão do Viewport do Crop
  const VIEWPORT_SIZE = 280; // tamanho do círculo na UI em pixels

  /**
   * Centraliza automaticamente o rosto detectado no círculo
   */
  const applyAutoFaceCentering = useCallback(async (img: HTMLImageElement) => {
    setLoading(true);
    try {
      const naturalW = img.naturalWidth || img.width;
      const naturalH = img.naturalHeight || img.height;

      // Executa detecção facial inteligente
      const result = await detectFace(img);
      setFaceDetected(result.detected);

      // Calcula a escala necessária para que o crop cubra o viewport
      const { sx, sy, sWidth, sHeight } = result.crop;

      // Proporção de escala para que a área cortada preencha o VIEWPORT_SIZE
      const scaleFactor = VIEWPORT_SIZE / sWidth;
      const baseScale = Math.max(VIEWPORT_SIZE / naturalW, VIEWPORT_SIZE / naturalH);
      const computedScale = Math.max(scaleFactor, baseScale);

      setScale(computedScale);
      setMinScale(baseScale);

      // Calcula o centro da imagem desenhada
      const centerX = sx + sWidth / 2;
      const centerY = sy + sHeight / 2;

      // Deslocamento para alinhar o centro do corte com o centro do viewport
      const targetOffsetX = (VIEWPORT_SIZE / 2) - (centerX * computedScale);
      const targetOffsetY = (VIEWPORT_SIZE / 2) - (centerY * computedScale);

      setOffset({
        x: targetOffsetX,
        y: targetOffsetY,
      });
      setRotation(0);

      if (result.detected) {
        setNotification("Rosto detectado e centralizado no círculo!");
      } else {
        setNotification("Enquadramento otimizado para foto de perfil.");
      }

      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      console.error("Erro na auto-centralização:", err);
    } finally {
      setLoading(false);
    }
  }, [VIEWPORT_SIZE]);

  // Carrega a imagem e executa a centralização inicial
  useEffect(() => {
    if (!isOpen || !imageSrc) return;

    let isMounted = true;
    setLoading(true);

    loadImage(imageSrc)
      .then((img) => {
        if (!isMounted) return;
        setImgElement(img);
        applyAutoFaceCentering(img);
      })
      .catch((err) => {
        console.error("Falha ao carregar imagem para crop:", err);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, imageSrc, applyAutoFaceCentering]);

  // Manipuladores de Drag / Pan
  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    startOffset.current = { ...offset };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setOffset({
      x: startOffset.current.x + dx,
      y: startOffset.current.y + dy,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignora erro se não capturado
    }
  };

  // Zoom via roda do mouse no círculo
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.08 : -0.08;
    setScale((prev) => {
      const next = Math.max(minScale * 0.8, Math.min(prev + zoomDelta, minScale * 4));
      return Number(next.toFixed(3));
    });
  };

  // Gira 90 graus
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Redefinir
  const handleReset = () => {
    if (imgElement) {
      applyAutoFaceCentering(imgElement);
    }
  };

  /**
   * Renderiza a imagem final recortada em alta resolução (512x512)
   */
  const handleSaveCrop = () => {
    if (!imgElement) return;
    setSaving(true);

    try {
      const outputDim = 512;
      const canvas = document.createElement("canvas");
      canvas.width = outputDim;
      canvas.height = outputDim;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Contexto 2D indisponível");
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Fator de conversão da UI do viewport para o canvas de alta resolução
      const ratio = outputDim / VIEWPORT_SIZE;

      ctx.save();
      // Aplica transformações relativas
      ctx.translate(offset.x * ratio, offset.y * ratio);

      const naturalW = imgElement.naturalWidth || imgElement.width;
      const naturalH = imgElement.naturalHeight || imgElement.height;

      // Aplica rotação se houver
      if (rotation !== 0) {
        ctx.translate((naturalW * scale * ratio) / 2, (naturalH * scale * ratio) / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.translate(-(naturalW * scale * ratio) / 2, -(naturalH * scale * ratio) / 2);
      }

      // Desenha imagem
      ctx.drawImage(
        imgElement,
        0,
        0,
        naturalW * scale * ratio,
        naturalH * scale * ratio
      );
      ctx.restore();

      // Exporta em JPEG otimizado
      const croppedDataUrl = canvas.toDataURL("image/jpeg", 0.92);
      onSave(croppedDataUrl);
      onClose();
    } catch (err) {
      console.error("Erro ao gerar crop:", err);
      alert("Não foi possível salvar a imagem ajustada.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-soft w-full max-w-md overflow-hidden flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-soft flex items-center justify-between bg-warm/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-sun/30 flex items-center justify-center text-forest">
              <Sparkles className="w-4 h-4 text-forest" />
            </div>
            <div>
              <h3 className="text-base font-bold text-forest">{title}</h3>
              <p className="text-xs text-forest/70">Centralize seu rosto para uma exibição perfeita</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-forest/60 hover:text-forest hover:bg-forest/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col items-center gap-5">
          {notification && (
            <div className="w-full py-2 px-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 justify-center font-medium animate-fadeIn">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{notification}</span>
            </div>
          )}

          {/* Viewport de Enquadramento */}
          <div className="relative flex items-center justify-center select-none">
            {/* Círculo com máscara escura em volta */}
            <div 
              className="relative overflow-hidden rounded-full shadow-inner border-4 border-sun/80 bg-neutral-900 cursor-grab active:cursor-grabbing touch-none"
              style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onWheel={handleWheel}
            >
              {loading ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-white/80 bg-neutral-900">
                  <Loader2 className="w-7 h-7 animate-spin text-sun" />
                  <span className="text-xs">Detectando e centralizando rosto...</span>
                </div>
              ) : imgElement ? (
                <div
                  className="absolute pointer-events-none origin-top-left will-change-transform"
                  style={{
                    transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg)`,
                    transformOrigin: "center center",
                  }}
                >
                  <img
                    src={imageSrc}
                    alt="Preview"
                    draggable={false}
                    className="max-w-none pointer-events-none"
                    style={{
                      width: (imgElement.naturalWidth || imgElement.width) * scale,
                      height: (imgElement.naturalHeight || imgElement.height) * scale,
                    }}
                  />
                </div>
              ) : null}

              {/* Guia visual de enquadramento (grade suave) */}
              <div className="absolute inset-0 pointer-events-none border border-white/20 rounded-full flex items-center justify-center">
                <div className="w-full h-[1px] bg-white/10" />
                <div className="h-full w-[1px] bg-white/10 absolute" />
              </div>
            </div>

            {/* Dica de arraste */}
            <div className="absolute bottom-2 bg-black/60 backdrop-blur-md text-white/90 text-[10px] px-2.5 py-1 rounded-full pointer-events-none flex items-center gap-1.5 shadow-sm">
              <Move className="w-3 h-3" /> Arraste para mover
            </div>
          </div>

          {/* Controles de Zoom e Ajustes */}
          <div className="w-full space-y-4 pt-1">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setScale((s) => Math.max(minScale * 0.8, Number((s - 0.1).toFixed(3))))}
                className="p-2 text-forest/70 hover:text-forest bg-warm hover:bg-soft rounded-xl transition-colors border border-soft"
                title="Afastar"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <div className="flex-1 flex flex-col gap-1">
                <div className="flex justify-between text-[11px] font-semibold text-forest/70">
                  <span>Zoom / Escala</span>
                  <span>{Math.round((scale / minScale) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={minScale * 0.8}
                  max={minScale * 3.5}
                  step={0.01}
                  value={scale}
                  onChange={(e) => setScale(parseFloat(e.target.value))}
                  className="w-full accent-forest cursor-pointer"
                />
              </div>

              <button
                type="button"
                onClick={() => setScale((s) => Math.min(minScale * 3.5, Number((s + 0.1).toFixed(3))))}
                className="p-2 text-forest/70 hover:text-forest bg-warm hover:bg-soft rounded-xl transition-colors border border-soft"
                title="Aproximar"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* Botões de Ações Rápidas */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleReset}
                disabled={loading}
                className="flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-forest bg-warm/80 hover:bg-warm rounded-xl border border-soft transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-sun-dark" />
                Auto-centralizar Rosto
              </button>

              <button
                type="button"
                onClick={handleRotate}
                disabled={loading}
                className="flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-forest bg-warm/80 hover:bg-warm rounded-xl border border-soft transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5 text-forest/70" />
                Girar 90°
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-soft bg-warm/30 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2.5 text-xs font-semibold text-forest/80 hover:text-forest transition-colors rounded-xl"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSaveCrop}
            disabled={loading || saving || !imgElement}
            className="px-6 py-2.5 bg-forest hover:bg-forest/90 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 text-sun" />
                Confirmar Foto
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
