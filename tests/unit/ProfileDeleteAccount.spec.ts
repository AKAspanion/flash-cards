import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, reactive } from 'vue';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import type { RedirectOutcome } from '@/services/firebase';

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/services/firebase', () => ({ updateUserProfile: vi.fn(), confirmMethod: vi.fn() }));

const session = vi.hoisted(() => ({
  state: null as null | {
    user: { uid: string; email: string; displayName: string; photoURL: string };
    online: boolean;
    redirectOutcomeLoaded: boolean;
    redirectOutcome: RedirectOutcome | null;
    showSnack: (message: string) => void;
  },
}));
vi.mock('@/stores/session', () => ({ useSessionStore: () => session.state }));
vi.mock('@/stores/library', () => ({ useLibraryStore: () => ({ labels: [] }) }));
vi.mock('@/stores/account', () => ({ useAccountStore: () => ({ signOut: vi.fn() }) }));

const { default: vuetify } = await import('@/plugins/vuetify');
const { default: i18n } = await import('@/plugins/i18n');
const { writePendingDelete } = await import('@/utils/pendingDelete');
const { default: Profile } = await import('@/views/Profile.vue');

const UID = 'u1';

/** Stands in for the dialog: shows what Profile passes it, and closes the way the real one does. */
const DialogStub = defineComponent({
  name: 'DialogDeleteAccount',
  props: { modelValue: Boolean, confirmed: Boolean },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () =>
      props.modelValue
        ? h('div', { class: 'dialog-stub', 'data-confirmed': String(props.confirmed) }, [
            h('button', { class: 'dialog-stub__close', onClick: () => emit('update:modelValue', false) }, 'Close'),
          ])
        : null;
  },
});

let wrapper: VueWrapper | null = null;

async function mountProfile(googleReturn: boolean) {
  sessionStorage.clear();
  if (googleReturn) {
    writePendingDelete(sessionStorage, { uid: UID, at: Date.now() });
  }
  session.state = reactive({
    user: { uid: UID, email: 'a@example.com', displayName: 'A', photoURL: '' },
    online: true,
    redirectOutcomeLoaded: true,
    redirectOutcome: googleReturn ? { operationType: 'reauthenticate' as const, uid: UID } : null,
    showSnack: vi.fn(),
  });
  wrapper = mount(Profile, {
    global: {
      plugins: [vuetify, i18n],
      stubs: { DialogDeleteAccount: DialogStub, BarTop: true, BtnAction: true },
    },
    attachTo: document.body,
  });
  await flushPromises();
}

function dialog() {
  return wrapper!.find('.dialog-stub');
}

async function closeDialog() {
  await dialog().find('.dialog-stub__close').trigger('click');
  await flushPromises();
}

async function openDialog() {
  const row = wrapper!.findAll('button').find((b) => b.text().includes('Delete account'));
  if (!row) {
    throw new Error('No Delete account row');
  }
  await row.trigger('click');
  await flushPromises();
}

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  sessionStorage.clear();
  vi.unstubAllGlobals();
});

describe('Profile delete account, confirmed Google return', () => {
  it('opens at the final step once, and asks again after the dialog is closed', async () => {
    await mountProfile(true);
    expect(dialog().exists()).toBe(true);
    expect(dialog().attributes('data-confirmed')).toBe('true');

    await closeDialog();
    expect(dialog().exists()).toBe(false);

    await openDialog();
    expect(dialog().attributes('data-confirmed')).toBe('false');
  });

  it('stays at the final step while the dialog stays open', async () => {
    await mountProfile(true);
    await flushPromises();
    expect(dialog().attributes('data-confirmed')).toBe('true');
  });

  it('never arms the final step for an opening with no Google return', async () => {
    await mountProfile(false);
    expect(dialog().exists()).toBe(false);
    await openDialog();
    expect(dialog().attributes('data-confirmed')).toBe('false');
    await closeDialog();
    await openDialog();
    expect(dialog().attributes('data-confirmed')).toBe('false');
  });
});
