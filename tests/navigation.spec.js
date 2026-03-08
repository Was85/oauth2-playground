import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('all 4 nav links are visible in the header', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Flows' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'JWT Decoder' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Compliance' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Export' })).toBeVisible();
  });

  test('logo and header are always visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('OAuth DevTools')).toBeVisible();
    await expect(page.getByText('Test Real OAuth Flows')).toBeVisible();
  });

  test('Flows nav link navigates to /', async ({ page }) => {
    await page.goto('/decoder');
    await page.getByRole('link', { name: 'Flows' }).click();
    await expect(page).toHaveURL('/');
  });

  test('JWT Decoder nav link navigates to /decoder', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'JWT Decoder' }).click();
    await expect(page).toHaveURL('/decoder');
  });

  test('Compliance nav link navigates to /compliance', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Compliance' }).click();
    await expect(page).toHaveURL('/compliance');
  });

  test('Export nav link navigates to /export', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Export' }).click();
    await expect(page).toHaveURL('/export');
  });

  test('active nav link is highlighted with accent color', async ({ page }) => {
    await page.goto('/');
    const flowsLink = page.getByRole('link', { name: 'Flows' });
    await expect(flowsLink).toHaveClass(/text-accent/);

    // Other links should not be highlighted
    const decoderLink = page.getByRole('link', { name: 'JWT Decoder' });
    await expect(decoderLink).toHaveClass(/text-muted/);
  });

  test('active link changes when navigating', async ({ page }) => {
    await page.goto('/decoder');
    const decoderLink = page.getByRole('link', { name: 'JWT Decoder' });
    await expect(decoderLink).toHaveClass(/text-accent/);

    const flowsLink = page.getByRole('link', { name: 'Flows' });
    await expect(flowsLink).toHaveClass(/text-muted/);
  });

  test('unknown routes redirect to /', async ({ page }) => {
    await page.goto('/nonexistent-route');
    await expect(page).toHaveURL('/');
  });

  test('header remains visible on all pages', async ({ page }) => {
    const pages = ['/', '/decoder', '/compliance', '/export'];
    for (const path of pages) {
      await page.goto(path);
      await expect(page.getByText('OAuth DevTools')).toBeVisible();
    }
  });
});
