import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const StarkFocusApp = lazy(() => import("@/StarkFocusApp"));

const DESCRIPTION =
  "Centrum dowodzenia i system operacyjny produkcji treści stoickich: generator postów, karuzel i wideo 9:16 z AI.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "STARK FOCUS – Content OS" },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "STARK FOCUS – Content OS" },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#090C14]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#38BDF8] border-t-transparent" />
        <p className="font-mono text-xs tracking-widest text-[#38BDF8]">ŁADOWANIE MODUŁU…</p>
      </div>
    </div>
  );
}

function Index() {
  return (
    <ClientOnly fallback={<LoadingScreen />}>
      <Suspense fallback={<LoadingScreen />}>
        <StarkFocusApp />
      </Suspense>
    </ClientOnly>
  );
}
