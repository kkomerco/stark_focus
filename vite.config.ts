import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// CLEAN - bez Lovable, bez lightningcss minify (fix dla Tailwind v4 source(none))
export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 3000,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    cssMinify: false, // <--- wyłączamy lightningcss minify, które wywala się na source(none)
  },
  css: {
    transformer: "postcss",
  },
});
