// Smoke test endpointów AI: startuje serwer dev (bez klucza działa offline) i weryfikuje
// idea-stream (anty-powtórka), deconstruct-viral oraz daily-pack. Uruchamiaj przez
// `npm run smoke`. Sprząta całe drzewo procesów także na Windows (taskkill /T).
import { spawn } from "node:child_process";

// UWAGA: celowo spawnujemy `node --import tsx server.ts` BEZ npm i bez shell —
// na Windows `npm run dev` (npm.cmd -> cmd.exe -> node) tworzy drzewo procesów,
// którego SIGTERM nie ubija i port 3000 zostaje zajęty przez osierocony serwer.
const server = spawn(process.execPath, ["--import", "tsx", "server.ts"], {
  cwd: process.cwd(),
  stdio: ["ignore", "pipe", "pipe"],
  windowsHide: true,
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
  // /T ubija całe drzewo procesów (tsx, esbuild service), /F to twarde zabicie.
  try {
    if (process.platform === "win32") {
      spawn("taskkill", ["/PID", String(server.pid), "/T", "/F"], { windowsHide: true });
    } else {
      server.kill("SIGTERM");
      const t = setTimeout(() => server.kill("SIGKILL"), 2000);
      t.unref();
    }
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

  // 2) idea-stream bez wykluczeń — inny zestaw (rotacja)
  const ideas2 = await post("/api/ai/idea-stream", {
    count: 3,
    excludeHooks: [],
    usedCount: 0,
  });
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

  cleanup(0);
})();
