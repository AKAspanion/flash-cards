import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { languageName, speak, speechAvailable, voiceLanguages } from '@/utils/speech';

type Listener = () => void;

class FakeUtterance {
  lang = '';
  constructor(public text: string) {}
}

function installSpeech(voices: string[]) {
  const calls: string[] = [];
  const listeners = new Set<Listener>();
  const state = { voices: voices.map((lang) => ({ lang })) };
  const synth = {
    cancel: vi.fn(() => calls.push('cancel')),
    speak: vi.fn((u: FakeUtterance) => calls.push(`speak:${u.text}:${u.lang}`)),
    getVoices: vi.fn(() => state.voices),
    addEventListener: vi.fn((_type: string, fn: Listener) => listeners.add(fn)),
    removeEventListener: vi.fn((_type: string, fn: Listener) => listeners.delete(fn)),
  };
  vi.stubGlobal('speechSynthesis', synth);
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  return {
    synth,
    calls,
    fireVoicesChanged(next: string[]) {
      state.voices = next.map((lang) => ({ lang }));
      [...listeners].forEach((fn) => fn());
    },
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('speak', () => {
  it('cancels, then speaks one utterance with the text and language', () => {
    const fake = installSpeech([]);
    speak('hola', 'es-ES');
    expect(fake.calls).toEqual(['cancel', 'speak:hola:es-ES']);
  });

  it('leaves the language at the browser default when none is given', () => {
    const fake = installSpeech([]);
    speak('hola');
    expect(fake.calls).toEqual(['cancel', 'speak:hola:']);
  });

  it('does nothing, not even cancel, for blank text', () => {
    const fake = installSpeech([]);
    speak('   ');
    expect(fake.synth.cancel).not.toHaveBeenCalled();
    expect(fake.synth.speak).not.toHaveBeenCalled();
  });
});

describe('without speech synthesis', () => {
  it('reports unavailable and speak is a safe no-op', () => {
    expect(speechAvailable()).toBe(false);
    expect(() => speak('hola', 'es-ES')).not.toThrow();
  });

  it('reports available when both globals exist', () => {
    installSpeech([]);
    expect(speechAvailable()).toBe(true);
  });

  it('resolves no languages', async () => {
    await expect(voiceLanguages()).resolves.toEqual([]);
  });
});

describe('voiceLanguages', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('resolves unique languages, sorted', async () => {
    installSpeech(['en-US', 'es-ES', 'en-US']);
    await expect(voiceLanguages()).resolves.toEqual(['en-US', 'es-ES']);
  });

  it('waits for voiceschanged when the list starts empty', async () => {
    const fake = installSpeech([]);
    const result = voiceLanguages();
    await vi.advanceTimersByTimeAsync(200);
    fake.fireVoicesChanged(['hi-IN']);
    await expect(result).resolves.toEqual(['hi-IN']);
    expect(fake.synth.removeEventListener).toHaveBeenCalled();
  });

  it('gives up with no languages after 1,000 ms', async () => {
    installSpeech([]);
    let settled: string[] | null = null;
    void voiceLanguages().then((langs) => (settled = langs));
    await vi.advanceTimersByTimeAsync(999);
    expect(settled).toBeNull();
    await vi.advanceTimersByTimeAsync(1);
    expect(settled).toEqual([]);
  });
});

describe('languageName', () => {
  it('gives the display name in the app language', () => {
    // ICU decides the exact wording ("Spanish (Spain)" or "European Spanish"), so compare with Intl itself.
    const expected = new Intl.DisplayNames('en', { type: 'language' }).of('es-ES');
    expect(languageName('es-ES', 'en')).toBe(expected);
    expect(languageName('es-ES', 'en')).toContain('Spanish');
  });

  it('falls back to the tag when Intl throws', () => {
    expect(languageName('not a tag!', 'en')).toBe('not a tag!');
  });

  it('falls back to the tag when Intl echoes it', () => {
    vi.spyOn(Intl, 'DisplayNames').mockImplementation(
      () => ({ of: (tag: string) => tag }) as unknown as Intl.DisplayNames,
    );
    expect(languageName('zz-ZZ', 'en')).toBe('zz-ZZ');
  });
});
