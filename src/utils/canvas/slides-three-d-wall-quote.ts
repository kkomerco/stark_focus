// =========================================================================
// PROFESJONALNY FORMAT: LITERY 3D NA ĹšCIANIE (PERSPEKTYWA 3D + KINOWE ĹšWIATĹO + GLOW)
// =========================================================================
// Slajd "Litery 3D na ścianie" (perspektywa 3D + kinowe światło + glow).
import { drawImageCover, drawProceduralWall, getFontFamilySpec } from "./wall";

export function draw3DWallQuoteSlide(
  canvas: HTMLCanvasElement,
  options: {
    width?: number;
    height?: number;
    textLines: string[];
    wallImage?: CanvasImageSource | null;
    handle?: string;
    fontSize?: number;
    fontFamily?: string;
    textScale?: number;
    wallType?: string;
    wallGlow?: string;
    glowIntensity?: number;
    fontColor?: "white" | "black";
    letterMaterial?: "matte_graphite" | "brushed_steel" | "carved_stone" | "pure_acrylic";
  },
) {
  const {
    width = 1080,
    height = 1920,
    textLines = [
      "Stay coachable",
      "through all",
      "phases of life.",
      "Never stop",
      "learning and",
      "listening.",
    ],
    wallImage = null,
    handle = "stark_focus",
    textScale = 1.0,
    fontFamily = "sans",
    wallType = "concrete",
    wallGlow = "spotlight",
    glowIntensity = 0.7,
    fontColor = "black",
    letterMaterial = "matte_graphite",
  } = options;

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // 1. TĹO ĹšCIANY: WĹ‚asne zdjÄ™cie lub wygenerowany proceduralny materiaĹ‚
  if (wallImage) {
    drawImageCover(ctx, wallImage, 0, 0, width, height);
  } else {
    drawProceduralWall(ctx, width, height, wallType);

    // 2. OĹšWIETLENIE ĹšCIANY (GLOW / SPOTLIGHT / DRAMATIC)
    if (wallGlow !== "none") {
      if (wallGlow === "spotlight") {
        // Naturalny snop Ĺ›wiatĹ‚a padajÄ…cy z gĂłry
        const spotX = width * 0.88;
        const spotY = height * 0.02;
        const spotGrad = ctx.createRadialGradient(spotX, spotY, 40, spotX, spotY, height * 0.95);
        const lightAlpha = Math.min(0.7, 0.45 * glowIntensity);
        spotGrad.addColorStop(0, `rgba(255, 255, 255, ${lightAlpha})`);
        spotGrad.addColorStop(0.35, `rgba(255, 255, 255, ${lightAlpha * 0.4})`);
        spotGrad.addColorStop(0.7, "rgba(0, 0, 0, 0.05)");
        spotGrad.addColorStop(1, `rgba(0, 0, 0, ${0.5 * glowIntensity})`);
        ctx.fillStyle = spotGrad;
        ctx.fillRect(0, 0, width, height);
      } else if (wallGlow === "dramatic_side") {
        // Ostre Ĺ›wiatĹ‚o z prawej strony
        const sideGrad = ctx.createLinearGradient(width, height * 0.3, 0, height * 0.7);
        sideGrad.addColorStop(0, `rgba(255, 255, 255, ${0.35 * glowIntensity})`);
        sideGrad.addColorStop(0.4, "rgba(255, 255, 255, 0.05)");
        sideGrad.addColorStop(1, `rgba(0, 0, 0, ${0.65 * glowIntensity})`);
        ctx.fillStyle = sideGrad;
        ctx.fillRect(0, 0, width, height);
      } else if (wallGlow === "halo_glow") {
        // Rozproszona aureola w centrum kadru
        const haloGrad = ctx.createRadialGradient(
          width * 0.5,
          height * 0.45,
          80,
          width * 0.5,
          height * 0.45,
          width * 0.7,
        );
        haloGrad.addColorStop(0, `rgba(255, 255, 255, ${0.3 * glowIntensity})`);
        haloGrad.addColorStop(0.6, "rgba(255, 255, 255, 0.05)");
        haloGrad.addColorStop(1, "rgba(0, 0, 0, 0.4)");
        ctx.fillStyle = haloGrad;
        ctx.fillRect(0, 0, width, height);
      }

      // CieĹ„ w prawym naroĹĽniku
      const cornerGrad = ctx.createLinearGradient(width * 0.82, 0, width, 0);
      cornerGrad.addColorStop(0, "rgba(0,0,0,0)");
      cornerGrad.addColorStop(1, `rgba(0,0,0,${0.5 * glowIntensity})`);
      ctx.fillStyle = cornerGrad;
      ctx.fillRect(width * 0.82, 0, width * 0.18, height);
    }
  }

  // 3. NAĹOĹ»ENIE MACIERZY PERSPEKTYWY 3D
  ctx.save();
  ctx.setTransform(1, -0.055, 0.065, 1, width * 0.05, height * 0.06);

  const baseFontSize = options.fontSize || (height <= 1080 ? 52 : height <= 1350 ? 62 : 72);
  const fontSize = Math.round(baseFontSize * textScale);
  const lineHeight = fontSize * 1.34;

  const fontSpec = getFontFamilySpec(fontFamily);

  ctx.font = `900 ${fontSize}px ${fontSpec}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  const startX = width * 0.12;
  const totalTextH = (textLines.length - 1) * lineHeight;

  let curY =
    height <= 1080
      ? Math.max(160, (height - totalTextH) * 0.42)
      : height <= 1350
        ? Math.max(220, (height - totalTextH) * 0.38)
        : height * 0.26;

  // DobĂłr barwy liter 3D wg tĹ‚a i wyboru koloru czcionki (biaĹ‚a vs czarna)
  const isWhiteFont = fontColor === "white";
  const isLightWall = wallType === "white_carrara";

  const frontTextColor = isWhiteFont ? "#F8FAFC" : isLightWall ? "#111215" : "#1A1D24";

  const bevelDepthColor = isWhiteFont
    ? isLightWall
      ? "#94A3B8"
      : "#334155"
    : isLightWall
      ? "#252A34"
      : "#0A0B0E";

  textLines.forEach((rawLine) => {
    const line = rawLine;
    const shadowOffsetX = -14;
    const shadowOffsetY = 18;

    // A. EFEKT GLOW: Backlight LED zza liter (jeĹ›li wybrano backlight_glow)
    if (wallGlow === "backlight_glow") {
      ctx.save();
      ctx.shadowColor = isWhiteFont
        ? "rgba(255, 255, 255, 0.9)"
        : isLightWall
          ? "rgba(0, 0, 0, 0.6)"
          : "rgba(255, 255, 255, 0.75)";
      ctx.shadowBlur = Math.round(36 * glowIntensity);
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.fillStyle = isWhiteFont
        ? `rgba(255, 255, 255, ${0.55 * glowIntensity})`
        : isLightWall
          ? "rgba(0, 0, 0, 0.2)"
          : `rgba(255, 255, 255, ${0.45 * glowIntensity})`;
      ctx.fillText(line, startX, curY);
      ctx.fillText(line, startX, curY);
      ctx.restore();
    }

    if (letterMaterial === "carved_stone") {
      // SPECJALNY EFEKT: WYKUCIE W KAMIENIU / PĹASKORZEĹąBA (WKLÄSĹE LITERY)
      // 1. WewnÄ™trzny cieĹ„ w zagĹ‚Ä™bieniu (gĂłrna i lewa krawÄ™dĹş)
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 4;
      ctx.shadowOffsetY = 5;
      ctx.fillStyle = isLightWall ? "rgba(40, 45, 55, 0.85)" : "rgba(10, 12, 16, 0.92)";
      ctx.fillText(line, startX, curY);
      ctx.restore();

      // 2. Dolno-prawe doĹ›wietlenie krawÄ™dzi wykucia (Ĺ›wiatĹ‚o odbite od krawÄ™dzi kamienia)
      ctx.save();
      ctx.shadowColor = isLightWall ? "rgba(255, 255, 255, 0.95)" : "rgba(255, 255, 255, 0.35)";
      ctx.shadowBlur = 3;
      ctx.shadowOffsetX = -2;
      ctx.shadowOffsetY = -2;
      ctx.fillStyle = isLightWall ? "#333A48" : "#12151B";
      ctx.fillText(line, startX, curY);
      ctx.restore();

      // 3. WnÄ™trze kutej litery z surowym gradientem gĹ‚Ä™bi
      const carvedGrad = ctx.createLinearGradient(startX, curY - fontSize, startX, curY);
      if (isLightWall) {
        carvedGrad.addColorStop(0, "#2B313C");
        carvedGrad.addColorStop(1, "#434B59");
      } else {
        carvedGrad.addColorStop(0, "#08090C");
        carvedGrad.addColorStop(0.6, "#14171E");
        carvedGrad.addColorStop(1, "#1E222A");
      }
      ctx.fillStyle = carvedGrad;
      ctx.fillText(line, startX, curY);
    } else {
      // EFEKT WYPUKĹYCH LITER 3D (MATOWY ANTRACYT, SZCZOTKOWANA STAL, CZYSTY AKRYL)
      // B. MiÄ™kki cieĹ„ rozproszony na Ĺ›cianie (Ambient Shadow)
      ctx.save();
      ctx.shadowColor = isLightWall ? "rgba(10, 15, 25, 0.6)" : "rgba(0, 0, 0, 0.55)";
      ctx.shadowBlur = 28;
      ctx.shadowOffsetX = shadowOffsetX * 1.3;
      ctx.shadowOffsetY = shadowOffsetY * 1.3;
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.fillText(line, startX, curY);
      ctx.restore();

      // C. Ostry cieĹ„ kontaktowy przy krawÄ™dzi litery
      ctx.save();
      ctx.shadowColor = isWhiteFont ? "rgba(0, 0, 0, 0.75)" : "rgba(0, 0, 0, 0.9)";
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = shadowOffsetX * 0.5;
      ctx.shadowOffsetY = shadowOffsetY * 0.5;
      ctx.fillStyle = bevelDepthColor;
      ctx.fillText(line, startX, curY);
      ctx.restore();

      // D. WypukĹ‚oĹ›Ä‡ 3D (boki liter rzeĹşbione w stronÄ™ cienia)
      for (let d = 4; d >= 1; d--) {
        ctx.fillStyle = bevelDepthColor;
        ctx.fillText(line, startX - d * 1.2, curY + d * 1.4);
      }

      // E. Front litery wg wybranego materiaĹ‚u
      if (letterMaterial === "brushed_steel") {
        // Szczotkowana stal / metaliczny tytan z refleksami
        const steelGrad = ctx.createLinearGradient(
          startX,
          curY - fontSize,
          startX + fontSize * 3,
          curY,
        );
        if (isWhiteFont) {
          steelGrad.addColorStop(0, "#FFFFFF");
          steelGrad.addColorStop(0.25, "#CBD5E1");
          steelGrad.addColorStop(0.5, "#F1F5F9");
          steelGrad.addColorStop(0.75, "#94A3B8");
          steelGrad.addColorStop(1, "#E2E8F0");
        } else {
          steelGrad.addColorStop(0, "#475569");
          steelGrad.addColorStop(0.3, "#1E293B");
          steelGrad.addColorStop(0.6, "#334155");
          steelGrad.addColorStop(1, "#0F172A");
        }
        ctx.fillStyle = steelGrad;
        ctx.fillText(line, startX, curY);

        // Subtelny obrys krawÄ™dzi stali
        ctx.save();
        ctx.strokeStyle = isWhiteFont ? "rgba(255, 255, 255, 0.6)" : "rgba(148, 163, 184, 0.35)";
        ctx.lineWidth = 1;
        ctx.strokeText(line, startX, curY);
        ctx.restore();
      } else if (letterMaterial === "pure_acrylic") {
        // Czysty odlew akrylowy / wysoki kontrast
        ctx.fillStyle = frontTextColor;
        ctx.fillText(line, startX, curY);

        ctx.save();
        ctx.strokeStyle = isWhiteFont ? "rgba(255, 255, 255, 0.9)" : "rgba(255, 255, 255, 0.18)";
        ctx.lineWidth = 1.2;
        ctx.strokeText(line, startX, curY);
        ctx.restore();
      } else {
        // DomyĹ›lny matowy antracyt / surowy wÄ™giel
        ctx.fillStyle = frontTextColor;
        ctx.fillText(line, startX, curY);
      }
    }

    curY += lineHeight;
  });

  ctx.restore(); // PrzywrĂłcenie normalnego ukĹ‚adu

  // Dyskretna sygnatura na dole Ĺ›ciany
  ctx.font = "500 20px monospace";
  ctx.fillStyle = isWhiteFont
    ? "rgba(255, 255, 255, 0.6)"
    : isLightWall
      ? "rgba(0, 0, 0, 0.6)"
      : "rgba(255, 255, 255, 0.35)";
  ctx.textAlign = "left";
  ctx.fillText(`@${handle.replace("@", "")}`, width * 0.14, height * 0.94);
}

// =========================================================================
// KOLAĹ» 4 KADRĂ“W (WINTER ARC / SIATKA 2x2)
// =========================================================================
