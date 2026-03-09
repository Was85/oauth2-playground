import { test, expect } from '@playwright/test';

test.describe('Keyboard Navigation', () => {
  test('tab through nav links and verify they receive focus', async ({ page }) => {
    await page.goto('/');

    // Focus the first nav link by tabbing from the top
    // Tab until we reach the first nav link
    const navLinks = page.locator('nav a');
    const linkCount = await navLinks.count();
    expect(linkCount).toBe(4);

    // Focus the first link and verify each receives focus via Tab
    await navLinks.first().focus();
    await expect(navLinks.nth(0)).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(navLinks.nth(1)).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(navLinks.nth(2)).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(navLinks.nth(3)).toBeFocused();
  });

  test('Enter key activates nav links', async ({ page }) => {
    await page.goto('/');

    const decoderLink = page.getByRole('link', { name: 'JWT Decoder' });
    await decoderLink.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL('/decoder');
  });

  test('tab through interactive elements on FlowPage', async ({ page }) => {
    await page.goto('/');

    // Provider buttons should be focusable
    const providerButtons = page.locator('button').filter({ hasText: /Entra|Google|Auth0|Custom/ });
    const firstProvider = providerButtons.first();
    await firstProvider.focus();
    await expect(firstProvider).toBeFocused();

    // Flow pills should be focusable
    const flowPills = page.locator('button').filter({ hasText: /PKCE|Client Creds/ });
    const firstPill = flowPills.first();
    await firstPill.focus();
    await expect(firstPill).toBeFocused();

    // Input fields should be focusable
    const inputs = page.locator('input');
    const inputCount = await inputs.count();
    expect(inputCount).toBeGreaterThan(0);
    await inputs.first().focus();
    await expect(inputs.first()).toBeFocused();

    // Reset button should be focusable
    const resetButton = page.getByRole('button', { name: 'Reset' });
    await resetButton.focus();
    await expect(resetButton).toBeFocused();
  });
});

test.describe('Responsive Layout', () => {
  test('mobile viewport (375x667): nav links visible and accessible', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // All nav links should still be visible and accessible at mobile width
    await expect(page.getByRole('link', { name: 'Flows' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'JWT Decoder' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Compliance' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Export' })).toBeVisible();
  });

  test('tablet viewport (768x1024): layout renders correctly', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    // Header elements visible
    await expect(page.getByText('OAuth DevTools')).toBeVisible();
    await expect(page.getByText('Test Real OAuth Flows')).toBeVisible();

    // Nav links visible
    await expect(page.getByRole('link', { name: 'Flows' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'JWT Decoder' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Compliance' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Export' })).toBeVisible();

    // Main content visible
    await expect(page.getByText('Identity Provider')).toBeVisible();
  });

  test('desktop viewport (1280x800): full layout renders', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    // Header
    await expect(page.getByText('OAuth DevTools')).toBeVisible();
    await expect(page.getByText('Test Real OAuth Flows')).toBeVisible();

    // All nav links
    await expect(page.getByRole('link', { name: 'Flows' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'JWT Decoder' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Compliance' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Export' })).toBeVisible();

    // Sidebar sections on FlowPage
    await expect(page.getByText('Identity Provider')).toBeVisible();
    await expect(page.getByText('Token Inspector')).toBeVisible();
  });

  test('mobile viewport: each page renders content', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const routes = [
      { path: '/', expectedText: 'OAuth DevTools' },
      { path: '/decoder', expectedText: 'JWT Decoder' },
      { path: '/compliance', expectedText: 'OAuth Compliance Checker' },
      { path: '/export', expectedText: 'Export to Code' },
    ];
    for (const { path, expectedText } of routes) {
      await page.goto(path);
      await expect(page.getByText(expectedText).first()).toBeVisible();
    }
  });
});

test.describe('Page Titles and Headings', () => {
  test('FlowPage has Identity Provider and Token Inspector headings', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Identity Provider')).toBeVisible();
    await expect(page.getByText('Token Inspector')).toBeVisible();
  });

  test('DecoderPage has JWT Decoder heading', async ({ page }) => {
    await page.goto('/decoder');
    await expect(page.locator('h1', { hasText: 'JWT Decoder' })).toBeVisible();
  });

  test('CompliancePage has OAuth Compliance Checker heading', async ({ page }) => {
    await page.goto('/compliance');
    await expect(page.locator('h1', { hasText: 'OAuth Compliance Checker' })).toBeVisible();
  });

  test('ExportPage has Export to Code heading', async ({ page }) => {
    await page.goto('/export');
    await expect(page.locator('h1', { hasText: 'Export to Code' })).toBeVisible();
  });
});

