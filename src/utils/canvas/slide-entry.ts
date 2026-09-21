// GŁÓWNY SILNIK RENDEROWANIA KARUZEL: entry point drawSlideToCanvas (wycięty z canvasRenderer.ts).
import type {
  VisualTheme,
  LogoPlacement,
  LogoGlowChoice,
  LogoSourceType,
  TopHeaderMode,
  CarouselFontFamily,
} from "../../types";
import {
  getStarkThemeConfig,
  normalizeLogoPlacement,
  resolveTopHeaderText,
  drawBrandLogoOnContext,
} from "../starkBrandTheme";
import { drawImageCover } from "./wall";
import { parseLineTokens } from "./tokens";
import {
  computeFittedSlideLayout,
  getCarouselFontFamilyCSS,
  drawCornerCrosshair,
  drawPill,
} from "./carousel";

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
    bgStyle = "flat_fog",
  } = options;

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const themeConfig = getStarkThemeConfig(theme);
  const normPlacement = normalizeLogoPlacement(logoPlacement);

  // 1. TĹO & ATMOSFERA: Flat / Foggy Stoic Mood (bez ĹĽadnych kiczowatych posÄ…gĂłw)
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
    // Mroczna winieta kinowa o wysokim kontraĹ›cie
    ctx.fillStyle = "rgba(5, 7, 12, 0.76)";
    ctx.fillRect(0, 0, width, height);
  } else {
    // PĹ‚askie, gĹ‚Ä™bokie, zamglone tĹ‚o z subtelnÄ… mgĹ‚awicÄ…/gradientem (Flat & Foggy)
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, themeConfig.bgGradStart);
    bgGrad.addColorStop(0.4, themeConfig.bgGradMid);
    bgGrad.addColorStop(1, themeConfig.bgGradEnd);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtelna mgĹ‚a (fog) w tle - miÄ™kkie, pĹ‚askie rozproszenie dymu/Ĺ›wiatĹ‚a
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

    // Delikatna dolna mgĹ‚a (bottom mist)
    const fogGrad2 = ctx.createLinearGradient(0, height - 320, 0, height);
    fogGrad2.addColorStop(0, "rgba(0, 0, 0, 0)");
    fogGrad2.addColorStop(1, "rgba(2, 3, 5, 0.45)");
    ctx.fillStyle = fogGrad2;
    ctx.fillRect(0, height - 320, width, 320);
  }

  // Efekt ciÄ…gĹ‚ej karuzeli (Continuous Carousel Seamless Elements)
  if (isContinuous) {
    // Lewa krawÄ™dĹş (dla slajdĂłw > 1) - Ĺ‚Ä…cznik z poprzednim slajdem
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
    // Prawa krawÄ™dĹş (dla slajdĂłw < totalSlides) - Ĺ‚Ä…cznik z kolejnym slajdem
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

  // Linie podziaĹ‚u nagĹ‚Ăłwka i stopki
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

  // 4. GĂ“RNY PASEK NAGĹĂ“WKA (SERIES TAG + PROGRESS CAPSULES)
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const headerText = resolveTopHeaderText(topHeaderMode, topHeaderCustom);
  const headerY = 88;

  const isGold = theme === "pantheon_mist";
  const isCrimson = theme === "crimson_eclipse";
  const isObsidian = theme === "obsidian_monolith";
  const isTitanium = theme === "titanium_slate";

  const highlightColor = isCrimson
    ? "#E11D48" // Mroczna czerwieĹ„ (Dark Crimson / Blood Rose)
    : isGold
      ? "#C5A059" // Mroczne zĹ‚oto cesarza
      : isObsidian
        ? "#38BDF8" // ChĹ‚odny platynowo-cyjanowy akcent w stylu Stark
        : isTitanium
          ? "#94A3B8" // ChĹ‚odna stal / tytan
          : themeConfig.accentColor || "#38BDF8";

  const fontFam = getCarouselFontFamilyCSS(fontChoice);

  // 4A. Lewa strona nagĹ‚Ăłwka
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

  // 4B. Prawa strona nagĹ‚Ăłwka: Segmentowy pasek postÄ™pu karuzeli
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

  // 5. INTELIGENTNY SILNIK DOPASOWYWANIA TREĹšCI (AUTO-FIT)
  const maxContentW = width - 176; // 88px marginesu z kaĹĽdej strony
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

  // Bezpieczny odstÄ™p przed nagĹ‚Ăłwkiem, zapobiegajÄ…cy nakĹ‚adaniu siÄ™ liter
  curY += layout.headlineFontSize + 14;

  // 5B. Headline z obsĹ‚ugÄ… Enter i wyrĂłĹĽnianiem sĹ‚Ăłw
  ctx.font = `900 ${layout.headlineFontSize}px ${fontFam.headlineFont}`;

  layout.headlineLines.forEach((line) => {
    if (line === "") {
      curY += Math.round(layout.headlineLineHeight * 0.5);
      return;
    }

    const tokens = parseLineTokens(line, parsedHighlightTerms);
    let currentX = contentLeftX;

    tokens.forEach((token) => {
      const isHighlighted = token.isHighlight;
      ctx.font = `900 ${layout.headlineFontSize}px ${fontFam.headlineFont}`;
      ctx.fillStyle = isHighlighted ? highlightColor : "#FFFFFF";
      ctx.fillText(token.text, currentX, curY);

      const tokenW = ctx.measureText(token.text).width;
      const spaceW = ctx.measureText(" ").width;

      if (isHighlighted) {
        ctx.strokeStyle = highlightColor;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(currentX, curY + 6);
        ctx.lineTo(currentX + tokenW, curY + 6);
        ctx.stroke();
      }

      currentX += tokenW + spaceW;
    });

    curY += layout.headlineLineHeight;
  });

  // 5C. Architektoniczny divider miÄ™dzy nagĹ‚Ăłwkiem a tekstem
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

  // 5D. Body Text z obsĹ‚ugÄ… akapitĂłw, EnterĂłw i wyraĹşnym wyrĂłĹĽnianiem sĹ‚Ăłw
  layout.bodyLines.forEach((line) => {
    if (line === "") {
      curY += layout.paragraphGap;
      return;
    }

    const tokens = parseLineTokens(line, parsedHighlightTerms);
    let currentX = contentLeftX;

    tokens.forEach((token) => {
      const isHighlighted = token.isHighlight;
      const fontToUse = isHighlighted
        ? `800 ${layout.bodyFontSize}px ${fontFam.bodyFont}`
        : `500 ${layout.bodyFontSize}px ${fontFam.bodyFont}`;

      ctx.font = fontToUse;
      const tokenW = ctx.measureText(token.text).width;
      const spaceW = ctx.measureText(" ").width;

      if (isHighlighted) {
        // Nowoczesne tĹ‚o kapsuĹ‚ki wyrĂłĹĽniajÄ…cej w stylu editorial
        const pillPadX = 5;
        const pillH = Math.round(layout.bodyFontSize * 1.2);
        const pillY = curY - Math.round(layout.bodyFontSize * 0.92);
        const pillBg = isCrimson
          ? "rgba(225, 29, 72, 0.18)"
          : isGold
            ? "rgba(245, 158, 11, 0.18)"
            : "rgba(255, 255, 255, 0.14)";
        const pillBorder = isCrimson
          ? "rgba(225, 29, 72, 0.4)"
          : isGold
            ? "rgba(245, 158, 11, 0.35)"
            : "rgba(255, 255, 255, 0.35)";
        drawPill(
          ctx,
          currentX - pillPadX,
          pillY,
          tokenW + pillPadX * 2,
          pillH,
          4,
          pillBg,
          pillBorder,
          1,
        );

        // Wyraz w wyrazistym, czytelnym kolorze akcentu
        ctx.fillStyle = highlightColor;
        ctx.fillText(token.text, currentX, curY);

        // Akcentowa linia podkreĹ›lajÄ…ca
        ctx.strokeStyle = highlightColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(currentX - 2, curY + 5);
        ctx.lineTo(currentX + tokenW + 2, curY + 5);
        ctx.stroke();
      } else {
        ctx.fillStyle = "#CBD5E1";
        ctx.fillText(token.text, currentX, curY);
      }

      currentX += tokenW + spaceW;
    });

    curY += layout.bodyLineHeight;
  });

  // 6. NOWOCZESNA STOPKA ARCHITEKTONICZNA (Czysty podpis profilu)
  const footerY = height - 88;
  const cleanHandle = handle.replace("@", "") || "stark_focus";

  // 6A. Lewa strona stopki: Czysty podpis profilu (bez nachodzÄ…cego podpisu staĹ‚ego)
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
    ctx.fillText("SAVE THIS POST âš‘", badgeX + badgeW / 2, footerY + 6);
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
    ctx.fillText("SWIPE âž”", badgeX + badgeW / 2, footerY + 6);
  }
}
