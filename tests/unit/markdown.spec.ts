import { describe, it, expect } from 'vitest'
import DOMPurify from 'dompurify'
import { renderCardText, cardPlainText } from '@/utils/markdown'

function parse(text: string): Document {
  return new DOMParser().parseFromString(renderCardText(text), 'text/html')
}

function hrefs(doc: Document): string[] {
  return [...doc.querySelectorAll('[href]')].map((el) => el.getAttribute('href') ?? '')
}

describe('renderCardText formatting', () => {
  it('renders bold, italic and inline code', () => {
    const html = renderCardText('**bold** _it_ `code`')
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('<em>it</em>')
    expect(html).toContain('<code>code</code>')
  })

  it('renders a list', () => {
    const doc = parse('- one\n- two')
    expect(doc.querySelectorAll('ul > li')).toHaveLength(2)
  })

  it('turns a single newline into a br', () => {
    expect(parse('line one\nline two').querySelectorAll('p > br')).toHaveLength(1)
  })

  it('shows HTML inside a code block as text', () => {
    const doc = parse('```\n<b>x</b>\n```')
    expect(doc.querySelector('pre > code')?.textContent).toContain('<b>x</b>')
    expect(doc.querySelector('b')).toBeNull()
  })

  it('does not render tables', () => {
    expect(parse('| a | b |\n|---|---|\n| 1 | 2 |').querySelector('table')).toBeNull()
  })
})

describe('renderCardText raw HTML', () => {
  it('shows a script tag as text', () => {
    const doc = parse('<script>alert(1)</script>')
    expect(doc.querySelector('script')).toBeNull()
    expect(doc.body.textContent).toContain('<script>alert(1)</script>')
  })

  it('drops an img with onerror and keeps no onerror attribute', () => {
    const doc = parse('<img src=x onerror="alert(1)">')
    expect(doc.querySelector('img')).toBeNull()
    expect(doc.querySelector('[onerror]')).toBeNull()
    expect(doc.body.textContent).toContain('<img src=x onerror="alert(1)">')
  })

  it('shows an svg tag as text', () => {
    const doc = parse('<svg onload=alert(1)>')
    expect(doc.querySelector('svg')).toBeNull()
    expect(doc.querySelector('[onload]')).toBeNull()
    expect(doc.body.textContent).toContain('<svg onload=alert(1)>')
  })

  it('shows an anchor tag with a handler as text', () => {
    // The URL inside the text is linkified on its own, so only its handler-less link may exist.
    const doc = parse('<a href="https://example.com" onclick="alert(1)">x</a>')
    expect(doc.querySelector('[onclick]')).toBeNull()
    expect(doc.body.textContent).toContain('<a href="https://example.com" onclick="alert(1)">x</a>')
    for (const a of doc.querySelectorAll('a')) {
      expect(a.getAttributeNames().sort()).toEqual(['href', 'rel', 'target'])
    }
  })

  it('does not let an entity-encoded or inline tag become an element', () => {
    const doc = parse('&lt;script&gt;alert(1)&lt;/script&gt; <iframe src="https://example.com"></iframe>')
    expect(doc.querySelector('script,iframe')).toBeNull()
  })
})

