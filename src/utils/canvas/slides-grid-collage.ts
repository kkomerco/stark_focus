// Slajd "Kolaż 4 Kadrów" (siatka 2x2).
import { drawImageCover } from "./wall";

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

  // Czarne linie dzielÄ…ce siatkÄ™ (10px)
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
