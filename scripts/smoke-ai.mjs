// Tymczasowy skrypt weryfikujący nowe endpointy Fazy 2 (idea-stream, deconstruct-viral).
import { spawn } from "node:child_process";

const server = spawn("npm", ["run", "dev"], {
  cwd: process.cwd(),
  shell: true,
  stdio: ["ignore", "pipe", "pipe"],
});

let serverOut = "";
server.stdout.on("data", (d) => (serverOut += d.toString()));
server.stderr.on("data", (d) => (serverOut += d.toString()));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForHealth(timeoutMs = 60000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch("http://localhost:3000/api/health");
      if (res.ok) return true;
    } catch {
      /* jeszcze nie wstał */
    }
    await sleep(1500);
  }
  return false;
}

async function post(path, body) {
  const res = await fetch("http://localhost:3000" + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

function cleanup(code) {
  try {
    server.kill("SIGTERM");
  } catch {
    /* ignore */
  }
  process.exit(code);
}

(async () => {
  const healthy = await waitForHealth();
  console.log("HEALTH:", healthy ? "OK" : "FAILED");
  if (!healthy) {
    console.log("--- server output ---\n" + serverOut);
    cleanup(1);
  }

  // Smoke ma łapać regresję, a nie tylko coś wypisywać. Najgroźniejsza awaria,
  // jaką tu znaleźliśmy: trasa zwracała 200 i source:"offline" przy sprawnym
  // kluczu (503 na jednym modelu bez łańcucha fallbacku). Oko widziało „200 OK"
  // i uznawało generację za działającą, a leciał bank treści.
  const requireAi = !!process.env.GEMINI_API_KEY;
  const problems = [];
  const check = (ok, msg) => {
    if (!ok) problems.push(msg);
  };

  // 1) idea-stream: sprawdzamy anty-powtórkę
  const exclude = [
    "your comfort zone is a coffin with wifi",
    "they see your silence and call it weakness",
  ];
  const ideas = await post("/api/ai/idea-stream", {
    count: 4,
    excludeHooks: exclude,
    usedCount: 2,
  });
  console.log("\n=== IDEA-STREAM ===");
  console.log(
    "HTTP",
    ideas.status,
    "| source:",
    ideas.json.source,
    "| count:",
    ideas.json.ideas?.length,
  );
  (ideas.json.ideas || []).forEach((i) => {
    const excluded = exclude.includes(
      i.hook
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .trim(),
    );
    console.log(`  [${i.category}] ${i.hook}  ${excluded ? "<-- POWTORKA!" : ""}`);
  });

  check(ideas.status === 200, `idea-stream: HTTP ${ideas.status}`);
  if (requireAi)
    check(
      ideas.json.source === "ai",
      `idea-stream: source="${ideas.json.source}" zamiast "ai" przy skonfigurowanym kluczu`,
    );
  check(
    (ideas.json.ideas || []).length > 0,
    "idea-stream: pusta lista (sprawdź pole `exhausted` / `notice` w odpowiedzi)",
  );
  (ideas.json.ideas || []).forEach((i) => {
    check(
      Array.isArray(i.phrases) && i.phrases.length > 0,
      `idea-stream: brak frazy w „${i.hook}"`,
    );
    check(typeof i.category === "string" && i.category.length > 0, `idea-stream: brak kategorii`);
  });

  // 2) idea-stream bez wykluczeń — inny zestaw (rotacja)
  const ideas2 = await post("/api/ai/idea-stream", { count: 3, excludeHooks: [], usedCount: 0 });
  console.log("\n=== IDEA-STREAM (bez historii) ===");
  (ideas2.json.ideas || []).forEach((i) => console.log(`  [${i.category}] ${i.hook}`));

  // 3) deconstruct-viral (offline fallback bez klucza API)
  const dec = await post("/api/ai/deconstruct-viral", {
    url: "https://www.tiktok.com/@example/video/1234567890",
  });
  console.log("\n=== DECONSTRUCT-VIRAL ===");
  console.log("HTTP", dec.status, "| source:", dec.json.source, "| platform:", dec.json.platform);
  console.log("  hookType:", dec.json.deconstruction?.hookType);
  console.log("  structure:", (dec.json.deconstruction?.structure || []).join(" -> "));
  console.log("  triggers:", (dec.json.deconstruction?.psychologicalTriggers || []).join(", "));
  console.log("  variants:", (dec.json.starkVariants || []).length);
  (dec.json.starkVariants || []).forEach((v) =>
    console.log(`    - ${v.hook} (${v.viralityScore}%)`),
  );

  check(dec.status === 200, `deconstruct-viral: HTTP ${dec.status}`);
  check(
    (dec.json.starkVariants || []).length > 0,
    "deconstruct-viral: brak wariantów @stark_focus",
  );
  if (requireAi)
    check(
      dec.json.source !== "error",
      `deconstruct-viral: awaria modelu zgłoszona jako source="error" (${dec.json.deconstruction?.hookType})`,
    );

  // 4) daily-pack (Faza 1) — musi być podłączony do runtime
  const pack = await post("/api/ai/daily-pack", { reelsCount: 3 });
  console.log("\n=== DAILY-PACK ===");
  console.log(
    "HTTP",
    pack.status,
    "| source:",
    pack.json.source,
    "| category:",
    pack.json.category,
  );
  console.log("  reels:", (pack.json.reels || []).length);
  (pack.json.reels || []).forEach((r) => console.log(`    - ${r.hook}`));
  console.log(
    "  carousel:",
    pack.json.carousel?.title,
    "| slides:",
    pack.json.carousel?.slides?.length,
  );
  console.log("  post:", pack.json.post?.headline);

  check(pack.status === 200, `daily-pack: HTTP ${pack.status}`);
  if (requireAi)
    check(
      pack.json.source === "ai",
      `daily-pack: source="${pack.json.source}" zamiast "ai" przy skonfigurowanym kluczu — upadł fallback modeli`,
    );
  // To są dokładnie pola, które UI mapuje bez sprawdzania — pusta `phrases`
  // albo `hashtags` bez tablicy wywracają cały aplikacyjny ekran.
  (pack.json.reels || []).forEach((r) => {
    check(typeof r.hook === "string" && r.hook.length > 0, "daily-pack: rolka bez hooka");
    check(
      Array.isArray(r.phrases) && r.phrases.length > 0,
      `daily-pack: rolka bez fraz: ${r.hook}`,
    );
    check(Array.isArray(r.hashtags), `daily-pack: hashtags nie są tablicą: ${r.hook}`);
    check(
      typeof r.duration === "number" && r.duration > 0,
      `daily-pack: zły czas rolki: ${r.hook}`,
    );
  });
  check((pack.json.reels || []).length > 0, "daily-pack: zero rolek");
  check(
    (pack.json.carousel?.slides || []).length > 0,
    "daily-pack: karuzela bez slajdów (studio nie ma czego renderować)",
  );
  (pack.json.carousel?.slides || []).forEach((s) =>
    check(
      typeof s.headline === "string" && typeof s.bodyText === "string",
      "daily-pack: slajd bez treści",
    ),
  );
  check(typeof pack.json.post?.headline === "string", "daily-pack: post 1:1 bez nagłówka");

  if (problems.length > 0) {
    console.log("\n=== SMOKE: BŁĘDY ===");
    problems.forEach((p) => console.log("  ✗", p));
    cleanup(1);
    return;
  }
  console.log("\n=== SMOKE: wszystkie asercje przeszły ===");
  cleanup(0);
})();
