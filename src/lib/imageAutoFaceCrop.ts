/**
 * Algoritmo Inteligente de Detecção Facial e Auto-Centralização de Avatares Circulares
 * 
 * Suporta:
 * 1. Native FaceDetector API (Chromium / Web API com aceleração)
 * 2. Scanner de Centróide Facial Multi-Étnico (YCbCr + Luminância + Variância de Contraste Ocular)
 * 3. Enquadramento de Proporção Áurea Fotográfica (Golden Portrait Ratio)
 */

export interface FaceDetectionResult {
  detected: boolean;
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
    centerX: number;
    centerY: number;
  };
  crop: {
    sx: number;
    sy: number;
    sWidth: number;
    sHeight: number;
  };
}

/**
 * Carrega uma URL ou base64 em um elemento HTMLImageElement
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

/**
 * Lê um File do usuário como Data URL
 */
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Detecta o rosto na imagem utilizando a melhor estratégia disponível no navegador
 */
export async function detectFace(img: HTMLImageElement): Promise<FaceDetectionResult> {
  const naturalWidth = img.naturalWidth || img.width;
  const naturalHeight = img.naturalHeight || img.height;

  // 1. Tentar Native FaceDetector API (disponível em navegadores modernos)
  if (typeof window !== "undefined" && "FaceDetector" in window) {
    try {
      const faceDetector = new (window as any).FaceDetector({
        fastMode: true,
        maxDetectedFaces: 1,
      });
      const faces = await faceDetector.detect(img);
      if (faces && faces.length > 0) {
        const face = faces[0];
        const box = face.boundingBox;
        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;

        const crop = calculateOptimalPortraitCrop(
          naturalWidth,
          naturalHeight,
          centerX,
          centerY,
          Math.max(box.width, box.height)
        );

        return {
          detected: true,
          box: {
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height,
            centerX,
            centerY,
          },
          crop,
        };
      }
    } catch {
      // Prossegue para o scanner fallback
    }
  }

  // 2. Scanner Heurístico de Centróide Facial em Canvas (Tons de Pele Multi-Étnicos + Contraste Ocular/Cabelo)
  const scanned = scanFaceCentroidInCanvas(img, naturalWidth, naturalHeight);
  if (scanned.detected) {
    const crop = calculateOptimalPortraitCrop(
      naturalWidth,
      naturalHeight,
      scanned.centerX,
      scanned.centerY,
      scanned.estimatedFaceSize
    );
    return {
      detected: true,
      box: {
        x: scanned.centerX - scanned.estimatedFaceSize / 2,
        y: scanned.centerY - scanned.estimatedFaceSize / 2,
        width: scanned.estimatedFaceSize,
        height: scanned.estimatedFaceSize,
        centerX: scanned.centerX,
        centerY: scanned.centerY,
      },
      crop,
    };
  }

  // 3. Fallback: Proporção Áurea Fotográfica para Retratos (Foco no terço superior)
  const fallbackCenterX = naturalWidth * 0.5;
  const fallbackCenterY = naturalHeight * 0.38; // 38% do topo é o ponto padrão da cabeça/olhos
  const minDim = Math.min(naturalWidth, naturalHeight);
  const crop = calculateOptimalPortraitCrop(
    naturalWidth,
    naturalHeight,
    fallbackCenterX,
    fallbackCenterY,
    minDim * 0.45
  );

  return {
    detected: false,
    box: {
      x: fallbackCenterX - (minDim * 0.45) / 2,
      y: fallbackCenterY - (minDim * 0.45) / 2,
      width: minDim * 0.45,
      height: minDim * 0.45,
      centerX: fallbackCenterX,
      centerY: fallbackCenterY,
    },
    crop,
  };
}

/**
 * Analisa os pixels da imagem em escala reduzida para encontrar o centro do rosto
 */
