/**
 * Utilitário para redimensionamento e compressão otimizada de imagens temáticas
 * de Eventos e Serviços no navegador (HTML5 Canvas), garantindo alta nitidez
 * visual e compatibilidade segura com o limite de documentos do Firestore.
 */

export async function compressThematicImage(
  file: File,
  maxDimension = 1200,
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Selecione um arquivo de imagem válido (JPG, PNG ou WebP).");
  }

  if (file.size > 15 * 1024 * 1024) {
    throw new Error("A imagem original deve ter no máximo 15 MB.");
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Falha ao ler o arquivo de imagem."));
      }
    };
    reader.onerror = () => reject(new Error("Erro ao abrir o arquivo selecionado."));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Não foi possível processar esta imagem."));
    image.src = dataUrl;
  });

  let targetWidth = img.naturalWidth || img.width;
  let targetHeight = img.naturalHeight || img.height;

  if (targetWidth > maxDimension || targetHeight > maxDimension) {
    if (targetWidth >= targetHeight) {
      targetHeight = Math.round((targetHeight * maxDimension) / targetWidth);
      targetWidth = maxDimension;
    } else {
      targetWidth = Math.round((targetWidth * maxDimension) / targetHeight);
      targetHeight = maxDimension;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, targetWidth);
  canvas.height = Math.max(1, targetHeight);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Seu navegador não suporta otimização gráfica de imagens.");
  }

  // Fundo neutro caso a imagem original seja PNG transparente
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // Tenta WebP de alta eficiência primeiro; fallback para JPEG
  let compressed = canvas.toDataURL("image/webp", 0.82);
  if (!compressed.startsWith("data:image/webp")) {
    compressed = canvas.toDataURL("image/jpeg", 0.8);
  }

  // Caso artes muito densas ultrapassem ~380 KB em base64, aplica segunda passagem suave
  if (compressed.length > 390_000) {
    const retryScale = 0.82;
    const secondCanvas = document.createElement("canvas");
    secondCanvas.width = Math.max(1, Math.round(canvas.width * retryScale));
    secondCanvas.height = Math.max(1, Math.round(canvas.height * retryScale));
    const ctx2 = secondCanvas.getContext("2d");
    if (ctx2) {
      ctx2.fillStyle = "#FFFFFF";
      ctx2.fillRect(0, 0, secondCanvas.width, secondCanvas.height);
      ctx2.drawImage(canvas, 0, 0, secondCanvas.width, secondCanvas.height);
      compressed = secondCanvas.toDataURL("image/jpeg", 0.72);
    }
  }

  return compressed;
}

/**
 * Formata datas YYYY-MM-DD para DD/MM/AAAA preservando textos livres se já formatados.
 */
export function formatEventDateDisplay(rawDate?: string): string {
  if (!rawDate) return "";
  const trimmed = rawDate.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  return trimmed;
}
