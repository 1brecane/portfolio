import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import type { Plugin } from 'vite'
import { extras, notFound, staticFrame } from './build/plugins.ts'

const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; " +
  "connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'"

// Build-only: the dev server needs HMR websockets/injected modules that this CSP would block.
function cspMeta(): Plugin {
  return {
    name: 'csp-meta',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head' },
    ],
  }
}

export default defineConfig(({ mode }) => {
  const siteUrl = loadEnv(mode, '.', 'SITE_').SITE_URL
  return {
  base: './',
  plugins: [cspMeta(), staticFrame(), extras(siteUrl), notFound(siteUrl)],
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    modulePreload: { polyfill: false },
    rollupOptions: { input: { index: 'index.html', notfound: '404.html' } },
  },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
  }
})
