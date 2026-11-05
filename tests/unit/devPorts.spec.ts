import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { DEV_PORTS } from '../../dev-ports'

const { emulators } = JSON.parse(readFileSync('firebase.json', 'utf8'))

describe('DEV_PORTS', () => {
  it('is unique, contiguous and starts at 2100', () => {
    const sorted = Object.values(DEV_PORTS).sort((a, b) => a - b)
    expect(sorted).toEqual(sorted.map((_, i) => 2100 + i))
    expect(sorted[sorted.length - 1]).toBe(2108)
  })
})

describe('firebase.json emulators mirror DEV_PORTS', () => {
  it('hub', () => expect(emulators.hub.port).toBe(DEV_PORTS.hub))
  it('auth', () => expect(emulators.auth.port).toBe(DEV_PORTS.auth))
  it('firestore', () => {
    expect(emulators.firestore.port).toBe(DEV_PORTS.firestore)
    expect(emulators.firestore.websocketPort).toBe(DEV_PORTS.firestoreWebsocket)
  })
  it('logging', () => expect(emulators.logging.port).toBe(DEV_PORTS.logging))
  it('hosting', () => expect(emulators.hosting.port).toBe(DEV_PORTS.hosting))
  it('keeps the emulator UI disabled', () => expect(emulators.ui.enabled).toBe(false))
})
