// Nakładki podglądu na klatkę rolki (strefy bezpieczeństwa TikToka).
// Wycięte z renderFrame() VideoStudioModal.tsx (etap 3 refaktoryzacji).

/** Sekcja 7: TikTok Safe Zone UI overlay (tylko podgląd, nigdy eksport). */
export function drawTikTokGuides(ctx: CanvasRenderingContext2D, width: number, _height: number) {
  ctx.save();
  // Top Danger Zone
  ctx.fillStyle = "rgba(239, 68, 68, 0.12)";
  ctx.fillRect(0, 0, width, 210);
  ctx.strokeStyle = "rgba(239, 68, 68, 0.45)";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(0, 210);
  ctx.lineTo(width, 210);
  ctx.stroke();

  ctx.fillStyle = "#F87171";
  ctx.font = "bold 16px monospace";
  ctx.textAlign = "center";
  ctx.fillText("⚠️ GÓRNY PASEK TIKTOK (STATUS / TABS)", width / 2, 110);

  // Right Action Icons
  ctx.fillStyle = "rgba(239, 68, 68, 0.10)";
  ctx.fillRect(width - 130, 690, 130, 900);
  ctx.fillText("SIDEBAR", width - 65, 1140);

  // Bottom Caption Danger Zone
  ctx.fillStyle = "rgba(239, 68, 68, 0.15)";
  ctx.fillRect(0, 1560, width, 360);
  ctx.beginPath();
  ctx.moveTo(0, 1560);
  ctx.lineTo(width, 1560);
  ctx.stroke();
  ctx.fillText("⚠️ DOLNA STREFA TIKTOK (OPIS, DŹWIĘK, PROFIL)", width / 2, 1710);
  ctx.restore();
}
