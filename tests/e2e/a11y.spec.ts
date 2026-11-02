import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { createSet, setCard, signUp } from './helpers';

async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const summary = results.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => `${n.target.join(' ')} ${n.any[0]?.message ?? ''}`).join(' | ')}`,
  );
  expect(summary).toEqual([]);
}

test('login page is accessible', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
  await expectNoA11yViolations(page);
});

test('signed-in screens are accessible', async ({ page }) => {
  // Seven pages, each with a full axe scan.
  test.setTimeout(120_000);
  await signUp(page);
  await createSet(page, 'Spanish verbs');

  // Firestore keeps a connection open, so wait for each page's own content instead of network idle.
  const pages: [string, string][] = [
    ['/home', 'Spanish verbs'],
    ['/profile', 'Member Since'],
    ['/settings', 'Card-sets order'],
    ['/info', 'Learn & Memorize'],
    ['/bin', 'Flashcards trash bin'],
  ];
  for (const [path, text] of pages) {
    await page.goto(path);
    await expect(page.getByText(text, { exact: true }).first()).toBeVisible();
    await expectNoA11yViolations(page);
  }

  await page.goto('/home');
  await setCard(page, 'Spanish verbs').getByText('browse').click();
  await expect(page.getByText('hablar')).toBeVisible();
  await expectNoA11yViolations(page);

  await page.goto('/add');
  await expect(page.getByText('Add new flashcards here')).toBeVisible();
  await expectNoA11yViolations(page);
});
