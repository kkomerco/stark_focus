// src/utils/character/rig.ts
// Rysowany w kodzie chłopak — ta sama postać w każdym kadrze.
//
// Maskotka działa tylko wtedy, gdy jest TA SAMA: ten sam łeb, te same okulary,
// te same proporcje, inne zajęcie. Dlatego postać jest szkieletem z kątami
// stawowymi, a nie zbiorem osobnych rysunków — pozy pochodzą z jednego riga.
//
// Technika „fill then stroke": każdy kształt zamalowywany jest tłem, zanim
// dostanie obrys, a rysujemy od tyłu do przodu. Bez tego ramiona i tułów
// tworzą siekę linii zamiast czytelnej sylwetki.

export type Joint =
  | "headTilt"
  | "spineLean"
  | "lShoulder"
  | "lElbow"
  | "rShoulder"
  | "rElbow"
  | "lHip"
  | "lKnee"
  | "rHip"
  | "rKnee";

/** Kąty w stopniach: 0 = kończyna w dół, dodatni = do przodu (w prawo). */
export type Pose = Partial<Record<Joint, number>>;

export type Expression = "empty" | "grit" | "tired" | "break" | "calm" | "focus" | "falling";

export interface DoodleOptions {
  /** Środek pionowego pudełka postaci. */
  cx: number;
  cy: number;
  /** Wysokość od czubka głowy do podeszwy — wszystko inne jest jej ułamkiem. */
  height: number;
  pose: Pose;
  expression?: Expression;
  line?: string;
  fill?: string;
  /** Faza cyklu ruchu 0-1 (oddech, krok). Deterministyczna, nie losowa. */
  motion?: number;
  /** Odbicie lustrzane — chłopak patrzy w drugą stronę kadru. */
  flip?: boolean;
  /** Przedmiot w dłoniach: bez niego „niesie ciężar" jest tylko kątem w kolanach. */
  prop?: "none" | "boulder" | "phone" | "rope";
  /** Obrót całej sylwetki — upadek i potknięcie czytają się z pochylenia. */
  rotate?: number;
}

const DEG = Math.PI / 180;

/**
 * Proporcje jako ułamki wysokości, liczone od czubka głowy w dół.
 * Głowa jest celowo mała (~1/13 wysokości): przy większej chłopak wygląda na
 * dziecko, a „motywacja z dziecka" to nie jest ta marka.
 */
const R = {
  headR: 0.078,
  neckY: 0.185,
  shoulderY: 0.215,
  chestY: 0.285,
  hipY: 0.44,
  shoulderX: 0.055,
  upperArm: 0.17,
  foreArm: 0.16,
  thigh: 0.26,
  shin: 0.26,
  hand: 0.024,
  footW: 0.07,
  footH: 0.026,
  torsoW: 0.15,
  /** Podeszwa przy wyprostowanych nogach — punkt odniesienia dla „stopy na ziemi". */
  soleY: 0.96,
};

const BASE_LINE = "rgba(243,240,234,0.92)";
const BASE_FILL = "#050505";

interface Point {
  x: number;
  y: number;
}

/** Punkt oddalony o `len` w dół pod kątem `deg` od pionu. */
function down(from: Point, len: number, deg: number): Point {
  const a = deg * DEG;
  return { x: from.x + Math.sin(a) * len, y: from.y + Math.cos(a) * len };
}

/** Punkt oddalony o `len` w górę, z przechyłem kręgosłupa. */
function up(from: Point, len: number, leanDeg: number): Point {
  return down(from, len, 180 + leanDeg);
}

/** Kształt zamalowany tłem i dopiero obrysowany — czytelny doodle, nie sieka. */
function shape(ctx: CanvasRenderingContext2D, draw: () => void, line: string, fill: string) {
  ctx.beginPath();
  draw();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = line;
  ctx.stroke();
}

function stroke(ctx: CanvasRenderingContext2D, points: Point[], line: string, width: number) {
  ctx.beginPath();
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.strokeStyle = line;
  ctx.lineWidth = width;
  ctx.stroke();
}

