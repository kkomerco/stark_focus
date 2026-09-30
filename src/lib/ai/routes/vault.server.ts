import type { MiniApp, MiniRequest, MiniResponse } from "../../mini-express.server";
import type { VaultAsset } from "../../../types";
import { LIMITS, clampInt, clampText } from "../../limits";
import { fetchSafeFile } from "../../fetch-image.server";
import { pexelsConfigured, searchStockClips } from "../../pexels.server";
import {
  VAULT_HOSTS,
  findVaultFileById,
  listVaultFiles,
  saveVaultFile,
  vaultFileName,
} from "../../vault.server";

/**
 * SEJF UJĘĆ.
 *
 * Nie zużywa ani jednego zapytania do modelu — to jedyna płatna rzecz w tej
 * aplikacji, więc każde kliknięcie musi mówić, ile kosztuje. Tutaj kosztuje
 * zero, a mimo to trasa ma własne clampy i własną normalizację odpowiedzi,
 * bo katalog jest serwisem zewnętrznym tak samo jak model.
 *
 * Plik trafia na dysk do `sejf/` (poza repo), a nie do `localStorage`: plik
 * wideo w kopii danych zapchałby 5 MB przeglądarki i `shrinkForQuota` zacząłby
 * wycinać inne pola, żeby ratować ujęcie.
 */

const MAX_RESULTS = 12;

function assetFromFile(
  file: { filename: string; url: string; bytes: number },
  id: string,
  query: string,
): VaultAsset {
  const video = /\.(mp4|webm)$/i.test(file.filename);
  return {
    id,
    filename: file.filename,
    url: file.url,
    type: video ? "video" : "bg",
    created_date: new Date().toISOString().slice(0, 10),
    notes: query || undefined,
  };
}

export function registerVaultRoutes(app: MiniApp): void {
  app.get("/api/ai/vault", async (_req: MiniRequest, res: MiniResponse) => {
    const files = await listVaultFiles();
    res.json({
      configured: pexelsConfigured(),
      vaultHosts: VAULT_HOSTS,
      files,
      maxBytes: LIMITS.maxVaultBytes,
    });
  });

  app.get("/api/ai/vault/search", async (req, res) => {
    const count = clampInt(req.query?.count, 1, MAX_RESULTS, 8);
    const { clips, notice } = await searchStockClips(String(req.query?.q ?? ""), count);
    res.json({ configured: pexelsConfigured(), clips, notice });
  });

  app.post("/api/ai/vault/take", async (req, res) => {
    const id = clampText(req.body?.id, 20);
    const url = clampText(req.body?.url, 400);
    const query = clampText(req.body?.query, 60);

    if (!id || !url.startsWith("https://")) {
      return res
        .status(400)
        .json({ asset: null, file: null, notice: "Brak identyfikatora lub adresu ujęcia." });
    }

    // Ten sam kadr wzięty drugi raz nie ma prawa zajrzeć do sieci.
    const existing = await findVaultFileById(id);
    if (existing) {
      return res.json({
        asset: assetFromFile(existing, id, existing.filename),
        file: existing,
        notice: "",
      });
    }

    const downloaded = await fetchSafeFile(url, {
      maxBytes: LIMITS.maxVaultBytes,
      hosts: VAULT_HOSTS,
      timeoutMs: 45_000,
    });
    if (!downloaded) {
      return res.status(502).json({
        asset: null,
        file: null,
        notice:
          "Ujęcie nie przyszło: host spoza listy, przekierowanie, typ inny niż wideo albo plik ponad limit sejfu.",
      });
    }

    const name = vaultFileName(id, query, downloaded.mimeType);
    if (!name) {
      return res.status(502).json({
        asset: null,
        file: null,
        notice: "Katalog oddał typ pliku, którego sejf nie przyjmuje.",
      });
    }

    const saved = await saveVaultFile(name, downloaded.buffer);
    if (!saved) {
      return res.status(500).json({
        asset: null,
        file: null,
        notice: "Nie udało się zapisać pliku w sejfie na dysku.",
      });
    }

    res.json({ asset: assetFromFile(saved, id, query), file: saved, notice: "" });
  });
}
