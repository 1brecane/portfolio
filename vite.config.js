import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import { compression } from "vite-plugin-compression2";
import { fileURLToPath, URL } from "node:url";

export default defineConfig(({ mode }) => {
  // Empty prefix (unlike `import.meta.env`, which only exposes VITE_-prefixed
  // vars to client code) so HOMELAB_API_TOKEN — deliberately NOT VITE_-prefixed,
  // it must never be bundled — can still be read here, server-side, from a
  // gitignored .env.local for the dev proxy below.
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [vue(), compression({ algorithm: "gzip", threshold: 1024 })],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    build: {
      target: "esnext",
      cssMinify: "lightningcss",
    },
    server: {
      proxy: {
        // Dev-only mirror of the prod Nginx proxy (nginx.conf `/api/dashboard`):
        // same same-origin path, same server-side Bearer injection, so the
        // frontend fetch code is identical in both environments.
        "/api/dashboard": {
          target: env.HOMELAB_API_ORIGIN || "http://localhost:8080",
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              if (env.HOMELAB_API_TOKEN) {
                proxyReq.setHeader("Authorization", `Bearer ${env.HOMELAB_API_TOKEN}`);
              }
            });
          },
        },
      },
    },
  };
});
