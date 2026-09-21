// Eksport klatek karuzeli: pojedynczy PNG (Blob) oraz paczka ZIP (wycięte z canvasRenderer.ts).
import JSZip from "jszip";
import type { SlideData } from "../../types";
import { drawSlideToCanvas, type RenderSlideOptions } from "./slide-entry";

export async function exportSlideToBlob(
  canvas: HTMLCanvasElement,
  options: RenderSlideOptions,
): Promise<Blob> {
  drawSlideToCanvas(canvas, options);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("BĹ‚Ä…d renderowania Canvas"))),
      "image/png",
    );
  });
}

export async function exportAllSlidesAsZip(slides: SlideData[], options: any) {
  const zip = new JSZip();
  const hiddenCanvas = document.createElement("canvas");

  for (let i = 0; i < slides.length; i++) {
    const blob = await exportSlideToBlob(hiddenCanvas, {
      ...options,
      slideNumber: i + 1,
      totalSlides: slides.length,
      headline: slides[i].headline,
      bodyText: slides[i].bodyText,
      textOffsetY: slides[i].textOffsetY ?? options.textOffsetY,
      highlightWords: slides[i].highlightWords ?? options.highlightWords,
    });
    zip.file(`slide_${i + 1}.png`, blob);
  }

  if (options.captionText) {
    zip.file("caption_and_hashtags.txt", options.captionText);
  }

  const content = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(content);
  const link = document.createElement("a");
  link.href = url;
  link.download = options.zipName || "stark_focus_carousel.zip";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
