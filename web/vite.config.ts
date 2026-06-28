import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" keeps asset paths relative so the static build works under a
// GitHub Pages / subpath deploy as well as at a domain root.
// Test config lives in vitest.config.ts to avoid a vite/vitest type clash.
export default defineConfig({
  base: "./",
  plugins: [react()],
});
