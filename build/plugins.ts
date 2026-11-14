import type { Plugin } from 'vite'
import { SATURN } from '../src/ascii/bodies.ts'
import { createFrameRenderer, frameToText } from '../src/ascii/frame.ts'
import { FRAME_BOTTOM, STATIC_COLS, STATIC_ROWS } from '../src/config.ts'
import { renderOgPng } from './og.ts'

const escapeHtml = (s: string): string => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

// Puts a still frame in the HTML for visitors without JavaScript (and for whoever reads the source).
export function staticFrame(): Plugin {
  return {
    name: 'static-frame',
    transformIndexHtml(html) {
      const text = frameToText(createFrameRenderer(STATIC_COLS, STATIC_ROWS, SATURN, FRAME_BOTTOM)(0))
      return html.replace(
        '<!-- saturn -->',
        `<noscript><pre class="art-static" aria-hidden="true">\n${escapeHtml(text)}\n</pre></noscript>`,
      )
    },
  }
}

// Emits the link preview image. The image tag needs an absolute address,
// so it is only added when SITE_URL is set (for example SITE_URL=https://example.com npm run build).
export function extras(siteUrl: string | undefined): Plugin {
  const base = siteUrl?.replace(/\/+$/, '')
  return {
    name: 'extras',
    apply: 'build',
    async generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'og.png', source: await renderOgPng() })
      if (!base) this.warn('SITE_URL is not set: og.png is built, but no og:image tag is added.')
    },
    transformIndexHtml(_html, ctx) {
      if (!base || !ctx.path.endsWith('index.html')) return []
      return [
        { tag: 'meta', attrs: { property: 'og:url', content: `${base}/` }, injectTo: 'head' },
        { tag: 'meta', attrs: { property: 'og:image', content: `${base}/og.png` }, injectTo: 'head' },
        { tag: 'meta', attrs: { property: 'og:image:width', content: '1200' }, injectTo: 'head' },
        { tag: 'meta', attrs: { property: 'og:image:height', content: '630' }, injectTo: 'head' },
      ]
    },
  }
}

// Where the site lives on its host: "/" unless SITE_URL has a path.
export function sitePath(siteUrl: string | undefined): string {
  if (!siteUrl) return '/'
  const path = new URL(siteUrl).pathname
  return path.endsWith('/') ? path : `${path}/`
}

// The host serves 404.html at whatever address was asked for, so nothing in it can be relative.
export function rootAddresses(html: string, root: string): string {
  return html.replaceAll(/(href|src)="\.\//g, `$1="${root}`)
}

export function notFound(siteUrl: string | undefined): Plugin {
  const root = sitePath(siteUrl)
  return {
    name: 'not-found',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler: (html, ctx) => (ctx.path.endsWith('404.html') ? rootAddresses(html, root) : html),
    },
  }
}
