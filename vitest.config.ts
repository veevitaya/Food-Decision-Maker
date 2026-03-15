import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/ui/setup.tsx"],
    globals: true,
    clearMocks: true,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "apps/frontend/src"),
      "@shared": path.resolve(import.meta.dirname, "packages/shared"),
      "@algorithms": path.resolve(import.meta.dirname, "packages/algorithms/src"),
      "@assets": path.resolve(import.meta.dirname, "apps/frontend/src/assets"),
    },
  },
});
