import { useState, useRef, useEffect } from "react";

interface BlurImageBackgroundProps {
  src: string;
  alt: string;
  targetOpacity?: string;
  lowResSrc?: string;
  className?: string;
  scrimGradient?: string;
  scrimHeight?: string;
}

export function BlurImageBackground({
  src,
  alt,
  targetOpacity = "opacity-85",
  lowResSrc,
  className = "",
  scrimGradient = "from-[#0d2218] via-[#0d2218]/60 to-transparent",
  scrimHeight = "h-28 sm:h-36",
}: BlurImageBackgroundProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Generate lightweight low-res thumbnail (~800 bytes) for instant blur placeholder
  const placeholderUrl =
    lowResSrc ||
    (src.includes("images.unsplash.com")
      ? src.replace(/w=\d+/, "w=50").replace(/q=\d+/, "q=20") + "&blur=15"
      : src);

  useEffect(() => {
    if (imgRef.current?.complete) {
      setIsLoaded(true);
    }
  }, [src]);

  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden z-0 ${className}`}>
      {/* Low-resolution blurred placeholder */}
      <img
        src={placeholderUrl}
        alt=""
        aria-hidden="true"
        className={`absolute inset-0 w-full h-full object-cover object-center filter blur-md scale-110 transition-opacity duration-700 ease-out ${
          isLoaded ? "opacity-0" : "opacity-75"
        }`}
        referrerPolicy="no-referrer"
      />

      {/* High-resolution lazy-loaded image with smooth fade-in */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        className={`w-full h-full object-cover object-center transition-all duration-700 ease-out group-hover:scale-105 ${
          isLoaded ? targetOpacity : "opacity-0"
        }`}
        referrerPolicy="no-referrer"
      />

      {/* Scrim / esmaecimento no pé da imagem para fusão suave com a base */}
      <div
        className={`absolute inset-x-0 bottom-0 pointer-events-none z-1 transition-opacity duration-700 ${scrimHeight} bg-gradient-to-t ${scrimGradient}`}
      />
    </div>
  );
}
