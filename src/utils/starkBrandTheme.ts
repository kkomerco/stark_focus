import {
  VisualTheme,
  LogoSourceType,
  LogoPlacement,
  LogoGlowChoice,
  TopHeaderMode,
} from "../types";

export interface ThemeConfig {
  id: VisualTheme;
  name: string;
  badge: string;
  primaryColor: string;
  accentColor: string;
  desc: string;
  bgGradStart: string;
  bgGradMid: string;
  bgGradEnd: string;
  borderColor: string;
}

export const STARK_THEMES: ThemeConfig[] = [
  {
    id: "obsidian_monolith",
    name: "1. STARK OBSIDIAN (Czysta Czerń)",
    badge: "Mroczna Czerń & Platyna",
    primaryColor: "#FFFFFF",
    accentColor: "#E2E8F0",
    desc: "Bezwzględna, mroczna czerń otchłani, matowa platyna i surowy stoicki minimalizm.",
    bgGradStart: "#06080C",
    bgGradMid: "#030406",
    bgGradEnd: "#010102",
    borderColor: "rgba(226, 232, 240, 0.15)",
  },
  {
    id: "titanium_slate",
    name: "2. TITANIUM CHARCOAL (Grafit & Węgiel)",
    badge: "Stal & Ciemny Antracyt",
    primaryColor: "#F8FAFC",
    accentColor: "#94A3B8",
    desc: "Architektoniczny matowy grafit, szczotkowany tytan i stalowy światłocień bez jaskrawych barw.",
    bgGradStart: "#0D1117",
    bgGradMid: "#080B10",
    bgGradEnd: "#030407",
    borderColor: "rgba(148, 163, 184, 0.18)",
  },
  {
    id: "pantheon_mist",
    name: "3. SHADOW GOLD (Mroczny Złoty Cień)",
    badge: "Czerń & Cesarskie Złoto",
    primaryColor: "#FFFFFF",
    accentColor: "#C5A059",
    desc: "Głęboki cień monumentów z akcentem stonowanego mrocznego złota cesarza Marka Aureliusza.",
    bgGradStart: "#0A0907",
    bgGradMid: "#050403",
    bgGradEnd: "#010101",
    borderColor: "rgba(197, 160, 89, 0.22)",
  },
  {
    id: "crimson_eclipse",
    name: "4. CRIMSON ECLIPSE (Mroczna Krwista Czerwień)",
    badge: "Czerń & Głęboki Karmazyn",
    primaryColor: "#FFFFFF",
    accentColor: "#E11D48",
    desc: "Surowa czerń nocy z głębokim, mrocznym karmazynowym podświetleniem słów kluczowych.",
    bgGradStart: "#0B0507",
    bgGradMid: "#070204",
    bgGradEnd: "#020102",
    borderColor: "rgba(225, 29, 72, 0.24)",
  },
];

export function getStarkThemeConfig(themeId: string): ThemeConfig {
  const found = STARK_THEMES.find((t) => t.id === themeId);
  return found || STARK_THEMES[0];
}

export function normalizeLogoPlacement(placement: string): LogoPlacement {
  if (
    placement === "bottom" ||
    placement === "bottom_under" ||
    placement === "footer" ||
    placement === "bottom_inline" ||
    placement === "bottom_above"
  ) {
    return "bottom_under";
  }
  if (
    placement === "top" ||
    placement === "top_left" ||
    placement === "top_right" ||
    placement === "top_center"
  ) {
    return "top_left";
  }
  if (
    placement === "center_watermark" ||
    placement === "background_watermark" ||
    placement === "watermark"
  ) {
    return "background_watermark";
  }
  if (placement === "none") {
    return "none";
  }
  return "background_watermark";
}

export interface DrawBrandLogoOptions {
  ctx: CanvasRenderingContext2D;
  lx: number;
  ly: number;
  targetSize: number;
  alphaPct: number;
  halo: LogoGlowChoice;
  logoImg: HTMLImageElement | null;
  logoSourceType: LogoSourceType;
}

export interface TopHeaderPreset {
  id: TopHeaderMode;
  label: string;
  displayText: string;
  desc: string;
}

export const STARK_TOP_HEADER_PRESETS: TopHeaderPreset[] = [
  {
    id: "protocol_standard",
    label: "STARK FOCUS",
    displayText: "STARK FOCUS",
    desc: "Uniwersalna belka flagowa marki",
  },
  {
    id: "daily_discipline",
    label: "DAILY DISCIPLINE // NO EXCUSES",
    displayText: "DAILY DISCIPLINE // NO EXCUSES",
    desc: "Samodyscyplina i rygor",
  },
  {
    id: "cold_truth",
    label: "THE COLD TRUTH // WAKE UP",
    displayText: "THE COLD TRUTH // WAKE UP",
    desc: "Brutalna prawda o nawykach",
  },
  {
    id: "clean_void",
    label: "✕ Czysty Kadr (Bez belki)",
    displayText: "",
    desc: "Brak górnego paska",
  },
  {
    id: "custom",
    label: "✍️ Własny Tekst (Wpisz sam)",
    displayText: "",
    desc: "Twój własny tekst belki",
  },
];

export function resolveTopHeaderText(mode: TopHeaderMode | string, customText?: string): string {
  if (mode === "clean_void" || mode === "none") return "";
  if (mode === "custom" && customText && customText.trim().length > 0) {
    return customText.trim().toUpperCase();
  }
  const found = STARK_TOP_HEADER_PRESETS.find((p) => p.id === mode);
  if (found) return found.displayText;
  return customText?.trim() || "STARK FOCUS";
}

export function drawBrandLogoOnContext(options: DrawBrandLogoOptions) {
  const { ctx, lx, ly, targetSize, alphaPct, halo, logoImg } = options;
  ctx.save();
  ctx.globalAlpha = Math.max(0.02, Math.min(1, alphaPct / 100));

  if (halo === "white") {
    ctx.shadowColor = "rgba(255, 255, 255, 0.45)";
    ctx.shadowBlur = 12;
  } else {
    ctx.shadowBlur = 0;
  }

  if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
    const aspect = logoImg.naturalWidth / logoImg.naturalHeight;
    let dw = targetSize;
    let dh = targetSize;
    if (aspect > 1) {
      dh = dw / aspect;
    } else {
      dw = dh * aspect;
    }

    // Circular clip for official seal logo
    ctx.beginPath();
    ctx.arc(lx, ly, dw / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.save();
    ctx.clip();
    ctx.drawImage(logoImg, lx - dw / 2, ly - dh / 2, dw, dh);
    ctx.restore();

    // Subtle dark/platinum protective outer rim
    if (halo !== "none") {
      ctx.strokeStyle = "rgba(226, 232, 240, 0.4)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(lx, ly, dw / 2, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else {
    // Minimal geometric shield fallback
    ctx.strokeStyle = "rgba(226, 232, 240, 0.5)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(lx, ly, targetSize / 2, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}
