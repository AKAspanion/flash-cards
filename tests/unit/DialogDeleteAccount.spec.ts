import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import type { Composer } from 'vue-i18n';

const firebase = vi.hoisted(() => ({ confirmMethod: vi.fn<() => 'password' | 'google'>() }));
vi.mock('@/services/firebase', () => firebase);

const account = vi.hoisted(() => ({
  confirmWithPassword: vi.fn<(password: string) => Promise<boolean>>(),
  confirmWithGoogle: vi.fn<() => Promise<void>>(),
  deleteAccount: vi.fn<() => Promise<boolean>>(),
}));
vi.mock('@/stores/account', () => ({ useAccountStore: () => account }));

const { default: vuetify } = await import('@/plugins/vuetify');
const { default: i18n } = await import('@/plugins/i18n');
const { default: DialogDeleteAccount } = await import('@/components/DialogDeleteAccount.vue');

const WORD_LABEL = 'Type DELETE to confirm';
const WORD_HINT = 'Type the word DELETE in capitals.';
const DELETE = 'Delete my account';
const GOOGLE = 'Continue with Google';

let wrapper: VueWrapper | null = null;

/** The plugin is created with `legacy: false`, so its global is a Composer whose locale is a ref. */
function setLocale(locale: 'en' | 'hi') {
  (i18n.global as unknown as Composer).locale.value = locale;
}

async function open(method: 'password' | 'google', props: { confirmed?: boolean } = {}) {
  firebase.confirmMethod.mockReturnValue(method);
  wrapper = mount(DialogDeleteAccount, {
    props: { modelValue: false, ...props },
    global: { plugins: [vuetify, i18n] },
    attachTo: document.body,
  });
  await wrapper.setProps({ modelValue: true });
  await flushPromises();
}

/** The dialog teleports its content to the body, outside the wrapper. */
function dialog(): HTMLElement {
  const found = document.querySelector<HTMLElement>('.v-overlay__content');
  if (!found) {
    throw new Error('The dialog is not open');
  }
  return found;
}

function field(label: string): HTMLInputElement | null {
  const labelled = [...dialog().querySelectorAll('.v-text-field')].find(
    (f) => f.querySelector('label')?.textContent?.trim() === label,
  );
  return labelled?.querySelector('input') ?? null;
}

function wordField() {
  return field(i18n.global.t('account.delete.type'));
}

function button(label: string): HTMLButtonElement {
  const found = [...dialog().querySelectorAll('button')].find((b) => b.textContent?.trim() === label);
  if (!found) {
    throw new Error(`No button ${label}`);
  }
  return found;
}

async function type(input: HTMLInputElement | null, value: string) {
  if (!input) {
    throw new Error('No such field');
  }
  input.value = value;
  input.dispatchEvent(new Event('input'));
  await flushPromises();
}

async function click(el: HTMLElement) {
  el.click();
  await flushPromises();
}

beforeEach(() => {
  vi.clearAllMocks();
  // Vuetify's dialog positions itself with these, which jsdom lacks.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal('visualViewport', Object.assign(new EventTarget(), { width: 1024, height: 768, scale: 1 }));
  account.confirmWithPassword.mockResolvedValue(true);
  account.confirmWithGoogle.mockResolvedValue();
  account.deleteAccount.mockResolvedValue(true);
  setLocale('en');
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
  setLocale('en');
  vi.unstubAllGlobals();
});

