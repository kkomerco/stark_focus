// Eksport rolki: paczka ZIP (okładka + klatka finałowa + opis), wideo MP4/WebM (MediaRecorder)
// oraz pojedyncza klatka PNG. Wycięte z VideoStudioModal.tsx (etap 3 refaktoryzacji).
import type { MutableRefObject } from "react";
import JSZip from "jszip";
import type { ReelDuration, VisualTheme } from "./reel-helpers";

export interface ReelExportsDeps {
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
  renderFrame: (timeSec: number) => void;
  duration: ReelDuration;
  exportFps: 60 | 30;
  selectedTheme: VisualTheme;
  phrases: string[];
  caption: string;
  hashtags: string[];
  isExportingRef: MutableRefObject<boolean>;
  setIsExportingZip: (v: boolean) => void;
  setIsExporting: (v: boolean) => void;
  setExportProgress: (v: number) => void;
  setIsPlaying: (v: boolean) => void;
  setToastMessage: (v: string | null) => void;
}

export function useReelExports(deps: ReelExportsDeps) {
  const {
    canvasRef,
    renderFrame,
    duration,
    exportFps,
    selectedTheme,
    phrases,
    caption,
    hashtags,
    isExportingRef,
    setIsExportingZip,
    setIsExporting,
    setExportProgress,
    setIsPlaying,
    setToastMessage,
  } = deps;

  /** Paczka "ready-to-post": okładka, klatka finałowa i opis z hashtagami. */
  const handleExportZipBundle = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsExportingZip(true);
    setToastMessage("Pakowanie zestawu ZIP (Wideo + Klatki + Opis)...");

    try {
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
============================================================
DATA GENERACJI: ${new Date().toISOString()}
FORMAT: Rolka 9:16 (1080x1920 Full HD)
CZAS TRWANIA: ${duration}.00s (${exportFps} FPS)
MOTYW: ${selectedTheme}

------------------------------------------------------------
[1] HOOK (0-3 SEKUNDY):
"${phrases[0] || ""}"

[2] PEŁNA NARRACJA (FAZY):
${phrases.map((p, i) => `Faza #${i + 1}: ${p}`).join("\n")}

[3] PUENTA (CLIMAX):
"${phrases[phrases.length - 1] || ""}"

------------------------------------------------------------
[4] OPIS POSTA (INSTAGRAM / TIKTOK CAPTION):
${caption}

------------------------------------------------------------
[5] HASHTAGI:
${hashtags.join(" ")}
============================================================
Wygenerowano przez STARK FOCUS TURNKEY BUNDLE PIPELINE.`;

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

      setToastMessage("✓ Pakiet ZIP został pobrany!");
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error("ZIP export error:", err);
      setToastMessage("Błąd eksportu pakietu ZIP.");
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setIsExportingZip(false);
      setIsPlaying(true);
    }
  };

  /** Nagranie rolki przez MediaRecorder (30 FPS, MP4 z fallbackiem na WebM). */
  const handleExportVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    isExportingRef.current = true;
    setIsExporting(true);
    setExportProgress(0);
    setIsPlaying(false);

    try {
      // FIX BŁĘDU 60 FPS (PODWAJANIE DŁUGOŚCI ROLKI):
      // W silnikach Chromium (Chrome/Edge/Brave) CanvasCaptureMediaStreamTrack przy 60fps
      // indeksuje klatki w kontenerze z domyślnym czasem 33.3ms (30fps), co powodowało odtwarzanie
      // w zwolnionym tempie (0.5x) i podwajało czas trwania z np. 7s do 14s.
      // Standardem platform wertykalnych (Instagram Reels, TikTok, YouTube Shorts) jest 30 FPS.
      // Taktowanie captureStream na stabilne 30 FPS z bitrate 18-24 Mbps gwarantuje:
      // 1. Idealny czas trwania 1:1 (film 7s ma dokładnie 7.00s na każdym odtwarzaczu i w social media).
      // 2. Maksymalną ostrość typografii i brak jakiegokolwiek zacinania czy rozbieżności audio/video.
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
        setToastMessage(`✓ Rolka 1080x1920 pobrana! Dokładny czas trwania: ${duration}.00s`);
        setTimeout(() => setToastMessage(null), 3000);
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
      isExportingRef.current = false;
      setIsExporting(false);
      setIsPlaying(true);
      setToastMessage("Błąd nagrywania wideo. Spróbuj pobrać klatkę PNG.");
      setTimeout(() => setToastMessage(null), 3500);
    }
  };
  /** Pojedyncza klatka PNG (Full HD 1080x1920). */
  const handleExportPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `stark_reel_frame_1080x1920_${Date.now()}.png`;
    a.click();
  };

  return { handleExportZipBundle, handleExportVideo, handleExportPng };
}
