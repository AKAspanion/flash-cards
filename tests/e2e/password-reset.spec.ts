import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { PASSWORD, signUp, uniqueEmail } from './helpers';
import { DEV_PORTS } from '../../dev-ports';

const AUTH = `http://127.0.0.1:${DEV_PORTS.auth}`;
const PROJECT = 'demo-flash-cards';
const SENT = "If an account exists for that address, we've sent it a link to reset the password.";
const NEW_PASSWORD = 'e2e-emulator-only-new';

type OobCode = { email: string; oobCode: string; requestType: string };

/** The password-reset codes the Auth emulator has issued for `email`. */
async function resetCodesFor(request: APIRequestContext, email: string): Promise<OobCode[]> {
  const response = await request.get(`${AUTH}/emulator/v1/projects/${PROJECT}/oobCodes`);
  expect(response.ok()).toBe(true);
  const { oobCodes } = (await response.json()) as { oobCodes: OobCode[] };
  return oobCodes.filter((code) => code.email === email && code.requestType === 'PASSWORD_RESET');
}

async function signedOutUser(page: Page) {
  const email = await signUp(page);
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login/);
  return email;
}

async function openReset(page: Page) {
  await page.getByRole('button', { name: 'Forgot password?' }).click();
  await expect(page.getByText('Reset your password')).toBeVisible();
}

async function expectSignInMode(page: Page, email: string) {
  await expect(page.getByLabel('Password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Login', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send reset link' })).toHaveCount(0);
  await expect(page.getByLabel('Email')).toHaveValue(email);
}

test('a registered user resets the password from the login screen', async ({ page, request }) => {
  const email = await signedOutUser(page);

  await page.getByLabel('Email').fill(email);
  await openReset(page);
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Email')).toHaveValue(email);
  await expect(page.getByLabel('Password')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Send reset link' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign up' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByText(SENT)).toBeVisible();
  await expectSignInMode(page, email);
  await expect(page).toHaveURL(/\/login/);

  await expect.poll(async () => (await resetCodesFor(request, email)).length).toBe(1);
  const [{ oobCode }] = await resetCodesFor(request, email);
  const reset = await request.post(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=fake-key`, {
    data: { oobCode, newPassword: NEW_PASSWORD },
  });
  expect(reset.ok()).toBe(true);

  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByText('Incorrect email or password.')).toBeVisible();
  await expect(page).toHaveURL(/\/login/);

  await page.getByLabel('Password').fill(NEW_PASSWORD);
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/home$/);
});

test('an address with no account gets the same reply', async ({ page, request }) => {
  const email = uniqueEmail();
  await page.goto('/login');
  await openReset(page);
  await page.getByLabel('Email').fill(email);

  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByText(SENT)).toBeVisible();
  await expectSignInMode(page, email);
  await expect(page).toHaveURL(/\/login/);
  expect(await resetCodesFor(request, email)).toHaveLength(0);
});

test('reset mode explains what is wrong and stays put', async ({ page }) => {
  const sent: string[] = [];
  page.on('request', (req) => {
    if (req.url().includes('accounts:sendOobCode')) {
      sent.push(req.url());
    }
  });
  await page.goto('/login');
  await openReset(page);
  const submit = page.getByRole('button', { name: 'Send reset link' });

  await submit.click();
  await expect(page.getByText('Please enter your email')).toBeVisible();
  await expect(submit).toBeVisible();
  expect(sent).toHaveLength(0);

  await page.getByLabel('Email').fill('not-an-email');
  await submit.click();
  await expect(page.getByText('That email address is not valid.')).toBeVisible();
  await expect(page.getByText('Reset your password')).toBeVisible();
  await expect(submit).toBeVisible();
  await expect(page.getByLabel('Email')).toHaveValue('not-an-email');
  await expect(page).toHaveURL(/\/login/);
  // The Auth emulator would answer a malformed address as an unknown one, so the screen checks it first.
  expect(sent).toHaveLength(0);
});

test('a failed request stays in reset mode with the address and says why', async ({ page }) => {
  const email = uniqueEmail();
  await page.route('**/accounts:sendOobCode**', (route) => route.abort('internetdisconnected'));
  await page.goto('/login');
  await openReset(page);
  await page.getByLabel('Email').fill(email);

  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByText('Network error. Check your connection and try again.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send reset link' })).toBeVisible();
  await expect(page.getByText('Reset your password')).toBeVisible();
  await expect(page.getByLabel('Email')).toHaveValue(email);
  await expect(page.getByText(SENT)).toHaveCount(0);
});

test('pressing twice sends one request, and the mode holds while it is in flight', async ({ page }) => {
  let sent = 0;
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/accounts:sendOobCode**', async (route) => {
    sent += 1;
    await held;
    await route.continue();
  });
  await page.goto('/login');
  await openReset(page);
  await page.getByLabel('Email').fill(uniqueEmail());

  await page.getByRole('button', { name: 'Send reset link' }).dblclick();
  await expect.poll(() => sent).toBe(1);
  await expect(page.getByRole('button', { name: 'Back to login' })).toBeDisabled();

  release();
  await expect(page.getByText(SENT)).toBeVisible();
  expect(sent).toBe(1);
});

test('back to login keeps the email', async ({ page }) => {
  const email = uniqueEmail();
  await page.goto('/login');
  await openReset(page);
  await page.getByLabel('Email').fill(email);

  await page.getByRole('button', { name: 'Back to login' }).click();
  await expectSignInMode(page, email);
});
