import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/ui/setup.tsx"],
    clearMocks: true,
    restoreMocks: true,
    env: {
      NODE_ENV: "test",
    },
  },
  resolve: {
    conditions: ["development", "browser"],
    alias: {
      "@": path.resolve(import.meta.dirname, "apps/frontend/src"),
      "@shared": path.resolve(import.meta.dirname, "packages/shared"),
      "@algorithms": path.resolve(import.meta.dirname, "packages/algorithms/src"),
      "@assets": path.resolve(import.meta.dirname, "apps/frontend/src/assets"),
    },
  },
});
