import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    outDir: "dist/content",
    emptyOutDir: false,
    copyPublicDir: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "src/main/main.ts"),
      },
      output: {
        format: "iife",
        entryFileNames: "main.js",
      },
    },
  },
});
