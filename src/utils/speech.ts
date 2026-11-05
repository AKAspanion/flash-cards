import type { SpeechLanguages } from '@/types';

const VOICES_WAIT_MS = 1000;

const LANGUAGE_TAG = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{1,8})*$/;
const MAX_TAG_LENGTH = 35;

function toLanguage(value: unknown): string | undefined {
  return typeof value === 'string' && value.length <= MAX_TAG_LENGTH && LANGUAGE_TAG.test(value) ? value : undefined;
}

/**
 * Reads a set's stored or restored read-aloud languages, keeping only values shaped like BCP 47
 * tags; undefined when the value isn't an object.
 */
export function toSpeechLanguages(value: unknown): SpeechLanguages | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const { front, back } = value as Record<string, unknown>;
  const speech: SpeechLanguages = {};
  const frontTag = toLanguage(front);
  const backTag = toLanguage(back);
  if (frontTag) speech.front = frontTag;
  if (backTag) speech.back = backTag;
  return speech;
}

/** True when the browser can read text aloud. */
export function speechAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

/** Reads `text` aloud in `lang` (the browser default when unset), replacing any speech in progress. */
export function speak(text: string, lang?: string): void {
  if (!speechAvailable() || !text.trim()) {
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  if (lang) {
    utterance.lang = lang;
  }
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function languagesOf(voices: SpeechSynthesisVoice[]): string[] {
  return [...new Set(voices.map((voice) => voice.lang).filter(Boolean))].sort();
}

/** The unique languages of the browser's voices, sorted. Some browsers load voices late, so an empty list waits up to 1,000 ms. */
export function voiceLanguages(): Promise<string[]> {
  if (!speechAvailable()) {
    return Promise.resolve([]);
  }
  const synth = window.speechSynthesis;
  const now = languagesOf(synth.getVoices());
  if (now.length > 0) {
    return Promise.resolve(now);
  }
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      synth.removeEventListener('voiceschanged', finish);
      resolve(languagesOf(synth.getVoices()));
    };
    const timer = setTimeout(finish, VOICES_WAIT_MS);
    synth.addEventListener('voiceschanged', finish);
  });
}

/** The name of a language tag in the app language, or the tag itself when Intl doesn't know it. */
export function languageName(tag: string, uiLocale: string): string {
  try {
    return new Intl.DisplayNames(uiLocale, { type: 'language' }).of(tag) || tag;
  } catch {
    return tag;
  }
}
