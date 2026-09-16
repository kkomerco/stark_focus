// Eksport MP4/PNG studia rolek.
// Przeniesione 1:1 z VideoStudioModal.tsx (logika bez zmian).
import { useCallback, useRef, useState } from "react";

interface UseVideoExporterInput {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  renderFrame: (timeSec: number) => void;
  duration: number;
  selectedTheme: string;
  phrases: string[];
  caption: string;
  hashtags: string[];
  toast: (msg: string | null, ms?: number) => void;
  setIsPlaying: (playing: boolean) => void;
}

export function useVideoExporter({
  canvasRef,
  renderFrame,
  duration,
  selectedTheme,
  phrases,
  caption,
  hashtags,
  toast,
  setIsPlaying,
}: UseVideoExporterInput) {
  // Export State (Domyślnie 30 FPS zgodny ze standardem Instagram Reels / TikTok)
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportFps, setExportFps] = useState<60 | 30>(30);
  const isExportingRef = useRef<boolean>(false);

  // Export Full Video MP4 (1080x1920 Full HD - Zegarmistrzowski czas 1:1, bez podwajania)
  const handleExportVideo = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    isExportingRef.current = true;
    setIsExporting(true);
    setExportProgress(0);
    setIsPlaying(false);

    try {
      // FIX BŁĘDU 60 FPS (PODWAJANIE DŁUGOŚCI ROLKI):
      // W silnikach Chromium CanvasCaptureMediaStreamTrack przy 60fps indeksuje klatki
      // w kontenerze z domyślnym czasem 33.3ms (30fps), co powodowało odtwarzanie
      // w zwolnionym tempie (0.5x). Standardem platform wertykalnych jest 30 FPS.
      const stream = canvas.captureStream(30);
      const mimeTypes = [
        "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
        "video/mp4;codecs=avc1",
        "video/mp4",
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8",
        "video/webm",
      ];
      const selectedMime = mimeTypes.find((t) => MediaRecorder.isTypeSupported(t)) || "video/webm";

      const recorder = new MediaRecorder(stream, {
        mimeType: selectedMime,
        videoBitsPerSecond: exportFps === 60 ? 24000000 : 18000000,
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: selectedMime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `stark_reel_1080x1920_${duration}s_${selectedTheme}_${Date.now()}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        isExportingRef.current = false;
        setIsExporting(false);
        setIsPlaying(true);
        toast(`✓ Rolka 1080x1920 pobrana! Dokładny czas trwania: ${duration}.00s`, 3000);
      };

      recorder.start();

      const startTime = performance.now();
      const totalDur = duration;

      const step = (stamp: number) => {
        const elapsed = (stamp - startTime) / 1000;
        if (elapsed >= totalDur) {
          renderFrame(totalDur);
          setExportProgress(100);
          setTimeout(() => {
            try {
              if (recorder.state === "recording") recorder.stop();
            } catch (e) {
              console.error(e);
            }
          }, 150);
          return;
        }

        renderFrame(elapsed);
        setExportProgress(Math.min(99, Math.round((elapsed / totalDur) * 100)));
        requestAnimationFrame(step);
      };

      requestAnimationFrame(step);
    } catch (err) {
      console.error("Recording error:", err);

  // TURNKEY EXPORT: 1. "Ready-to-Post" ZIP Bundle
  const [isExportingZip, setIsExportingZip] = useState<boolean>(false);

  const handleExportZipBundle = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsExportingZip(true);
    toast("Pakowanie zestawu ZIP (Wideo + Klatki + Opis)...");

    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();

      // Klatka okładkowa (Hook)
      renderFrame(0.5);
      const coverDataUrl = canvas.toDataURL("image/png");
      const coverBlob = await (await fetch(coverDataUrl)).blob();
      zip.file("1_COVER_HOOK_1080x1920.png", coverBlob);

      // Klatka finałowa (Climax)
      renderFrame(Math.max(1, duration - 0.5));
      const climaxDataUrl = canvas.toDataURL("image/png");
      const climaxBlob = await (await fetch(climaxDataUrl)).blob();
      zip.file("2_CLIMAX_PUNCHLINE_1080x1920.png", climaxBlob);

      // Gotowy plik tekstowy z opisem posta i hashtagami
      const postText = `STARK FOCUS // READY-TO-POST CONTENT BUNDLE
DATA GENERACJI: ${new Date().toISOString()}
FORMAT: Rolka 9:16 (1080x1920 Full HD)
CZAS TRWANIA: ${duration}.00s (${exportFps} FPS)
MOTYW: ${selectedTheme}

[1] HOOK (0-3 SEKUNDY):
"${phrases[0] || ""}"

[2] PEŁNA NARRACJA (FAZY):
${phrases.map((p, i) => `Faza #${i + 1}: ${p}`).join("\n")}

[3] PUENTA (CLIMAX):
"${phrases[phrases.length - 1] || ""}"

[4] OPIS POSTA (INSTAGRAM / TIKTOK CAPTION):
${caption}

[5] HASHTAGI:
${hashtags.join(" ")}`;

      zip.file("POST_CAPTION_HASHTAGS.txt", postText);

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `STARK_READY_TO_POST_${duration}s_${selectedTheme}_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast("✓ Pakiet ZIP został pobrany!", 3000);
    } catch (err) {
      console.error("ZIP export error:", err);
      toast("Błąd eksportu pakietu ZIP.", 3000);
    } finally {
      setIsExportingZip(false);
      setIsPlaying(true);
    }
  }, [canvasRef, caption, duration, exportFps, hashtags, phrases, renderFrame, selectedTheme, setIsPlaying, toast]);

  return {
    isExporting,
    exportProgress,
    exportFps,
    setExportFps,
    isExportingZip,
    isExportingRef,
    handleExportVideo,
    handleExportPng,
    handleExportZipBundle,
  };
}
      isExportingRef.current = false;
      setIsExporting(false);
      setIsPlaying(true);
      toast("Błąd nagrywania wideo. Spróbuj pobrać klatkę PNG.", 3500);
    }
  }, [canvasRef, duration, exportFps, renderFrame, selectedTheme, setIsPlaying, toast]);

  // Export Still Frame PNG (Full HD 1080x1920)
  const handleExportPng = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `stark_reel_frame_1080x1920_${Date.now()}.png`;
    a.click();
  }, [canvasRef]);
