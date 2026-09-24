import JSZip from "jszip";
import type {
  VisualTheme,
  LogoPlacement,
  LogoGlowChoice,
  LogoSourceType,
  TopHeaderMode,
  SlideData,
  CarouselFontFamily,
  UniversalLayoutSpec,
  UniversalTextLayer,
} from "../types";
import {
  BRAND_ACCENT,
  getStarkThemeConfig,
  normalizeLogoPlacement,
  resolveTopHeaderText,
  drawBrandLogoOnContext,
} from "./starkBrandTheme";
import {
  centeredTop,
  drawBillboardSignSlide,
  drawConceptDiagramSlide,
  drawCostVsRewardSlide,
  drawNeonSignSlide,
  drawProtocolListSlide,
} from "./canvas/layouts-v2";
import { groupText, layerById, PRIMARY_LAYER_ID } from "./canvas/layerRoles";

export type { SlideData };

export interface RenderSlideOptions {
  width: number;
  height: number;
  slideNumber: number;
  totalSlides: number;
  headline: string;
  bodyText: string;
  handle: string;
  theme?: VisualTheme | string;
  bgImage?: CanvasImageSource | null;
  logoImg?: HTMLImageElement | null;
  logoSourceType?: LogoSourceType;
  logoPlacement?: LogoPlacement;
  logoSize?: number;
  logoOpacity?: number;
  logoGlow?: LogoGlowChoice;
  topHeaderMode?: TopHeaderMode;
  topHeaderCustom?: string;
  textOffsetY?: number;
  highlightWords?: string;
  fontChoice?: CarouselFontFamily;
  isContinuous?: boolean; // Ciągłość karuzeli (delikatne łączniki krawędzi)
  footerSignature?: string; // Stały podpis w stopce (np. "THE UNFORGIVING STANDARD")
  bgStyle?: "flat_fog" | "procedural" | "image"; // Styl tła: płaskie/zamglone bez stałych obiektów
}

// Prymitywy tekstu/obrazu mieszkaja w src/utils/canvas/primitives.ts —
// stąd tylko re-eksport, żeby dawni odbiorcy `canvasRenderer` nie musieli
// zmieniać importów.
export {
  drawImageCover,
  getFontFamilySpec,
  parseLineTokens,
  stripHighlightSyntax,
  wrapTextLines,
  type TextToken,
} from "./canvas/primitives";
import {
  drawImageCover,
  fitLines,
  getFontFamilySpec,
  parseLineTokens,
  stripHighlightSyntax,
  wrapTextLines,
} from "./canvas/primitives";

// =========================================================================
// POMOCNIK PROCEDURALNEGO TWORZENIA TEKSTUR ŚCIANY STARK FOCUS
// =========================================================================
function drawProceduralWall(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  wallType: string = "concrete",
) {
  // A. BAZOWY GRADIENT KOLORYSTYCZNY ŚCIANY
  if (wallType === "black_marble") {
    // 1. CZARNY MARMUR OBSIDIAN (Nero Marquina w barwach Stark Focus)
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, "#161922");
    bgGrad.addColorStop(0.3, "#0F1116");
    bgGrad.addColorStop(0.7, "#08090C");
    bgGrad.addColorStop(1, "#030406");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Organiczne żyłki marmuru (Marble Veins)
    ctx.save();
    const veins = [
      {
        startX: 0.15,
        startY: 0,
        cp1X: 0.35,
        cp1Y: 0.3,
        cp2X: 0.2,
        cp2Y: 0.7,
        endX: 0.45,
        endY: 1,
        width: 3,
        alpha: 0.25,
      },
      {
        startX: 0.5,
        startY: 0,
        cp1X: 0.65,
        cp1Y: 0.35,
        cp2X: 0.75,
        cp2Y: 0.6,
        endX: 0.9,
        endY: 1,
        width: 2.2,
        alpha: 0.2,
      },
      {
        startX: 0,
        startY: 0.3,
        cp1X: 0.25,
        cp1Y: 0.45,
        cp2X: 0.5,
        cp2Y: 0.4,
        endX: 0.8,
        endY: 0.65,
        width: 1.8,
        alpha: 0.18,
      },
      {
        startX: 0.3,
        startY: 0.6,
        cp1X: 0.45,
        cp1Y: 0.7,
        cp2X: 0.4,
        cp2Y: 0.85,
        endX: 0.6,
        endY: 1,
        width: 1.5,
        alpha: 0.15,
      },
      {
        startX: 0.7,
        startY: 0.15,
        cp1X: 0.8,
        cp1Y: 0.3,
        cp2X: 0.88,
        cp2Y: 0.4,
        endX: 1,
        endY: 0.5,
        width: 1.2,
        alpha: 0.12,
      },
    ];

    veins.forEach((v) => {
      // Miękka poświata żyłki
      ctx.beginPath();
      ctx.moveTo(v.startX * width, v.startY * height);
      ctx.bezierCurveTo(
        v.cp1X * width,
        v.cp1Y * height,
        v.cp2X * width,
        v.cp2Y * height,
        v.endX * width,
        v.endY * height,
      );
      ctx.strokeStyle = `rgba(220, 230, 245, ${v.alpha * 0.4})`;
      ctx.lineWidth = v.width * 3.5;
      ctx.stroke();

      // Ostry nerw żyłki
      ctx.beginPath();
      ctx.moveTo(v.startX * width, v.startY * height);
      ctx.bezierCurveTo(
        v.cp1X * width,
        v.cp1Y * height,
        v.cp2X * width,
        v.cp2Y * height,
        v.endX * width,
        v.endY * height,
      );
      ctx.strokeStyle = `rgba(240, 245, 255, ${v.alpha})`;
      ctx.lineWidth = v.width;
      ctx.stroke();
    });
    ctx.restore();
  } else if (wallType === "dark_granite") {
    // 2. CIEMNY GRANIT / ŁUPEK SKALNY
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, "#22262E");
    bgGrad.addColorStop(0.45, "#15171D");
    bgGrad.addColorStop(1, "#0B0C0E");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Mikrostruktura kwarcu/ziarna skalnego
    ctx.save();
    for (let i = 0; i < 450; i++) {
      const rx = (i * 12347) % width;
      const ry = (i * 31415) % height;
      const rSize = (i % 3) + 1;
      const alpha = ((i % 10) + 1) * 0.015;
      ctx.fillStyle = i % 2 === 0 ? `rgba(255, 255, 255, ${alpha})` : `rgba(0, 0, 0, ${alpha * 2})`;
      ctx.fillRect(rx, ry, rSize, rSize);
    }
    ctx.restore();
  } else if (wallType === "white_carrara") {
    // 3. CHŁODNY MARMUR STOICKI (CARRARA MONOLITH)
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, "#EAEFF5");
    bgGrad.addColorStop(0.4, "#D6DCE5");
    bgGrad.addColorStop(0.85, "#B8C0CC");
    bgGrad.addColorStop(1, "#9CA4B2");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Ciemne popielate żyłki
    ctx.save();
    const veins = [
      {
        startX: 0.2,
        startY: 0,
        cp1X: 0.38,
        cp1Y: 0.28,
        cp2X: 0.25,
        cp2Y: 0.65,
        endX: 0.5,
        endY: 1,
        width: 2.8,
        alpha: 0.22,
      },
      {
        startX: 0.6,
        startY: 0,
        cp1X: 0.72,
        cp1Y: 0.4,
        cp2X: 0.8,
        cp2Y: 0.65,
        endX: 0.95,
        endY: 1,
        width: 2,
        alpha: 0.18,
      },
      {
        startX: 0.05,
        startY: 0.5,
        cp1X: 0.35,
        cp1Y: 0.55,
        cp2X: 0.6,
        cp2Y: 0.5,
        endX: 0.85,
        endY: 0.7,
        width: 1.6,
        alpha: 0.16,
      },
    ];
    veins.forEach((v) => {
      ctx.beginPath();
      ctx.moveTo(v.startX * width, v.startY * height);
      ctx.bezierCurveTo(
        v.cp1X * width,
        v.cp1Y * height,
        v.cp2X * width,
        v.cp2Y * height,
        v.endX * width,
        v.endY * height,
      );
      ctx.strokeStyle = `rgba(35, 42, 55, ${v.alpha})`;
      ctx.lineWidth = v.width;
      ctx.stroke();
    });
    ctx.restore();
  } else if (wallType === "carbon_plaster") {
    // 4. WĘGLOWY TYNK AKUSTYCZNY (ULTRA-MATT CARBON)
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, "#1A1B22");
    bgGrad.addColorStop(0.5, "#101116");
    bgGrad.addColorStop(1, "#07080A");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Matowa mikroporowatość
    ctx.save();
    for (let i = 0; i < 300; i++) {
      const rx = (i * 9871) % width;
      const ry = (i * 18763) % height;
      ctx.fillStyle = `rgba(255, 255, 255, 0.025)`;
      ctx.fillRect(rx, ry, 2, 2);
    }
    ctx.restore();
  } else if (wallType === "brushed_steel") {
    // 5. CIEMNA SZCZOTKOWANA STAL
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, "#2E333C");
    bgGrad.addColorStop(0.3, "#21252C");
    bgGrad.addColorStop(0.7, "#14171D");
    bgGrad.addColorStop(1, "#0A0C0E");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Pasma szczotkowania
    ctx.save();
    for (let y = 0; y < height; y += 4) {
      const alpha = ((y % 7) + 1) * 0.012;
      ctx.fillStyle =
        y % 8 === 0 ? `rgba(255, 255, 255, ${alpha})` : `rgba(0, 0, 0, ${alpha * 1.5})`;
      ctx.fillRect(0, y, width, 2);
    }
    ctx.restore();
  } else {
    // 6. KLASYCZNY SUROWY BETON INDUSTRIALNY (DOMYŚLNY)
    const wallGrad = ctx.createLinearGradient(0, 0, width, height);
    wallGrad.addColorStop(0, "#B2B7C1");
    wallGrad.addColorStop(0.4, "#8E95A2");
    wallGrad.addColorStop(0.85, "#5D6472");
    wallGrad.addColorStop(1, "#343A45");
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtelne mikro-łączenie płyt betonowych
    ctx.save();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.1)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(width * 0.5, 0);
    ctx.lineTo(width * 0.5, height);
    ctx.moveTo(0, height * 0.5);
    ctx.lineTo(width, height * 0.5);
    ctx.stroke();
    ctx.restore();
  }
}

