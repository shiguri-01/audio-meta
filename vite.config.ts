/// <reference types="vitest" />
import tailwindcss from "@tailwindcss/vite";
import tanstackRouter from "@tanstack/router-plugin/vite";
import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import tsconfigPaths from "vite-tsconfig-paths";

const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({ target: "solid", autoCodeSplitting: true }),
    solidPlugin(),
    tailwindcss(),
    tsconfigPaths(),
  ],

  // ViteがRustのエラーを不明瞭にしないようにする
  clearScreen: false,
  server: {
    port: 3000,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : true,

    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  // これらのプレフィックスで始まる環境変数は、フロントエンドで`import.meta.env`からアクセスできる
  envPrefix: ["VITE_", "TAURI_ENV_*"],
  build: {
    // TauriはWindowsではChromium、macOS・LinuxではWebKitを使用
    target:
      process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari13",
    minify: !process.env.TAURI_ENV_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
});
