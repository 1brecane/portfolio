import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { compression } from "vite-plugin-compression2";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [
    vue(),
    compression({ algorithm: "gzip", threshold: 1024 }),
    compression({ algorithm: "brotliCompress", threshold: 1024 }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    target: "esnext",
    cssMinify: "lightningcss",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("@emailjs")) return "emailjs";
        },
      },
    },
  },
});