// =========================================================================
// PROFESJONALNY FORMAT: LITERY 3D NA ŚCIANIE (PERSPEKTYWA 3D + KINOWE ŚWIATŁO + GLOW)
// =========================================================================
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

  // 1. TŁO ŚCIANY: Własne zdjęcie lub wygenerowany proceduralny materiał
  if (wallImage) {
    drawImageCover(ctx, wallImage, 0, 0, width, height);
  } else {
    drawProceduralWall(ctx, width, height, wallType);

    // 2. OŚWIETLENIE ŚCIANY (GLOW / SPOTLIGHT / DRAMATIC)
    if (wallGlow !== "none") {
      if (wallGlow === "spotlight") {
        // Naturalny snop światła padający z góry
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
        // Ostre światło z prawej strony
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

      // Cień w prawym narożniku
      const cornerGrad = ctx.createLinearGradient(width * 0.82, 0, width, 0);
      cornerGrad.addColorStop(0, "rgba(0,0,0,0)");
      cornerGrad.addColorStop(1, `rgba(0,0,0,${0.5 * glowIntensity})`);
      ctx.fillStyle = cornerGrad;
      ctx.fillRect(width * 0.82, 0, width * 0.18, height);
    }
  }

  // 3. NAŁOŻENIE MACIERZY PERSPEKTYWY 3D
  ctx.save();
  ctx.setTransform(1, -0.055, 0.065, 1, width * 0.05, height * 0.06);

  const baseFontSize = options.fontSize || (height <= 1080 ? 52 : height <= 1350 ? 62 : 72);
  let fontSize = Math.round(baseFontSize * textScale);
  const fontSpec = getFontFamilySpec(fontFamily);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  const startX = width * 0.12;
  // Macierz nachyla kadr o 0,065*y, więc w połowie wysokości litera wędruje o
  // ~115 px w prawo. Bez oddania tego miejsca najdłuższy wiersz schodził za
  // prawą krawędź kadru.
  const maxTextWidth = width - startX - Math.round(width * 0.19);
  const fitted = fitLines(
    ctx,
    textLines.join("\n"),
    maxTextWidth,
    6,
    (size) => `900 ${size}px ${fontSpec}`,
    fontSize,
  );
  const lines = fitted.lines;
  fontSize = fitted.size;

  const lineHeight = fontSize * 1.34;
  const totalTextH = (lines.length - 1) * lineHeight;

  // Litera w tym samym rogu przy każdym poście to ta sama kompozycja w kółko;
  // blok stoi środkiem bezpiecznego pasa, bo górę i dół zjada interfejs.
  let curY = centeredTop(totalTextH + fontSize, height) + fontSize;

  // Dobór barwy liter 3D wg tła i wyboru koloru czcionki (biała vs czarna)
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

  ctx.font = `900 ${fontSize}px ${fontSpec}`;
  lines.forEach((rawLine) => {
    const line = rawLine;
    const shadowOffsetX = -14;
    const shadowOffsetY = 18;

    // A. EFEKT GLOW: Backlight LED zza liter (jeśli wybrano backlight_glow)
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
      // SPECJALNY EFEKT: WYKUCIE W KAMIENIU / PŁASKORZEŹBA (WKLĘSŁE LITERY)
      // 1. Wewnętrzny cień w zagłębieniu (górna i lewa krawędź)
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 4;
      ctx.shadowOffsetY = 5;
      ctx.fillStyle = isLightWall ? "rgba(40, 45, 55, 0.85)" : "rgba(10, 12, 16, 0.92)";
      ctx.fillText(line, startX, curY);
      ctx.restore();

      // 2. Dolno-prawe doświetlenie krawędzi wykucia (światło odbite od krawędzi kamienia)
      ctx.save();
      ctx.shadowColor = isLightWall ? "rgba(255, 255, 255, 0.95)" : "rgba(255, 255, 255, 0.35)";
      ctx.shadowBlur = 3;
      ctx.shadowOffsetX = -2;
      ctx.shadowOffsetY = -2;
      ctx.fillStyle = isLightWall ? "#333A48" : "#12151B";
      ctx.fillText(line, startX, curY);
      ctx.restore();

      // 3. Wnętrze kutej litery z surowym gradientem głębi
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
      // EFEKT WYPUKŁYCH LITER 3D (MATOWY ANTRACYT, SZCZOTKOWANA STAL, CZYSTY AKRYL)
      // B. Miękki cień rozproszony na ścianie (Ambient Shadow)
      ctx.save();
      ctx.shadowColor = isLightWall ? "rgba(10, 15, 25, 0.6)" : "rgba(0, 0, 0, 0.55)";
      ctx.shadowBlur = 28;
      ctx.shadowOffsetX = shadowOffsetX * 1.3;
      ctx.shadowOffsetY = shadowOffsetY * 1.3;
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.fillText(line, startX, curY);
      ctx.restore();

      // C. Ostry cień kontaktowy przy krawędzi litery
      ctx.save();
      ctx.shadowColor = isWhiteFont ? "rgba(0, 0, 0, 0.75)" : "rgba(0, 0, 0, 0.9)";
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = shadowOffsetX * 0.5;
      ctx.shadowOffsetY = shadowOffsetY * 0.5;
      ctx.fillStyle = bevelDepthColor;
      ctx.fillText(line, startX, curY);
      ctx.restore();

      // D. Wypukłość 3D (boki liter rzeźbione w stronę cienia)
      for (let d = 4; d >= 1; d--) {
        ctx.fillStyle = bevelDepthColor;
        ctx.fillText(line, startX - d * 1.2, curY + d * 1.4);
      }

      // E. Front litery wg wybranego materiału
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

        // Subtelny obrys krawędzi stali
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
        // Domyślny matowy antracyt / surowy węgiel
        ctx.fillStyle = frontTextColor;
        ctx.fillText(line, startX, curY);
      }
    }

    curY += lineHeight;
  });

  ctx.restore(); // Przywrócenie normalnego układu

  // Dyskretna sygnatura na dole ściany
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
// KOLAŻ 4 KADRÓW (WINTER ARC / SIATKA 2x2)
// =========================================================================
export function draw4GridCollageSlide(
  canvas: HTMLCanvasElement,
  options: {
    width?: number;
    height?: number;
    centerText: string;
    images: (CanvasImageSource | null)[];
    handle?: string;
    fontColor?: "white" | "black";
  },
) {
  const {
    width = 1080,
    height = 1920,
    centerText = "This winter",
    images = [null, null, null, null],
    fontColor = "white",
  } = options;

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const halfW = width / 2;
  const halfH = height / 2;

  const quadrants = [
    { x: 0, y: 0, w: halfW, h: halfH },
    { x: halfW, y: 0, w: halfW, h: halfH },
    { x: 0, y: halfH, w: halfW, h: halfH },
    { x: halfW, y: halfH, w: halfW, h: halfH },
  ];

  quadrants.forEach((q, idx) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(q.x, q.y, q.w, q.h);
    ctx.clip();

    const img = images[idx];
    if (img && (img as any).complete !== false) {
      try {
        drawImageCover(ctx, img, q.x, q.y, q.w, q.h);
        ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
        ctx.fillRect(q.x, q.y, q.w, q.h);
      } catch {
        ctx.fillStyle = "#0F1420";
        ctx.fillRect(q.x, q.y, q.w, q.h);
      }
    } else {
      ctx.fillStyle = "#090D16";
      ctx.fillRect(q.x, q.y, q.w, q.h);
    }
    ctx.restore();
  });

  // Czarne linie dzielące siatkę (10px)
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(halfW, 0);
  ctx.lineTo(halfW, height);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, halfH);
  ctx.lineTo(width, halfH);
  ctx.stroke();

  // Centralny napis szeryfowy z obrysem
  const fontSize = 76;
  ctx.font = `700 ${fontSize}px Georgia, "Times New Roman", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const isBlackFont = fontColor === "black";
  const textY = halfH;
  ctx.strokeStyle = isBlackFont ? "#FFFFFF" : "#000000";
  ctx.lineWidth = 14;
  ctx.lineJoin = "round";
  ctx.strokeText(centerText, width / 2, textY);

  ctx.fillStyle = isBlackFont ? "#000000" : "#FFFFFF";
  ctx.fillText(centerText, width / 2, textY);
}

// =========================================================================
// CYTAT NA CZERNI / BIELI (FORMAT 9:16 ORAZ INNE)
// =========================================================================
export function drawMinimalBlackQuoteSlide(
  canvas: HTMLCanvasElement,
  options: {
    width?: number;
    height?: number;
    mainText: string;
    subText?: string;
    boldKeyword?: string;
    align?: "left" | "center";
    fontFamily?: string;
    textScale?: number;
    fontColor?: "white" | "black";
    handle?: string;
    /** Wygenerowane w aplikacji tło — bez tego studio posta miało tylko płaską czerń. */
    backgroundImage?: CanvasImageSource | null;
  },
) {
  const {
    width = 1080,
    height = 1920,
    mainText = "Silence cannot be misquoted.",
    subText = "",
    align = "left",
    fontFamily = "sans",
    textScale = 1.0,
    fontColor = "white",
    handle = "stark_focus",
    backgroundImage = null,
  } = options;

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const isBlackFont = fontColor === "black";

  // Wypełnienie tła: czarne dla białej czcionki, czyste białe dla czarnej czcionki
  ctx.fillStyle = isBlackFont ? "#FFFFFF" : "#000000";
  ctx.fillRect(0, 0, width, height);
  if (backgroundImage) {
    drawImageCover(ctx, backgroundImage, 0, 0, width, height);
    // Zaciemnienie jest obowiązkowe: bez niego tekst na jasnej części zdjęcia
    // znika, a to pierwszy błąd, jaki zobaczy użytkownik eksportu.
    ctx.fillStyle = isBlackFont ? "rgba(255,255,255,0.72)" : "rgba(0,0,0,0.62)";
    ctx.fillRect(0, 0, width, height);
  }

  const paddingX = Math.round(width * 0.12);
  const maxLineWidth = width - paddingX * 2;
  const fontSpec = getFontFamilySpec(fontFamily);

  // Model zwraca markdown (`**słowo**`), a ten tryb nie ma własnego wyróżniania, więc
  // markery usuwamy raz tutaj — pomiar i `fillText` muszą widzieć ten sam tekst.
  const cleanMain = stripHighlightSyntax(mainText).trim();
  const cleanSub = stripHighlightSyntax(subText || "").trim();
  const hasSub = cleanSub.length > 0;

  const textColor = isBlackFont ? "#0A0B0D" : "#FFFFFF";
  const textMutedColor = isBlackFont ? "rgba(10, 11, 13, 0.72)" : "rgba(255, 255, 255, 0.72)";
  const drawX = align === "center" ? width / 2 : paddingX;
  ctx.textAlign = align === "center" ? "center" : "left";

  if (!hasSub) {
    // TRYB 1: POJEDYNCZA MOCNA TEZA (np. 3-6 słów na ekranie i koniec)
    let baseFontSize = height >= 1800 ? 84 : 70;
    if (cleanMain.length > 25) baseFontSize = height >= 1800 ? 74 : 62;
    if (cleanMain.length > 45) baseFontSize = height >= 1800 ? 64 : 52;
    if (cleanMain.length > 70) baseFontSize = height >= 1800 ? 54 : 44;

    const mainFontSize = Math.max(36, Math.round(baseFontSize * textScale));
    ctx.font = `700 ${mainFontSize}px ${fontSpec}`;
    const mainLines = wrapTextLines(ctx, cleanMain, maxLineWidth);

    const lineHeight = Math.round(mainFontSize * 1.34);
    const totalH = mainLines.length * lineHeight;

    // Idealne optyczne wyśrodkowanie w pionie dla 9:16
    let curY = Math.round((height - totalH) * 0.46) + mainFontSize;

    mainLines.forEach((line) => {
      ctx.font = `700 ${mainFontSize}px ${fontSpec}`;
      ctx.fillStyle = textColor;
      ctx.fillText(line, drawX, curY);
      curY += lineHeight;
    });
  } else {
    // TRYB 2: DWA WERSY (Nagłówek + dopisek). Najpierw schodzimy z rozmiarem pisma, a dopiero
    // na twardym minimum łamiemy tekst na wiersze — inaczej długie zdanie od modelu wyleca
    // za prawą krawędź kadru.
    let mainFontSize = Math.round((height >= 1800 ? 72 : 60) * textScale);
    ctx.font = `700 ${mainFontSize}px ${fontSpec}`;
    while (ctx.measureText(cleanMain).width > maxLineWidth && mainFontSize > 34) {
      mainFontSize -= 2;
      ctx.font = `700 ${mainFontSize}px ${fontSpec}`;
    }
    const mainLines =
      ctx.measureText(cleanMain).width > maxLineWidth
        ? wrapTextLines(ctx, cleanMain, maxLineWidth)
        : [cleanMain];

    let subFontSize = Math.round((height >= 1800 ? 44 : 36) * textScale);
    ctx.font = `400 ${subFontSize}px ${fontSpec}`;
    while (ctx.measureText(cleanSub).width > maxLineWidth && subFontSize > 22) {
      subFontSize -= 2;
      ctx.font = `400 ${subFontSize}px ${fontSpec}`;
    }
    const subLines =
      ctx.measureText(cleanSub).width > maxLineWidth
        ? wrapTextLines(ctx, cleanSub, maxLineWidth)
        : [cleanSub];

    const mainLineHeight = Math.round(mainFontSize * 1.34);
    const subLineHeight = Math.round(subFontSize * 1.34);
    const gap = Math.round(28 * textScale);
    const totalH =
      (mainLines.length - 1) * mainLineHeight +
      mainFontSize +
      gap +
      (subLines.length - 1) * subLineHeight +
      subFontSize;

    // Idealne optyczne wyśrodkowanie w pionie dla 9:16
    const startY = Math.round((height - totalH) * 0.46) + mainFontSize;

    ctx.font = `700 ${mainFontSize}px ${fontSpec}`;
    ctx.fillStyle = textColor;
    mainLines.forEach((line, i) => ctx.fillText(line, drawX, startY + i * mainLineHeight));

    ctx.font = `400 ${subFontSize}px ${fontSpec}`;
    ctx.fillStyle = textMutedColor;
    const subStartY = startY + (mainLines.length - 1) * mainLineHeight + gap + subFontSize;
    subLines.forEach((line, i) => ctx.fillText(line, drawX, subStartY + i * subLineHeight));
  }

  // Dyskretna sygnatura na dole kadru 9:16
  const cleanHandle = handle.replace("@", "") || "stark_focus";
  ctx.font = '600 22px "Space Grotesk", "JetBrains Mono", monospace';
  ctx.fillStyle = isBlackFont ? "rgba(0, 0, 0, 0.38)" : "rgba(255, 255, 255, 0.38)";
  ctx.textAlign = align === "center" ? "center" : "left";
  ctx.fillText(`@${cleanHandle}`, drawX, height - 120);
}

/**
 * Tło awaryjne, gdy model obrazów milczy (limit, brak klucza, awaria).
 * Wcześniejszą odpowiedzią był komunikat o rozliczeniach — użytkownik zostawał
 * z pustym kadrem i wykładem. Tu dostaje scenę marki: obsydian, światło z góry
 * i ziarno, bez cudzego zdjęcia.
 */
export function drawSceneBackdrop(
  canvas: HTMLCanvasElement,
  width = 1080,
  height = 1920,
  seed = 1,
) {
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const base = ctx.createLinearGradient(0, 0, 0, height);
  base.addColorStop(0, "#101114");
  base.addColorStop(0.55, "#08090B");
  base.addColorStop(1, "#030304");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);

  // Światło padające z góry — przesuwane seedem, żeby kolejne kadry nie
  // wyglądały jak ten sam plik.
  const lightX = width * (0.3 + ((seed * 37) % 40) / 100);
  const glow = ctx.createRadialGradient(
    lightX,
    height * 0.12,
    40,
    lightX,
    height * 0.12,
    height * 0.7,
  );
  glow.addColorStop(0, "rgba(243,240,234,0.10)");
  glow.addColorStop(0.5, "rgba(243,240,234,0.03)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  // Ziarno. Prosty LCG, żeby nie ciągnąć generatora liczb losowych dla tekstury.
  let state = (seed * 2654435761) >>> 0;
  const grain = ctx.createImageData(width, height);
  for (let i = 0; i < width * height; i++) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const v = 118 + (state % 22);
    grain.data[i * 4] = v;
    grain.data[i * 4 + 1] = v;
    grain.data[i * 4 + 2] = v;
    grain.data[i * 4 + 3] = 14;
  }
  ctx.putImageData(grain, 0, 0);

  const vignette = ctx.createRadialGradient(
    width / 2,
    height / 2,
    Math.min(width, height) * 0.25,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.75,
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}

// =========================================================================
// UNIWERSALNY ROUTER RENDEROWANIA UKŁADÓW
// =========================================================================

function applyCasing(text: string, casing?: string): string {
  if (casing === "uppercase") return text.toUpperCase();
  if (casing === "lowercase") return text.toLowerCase();
  return text;
}

function cssFontWeight(weight?: string): string {
  if (weight === "black") return "900";
  if (weight === "bold") return "700";
  return "400";
}

/**
 * Render warstwowy — każda warstwa z analizy układu ma własną geometrię
 * (rozmiar, kolor, pozycję, wyrównanie, wielkie litery). Wcześniejszy
 * `renderUniversalLayout` czytał tylko `textLayers[0]` i `[1]` i na sztywno
 * przyjmował `align: "left"`, więc „odtwórz układ 1:1" spłaszczało każdy
 * przekazany układ do jednego cytatu na czerni.
 */
function drawLayeredTextSlide(
  canvas: HTMLCanvasElement,
  spec: UniversalLayoutSpec,
  options: {
    width: number;
    height: number;
    textScale: number;
    fontColor: "white" | "black";
    handle: string;
    backgroundImage?: CanvasImageSource | null;
  },
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { width, height, textScale, fontColor, handle, backgroundImage } = options;

  // Ustawienie szerokości kasuje stan kontekstu, więc wszystkie style
  // ustawiamy po tym, a nie w save()/restore().
  canvas.width = width;
  canvas.height = height;
  ctx.fillStyle = spec.backgroundColor || (fontColor === "black" ? "#F5F5F5" : "#000000");
  ctx.fillRect(0, 0, width, height);
  if (backgroundImage) {
    drawImageCover(ctx, backgroundImage, 0, 0, width, height);
    ctx.fillStyle = fontColor === "black" ? "rgba(255,255,255,0.72)" : "rgba(0,0,0,0.62)";
    ctx.fillRect(0, 0, width, height);
  }

  const margin = Math.round(width * 0.09);
  const usableWidth = width - margin * 2;

  for (const layer of spec.textLayers) {
    const rawText = applyCasing(String(layer.text || ""), layer.casing).trim();
    if (!rawText) continue;

    const size = Math.max(18, Math.min(340, Math.round((layer.fontSize || 64) * textScale)));
    const style = layer.fontStyle === "italic" ? "italic " : "";
    ctx.font = `${style}${cssFontWeight(layer.fontWeight)} ${size}px ${getFontFamilySpec(
      layer.fontFamily || "sans",
    )}`;

    const lines = wrapTextLines(ctx, rawText, usableWidth);
    const lineHeight = Math.round(size * 1.18);

    const anchorX = Math.round(width * (layer.posX ?? 0.12));
    const align = layer.align === "center" || layer.align === "right" ? layer.align : "left";
    const x = align === "center" ? width / 2 : align === "right" ? width - margin : anchorX;

    ctx.textAlign = align === "center" ? "center" : align === "right" ? "right" : "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = layer.color || (fontColor === "black" ? "#161920" : "#FFFFFF");

    let y = Math.round(height * (layer.posY ?? 0.46));
    for (const line of lines) {
      if (layer.strokeWidth && layer.strokeColor) {
        ctx.lineWidth = layer.strokeWidth;
        ctx.strokeStyle = layer.strokeColor;
        ctx.strokeText(line, x, y);
      }
      ctx.fillText(line, x, y);
      y += lineHeight;
    }
  }

  ctx.textAlign = "left";
  ctx.font = "700 18px monospace";
  ctx.fillStyle = "rgba(160, 160, 160, 0.7)";
  ctx.fillText(
    `@${handle.replace("@", "").toUpperCase()}`,
    70,
    height - (height <= 1080 ? 30 : 60),
  );
}

/** Pierwsza warstwa tekstu z zachowaniem sensownej wartości, gdy jej brak. */
function l1Fallback(spec: UniversalLayoutSpec): string {
  return spec.textLayers[0]?.text?.trim() || "Silence cannot be misquoted.";
}

export function renderUniversalLayout(
  canvas: HTMLCanvasElement,
  spec: UniversalLayoutSpec,
  images: (CanvasImageSource | null)[] = [],
  options: {
    width?: number;
    height?: number;
    fontFamily?: string;
    textScale?: number;
    handle?: string;
    fontColor?: "white" | "black";
    /** Obraz tła z `POST /api/ai/generate-background`. */
    backgroundImage?: CanvasImageSource | null;
  } = {},
) {
  const width = options.width || 1080;
  const height = options.height || 1080;
  const handle = options.handle || "stark_focus";
  const fontFamily = options.fontFamily || "sans";
  const textScale = options.textScale || 1.0;
  const fontColor: "white" | "black" =
    options.fontColor ||
    spec.fontColorMode ||
    (spec.textLayers[0]?.color === "#000000" ||
    spec.textLayers[0]?.color === "#161920" ||
    spec.textLayers[0]?.color === "#111215"
      ? "black"
      : "white");

  // Format 1: Kolaż 4 Kadrów
  if (spec.gridType === "grid_2x2") {
    const centerText = spec.textLayers[0]?.text || "This winter";
    draw4GridCollageSlide(canvas, {
      width,
      height,
      centerText,
      images,
      handle,
      fontColor,
    });
    return;
  }

  // Format 2: Protokół — numerowane kroki pod tezą.
  if (spec.gridType === "protocol_list") {
    drawProtocolListSlide(canvas, {
      width,
      height,
      handle,
      statement: layerById(spec, PRIMARY_LAYER_ID) || l1Fallback(spec),
      steps: groupText(spec, "step"),
      figure: layerById(spec, "figure"),
      bgImage: options.backgroundImage ?? images[0] ?? null,
      headlineFont: spec.fontFamilyCustom || fontFamily,
    });
    return;
  }

  // Format 3: Koszt vs utrata — dwa słupki i pytanie bez odpowiedzi.
  if (spec.gridType === "cost_vs_reward") {
    drawCostVsRewardSlide(canvas, {
      width,
      height,
      handle,
      question: layerById(spec, PRIMARY_LAYER_ID) || l1Fallback(spec),
      cost: groupText(spec, "cost"),
      forfeit: groupText(spec, "forfeit"),
      closing: layerById(spec, "closing"),
      bgImage: options.backgroundImage ?? images[0] ?? null,
    });
    return;
  }

  // Format 5: Diagram + wiersz — rysunek niesie myśl, nie ją ilustruje.
  if (spec.gridType === "concept_diagram") {
    drawConceptDiagramSlide(canvas, {
      width,
      height,
      handle,
      line: layerById(spec, PRIMARY_LAYER_ID) || l1Fallback(spec),
      caption: layerById(spec, "closing"),
      diagram: spec.layoutData?.diagram ?? "chart",
      bgImage: options.backgroundImage ?? null,
    });
    return;
  }

  // Format 4: napis w otoczeniu — ściana 3D, neon albo baner. Ten sam tekst,
  // trzy różne kadry; bez tego materiał miał zawsze literę w tym samym rogu.
  if (spec.gridType === "studio_wall_3d") {
    const lines = spec.textLayers
      .flatMap((layer) => String(layer.text || "").split(/\r?\n/))
      .map((line) => line.trim())
      .filter(Boolean);
    const textLines = lines.length > 0 ? lines : ["Silence cannot be misquoted."];
    const scene = spec.layoutData?.scene || "wall";

    if (scene === "neon") {
      drawNeonSignSlide(canvas, { width, height, textLines, handle });
      return;
    }
    if (scene === "billboard") {
      drawBillboardSignSlide(canvas, { width, height, textLines, handle });
      return;
    }

    draw3DWallQuoteSlide(canvas, {
      width,
      height,
      textLines,
      wallImage: images[0] ?? options.backgroundImage ?? null,
      handle,
      fontSize: spec.textLayers[0]?.fontSize,
      fontFamily: spec.fontFamilyCustom || fontFamily,
      textScale,
      fontColor,
    });
    return;
  }

  // Format 3: wiele warstw tekstu — każda z własną geometrią z analizy.
  if (spec.textLayers.length > 2) {
    drawLayeredTextSlide(canvas, spec, {
      width,
      height,
      textScale,
      fontColor,
      handle,
      backgroundImage: options.backgroundImage ?? null,
    });
    return;
  }

  // Format 4: Domyślny, nieskazitelny Cytat na Czerni (9:16)
  const l1 = spec.textLayers[0]?.text?.trim() || "Silence cannot be misquoted.";
  // Subtext jest uwzględniany TYLKO jeśli użytkownik celowo dodał 2. warstwę z tekstem
  const l2 = spec.textLayers.length > 1 ? spec.textLayers[1]?.text?.trim() || "" : "";

  drawMinimalBlackQuoteSlide(canvas, {
    width,
    height,
    mainText: l1,
    subText: l2,
    align: "left",
    fontFamily: spec.fontFamilyCustom || fontFamily,
    textScale,
    fontColor,
    handle,
    backgroundImage: options.backgroundImage ?? null,
  });
}

// GŁÓWNY SILNIK RENDEROWANIA KARUZEL
function drawPill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  fill?: string,
  stroke?: string,
  lineWidth: number = 1,
) {
  ctx.save();
  ctx.beginPath();
  const r = Math.min(radius, h / 2, w / 2);
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
  ctx.restore();
}

function drawCornerCrosshair(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size = 8,
  color = "rgba(255, 255, 255, 0.16)",
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x - size, y);
  ctx.lineTo(x + size, y);
  ctx.moveTo(x, y - size);
  ctx.lineTo(x, y + size);
  ctx.stroke();
  ctx.restore();
}

interface FittedSlideLayout {
  headlineFontSize: number;
  headlineLineHeight: number;
  headlineLines: string[];
  bodyFontSize: number;
  bodyLineHeight: number;
  bodyLines: string[];
  paragraphGap: number;
  totalContentH: number;
  startY: number;
}

function getCarouselFontFamilyCSS(fontChoice?: CarouselFontFamily): {
  headlineFont: string;
  bodyFont: string;
} {
  switch (fontChoice) {
    case "cinzel":
      return {
        headlineFont: '"Cinzel", serif',
        bodyFont: '"Cinzel", serif',
      };
    case "cormorant":
      return {
        headlineFont: '"Cormorant Garamond", serif',
        bodyFont: '"Cormorant Garamond", serif',
      };
    case "inter":
      return {
        headlineFont: '"Inter", sans-serif',
        bodyFont: '"Inter", sans-serif',
      };
    case "plus_jakarta":
    default:
      return {
        headlineFont: '"Plus Jakarta Sans", sans-serif',
        bodyFont: '"Plus Jakarta Sans", sans-serif',
      };
  }
}

function computeFittedSlideLayout(
  ctx: CanvasRenderingContext2D,
  headline: string,
  bodyText: string,
  contentWidth: number,
  topLimit: number,
  bottomLimit: number,
  textOffsetY: number,
  headlineFontFamily: string = '"Plus Jakarta Sans", sans-serif',
  bodyFontFamily: string = '"Plus Jakarta Sans", sans-serif',
): FittedSlideLayout {
  const availableH = bottomLimit - topLimit;
  let headlineFontSize = headline.length > 55 ? 48 : headline.length > 30 ? 54 : 62;
  let bodyFontSize = bodyText.length > 250 ? 32 : bodyText.length > 140 ? 36 : 40;
  const minHeadlineSize = 30;
  const minBodySize = 20;

  let headlineLines: string[] = [];
  let bodyLines: string[] = [];
  let headlineLineHeight = Math.round(headlineFontSize * 1.25);
  let bodyLineHeight = Math.round(bodyFontSize * 1.48);
  let paragraphGap = Math.round(bodyFontSize * 0.85);
  const eyebrowH = 48;
  const dividerH = 46;
  let totalContentH = 0;

  for (let iter = 0; iter < 18; iter++) {
    headlineLineHeight = Math.round(headlineFontSize * 1.25);
    bodyLineHeight = Math.round(bodyFontSize * 1.48);
    paragraphGap = Math.round(bodyFontSize * 0.85);

    ctx.font = `900 ${headlineFontSize}px ${headlineFontFamily}`;
    headlineLines = wrapTextLines(ctx, headline.toUpperCase(), contentWidth);

    ctx.font = `500 ${bodyFontSize}px ${bodyFontFamily}`;
    bodyLines = wrapTextLines(ctx, bodyText, contentWidth);

    const headlineH = headlineLines.reduce(
      (acc, l) => acc + (l === "" ? Math.round(headlineLineHeight * 0.5) : headlineLineHeight),
      0,
    );
    const bodyH = bodyLines.reduce((acc, l) => acc + (l === "" ? paragraphGap : bodyLineHeight), 0);

    totalContentH = eyebrowH + headlineH + dividerH + bodyH;

    if (
      totalContentH <= availableH * 0.9 ||
      (headlineFontSize <= minHeadlineSize && bodyFontSize <= minBodySize)
    ) {
      break;
    }

    if (headlineFontSize > minHeadlineSize) {
      headlineFontSize = Math.max(minHeadlineSize, headlineFontSize - 2);
    }
    if (bodyFontSize > minBodySize) {
      bodyFontSize = Math.max(minBodySize, bodyFontSize - 1.5);
    }
  }

  // Blok treści licowany środkiem pola między liniami górną i dolną. Wcześniejszy
  // mnożnik 0.38 wciskał krótkie slajdy pod nagłówek, a połowa kadru świeciła pustką.
  const naturalStartY = Math.round(topLimit + (availableH - totalContentH) * 0.5) + textOffsetY;
  const minStartY = topLimit + 16;
  const maxStartY = Math.max(minStartY, bottomLimit - totalContentH - 16);
  const startY = Math.max(minStartY, Math.min(maxStartY, naturalStartY));

  return {
    headlineFontSize,
    headlineLineHeight,
    headlineLines,
    bodyFontSize,
    bodyLineHeight,
    bodyLines,
    paragraphGap,
    totalContentH,
    startY,
  };
}

// GŁÓWNY SILNIK RENDEROWANIA KARUZEL - NOWY ARCHETYP: DARK STOIC EDITORIAL
export function drawSlideToCanvas(canvas: HTMLCanvasElement, options: RenderSlideOptions) {
  const {
    width,
    height,
    slideNumber,
    totalSlides,
    headline,
    bodyText,
    handle,
    theme = "obsidian_monolith",
    bgImage,
    logoImg = null,
    logoSourceType = "seal",
    logoPlacement = "background_watermark",
    logoSize = 44,
    logoOpacity = 25,
    logoGlow = "none",
    topHeaderMode = "protocol_standard",
    topHeaderCustom,
    textOffsetY = 0,
    highlightWords = "",
    fontChoice = "plus_jakarta",
    isContinuous = false,
    footerSignature = "THE UNFORGIVING STANDARD",
    bgStyle = "flat_fog",
  } = options;

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const themeConfig = getStarkThemeConfig(theme);
  const normPlacement = normalizeLogoPlacement(logoPlacement);

  // 1. TŁO & ATMOSFERA: Flat / Foggy Stoic Mood (bez żadnych kiczowatych posągów)
  if (bgImage && bgStyle === "image") {
    try {
      drawImageCover(ctx, bgImage, 0, 0, width, height);
    } catch {
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, themeConfig.bgGradStart);
      bgGrad.addColorStop(0.5, themeConfig.bgGradMid);
      bgGrad.addColorStop(1, themeConfig.bgGradEnd);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);
    }
    // Mroczna winieta kinowa o wysokim kontraście
    ctx.fillStyle = "rgba(5, 7, 12, 0.76)";
    ctx.fillRect(0, 0, width, height);
  } else {
    // Płaskie, głębokie, zamglone tło z subtelną mgławicą/gradientem (Flat & Foggy)
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, themeConfig.bgGradStart);
    bgGrad.addColorStop(0.4, themeConfig.bgGradMid);
    bgGrad.addColorStop(1, themeConfig.bgGradEnd);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtelna mgła (fog) w tle - miękkie, płaskie rozproszenie dymu/światła
    const fogGrad1 = ctx.createRadialGradient(
      width * 0.5,
      height * 0.45,
      20,
      width * 0.5,
      height * 0.45,
      width * 0.85,
    );
    if (theme === "crimson_eclipse") {
      fogGrad1.addColorStop(0, "rgba(225, 29, 72, 0.05)");
      fogGrad1.addColorStop(0.5, "rgba(136, 19, 55, 0.025)");
      fogGrad1.addColorStop(1, "rgba(0, 0, 0, 0)");
    } else if (theme === "pantheon_mist") {
      fogGrad1.addColorStop(0, "rgba(197, 160, 89, 0.045)");
      fogGrad1.addColorStop(0.6, "rgba(0, 0, 0, 0)");
      fogGrad1.addColorStop(1, "rgba(0, 0, 0, 0)");
    } else {
      fogGrad1.addColorStop(0, "rgba(255, 255, 255, 0.03)");
      fogGrad1.addColorStop(0.5, "rgba(148, 163, 184, 0.015)");
      fogGrad1.addColorStop(1, "rgba(0, 0, 0, 0)");
    }
    ctx.fillStyle = fogGrad1;
    ctx.fillRect(0, 0, width, height);

    // Delikatna dolna mgła (bottom mist)
    const fogGrad2 = ctx.createLinearGradient(0, height - 320, 0, height);
    fogGrad2.addColorStop(0, "rgba(0, 0, 0, 0)");
    fogGrad2.addColorStop(1, "rgba(2, 3, 5, 0.45)");
    ctx.fillStyle = fogGrad2;
    ctx.fillRect(0, height - 320, width, 320);
  }

  // Efekt ciągłej karuzeli (Continuous Carousel Seamless Elements)
  if (isContinuous) {
    // Lewa krawędź (dla slajdów > 1) - łącznik z poprzednim slajdem
    if (slideNumber > 1) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height * 0.5 - 30);
      ctx.lineTo(24, height * 0.5 - 30);
      ctx.stroke();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
      ctx.beginPath();
      ctx.moveTo(0, height * 0.5);
      ctx.lineTo(40, height * 0.5);
      ctx.stroke();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.beginPath();
      ctx.moveTo(0, height * 0.5 + 30);
      ctx.lineTo(24, height * 0.5 + 30);
      ctx.stroke();
    }
    // Prawa krawędź (dla slajdów < totalSlides) - łącznik z kolejnym slajdem
    if (slideNumber < totalSlides) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(width, height * 0.5 - 30);
      ctx.lineTo(width - 24, height * 0.5 - 30);
      ctx.stroke();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
      ctx.beginPath();
      ctx.moveTo(width, height * 0.5);
      ctx.lineTo(width - 40, height * 0.5);
      ctx.stroke();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.beginPath();
      ctx.moveTo(width, height * 0.5 + 30);
      ctx.lineTo(width - 24, height * 0.5 + 30);
      ctx.stroke();
    }
  }

  // 2. RAMKA ARCHITEKTONICZNA & ZNACZNIKI REJESTRACYJNE (CROSSHAIRS)
  const frameMargin = 52;
  drawCornerCrosshair(ctx, frameMargin, frameMargin, 8, "rgba(255, 255, 255, 0.16)");
  drawCornerCrosshair(ctx, width - frameMargin, frameMargin, 8, "rgba(255, 255, 255, 0.16)");
  drawCornerCrosshair(ctx, frameMargin, height - frameMargin, 8, "rgba(255, 255, 255, 0.16)");
  drawCornerCrosshair(
    ctx,
    width - frameMargin,
    height - frameMargin,
    8,
    "rgba(255, 255, 255, 0.16)",
  );

  // Linie podziału nagłówka i stopki
  const topRuleY = 136;
  const bottomRuleY = height - 136;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.07)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(frameMargin, topRuleY);
  ctx.lineTo(width - frameMargin, topRuleY);
  ctx.moveTo(frameMargin, bottomRuleY);
  ctx.lineTo(width - frameMargin, bottomRuleY);
  ctx.stroke();

  const renderLogo = (
    lx: number,
    ly: number,
    size: number,
    alpha: number,
    glow: LogoGlowChoice,
  ) => {
    drawBrandLogoOnContext({
      ctx,
      lx,
      ly,
      targetSize: size,
      alphaPct: alpha,
      halo: glow,
      logoImg,
      logoSourceType,
    });
  };

  // 3. LOGO: ZNAK WODNY W TLE (W CENTRUM KADRU)
  if (normPlacement === "background_watermark") {
    renderLogo(width / 2, height * 0.48, Math.max(logoSize * 4.6, 280), logoOpacity, "none");
  }

  // 4. GÓRNY PASEK NAGŁÓWKA (SERIES TAG + PROGRESS CAPSULES)
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const headerText = resolveTopHeaderText(topHeaderMode, topHeaderCustom);
  const headerY = 88;

  const isGold = theme === "pantheon_mist";
  const isCrimson = theme === "crimson_eclipse";
  const isObsidian = theme === "obsidian_monolith";
  const isTitanium = theme === "titanium_slate";

  const highlightColor = isCrimson
    ? "#E11D48" // Mroczna czerwień (Dark Crimson / Blood Rose)
    : isGold
      ? "#C5A059" // Mroczne złoto cesarza
      : isObsidian
        ? "#E11D48" // Karmazyn na czerni — kanoniczny akcent marki
        : isTitanium
          ? "#94A3B8" // Chłodna stal / tytan
          : themeConfig.accentColor || BRAND_ACCENT;

  const fontFam = getCarouselFontFamilyCSS(fontChoice);

  // 4A. Lewa strona nagłówka
  if (topHeaderMode !== "none" && topHeaderMode !== "clean_void") {
    let startTagX = 74;

    if (normPlacement === "top_left") {
      const topLogoSize = 42;
      renderLogo(startTagX + 16, headerY, topLogoSize, Math.max(logoOpacity, 85), logoGlow);
      startTagX += topLogoSize + 24;
    }

    if (headerText) {
      ctx.font = 'bold 14px "Space Grotesk", monospace, sans-serif';
      const tagTextWidth = ctx.measureText(headerText).width;
      const pillW = tagTextWidth + 24;
      drawPill(
        ctx,
        startTagX,
        headerY - 17,
        pillW,
        34,
        6,
        "rgba(255, 255, 255, 0.04)",
        "rgba(255, 255, 255, 0.12)",
      );

      ctx.fillStyle = highlightColor;
      ctx.textAlign = "left";
      ctx.fillText(headerText, startTagX + 12, headerY + 5);
    }
  }

  // 4B. Prawa strona nagłówka: Segmentowy pasek postępu karuzeli
  const counterString = `${pad(slideNumber)} / ${pad(totalSlides)}`;
  ctx.font = 'bold 15px "Space Grotesk", monospace, sans-serif';
  ctx.fillStyle = "#94A3B8";
  ctx.textAlign = "right";
  ctx.fillText(counterString, width - 74, headerY + 5);

  const counterWidth = ctx.measureText(counterString).width;
  const capsuleCount = Math.max(1, totalSlides);
  const capsuleW = Math.max(16, Math.min(28, Math.floor(130 / capsuleCount)));
  const capsuleH = 5;
  const capsuleGap = 4;
  const totalCapsulesW = capsuleCount * capsuleW + (capsuleCount - 1) * capsuleGap;
  const capsulesStartX = width - 74 - counterWidth - 16 - totalCapsulesW;

  for (let i = 0; i < capsuleCount; i++) {
    const capX = capsulesStartX + i * (capsuleW + capsuleGap);
    const capY = headerY - 3;
    const isLit = i < slideNumber;
    drawPill(
      ctx,
      capX,
      capY,
      capsuleW,
      capsuleH,
      2,
      isLit ? highlightColor : "rgba(255, 255, 255, 0.14)",
    );
  }

  // 5. INTELIGENTNY SILNIK DOPASOWYWANIA TREŚCI (AUTO-FIT)
  const maxContentW = width - 176; // 88px marginesu z każdej strony
  const topSafeLimit = topRuleY + 34;
  const bottomSafeLimit = bottomRuleY - 34;

  const layout = computeFittedSlideLayout(
    ctx,
    headline,
    bodyText,
    maxContentW,
    topSafeLimit,
    bottomSafeLimit,
    textOffsetY,
    fontFam.headlineFont,
    fontFam.bodyFont,
  );

  const parsedHighlightTerms = highlightWords
    .split(",")
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w.length > 0);

  let curY = layout.startY;
  const contentLeftX = 88;

  // 5A. Slide Category / Eyebrow Indicator
  const eyebrowFontSize = 15;
  ctx.font = `bold ${eyebrowFontSize}px "Space Grotesk", monospace, sans-serif`;
  ctx.fillStyle = highlightColor;
  ctx.fillRect(contentLeftX, curY - 9, 6, 6);

  ctx.textAlign = "left";
  const eyebrowLabel =
    slideNumber === 1
      ? "HOOK // THE UNFORGIVING REALITY"
      : slideNumber === totalSlides
        ? "CONCLUSION // THE FINAL DIRECTIVE"
        : `RULE ${pad(slideNumber)} // PRINCIPLE`;
  ctx.fillText(eyebrowLabel, contentLeftX + 16, curY);

  // Bezpieczny odstęp przed nagłówkiem, zapobiegający nakładaniu się liter
  curY += layout.headlineFontSize + 14;

  // 5B. Headline z obsługą Enter i wyróżnianiem słów
  ctx.font = `900 ${layout.headlineFontSize}px ${fontFam.headlineFont}`;

  layout.headlineLines.forEach((line) => {
    if (line === "") {
      curY += Math.round(layout.headlineLineHeight * 0.5);
      return;
    }

    const tokens = parseLineTokens(line, parsedHighlightTerms);
    let currentX = contentLeftX;

    tokens.forEach((token) => {
      ctx.font = `900 ${layout.headlineFontSize}px ${fontFam.headlineFont}`;
      ctx.fillStyle = token.isHighlight ? highlightColor : "#FFFFFF";
      ctx.fillText(token.text, currentX, curY);
      currentX += ctx.measureText(`${token.text} `).width;
    });

    curY += layout.headlineLineHeight;
  });

  // 5C. Architektoniczny divider między nagłówkiem a tekstem
  curY += 14;
  ctx.fillStyle = highlightColor;
  ctx.fillRect(contentLeftX, curY - 3, 6, 6);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(contentLeftX + 16, curY);
  ctx.lineTo(contentLeftX + Math.min(maxContentW, 260), curY);
  ctx.stroke();

  curY += layout.bodyFontSize + 14;

  // 5D. Body Text z obsługą akapitów, Enterów i wyraźnym wyróżnianiem słów
  layout.bodyLines.forEach((line) => {
    if (line === "") {
      curY += layout.paragraphGap;
      return;
    }

    const tokens = parseLineTokens(line, parsedHighlightTerms);
    let currentX = contentLeftX;

    tokens.forEach((token) => {
      // Wyróżnienie to wyłącznie kolor. Tło w kapsułce i linia pod spodem
      // robiły z akapitu choinkę i utrudniały czytanie dłuższego tekstu.
      ctx.font = `500 ${layout.bodyFontSize}px ${fontFam.bodyFont}`;
      ctx.fillStyle = token.isHighlight ? highlightColor : "#CBD5E1";
      const tokenW = ctx.measureText(token.text).width;
      ctx.fillText(token.text, currentX, curY);
      currentX += tokenW + ctx.measureText(" ").width;
    });

    curY += layout.bodyLineHeight;
  });

  // 6. NOWOCZESNA STOPKA ARCHITEKTONICZNA (Czysty podpis profilu)
  const footerY = height - 88;
  const cleanHandle = handle.replace("@", "") || "stark_focus";

  // 6A. Lewa strona stopki: Czysty podpis profilu (bez nachodzącego podpisu stałego)
  if (normPlacement === "bottom_under") {
    const bottomLogoSize = 38;
    renderLogo(contentLeftX + 12, footerY, bottomLogoSize, Math.max(logoOpacity, 85), logoGlow);

    ctx.font = 'bold 20px "Space Grotesk", monospace, sans-serif';
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "left";
    ctx.fillText(`@${cleanHandle}`, contentLeftX + bottomLogoSize + 18, footerY + 6);
  } else {
    ctx.font = 'bold 20px "Space Grotesk", monospace, sans-serif';
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "left";
    ctx.fillText(`@${cleanHandle}`, contentLeftX, footerY + 6);
  }

  // 6B. Prawa strona stopki: Interaktywny przycisk akcji (Pill badge)
  if (slideNumber === totalSlides) {
    const badgeW = 186;
    const badgeH = 40;
    const badgeX = width - 74 - badgeW;
    const badgeY = footerY - 18;
    drawPill(ctx, badgeX, badgeY, badgeW, badgeH, 8, highlightColor, undefined);

    ctx.font = 'bold 13px "Space Grotesk", monospace, sans-serif';
    ctx.fillStyle = "#080C14";
    ctx.textAlign = "center";
    ctx.fillText("SAVE THIS POST ⚑", badgeX + badgeW / 2, footerY + 6);
  } else {
    const badgeW = 116;
    const badgeH = 38;
    const badgeX = width - 74 - badgeW;
    const badgeY = footerY - 17;
    drawPill(
      ctx,
      badgeX,
      badgeY,
      badgeW,
      badgeH,
      8,
      "rgba(255, 255, 255, 0.04)",
      "rgba(255, 255, 255, 0.18)",
    );

    ctx.font = 'bold 13px "Space Grotesk", monospace, sans-serif';
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.fillText("SWIPE ➔", badgeX + badgeW / 2, footerY + 6);
  }
}

export async function exportSlideToBlob(
  canvas: HTMLCanvasElement,
  options: RenderSlideOptions,
): Promise<Blob> {
  drawSlideToCanvas(canvas, options);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Błąd renderowania Canvas"))),
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