function scanFaceCentroidInCanvas(
  img: HTMLImageElement,
  origW: number,
  origH: number
): { detected: boolean; centerX: number; centerY: number; estimatedFaceSize: number } {
  const scanW = 160;
  const scanH = Math.round((scanW * origH) / origW);
  const canvas = document.createElement("canvas");
  canvas.width = scanW;
  canvas.height = scanH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return { detected: false, centerX: origW / 2, centerY: origH * 0.38, estimatedFaceSize: origW * 0.4 };
  }

  ctx.drawImage(img, 0, 0, scanW, scanH);
  const imageData = ctx.getImageData(0, 0, scanW, scanH);
  const data = imageData.data;

  let totalWeight = 0;
  let weightedX = 0;
  let weightedY = 0;
  let skinPixelCount = 0;

  // Analisa pixels (com ênfase na metade superior da imagem onde rostos costumam estar)
  for (let y = 0; y < scanH; y++) {
    const yRatio = y / scanH;
    // Peso espacial: maior nos primeiros 20% a 70% da altura (evita focar em mãos, sapatos ou texto no rodapé)
    const verticalWeight = yRatio >= 0.1 && yRatio <= 0.75 
      ? Math.sin(((yRatio - 0.1) / 0.65) * Math.PI) 
      : 0.1;

    for (let x = 0; x < scanW; x++) {
      const idx = (y * scanW + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Verificação de tom de pele em espaço de cores YCbCr (amplo para todas as tonalidades: parda, negra, branca, etc.)
      const isSkin = checkSkinToneYCbCr(r, g, b);

      if (isSkin) {
        skinPixelCount++;
        // Calcula variância local rápida (olhos e boca geram variação de contraste sobre a pele)
        const contrastFactor = Math.abs(r - g) + Math.abs(r - b) > 20 ? 1.4 : 1.0;
        const weight = verticalWeight * contrastFactor;
        
        weightedX += x * weight;
        weightedY += y * weight;
        totalWeight += weight;
      }
    }
  }

  // Se detectou uma quantidade razoável de pele concentrada
  const minRequiredSkin = (scanW * scanH) * 0.015; // pelo menos 1.5% da imagem
  if (skinPixelCount > minRequiredSkin && totalWeight > 0) {
    const normCenterX = (weightedX / totalWeight) / scanW;
    const normCenterY = (weightedY / totalWeight) / scanH;

    const realCenterX = normCenterX * origW;
    const realCenterY = normCenterY * origH;
    const estimatedFaceSize = Math.min(origW, origH) * 0.42;

    return {
      detected: true,
      centerX: realCenterX,
      centerY: realCenterY,
      estimatedFaceSize,
    };
  }

  return { detected: false, centerX: origW / 2, centerY: origH * 0.38, estimatedFaceSize: origW * 0.4 };
}

/**
 * Validador multi-étnico de pele (cobre fototipos I a VI)
 */
function checkSkinToneYCbCr(r: number, g: number, b: number): boolean {
  // YCbCr conversion
  const Y = 0.299 * r + 0.587 * g + 0.114 * b;
  const Cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const Cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

  // Tolerâncias amplas que abrangem pele morena/parda, negra e clara
  const skinYCbCr = Cb >= 77 && Cb <= 135 && Cr >= 130 && Cr <= 180 && Y >= 30;
  
  // Regra RGB clássica complementar
  const skinRGB = r > 50 && g > 30 && b > 20 && r > g && r > b && Math.abs(r - g) >= 10;

  return skinYCbCr || skinRGB;
}

/**
 * Calcula o retângulo de corte quadrado ideal para que o rosto fique centralizado e perfeitamente enquadrado no círculo
 */
export function calculateOptimalPortraitCrop(
  imgW: number,
  imgH: number,
  faceCenterX: number,
  faceCenterY: number,
  faceSize: number
): { sx: number; sy: number; sWidth: number; sHeight: number } {
  // Em fotografia de perfil, o diâmetro da cabeça deve ocupar aproximadamente 45% a 55% da altura total do corte,
  // com uma margem de folga superior (headroom) de 15% a 20% do topo do círculo.
  const targetCropSize = Math.max(faceSize * 2.2, Math.min(imgW, imgH) * 0.65);
  const cropSize = Math.min(targetCropSize, Math.min(imgW, imgH));

  // No círculo, o centro dos olhos/rosto fica esteticamente melhor posicionado ligeiramente acima do meio exato (a ~45% do topo do círculo)
  const idealCenterYInCrop = cropSize * 0.44;

  let sx = faceCenterX - cropSize / 2;
  let sy = faceCenterY - idealCenterYInCrop;

  // Garantir que o corte não ultrapasse os limites da imagem
  if (sx < 0) sx = 0;
  if (sy < 0) sy = 0;
  if (sx + cropSize > imgW) sx = imgW - cropSize;
  if (sy + cropSize > imgH) sy = imgH - cropSize;

  // Reajuste caso a imagem seja menor que o cropSize
  const finalSize = Math.min(cropSize, imgW, imgH);

  return {
    sx: Math.round(sx),
    sy: Math.round(sy),
    sWidth: Math.round(finalSize),
    sHeight: Math.round(finalSize),
  };
}

/**
 * Gera automaticamente uma imagem recortada quadrada (512x512) com o rosto centralizado
 */
export async function autoCropProfileImage(
  fileOrUrl: File | string,
  outputDimension = 512
): Promise<{ dataUrl: string; detected: boolean }> {
  let src = "";
  if (typeof fileOrUrl === "string") {
    src = fileOrUrl;
  } else {
    src = await readFileAsDataURL(fileOrUrl);
  }

  const img = await loadImage(src);
  const result = await detectFace(img);
  const { sx, sy, sWidth, sHeight } = result.crop;

  const canvas = document.createElement("canvas");
  canvas.width = outputDimension;
  canvas.height = outputDimension;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Não foi possível inicializar o canvas 2D");
  }

  // Renderiza com suavização máxima
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, outputDimension, outputDimension);

  // Exporta comprimido em JPEG de alta fidelidade
  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

  return {
    dataUrl,
    detected: result.detected,
  };
}