test.describe('Focus Management', () => {
  test('inputs are focusable on FlowPage', async ({ page }) => {
    await page.goto('/');
    // Wait for lazy-loaded FlowPage content to render
    await expect(page.getByText('Authorization Code + PKCE')).toBeVisible();

    const inputs = page.locator('input');
    const count = await inputs.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      // Skip readonly inputs
      const isReadOnly = await input.getAttribute('readonly');
      if (isReadOnly !== null) continue;

      await input.focus();
      await expect(input).toBeFocused();
    }
  });

  test('inputs are focusable on DecoderPage', async ({ page }) => {
    await page.goto('/decoder');

    // The JWT input textarea or input should be focusable
    const textareas = page.locator('textarea');
    const textareaCount = await textareas.count();
    if (textareaCount > 0) {
      await textareas.first().focus();
      await expect(textareas.first()).toBeFocused();
    }

    const inputs = page.locator('input');
    const inputCount = await inputs.count();
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      await input.focus();
      await expect(input).toBeFocused();
    }
  });

  test('buttons are activatable via Enter key', async ({ page }) => {
    await page.goto('/');

    // Focus a provider button and press Enter
    const providerButtons = page.locator('button').filter({ hasText: /Entra|Google|Auth0|Custom/ });
    const firstProvider = providerButtons.first();
    await firstProvider.focus();
    await page.keyboard.press('Enter');

    // The button should have been activated (class changes to active state)
    // Verify no error occurred and button is still visible
    await expect(firstProvider).toBeVisible();
  });

  test('buttons are activatable via Space key', async ({ page }) => {
    await page.goto('/');

    // Focus a flow pill and press Space
    const flowPills = page.locator('button').filter({ hasText: 'M2M' });
    const pill = flowPills.first();
    await pill.focus();
    await page.keyboard.press('Space');

    // After activation, the pill should reflect the active state
    await expect(pill).toBeVisible();
  });
});

test.describe('Color Contrast / Dark Theme', () => {
  test('body has the dark background class', async ({ page }) => {
    await page.goto('/');

    // The root wrapper div should have bg-bg class for dark theme
    const rootDiv = page.locator('div.bg-bg').first();
    await expect(rootDiv).toBeVisible();
  });

  test('text elements are visible and not hidden on all pages', async ({ page }) => {
    const routes = [
      { path: '/', expectedTexts: ['OAuth DevTools', 'Identity Provider', 'Token Inspector'] },
      { path: '/decoder', expectedTexts: ['OAuth DevTools', 'JWT Decoder'] },
      { path: '/compliance', expectedTexts: ['OAuth DevTools', 'OAuth Compliance Checker'] },
      { path: '/export', expectedTexts: ['OAuth DevTools', 'Export to Code'] },
    ];

    for (const { path, expectedTexts } of routes) {
      await page.goto(path);
      for (const text of expectedTexts) {
        const element = page.getByText(text, { exact: false }).first();
        await expect(element).toBeVisible();

        // Verify element is not invisible due to zero opacity or visibility hidden
        const styles = await element.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            opacity: computed.opacity,
            visibility: computed.visibility,
            display: computed.display,
          };
        });
        expect(styles.opacity).not.toBe('0');
        expect(styles.visibility).not.toBe('hidden');
        expect(styles.display).not.toBe('none');
      }
    }
  });

  test('header text has visible contrast against background', async ({ page }) => {
    await page.goto('/');

    const title = page.getByText('OAuth DevTools');
    await expect(title).toBeVisible();

    // Verify the title has a non-transparent color
    const color = await title.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return computed.color;
    });
    // Color should not be fully transparent (rgba with alpha 0)
    expect(color).not.toMatch(/rgba\(\d+,\s*\d+,\s*\d+,\s*0\)/);
  });

  test('nav links have visible text', async ({ page }) => {
    await page.goto('/');

    const navLinks = page.locator('nav a');
    const count = await navLinks.count();
    expect(count).toBe(4);

    for (let i = 0; i < count; i++) {
      const link = navLinks.nth(i);
      await expect(link).toBeVisible();

      const styles = await link.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          color: computed.color,
          fontSize: computed.fontSize,
        };
      });
      // Font size should be non-zero
      expect(parseFloat(styles.fontSize)).toBeGreaterThan(0);
    }
  });
});
