import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  define: {
    __DEV__: "true",
  },
  resolve: {
    alias: {
      "@": dirname,
      "@shared": path.resolve(dirname, "shared"),
    },
  },
  test: {
    environment: "node",
  },
});
