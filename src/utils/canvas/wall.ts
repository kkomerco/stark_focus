// Rysowanie tła "ściany" dla rendererów canvas (wycięte z canvasRenderer.ts).
export function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const naturalWidth =
    (img as any).naturalWidth || (img as any).videoWidth || (img as any).width || 800;
  const naturalHeight =
    (img as any).naturalHeight || (img as any).videoHeight || (img as any).height || 600;

  const targetRatio = w / h;
  const imageRatio = naturalWidth / naturalHeight;

  let sx = 0;
  let sy = 0;
  let sWidth = naturalWidth;
  let sHeight = naturalHeight;

  if (imageRatio > targetRatio) {
    sWidth = naturalHeight * targetRatio;
    sx = (naturalWidth - sWidth) / 2;
  } else {
    sHeight = naturalWidth / targetRatio;
    sy = (naturalHeight - sHeight) / 2;
  }

  ctx.drawImage(img, sx, sy, sWidth, sHeight, x, y, w, h);
}

// =========================================================================
// POMOCNIK PROCEDURALNEGO TWORZENIA TEKSTUR ĹšCIANY STARK FOCUS
// =========================================================================
export function drawProceduralWall(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  wallType: string = "concrete",
) {
  // A. BAZOWY GRADIENT KOLORYSTYCZNY ĹšCIANY
  if (wallType === "black_marble") {
    // 1. CZARNY MARMUR OBSIDIAN (Nero Marquina w barwach Stark Focus)
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, "#161922");
    bgGrad.addColorStop(0.3, "#0F1116");
    bgGrad.addColorStop(0.7, "#08090C");
    bgGrad.addColorStop(1, "#030406");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Organiczne ĹĽyĹ‚ki marmuru (Marble Veins)
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
      // MiÄ™kka poĹ›wiata ĹĽyĹ‚ki
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

      // Ostry nerw ĹĽyĹ‚ki
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
    // 2. CIEMNY GRANIT / ĹUPEK SKALNY
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
    // 3. CHĹODNY MARMUR STOICKI (CARRARA MONOLITH)
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, "#EAEFF5");
    bgGrad.addColorStop(0.4, "#D6DCE5");
    bgGrad.addColorStop(0.85, "#B8C0CC");
    bgGrad.addColorStop(1, "#9CA4B2");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Ciemne popielate ĹĽyĹ‚ki
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
    // 4. WÄGLOWY TYNK AKUSTYCZNY (ULTRA-MATT CARBON)
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, "#1A1B22");
    bgGrad.addColorStop(0.5, "#101116");
    bgGrad.addColorStop(1, "#07080A");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Matowa mikroporowatoĹ›Ä‡
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
    // 6. KLASYCZNY SUROWY BETON INDUSTRIALNY (DOMYĹšLNY)
    const wallGrad = ctx.createLinearGradient(0, 0, width, height);
    wallGrad.addColorStop(0, "#B2B7C1");
    wallGrad.addColorStop(0.4, "#8E95A2");
    wallGrad.addColorStop(0.85, "#5D6472");
    wallGrad.addColorStop(1, "#343A45");
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtelne mikro-Ĺ‚Ä…czenie pĹ‚yt betonowych
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

// Mapowanie nazw fontĂłw na specyfikacje Canvas (Plus Jakarta, Cinzel Roman, Inter, Cormorant)
export function getFontFamilySpec(fontFamily: string = "sans"): string {
  const f = fontFamily.toLowerCase();
  if (f === "cinzel" || f === "serif" || f === "cinzel roman") return `"Cinzel", serif`;
  if (f === "cormorant" || f === "cormorant garamond")
    return `"Cormorant Garamond", Georgia, serif`;
  if (f === "inter") return `"Inter", sans-serif`;
  return `"Plus Jakarta Sans", sans-serif`;
}
