import type { MiniApp } from "../../mini-express.server";
import { GEMINI_LITE_MODEL, GEMINI_MODEL, getGeminiClient, safeJsonParse } from "../gemini.server";
import { formatStarkCaption } from "../../caption";

export function registerStatusRoutes(app: MiniApp): void {
  app.get("/api/ai/status", (req, res) => {
    const key = process.env.GEMINI_API_KEY;
    res.json({
      configured: !!key,
      model: GEMINI_MODEL,
    });
  });
}
