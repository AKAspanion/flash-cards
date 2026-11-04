import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const text = readFileSync(resolve(__dirname, '../../public/ads.txt'), 'utf8')

describe('public/ads.txt', () => {
  it('is exactly one line naming Google as DIRECT seller', () => {
    expect(text).toMatch(/^google\.com, pub-\d+, DIRECT, f08c47fec0942fa0\n?$/)
  })

  it("carries the developer's publisher ID", () => {
    expect(text.trim()).toBe('google.com, pub-9381121077394867, DIRECT, f08c47fec0942fa0')
  })
})
