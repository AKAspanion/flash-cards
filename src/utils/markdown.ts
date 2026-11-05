import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'

// Card text is untrusted (a shared set's text comes from another person), so this module is the one place it
// becomes HTML: markdown-it never emits raw HTML, then a sanitizer that only this module uses filters the result.
const md = new MarkdownIt({ html: false, linkify: true, breaks: true }).disable('table')

// A dedicated instance: calling the default export creates a new one, so these hooks never reach other code.
const purify = DOMPurify(window)

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'del', 'ul', 'ol', 'li', 'code', 'pre', 'blockquote',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'a', 'img',
]
const ALLOWED_ATTR = ['href', 'src', 'alt', 'title']
const LINK_PROTOCOLS = ['http:', 'https:', 'mailto:']

// Relative and protocol-relative addresses fail to parse without a base, so they are dropped here too.
function parseAbsolute(value: string | null): URL | null {
  if (!value) return null
  try {
    return new URL(value)
  } catch {
    return null
  }
}

purify.addHook('afterSanitizeAttributes', (node) => {
  if (node.nodeName === 'A') {
    const url = parseAbsolute(node.getAttribute('href'))
    if (url && LINK_PROTOCOLS.includes(url.protocol)) {
      node.setAttribute('href', url.href)
      node.setAttribute('target', '_blank')
      node.setAttribute('rel', 'noopener noreferrer')
    } else {
      node.removeAttribute('href')
    }
  } else if (node.nodeName === 'IMG') {
    const url = parseAbsolute(node.getAttribute('src'))
    if (url && url.protocol === 'https:') {
      node.setAttribute('src', url.href)
      node.setAttribute('referrerpolicy', 'no-referrer')
      node.setAttribute('loading', 'lazy')
    } else {
      node.remove()
    }
  }
})

export function renderCardText(text: string): string {
  return purify.sanitize(md.render(text), {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
  })
}

export function cardPlainText(text: string): string {
  const parts: string[] = []
  for (const token of md.parse(text, {})) {
    if (token.type === 'inline') {
      // Children carry the visible text; an image's alt text is its token content, its URL is not read.
      parts.push(
        (token.children ?? [])
          .map((child) => {
            if (child.type === 'softbreak' || child.type === 'hardbreak') return ' '
            if (child.type === 'text' || child.type === 'code_inline' || child.type === 'image') return child.content
            return ''
          })
          .join(''),
      )
    } else if (token.type === 'fence' || token.type === 'code_block') {
      parts.push(token.content)
    }
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim()
}
