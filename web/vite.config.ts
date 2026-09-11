import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: "stats.html",
      gzipSize: true,
      brotliSize: true,
      open: false,
      emitFile: true
    }) as any,
    visualizer({
      filename: "stats.json",
      template: "raw-data",
      emitFile: true
    }) as any
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true
      },
      "/socket.io": {
        target: "http://localhost:4000",
        ws: true,
        changeOrigin: true
      }
    }
  }
});
