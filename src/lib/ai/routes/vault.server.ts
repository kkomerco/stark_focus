import type { MiniApp, MiniRequest, MiniResponse } from "../../mini-express.server";
import type { VaultAsset } from "../../../types";
import { LIMITS, clampInt, clampText } from "../../limits";
import { fetchSafeFile } from "../../fetch-image.server";
import { pexelsConfigured, searchStockClips } from "../../pexels.server";
import { pixabayConfigured, searchPixabayClips } from "../../pixabay.server";
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

/**
 * Który katalog odpowiada. Pexels wstrzymał wydawanie kluczy, więc sejf nie
 * może stać na jednym dostawcy: pytamy tego, którego klucz leży w `.env`,
 * a odpowiedź mówi UI, skąd przyszły miniaturki.
 */
export type StockSource = "pexels" | "pixabay";

export function activeStockSource(): StockSource | null {
  if (pexelsConfigured()) return "pexels";
  if (pixabayConfigured()) return "pixabay";
  return null;
}

/**
 * Jaki klucz serwer naprawdę zobaczył — długość i czy ma w środku znaki,
 * których klucz nie ma. Status czytają ludzie przy konfiguracji, a „400"
 * bez tej informacji znaczy godzinę zgadywania, czy winny jest plik, serwer
 * czy katalog.
 */
export function activeStockKey(): {
  source: StockSource;
  length: number;
  looksBroken: boolean;
} | null {
  const source = activeStockSource();
  if (!source) return null;
  const key =
    source === "pexels" ? String(process.env.PEXELS_API_KEY) : String(process.env.PIXABAY_API_KEY);
  return { source, length: key.length, looksBroken: /\s|=/.test(key) };
}

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
    const source = activeStockSource();
    res.json({
      configured: source !== null,
      source,
      vaultHosts: VAULT_HOSTS,
      files,
      maxBytes: LIMITS.maxVaultBytes,
    });
  });

  app.get("/api/ai/vault/search", async (req, res) => {
    const count = clampInt(req.query?.count, 1, MAX_RESULTS, 8);
    const term = String(req.query?.q ?? "");
    const source = activeStockSource();
    const { clips, notice } =
      source === "pexels"
        ? await searchStockClips(term, count)
        : source === "pixabay"
          ? await searchPixabayClips(term, count)
          : {
              clips: [],
              notice:
                "Żaden katalog nie ma klucza — wpisz PIXABAY_API_KEY (wydawany od razu) albo PEXELS_API_KEY do .env.",
            };
    res.json({ configured: source !== null, source, clips, notice });
  });

  app.post("/api/ai/vault/take", async (req, res) => {
    const id = clampText(req.body?.id, 28);
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
