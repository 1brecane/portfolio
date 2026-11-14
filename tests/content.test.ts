import { describe, it, expect } from 'vitest'
import html from '../index.html?raw'
import notFoundHtml from '../404.html?raw'
import pkg from '../package.json'
import { rootAddresses, sitePath } from '../build/plugins.ts'

describe('index.html', () => {
  it('has exactly the two links', () => {
    const anchors = [...html.matchAll(/<a\b[^>]*>([^<]*)<\/a>/g)]
    expect(html.match(/<a\b/g)?.length).toBe(2)
    expect(anchors).toHaveLength(2)
    expect(anchors[0][0]).toContain('href="https://github.com/1brecane"')
    expect(anchors[0][1]).toBe('GitHub')
    expect(anchors[1][0]).toContain('href="https://www.linkedin.com/in/samuele-ruaro-145251307/"')
    expect(anchors[1][1]).toBe('LinkedIn')
  })
  it('has one h1, lang and title', () => {
    expect(html.match(/<h1\b/g)?.length).toBe(1)
    expect(html).toMatch(/<h1[^>]*>Samuele Ruaro<\/h1>/)
    expect(html).toContain('<html lang="en">')
    expect(html).toContain('<title>Samuele Ruaro</title>')
  })
  it('target links carry noopener', () => {
    const withTarget = html.match(/<a\b[^>]*target=[^>]*>/g) ?? []
    for (const a of withTarget) expect(a).toMatch(/rel="[^"]*noopener/)
  })
  it('canvas is aria-hidden', () => {
    expect(html).toMatch(/<canvas\b[^>]*id="art"[^>]*aria-hidden="true"/)
  })
  it('has no inline style or script', () => {
    expect(html).not.toMatch(/<style\b/)
    expect(html).not.toMatch(/style="/)
    const scripts = html.match(/<script\b[^>]*>/g) ?? []
    for (const s of scripts) expect(s).toContain('src=')
  })
})

describe('404.html', () => {
  it('has a label, one line and one link home', () => {
    expect(notFoundHtml).toContain('<p class="today">404 · Pluto</p>')
    expect(notFoundHtml.match(/<h1\b/g)?.length).toBe(1)
    const anchors = [...notFoundHtml.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g)]
    expect(anchors).toHaveLength(1)
    expect(anchors[0][1]).toBe('./')
    expect(anchors[0][2]).toBe('Samuele Ruaro')
  })
  it('is kept out of search results and has no inline style or script', () => {
    expect(notFoundHtml).toContain('<meta name="robots" content="noindex" />')
    expect(notFoundHtml).not.toMatch(/<style\b/)
    expect(notFoundHtml).not.toMatch(/style="/)
    for (const s of notFoundHtml.match(/<script\b[^>]*>/g) ?? []) expect(s).toContain('src=')
  })
  it('gets absolute addresses, since it is served at any path', () => {
    const built = '<link href="./assets/a.css"><script src="./assets/a.js"></script><a href="./">x</a><link href="data:x">'
    expect(rootAddresses(built, '/')).toBe(
      '<link href="/assets/a.css"><script src="/assets/a.js"></script><a href="/">x</a><link href="data:x">',
    )
    expect(rootAddresses(built, '/site/')).toContain('href="/site/assets/a.css"')
    expect(sitePath(undefined)).toBe('/')
    expect(sitePath('https://example.com')).toBe('/')
    expect(sitePath('https://example.com/site')).toBe('/site/')
  })
})

describe('package.json', () => {
  it('has no dependencies and required scripts', () => {
    expect('dependencies' in pkg).toBe(false)
    for (const s of ['dev', 'build', 'preview', 'test', 'typecheck']) {
      expect(Object.keys(pkg.scripts)).toContain(s)
    }
  })
})
