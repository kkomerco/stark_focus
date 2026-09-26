import { createApp } from "../mini-express.server";
import { registerDeconstructRoutes } from "./routes/deconstruct.server";
import { registerGenerateRoutes } from "./routes/generate.server";
import { registerTrendsRoutes } from "./routes/trends.server";
import { registerStatusRoutes } from "./routes/status.server";
import { registerDailyPackRoutes } from "./routes/daily-pack.server";
import { registerIdeaStreamRoutes } from "./routes/idea-stream.server";
import { registerGrowthRoutes } from "./routes/growth.server";
import { registerBatchRoutes } from "./routes/batch.server";
import { registerFrameRoutes } from "./routes/frames.server";
import { registerClipRoutes } from "./routes/clips.server";

const app = createApp();

// Nic stąd nie idzie do cache'u: generator ma innego dnia dawać inne zdania,
// a kadr ma się dać wypełnić ponownie tym samym kliknięciem.
registerDeconstructRoutes(app);
registerGenerateRoutes(app);
registerTrendsRoutes(app);
registerStatusRoutes(app);
registerDailyPackRoutes(app);
registerIdeaStreamRoutes(app);
registerGrowthRoutes(app);
registerBatchRoutes(app);
registerFrameRoutes(app);
registerClipRoutes(app);

export async function handleStarkApi(request: Request): Promise<Response> {
  return app.handle(request);
}
