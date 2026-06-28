import { defineConfig } from "vitest/config";

// Unit tests are pure TypeScript (no JSX), so no plugins are needed here.
// Keeping this separate from vite.config.ts avoids the duplicate-vite type clash.
export default defineConfig({
  test: { environment: "node" },
});
