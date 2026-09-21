// Obsługa własnego tła rolki (upload obrazu/wideo, auto-load z Vault, reset).
// Wycięte z VideoStudioModal.tsx (etap 3 refaktoryzacji) — stan, refy i efekt w jednym hooku.
import { useEffect, useRef, useState } from "react";

export function useCustomBackground(
  initialBgUrl: string | undefined,
  setToastMessage: (v: string | null) => void,
) {
  const [customBgType, setCustomBgType] = useState<"none" | "image" | "video">("none");
  const [customBgName, setCustomBgName] = useState<string>("");
  const customImageRef = useRef<HTMLImageElement | null>(null);
  const customVideoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-load initial background if provided
  useEffect(() => {
    if (initialBgUrl) {
      const isVid = initialBgUrl.match(/\.(mp4|webm|mov)(\?.*)?$/i);
      if (isVid) {
        const vid = document.createElement("video");
        vid.crossOrigin = "anonymous";
        vid.src = initialBgUrl;
        vid.muted = true;
        vid.loop = true;
        vid.playsInline = true;
        vid.onloadeddata = () => {
          customVideoRef.current = vid;
          setCustomBgType("video");
          setCustomBgName("Vault Video");
          vid.play().catch(() => {});
        };
      } else {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = initialBgUrl;
        img.onload = () => {
          customImageRef.current = img;
          setCustomBgType("image");
          setCustomBgName("Vault Background");
        };
      }
    }
  }, [initialBgUrl]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileUrl = URL.createObjectURL(file);
    setCustomBgName(file.name);

    if (file.type.startsWith("video/")) {
      const vid = document.createElement("video");
      vid.src = fileUrl;
      vid.muted = true;
      vid.loop = true;
      vid.playsInline = true;
      vid.autoplay = true;
      vid.play().catch(() => {});
      customVideoRef.current = vid;
      customImageRef.current = null;
      setCustomBgType("video");
      setToastMessage("✓ Załadowano własne tło wideo!");
    } else if (file.type.startsWith("image/")) {
      const img = new Image();
      img.src = fileUrl;
      img.onload = () => {
        customImageRef.current = img;
        customVideoRef.current = null;
        setCustomBgType("image");
        setToastMessage("✓ Załadowano własne tło graficzne!");
      };
    }
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleClearCustomBg = () => {
    if (customVideoRef.current) {
      customVideoRef.current.pause();
      customVideoRef.current.src = "";
      customVideoRef.current = null;
    }
    customImageRef.current = null;
    setCustomBgType("none");
    setCustomBgName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setToastMessage("Przywrócono domyślny motyw wizualny.");
    setTimeout(() => setToastMessage(null), 2500);
  };

  return {
    customBgType,
    customBgName,
    customImageRef,
    customVideoRef,
    fileInputRef,
    handleFileUpload,
    handleClearCustomBg,
  };
}
