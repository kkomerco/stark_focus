// Tło klatki rolki: upload (wideo/obraz) albo generatywny motyw + vignette.
// Wycięte z renderFrame() VideoStudioModal.tsx (etap 3 refaktoryzacji) — czysta funkcja rysowania.
import type { VisualTheme } from "../reel-helpers";

export interface ReelBackgroundOptions {
  width: number;
  height: number;
  /** Skala Ken Burns / dynamicznego cięcia (1.00–1.12). */
  zoomScale: number;
  /** true w drugim ujęciu przy reelFormat === "dynamic_broll_cut" (mikronachylenie). */
  isDynamicCut: boolean;
  customBgType: "none" | "image" | "video";
  customImage: HTMLImageElement | null;
  customVideo: HTMLVideoElement | null;
  selectedTheme: VisualTheme;
}

export function drawReelBackground(
  ctx: CanvasRenderingContext2D,
  {
    width,
    height,
    zoomScale,
    isDynamicCut,
    customBgType,
    customImage,
    customVideo,
    selectedTheme,
  }: ReelBackgroundOptions,
) {
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.scale(zoomScale, zoomScale);
  if (isDynamicCut) {
    ctx.rotate(0.008); // Subtelne mikronachylenie przy cięciu kamery
  }
  ctx.translate(-width / 2, -height / 2);

  if (customBgType === "video" && customVideo) {
    const vid = customVideo;
    const vidW = vid.videoWidth || 1080;
    const vidH = vid.videoHeight || 1920;
    const scale = Math.max(width / vidW, height / vidH);
    const drawW = vidW * scale;
    const drawH = vidH * scale;
    const drawX = (width - drawW) / 2;
    const drawY = (height - drawH) / 2;
    ctx.drawImage(vid, drawX, drawY, drawW, drawH);
    // Dark overlay for contrast
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.fillRect(0, 0, width, height);
  } else if (customBgType === "image" && customImage) {
    const img = customImage;
    const imgW = img.naturalWidth || 1080;
    const imgH = img.naturalHeight || 1920;
    const scale = Math.max(width / imgW, height / imgH);
    const drawW = imgW * scale;
    const drawH = imgH * scale;
    const drawX = (width - drawW) / 2;
    const drawY = (height - drawH) / 2;
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    // Dark overlay for contrast
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.fillRect(0, 0, width, height);
  } else if (selectedTheme === "crimson_eclipse") {
    // Crimson Eclipse: Pitch black with deep brooding blood-crimson chiaroscuro eclipse
    const bgGrad = ctx.createRadialGradient(
      width * 0.5,
      height * 0.42,
      60,
      width * 0.5,
      height * 0.45,
      height * 0.75,
    );
    bgGrad.addColorStop(0, "#2A0808");
    bgGrad.addColorStop(0.25, "#150404");
    bgGrad.addColorStop(0.55, "#080202");
    bgGrad.addColorStop(1, "#000000");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle celestial eclipse ring behind the text focal point
    const ringGrad = ctx.createLinearGradient(0, height * 0.28, 0, height * 0.58);
    ringGrad.addColorStop(0, "rgba(220, 38, 38, 0.18)");
    ringGrad.addColorStop(0.5, "rgba(153, 27, 27, 0.05)");
    ringGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.strokeStyle = ringGrad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(width * 0.5, height * 0.43, 340, 0, Math.PI * 2);
    ctx.stroke();
  } else if (selectedTheme === "emerald_abyss") {
    // Emerald Abyss: Deep dark jade void with cold stoic granite undertone
    const bgGrad = ctx.createRadialGradient(
      width * 0.5,
      height * 0.44,
      80,
      width * 0.5,
      height * 0.48,
      height * 0.8,
    );
    bgGrad.addColorStop(0, "#081E15");
    bgGrad.addColorStop(0.3, "#04110C");
    bgGrad.addColorStop(0.65, "#020705");
    bgGrad.addColorStop(1, "#000000");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle vertical jade light shaft
    const shaftGrad = ctx.createLinearGradient(width * 0.5 - 140, 0, width * 0.5 + 140, 0);
    shaftGrad.addColorStop(0, "rgba(16, 185, 129, 0)");
    shaftGrad.addColorStop(0.5, "rgba(52, 211, 153, 0.07)");
    shaftGrad.addColorStop(1, "rgba(16, 185, 129, 0)");
    ctx.fillStyle = shaftGrad;
    ctx.fillRect(width * 0.5 - 140, 0, 280, height);
  } else if (selectedTheme === "carbon_aura") {
    // Carbon Aura: Velvet anthracite with subtle warm-cold golden ember glow
    const bgGrad = ctx.createRadialGradient(
      width * 0.5,
      height * 0.43,
      90,
      width * 0.5,
      height * 0.45,
      height * 0.8,
    );
    bgGrad.addColorStop(0, "#1F1A15");
    bgGrad.addColorStop(0.35, "#100E0C");
    bgGrad.addColorStop(0.7, "#080706");
    bgGrad.addColorStop(1, "#000000");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle elliptical golden ember halo behind center
    const haloGrad = ctx.createRadialGradient(
      width * 0.5,
      height * 0.43,
      10,
      width * 0.5,
      height * 0.43,
      320,
    );
    haloGrad.addColorStop(0, "rgba(217, 119, 6, 0.08)");
    haloGrad.addColorStop(0.5, "rgba(180, 83, 9, 0.03)");
    haloGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = haloGrad;
    ctx.fillRect(0, 0, width, height);
  } else if (selectedTheme === "silver_mist") {
    // Silver Mist: Deep atmospheric midnight slate with layered volumetric mist & silver horizon rim
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, "#080A0D");
    bgGrad.addColorStop(0.35, "#101418");
    bgGrad.addColorStop(0.65, "#0A0D10");
    bgGrad.addColorStop(1, "#030405");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 1. Volumetric horizontal silver mist band at center
    const mistCenterY = height * 0.43;
    const mistBand = ctx.createLinearGradient(0, mistCenterY - 300, 0, mistCenterY + 300);
    mistBand.addColorStop(0, "rgba(200, 215, 230, 0)");
    mistBand.addColorStop(0.25, "rgba(215, 228, 242, 0.035)");
    mistBand.addColorStop(0.5, "rgba(235, 245, 255, 0.08)");
    mistBand.addColorStop(0.75, "rgba(215, 228, 242, 0.035)");
    mistBand.addColorStop(1, "rgba(200, 215, 230, 0)");
    ctx.fillStyle = mistBand;
    ctx.fillRect(0, mistCenterY - 300, width, 600);

    // 2. Soft elliptical radiant silver core behind the central text area
    const radiantCore = ctx.createRadialGradient(
      width * 0.5,
      mistCenterY,
      20,
      width * 0.5,
      mistCenterY,
      width * 0.7,
    );
    radiantCore.addColorStop(0, "rgba(240, 246, 255, 0.09)");
    radiantCore.addColorStop(0.4, "rgba(180, 200, 220, 0.035)");
    radiantCore.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = radiantCore;
    ctx.fillRect(0, 0, width, height);

    // 3. Diffused atmospheric mist clouds
    const cloud1 = ctx.createRadialGradient(
      width * 0.28,
      mistCenterY - 70,
      15,
      width * 0.28,
      mistCenterY - 70,
      width * 0.45,
    );
    cloud1.addColorStop(0, "rgba(225, 235, 248, 0.05)");
    cloud1.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = cloud1;
    ctx.fillRect(0, mistCenterY - 250, width * 0.7, 360);

    const cloud2 = ctx.createRadialGradient(
      width * 0.72,
      mistCenterY + 60,
      15,
      width * 0.72,
      mistCenterY + 60,
      width * 0.48,
    );
    cloud2.addColorStop(0, "rgba(225, 235, 248, 0.045)");
    cloud2.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = cloud2;
    ctx.fillRect(width * 0.3, mistCenterY - 150, width * 0.7, 360);

    // 4. Razor-thin platinum horizon hairline with feathered lateral dissipation
    const horizonGrad = ctx.createLinearGradient(0, 0, width, 0);
    horizonGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
    horizonGrad.addColorStop(0.2, "rgba(225, 235, 250, 0.05)");
    horizonGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.16)");
    horizonGrad.addColorStop(0.8, "rgba(225, 235, 250, 0.05)");
    horizonGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = horizonGrad;
    ctx.fillRect(width * 0.08, mistCenterY - 1, width * 0.84, 2);
  } else {
    // Pure monumental black (Domyślne tło: czyste, głębokie czarne tło monumentalne)
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);
  }

  ctx.restore(); // end slow zoom

  // 2. Cinematic Edge Vignette
  const vignette = ctx.createLinearGradient(0, 0, 0, height);
  vignette.addColorStop(0, "rgba(0, 0, 0, 0.84)");
  vignette.addColorStop(0.18, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(0.82, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.92)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}