describe('renderCardText links', () => {
  it.each([
    '[click](javascript:alert(1))',
    '[click](JaVaScRiPt:alert(1))',
    '[click]( javascript:alert(1))',
    '[click](javascript&#58;alert(1))',
    '[click](java&#x09;script:alert(1))',
    '[click](&#106;avascript:alert(1))',
    '[click](<javascript:alert(1)>)',
    '[click][r]\n\n[r]: javascript:alert(1)',
    '<javascript:alert(1)>',
    '[click](data:text/html;base64,PHNjcmlwdD4=)',
  ])('keeps no javascript or data link for %j', (src) => {
    const doc = parse(src)
    for (const href of hrefs(doc)) {
      expect(href.trim().toLowerCase()).not.toMatch(/^(javascript|data|vbscript):/)
    }
    expect(doc.querySelector('[href]')).toBeNull()
    expect(doc.body.textContent).toMatch(/click|javascript/)
  })

  it.each([
    '[x](vbscript:msgbox(1))',
    '[x](ftp://example.com/a)',
    '[x](/bin)',
    '[x](//example.com)',
    '[x](file:///etc/passwd)',
    '[x](example.com/path)',
    '[x][r]\n\n[r]: //example.com',
  ])('keeps no href for %j', (src) => {
    expect(parse(src).querySelector('[href]')).toBeNull()
  })

  it('keeps the link text when the href is dropped', () => {
    expect(parse('[click](javascript:alert(1))').body.textContent).toContain('click')
    expect(parse('[click](/bin)').body.textContent).toContain('click')
  })

  it('opens http, https and bare URL links in a new tab with a safe rel', () => {
    for (const src of ['[docs](https://example.com)', 'https://example.com', '[d](http://example.com)', 'www.example.com']) {
      const a = parse(src).querySelector('a')
      expect(a, src).not.toBeNull()
      expect(a?.getAttribute('target')).toBe('_blank')
      expect(a?.getAttribute('rel')).toBe('noopener noreferrer')
    }
  })

  it('keeps a mailto link', () => {
    const a = parse('[mail](mailto:a@example.com)').querySelector('a')
    expect(a?.getAttribute('href')).toBe('mailto:a@example.com')
    expect(a?.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('keeps a reference-style https link', () => {
    expect(parse('[r][1]\n\n[1]: https://example.com/x').querySelector('a')?.getAttribute('href')).toBe(
      'https://example.com/x',
    )
  })
})

describe('renderCardText images', () => {
  it('keeps an https image with its alt, referrerpolicy and lazy loading', () => {
    const imgs = parse('![cat](https://example.com/cat.png)').querySelectorAll('img')
    expect(imgs).toHaveLength(1)
    const img = imgs[0]
    expect(img.getAttribute('src')).toBe('https://example.com/cat.png')
    expect(img.getAttribute('alt')).toBe('cat')
    expect(img.getAttribute('referrerpolicy')).toBe('no-referrer')
    expect(img.getAttribute('loading')).toBe('lazy')
  })

  it.each([
    '![a](data:image/png;base64,AAAA)',
    '![a](http://example.com/a.png)',
    '![a](//example.com/a.png)',
    '![a](/a.png)',
    '![a](javascript:alert(1))',
    '![a](ftp://example.com/a.png)',
    '![a](mailto:a@example.com)',
    '![a][r]\n\n[r]: http://example.com/a.png',
  ])('drops the image for %j', (src) => {
    expect(parse(src).querySelector('img')).toBeNull()
  })

  it('cannot break out of an attribute through the title', () => {
    const doc = parse('![a](https://example.com/a.png "t\\" onerror=\\"alert(1)")')
    expect(doc.querySelector('[onerror]')).toBeNull()
  })

  it('does not keep a link made of an unsafe href around a safe image', () => {
    const doc = parse('[![a](https://example.com/a.png)](javascript:alert(1))')
    expect(doc.querySelector('a')).toBeNull()
    expect(doc.querySelectorAll('img')).toHaveLength(1)
  })
})

describe('renderCardText robustness', () => {
  it('handles deeply nested blockquotes', () => {
    expect(() => renderCardText('>'.repeat(1000) + ' deep')).not.toThrow()
  })

  it('handles very long text', () => {
    const html = renderCardText('a'.repeat(50_000))
    expect(html.length).toBeGreaterThan(50_000)
  })

  it('handles empty text', () => {
    expect(renderCardText('')).toBe('')
  })

  it('leaves the global DOMPurify without hooks', () => {
    renderCardText('[x](https://example.com) ![a](https://example.com/a.png)')
    const out = DOMPurify.sanitize('<a href="https://example.com">x</a><img src="http://example.com/a.png">')
    expect(out).toBe('<a href="https://example.com">x</a><img src="http://example.com/a.png">')
  })
})

describe('cardPlainText', () => {
  it('returns text without Markdown, images as alt text and links without URLs', () => {
    expect(
      cardPlainText('**Hola** _mundo_\n![gato](https://example.com/g.png) [docs](https://example.com)'),
    ).toBe('Hola mundo gato docs')
  })

  it('treats raw HTML as text', () => {
    expect(cardPlainText('<b>x</b>')).toBe('<b>x</b>')
  })

  it('reads lists, code and paragraphs with single spaces and trims', () => {
    expect(cardPlainText('  # Title\n\n- one\n- two\n\n```\ncode  here\n```\n')).toBe('Title one two code here')
  })

  it('returns an empty string for empty text', () => {
    expect(cardPlainText('')).toBe('')
  })
})
