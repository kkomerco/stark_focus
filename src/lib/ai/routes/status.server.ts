import type { MiniApp } from "../../mini-express.server";
import { GEMINI_MODEL } from "../gemini.server";
import { activeStockKey } from "./vault.server";

export function registerStatusRoutes(app: MiniApp): void {
  app.get("/api/ai/status", (req, res) => {
    const key = process.env.GEMINI_API_KEY;
    const vaultKey = activeStockKey();
    res.json({
      configured: !!key,
      model: GEMINI_MODEL,
      // Sejf ujęć to osobny klucz i osobny limit — bez tego aplikacja
      // wyglądałaby na „skonfigurowaną", kiedy katalog nadal milczy.
      vaultConfigured: vaultKey !== null,
      vaultKey,
    });
  });
}
