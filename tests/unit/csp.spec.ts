import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

type Header = { key: string; value: string }
type Rule = { source: string; headers: Header[] }

const rules: Rule[] = JSON.parse(readFileSync(resolve(__dirname, '../../firebase.json'), 'utf8'))
  .hosting.headers

// The CSP directives and sources that existed before AdSense was added.
const ORIGINAL: Record<string, string[]> = {
  'default-src': ["'self'"],
  'script-src': ["'self'", 'https://apis.google.com'],
  'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
  'img-src': ["'self'", 'data:', 'blob:', 'https:'],
  'connect-src': ["'self'", 'https://*.googleapis.com', 'https://apis.google.com'],
  'frame-src': [
    "'self'",
    'https://flashcards.spanion.in',
    'https://*.firebaseapp.com',
    'https://*.web.app',
    'https://accounts.google.com',
  ],
  'worker-src': ["'self'"],
  'manifest-src': ["'self'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': [],
}

// Every other header, as it was before this task.
const OTHER_HEADERS: Header[] = [
  { key: 'Cache-Control', value: 'no-cache' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
]

const ADDED: Record<string, string[]> = {
  'script-src': [
    'https://pagead2.googlesyndication.com',
    'https://*.googlesyndication.com',
    'https://adservice.google.com',
    'https://*.adtrafficquality.google',
    'https://fundingchoicesmessages.google.com',
  ],
  'frame-src': [
    'https://googleads.g.doubleclick.net',
    'https://tpc.googlesyndication.com',
    'https://*.googlesyndication.com',
    'https://www.google.com',
    'https://*.adtrafficquality.google',
    'https://fundingchoicesmessages.google.com',
  ],
  'connect-src': [
    'https://pagead2.googlesyndication.com',
    'https://*.googlesyndication.com',
    'https://*.adtrafficquality.google',
    'https://fundingchoicesmessages.google.com',
    'https://*.doubleclick.net',
  ],
}

const all = rules[0].headers
const cspValue = all.find((h) => h.key === 'Content-Security-Policy')!.value
const now = new Map<string, string[]>()
for (const part of cspValue.split(';')) {
  const [name, ...sources] = part.trim().split(/\s+/)
  if (name) now.set(name, sources)
}

describe('Content-Security-Policy', () => {
  for (const [directive, added] of Object.entries(ADDED)) {
    it(`${directive} keeps its old sources first, then every ad source`, () => {
      const sources = now.get(directive)!
      const old = ORIGINAL[directive]
      expect(sources.slice(0, old.length)).toEqual(old)
      for (const s of added) expect(sources).toContain(s)
    })
  }

  it('leaves every other directive unchanged', () => {
    for (const [name, sources] of Object.entries(ORIGINAL)) {
      if (name in ADDED) continue
      expect(now.get(name)).toEqual(sources)
    }
    expect([...now.keys()].sort()).toEqual(Object.keys(ORIGINAL).sort())
  })

  it('has no unsafe-eval and no bare * source', () => {
    for (const sources of now.values()) {
      expect(sources).not.toContain("'unsafe-eval'")
      expect(sources).not.toContain('*')
    }
  })

  it('leaves every other header unchanged', () => {
    expect(rules.length).toBe(2)
    expect(rules[0].source).toBe('**')
    expect(all.filter((h) => h.key !== 'Content-Security-Policy')).toEqual(OTHER_HEADERS)
    expect(rules[1]).toEqual({
      source: '/assets/**',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
    })
  })
})
