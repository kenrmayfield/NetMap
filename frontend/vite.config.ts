import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  plugins: [
    react(),
    visualizer({ filename: "dist/stats.html", gzipSize: true, open: false }),
  ],
  build: {
    chunkSizeWarningLimit: 600,
  },
  server: {
    port: 8080,
    proxy: {
      "/api": "http://backend:8000",
    },
  },
});
