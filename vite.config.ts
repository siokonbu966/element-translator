import { defineConfig, type Plugin } from "vite";
import { resolve } from "path";
import { writeFileSync, readFileSync } from "fs";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import svgr from "vite-plugin-svgr";
import { generateManifest, type Browser } from "./src/manifest";

const browser: Browser =
  process.env.BROWSER === "chrome" ? "chrome" : "firefox";

const { version } = JSON.parse(
  readFileSync(resolve(__dirname, "package.json"), "utf-8"),
) as { version: string };

function manifestPlugin(browser: Browser): Plugin {
  return {
    name: "generate-manifest",
    writeBundle(options) {
      const dir = options.dir!;
      const manifest =
        JSON.stringify({ ...generateManifest(browser), version }, null, 2) + "\n";
      writeFileSync(resolve(dir, "manifest.json"), manifest);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), svgr(), manifestPlugin(browser)],
  build: {
    outDir: `dist/${browser}`,
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "popup.html"),
        panel: resolve(__dirname, "panel.html"),
        background: resolve(__dirname, "src/background.ts"),
        content: resolve(__dirname, "src/content.ts"),
      },
      output: {
        entryFileNames: "[name].js",
      },
    },
  },
});
