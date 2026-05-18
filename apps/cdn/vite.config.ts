import { defineConfig } from "vite";
import { resolve } from "path";
import * as dotenv from "dotenv";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";

dotenv.config();

const VERSION = process.env.VERSION;
const BACKEND_URL = process.env.BACKEND_URL;

if (!VERSION) {
  console.error("VERSION env var is required");
  process.exit(1);
}

if (!BACKEND_URL) {
  console.error("BACKEND_URL env var is required");
  process.exit(1);
}

export default defineConfig({
  define: {
    __BACKEND_URL__: JSON.stringify(BACKEND_URL),
    __CDN_VERSION__: JSON.stringify(VERSION),
  },
  plugins: [cssInjectedByJsPlugin()],
  build: {
    target: "es2020",
    sourcemap: false,
    minify: "terser",
    emptyOutDir: false,
    terserOptions: { mangle: false },
    rollupOptions: {
      input: { script: resolve(__dirname, "src/script.ts") },
      output: {
        dir: resolve(__dirname, "dist", VERSION),
        format: "es",
        entryFileNames: "script.js",
        chunkFileNames: undefined,
        manualChunks: undefined,
        preserveModules: false,
      },
    },
  },
});
