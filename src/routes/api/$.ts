import { createFileRoute } from "@tanstack/react-router";

async function handler({ request }: { request: Request }) {
  const { handleStarkApi } = await import("@/lib/stark-api.server");
  return handleStarkApi(request);
}

export const Route = createFileRoute("/api/$")({
  server: {
    handlers: {
      GET: handler,
      POST: handler,
    },
  },
});