describe('DialogDeleteAccount typed DELETE, password users', () => {
  it('shows the word field above the password field, with its hint and no autocorrect', async () => {
    await open('password');
    const word = field(WORD_LABEL);
    const password = field('Password');
    expect(word).not.toBeNull();
    expect(password).not.toBeNull();
    expect(word!.compareDocumentPosition(password!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(word!.getAttribute('autocomplete')).toBe('off');
    expect(word!.getAttribute('autocapitalize')).toBe('characters');
    expect(word!.getAttribute('spellcheck')).toBe('false');
    expect(dialog().textContent).toContain(WORD_HINT);
  });

  it('keeps Delete my account disabled with the right password but no word', async () => {
    await open('password');
    await type(field('Password'), 'secret1');
    expect(button(DELETE).disabled).toBe(true);
  });

  it.each(['delete', 'Delete', 'DELET', 'DELETE!'])('keeps Delete my account disabled for %j', async (word) => {
    await open('password');
    await type(field(WORD_LABEL), word);
    await type(field('Password'), 'secret1');
    expect(button(DELETE).disabled).toBe(true);
  });

  it('keeps Delete my account disabled with the word but no password', async () => {
    await open('password');
    await type(field(WORD_LABEL), 'DELETE');
    expect(button(DELETE).disabled).toBe(true);
  });

  it('deletes with " DELETE " (trimmed) and the password', async () => {
    await open('password');
    await type(field(WORD_LABEL), ' DELETE ');
    await type(field('Password'), 'secret1');
    expect(button(DELETE).disabled).toBe(false);
    await click(button(DELETE));
    expect(account.confirmWithPassword).toHaveBeenCalledWith('secret1');
    expect(account.deleteAccount).toHaveBeenCalledTimes(1);
  });

  it('ignores Enter in the password field until the word matches', async () => {
    await open('password');
    const password = field('Password')!;
    await type(password, 'secret1');
    password.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
    await flushPromises();
    expect(account.confirmWithPassword).not.toHaveBeenCalled();
    expect(account.deleteAccount).not.toHaveBeenCalled();

    await type(field(WORD_LABEL), 'DELETE');
    password.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
    await flushPromises();
    expect(account.confirmWithPassword).toHaveBeenCalledWith('secret1');
    expect(account.deleteAccount).toHaveBeenCalledTimes(1);
  });

  it('keeps the dialog open and the word typed after a wrong password', async () => {
    account.confirmWithPassword.mockResolvedValue(false);
    await open('password');
    await type(field(WORD_LABEL), 'DELETE');
    await type(field('Password'), 'wrong');
    await click(button(DELETE));
    expect(account.confirmWithPassword).toHaveBeenCalledWith('wrong');
    expect(account.deleteAccount).not.toHaveBeenCalled();
    expect(wrapper!.emitted('update:modelValue')).toBeUndefined();
    expect(field(WORD_LABEL)!.value).toBe('DELETE');
    expect(button(DELETE).disabled).toBe(false);
  });

  it('clears the word when the dialog is opened again', async () => {
    await open('password');
    await type(field(WORD_LABEL), 'DELETE');
    await type(field('Password'), 'secret1');
    await wrapper!.setProps({ modelValue: false });
    await flushPromises();
    await wrapper!.setProps({ modelValue: true });
    await flushPromises();
    expect(field(WORD_LABEL)!.value).toBe('');
    expect(field('Password')!.value).toBe('');
    expect(button(DELETE).disabled).toBe(true);
  });
});

describe('DialogDeleteAccount typed DELETE, Google users', () => {
  it('shows only the word field, and keeps Continue with Google disabled until DELETE is typed', async () => {
    await open('google');
    expect(field(WORD_LABEL)).not.toBeNull();
    expect(field('Password')).toBeNull();
    expect(button(GOOGLE).disabled).toBe(true);
    await click(button(GOOGLE));
    expect(account.confirmWithGoogle).not.toHaveBeenCalled();

    await type(field(WORD_LABEL), 'Delete');
    expect(button(GOOGLE).disabled).toBe(true);

    await type(field(WORD_LABEL), 'DELETE');
    expect(button(GOOGLE).disabled).toBe(false);
    await click(button(GOOGLE));
    expect(account.confirmWithGoogle).toHaveBeenCalledTimes(1);
  });

  it('back from Google, shows no word field and enables Delete my account', async () => {
    await open('google', { confirmed: true });
    expect(wordField()).toBeNull();
    expect(button(DELETE).disabled).toBe(false);
    await click(button(DELETE));
    expect(account.confirmWithGoogle).not.toHaveBeenCalled();
    expect(account.deleteAccount).toHaveBeenCalledTimes(1);
  });
});

describe('DialogDeleteAccount in Hindi', () => {
  it('labels the field and its hint in Hindi, and still asks for DELETE', async () => {
    setLocale('hi');
    await open('password');
    const label = i18n.global.t('account.delete.type');
    const hint = i18n.global.t('account.delete.typeHint');
    expect(label).not.toBe(WORD_LABEL);
    expect(hint).not.toBe(WORD_HINT);
    expect(label).toContain('DELETE');
    expect(hint).toContain('DELETE');
    expect(dialog().textContent).toContain(hint);

    await type(wordField(), 'DELETE');
    await type(field('पासवर्ड'), 'secret1');
    expect(button('मेरा खाता हटाएं').disabled).toBe(false);
  });
});