function foot(ctx: CanvasRenderingContext2D, at: Point, u: number, line: string, fill: string) {
  shape(
    ctx,
    () =>
      ctx.ellipse(
        at.x + u * R.footW * 0.32,
        at.y,
        u * R.footW * 0.5,
        u * R.footH,
        0,
        0,
        Math.PI * 2,
      ),
    line,
    fill,
  );
}

/** Trzy kreski na czubku — znak rozpoznawczy, identyczny w każdym kadrze. */
function hair(
  ctx: CanvasRenderingContext2D,
  head: Point,
  r: number,
  line: string,
  tiltDeg: number,
) {
  const width = r * 0.16;
  for (const [offset, spread] of [
    [-0.42, -26],
    [0.0, -2],
    [0.42, 24],
  ] as const) {
    const baseX = head.x + r * offset;
    const baseY = head.y - Math.sqrt(Math.max(0, r * r - (r * offset) ** 2));
    const tip = down({ x: baseX, y: baseY }, r * 0.42, tiltDeg + spread + 180);
    stroke(ctx, [{ x: baseX, y: baseY }, tip], line, width);
  }
}

/** Okulary robią twarz: dwa szkła, mostek i zausznik. */
function glasses(ctx: CanvasRenderingContext2D, head: Point, r: number, line: string) {
  const width = r * 0.16;
  ctx.strokeStyle = line;
  ctx.lineWidth = width;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(head.x + side * r * 0.42, head.y - r * 0.06, r * 0.3, r * 0.34, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(head.x - r * 0.12, head.y - r * 0.1);
  ctx.lineTo(head.x + r * 0.12, head.y - r * 0.1);
  ctx.stroke();
}

/**
 * Usta i brwi. Zero = linia prosta, ujemne = w dół, dodatnie = w górę.
 * „Grit" nie może być uśmiechem: maskotka @stark_focus jest zmęczona,
 * nie zadowolona — inaczej kłóci się z tekstem na kadrze.
 */
function face(
  ctx: CanvasRenderingContext2D,
  head: Point,
  r: number,
  line: string,
  expression: Expression,
) {
  const spec: Record<Expression, { mouth: number; brow: number }> = {
    empty: { mouth: 0, brow: 0 },
    calm: { mouth: 0.22, brow: 0 },
    focus: { mouth: -0.06, brow: 0.35 },
    grit: { mouth: -0.18, brow: 0.6 },
    tired: { mouth: -0.12, brow: -0.35 },
    break: { mouth: -0.3, brow: -0.6 },
    falling: { mouth: -0.1, brow: -0.45 },
  };
  const { mouth, brow } = spec[expression];
  const width = r * 0.16;

  const my = head.y + r * 0.5;
  ctx.beginPath();
  ctx.moveTo(head.x - r * 0.3, my);
  ctx.quadraticCurveTo(head.x, my + r * mouth, head.x + r * 0.3, my);
  ctx.strokeStyle = line;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.stroke();

  for (const side of [-1, 1]) {
    const bx = head.x + side * r * 0.42;
    const by = head.y - r * 0.44;
    stroke(
      ctx,
      [
        { x: bx - side * r * 0.26, y: by + r * brow * 0.5 },
        { x: bx + side * r * 0.26, y: by - r * brow * 0.5 },
      ],
      line,
      width,
    );
  }
}

/**
 * Konwencja kątów, jedna na cały rig: 0 = w dół, dodatni = w stronę, w którą
 * patrzy postać (+x). Lewa strona ciała „na zewnątrz" ma więc kąt UJEMNY,
 * prawa dodatni — zamiana znaków chowa rękę za tułowiem i postać bez rąk
 * wygląda na kreskę, nie na człowieka.
 */
const REST: Required<Pose> = {
  headTilt: 0,
  spineLean: 0,
  lShoulder: -13,
  lElbow: -5,
  rShoulder: 13,
  rElbow: 5,
  lHip: -6,
  lKnee: -2,
  rHip: 6,
  rKnee: 2,
};

/** Wszystkie punkty szkieletu dla danej pozy — wyliczone przed rysowaniem. */
function buildSkeleton(u: number, pose: Required<Pose>, breath: number) {
  const lean = pose.spineLean;
  const hip: Point = { x: 0, y: u * R.hipY };
  const chest = up(hip, u * (R.hipY - R.chestY), lean);
  const neck = up(hip, u * (R.hipY - R.neckY), lean * 0.55);
  const headR = u * R.headR;
  const head = up(neck, headR * 1.22, lean * 0.35 + pose.headTilt);
  const shoulderAnchor = up(hip, u * (R.hipY - R.shoulderY), lean);

  const arm = (origin: Point, root: number, bend: number) => {
    const elbow = down(origin, u * R.upperArm, root);
    return { elbow, hand: down(elbow, u * R.foreArm, root + bend) };
  };
  const leg = (root: number, bend: number) => {
    const knee = down(hip, u * R.thigh, root);
    return { knee, foot: down(knee, u * R.shin, root + bend) };
  };

  return {
    hip,
    chest,
    head,
    headR,
    backShoulder: { x: shoulderAnchor.x - u * R.shoulderX, y: shoulderAnchor.y + breath },
    frontShoulder: { x: shoulderAnchor.x + u * R.shoulderX, y: shoulderAnchor.y - breath },
    backArm: arm(
      { x: shoulderAnchor.x - u * R.shoulderX, y: shoulderAnchor.y + breath },
      pose.lShoulder + lean,
      pose.lElbow,
    ),
    frontArm: arm(
      { x: shoulderAnchor.x + u * R.shoulderX, y: shoulderAnchor.y - breath },
      pose.rShoulder + lean,
      pose.rElbow,
    ),
    backLeg: leg(pose.lHip, pose.lKnee),
    frontLeg: leg(pose.rHip, pose.rKnee),
  };
}

/** Przedmiot w rękach. Rysowany z tych samych punktów co szkielet, więc trzyma się dłoni w każdej pozycji. */
function drawProp(
  ctx: CanvasRenderingContext2D,
  prop: NonNullable<DoodleOptions["prop"]>,
  sk: ReturnType<typeof buildSkeleton>,
  u: number,
  line: string,
  fill: string,
) {
  const mid: Point = {
    x: (sk.backArm.hand.x + sk.frontArm.hand.x) / 2,
    y: (sk.backArm.hand.y + sk.frontArm.hand.y) / 2,
  };

  if (prop === "boulder") {
    shape(
      ctx,
      () => ctx.ellipse(mid.x, mid.y + u * 0.02, u * 0.085, u * 0.07, 0.2, 0, Math.PI * 2),
      line,
      fill,
    );
    stroke(
      ctx,
      [
        { x: mid.x - u * 0.04, y: mid.y - u * 0.01 },
        { x: mid.x - u * 0.01, y: mid.y + u * 0.03 },
      ],
      line,
      u * 0.012,
    );
    return;
  }

  if (prop === "phone") {
    ctx.save();
    ctx.translate(mid.x, mid.y);
    ctx.rotate(-0.35);
    shape(ctx, () => ctx.rect(-u * 0.028, -u * 0.048, u * 0.056, u * 0.096), line, fill);
    ctx.restore();
    return;
  }

  if (prop === "rope") {
    // Lina znad głowy: „ciągnie", zamiast stać.
    stroke(
      ctx,
      [
        { x: sk.frontArm.hand.x, y: sk.frontArm.hand.y },
        { x: sk.frontArm.hand.x + u * 0.1, y: sk.frontArm.hand.y - u * 0.28 },
      ],
      line,
      u * 0.016,
    );
  }
}

/** Najniższy i najwyższy punkt rysu — kotwica i testy trzymają jedną miarę. */
export function figureBounds(u: number, rawPose: Pose): { top: number; bottom: number } {
  const pose = { ...REST, ...rawPose };
  const sk = buildSkeleton(u, pose, 0);
  const points = [
    sk.backLeg.foot,
    sk.frontLeg.foot,
    sk.backArm.hand,
    sk.frontArm.hand,
    sk.hip,
    { x: sk.head.x, y: sk.head.y - sk.headR },
  ];
  const ys = points.map((p) => p.y);
  return {
    top: Math.min(...ys, sk.head.y - sk.headR),
    bottom: Math.max(...ys) + u * R.hand,
  };
}

/**
 * Postać rysowana w całości z jednego riga. `pose` podaje kąty stawów,
 * reszta — głowa, okulary, włosy, tułów, dłonie, stopy — jest wspólna.
 */
export function drawDoodle(ctx: CanvasRenderingContext2D, options: DoodleOptions): void {
  const u = options.height;
  const line = options.line ?? BASE_LINE;
  const fill = options.fill ?? BASE_FILL;
  const expression = options.expression ?? "empty";
  const motion = options.motion ?? 0;
  const prop = options.prop ?? "none";

  const pose = { ...REST, ...options.pose };
  // Oddech: niech postać nigdy nie będzie martwym rysem, ale bez cyrku.
  const breath = Math.sin(motion * Math.PI * 2) * u * 0.004;
  const sk = buildSkeleton(u, pose, breath);

  // Kotwica liczy się z najniższego punktu rysu, nie z „stóp". Siedzący ma
  // najniżej stopy, klęczący kolana, a pochylony — rękę; sztywna reguła
  // „biodro na dole" wypychała mu nogi za kadr.
  const lowest = figureBounds(u, options.pose).bottom;

  ctx.save();
  ctx.translate(options.cx, options.cy + u / 2 - lowest);
  if (options.rotate) {
    ctx.rotate(options.rotate * DEG);
  }
  if (options.flip) {
    ctx.scale(-1, 1);
  }
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const limbW = u * 0.024;
  const lean = pose.spineLean;

  // Tył ciała pierwszy, przód go zasłania.
  stroke(ctx, [sk.backShoulder, sk.backArm.elbow, sk.backArm.hand], line, limbW);
  shape(
    ctx,
    () => ctx.arc(sk.backArm.hand.x, sk.backArm.hand.y, u * R.hand, 0, Math.PI * 2),
    line,
    fill,
  );
  stroke(ctx, [sk.hip, sk.backLeg.knee, sk.backLeg.foot], line, limbW);
  foot(ctx, sk.backLeg.foot, u, line, fill);

  // Tułów jako jeden kapsułowaty obrys od barków do bioder.
  shape(
    ctx,
    () => {
      const top = up(sk.hip, u * (R.hipY - R.shoulderY), lean);
      const w = u * R.torsoW * 0.5;
      ctx.moveTo(top.x - w, top.y);
      ctx.quadraticCurveTo(top.x, top.y - u * 0.03, top.x + w, top.y);
      ctx.lineTo(sk.hip.x + u * 0.032, sk.hip.y);
      ctx.quadraticCurveTo(sk.hip.x, sk.hip.y + u * 0.026, sk.hip.x - u * 0.032, sk.hip.y);
      ctx.closePath();
    },
    line,
    fill,
  );

  if (prop !== "none") {
    drawProp(ctx, prop, sk, u, line, fill);
  }

  // Przednia noga i ręka na wierzchu.
  stroke(ctx, [sk.hip, sk.frontLeg.knee, sk.frontLeg.foot], line, limbW);
  foot(ctx, sk.frontLeg.foot, u, line, fill);
  stroke(ctx, [sk.frontShoulder, sk.frontArm.elbow, sk.frontArm.hand], line, limbW);
  shape(
    ctx,
    () => ctx.arc(sk.frontArm.hand.x, sk.frontArm.hand.y, u * R.hand, 0, Math.PI * 2),
    line,
    fill,
  );

  // Głowa na końcu: okulary, brwi i włosy leżą na zamalowanym kole.
  shape(ctx, () => ctx.arc(sk.head.x, sk.head.y, sk.headR, 0, Math.PI * 2), line, fill);
  hair(ctx, sk.head, sk.headR, line, lean + pose.headTilt);
  glasses(ctx, sk.head, sk.headR, line);
  face(ctx, sk.head, sk.headR, line, expression);

  ctx.restore();
}
