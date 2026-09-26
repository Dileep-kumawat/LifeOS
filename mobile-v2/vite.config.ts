import { defineConfig } from "vite";

export default defineConfig({
  root: "./",
  envPrefix: ["VITE_", "CAPACITOR_"],
  build: {
    outDir: "dist",
    emptyOutDir: true
  },
  server: {
    port: 5174
  }
});
