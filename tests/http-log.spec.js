import { test, expect } from '@playwright/test';

test.describe('HttpLog Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Log tab is visible and clickable', async ({ page }) => {
    const logTab = page.getByRole('button', { name: 'Log', exact: true });
    await expect(logTab).toBeVisible();
    await logTab.click();

    // Should switch to log view (flow content hidden)
    await expect(page.getByText('Authorization Code + PKCE')).not.toBeVisible();
  });

  test('empty log shows placeholder message', async ({ page }) => {
    const logTab = page.getByRole('button', { name: 'Log', exact: true });
    await logTab.click();

    await expect(
      page.getByText('Run the flow steps to see HTTP requests and responses here.')
    ).toBeVisible();
  });

  test('switching between Flow and Log tabs works', async ({ page }) => {
    const flowTab = page.getByRole('button', { name: 'Flow' });
    const logTab = page.getByRole('button', { name: 'Log', exact: true });

    // Flow tab active by default
    await expect(page.getByText('Authorization Code + PKCE')).toBeVisible();

    // Switch to Log
    await logTab.click();
    await expect(page.getByText('Authorization Code + PKCE')).not.toBeVisible();
    await expect(
      page.getByText('Run the flow steps to see HTTP requests and responses here.')
    ).toBeVisible();

    // Switch back to Flow
    await flowTab.click();
    await expect(page.getByText('Authorization Code + PKCE')).toBeVisible();
    await expect(
      page.getByText('Run the flow steps to see HTTP requests and responses here.')
    ).not.toBeVisible();

    // Switch to Log again to confirm round-trip
    await logTab.click();
    await expect(
      page.getByText('Run the flow steps to see HTTP requests and responses here.')
    ).toBeVisible();
  });

  test('log entries appear after running discovery step', async ({ page }) => {
    // Custom OIDC is the default provider. Fill in a real issuer URL to trigger discovery.
    const issuerInput = page.getByPlaceholder('e.g. https://idp.example.com');
    await issuerInput.fill('https://accounts.google.com');

    // Click the Run button on the first step (Discover IDP Endpoints)
    const runButton = page.getByRole('button', { name: /Run/ }).first();
    await runButton.click();

    // Wait for discovery to complete (step goes to done or error)
    // Either way, log entries should be created
    await page.waitForTimeout(3000);

    // Switch to Log tab - the tab label should now include a count
    const logTab = page.getByRole('button', { name: /Log \(/ });
    await expect(logTab).toBeVisible();
    await logTab.click();

    // Placeholder should NOT be visible since we have entries
    await expect(
      page.getByText('Run the flow steps to see HTTP requests and responses here.')
    ).not.toBeVisible();

    // Log header with entry count should be visible
    await expect(page.getByText(/HTTP Request \/ Response Log/)).toBeVisible();

    // Clear button should be visible
    await expect(page.getByRole('button', { name: 'Clear' })).toBeVisible();

    // At least the request entry should exist with GET method tag
    await expect(page.getByText('GET').first()).toBeVisible();

    // The OIDC Discovery label should appear
    await expect(page.getByText('OIDC Discovery')).toBeVisible();
  });

  test('log entries can be expanded and collapsed by clicking', async ({ page }) => {
    // Fill in issuer and run discovery to generate log entries
    const issuerInput = page.getByPlaceholder('e.g. https://idp.example.com');
    await issuerInput.fill('https://accounts.google.com');

    const runButton = page.getByRole('button', { name: /Run/ }).first();
    await runButton.click();

    // Wait for discovery to complete
    await page.waitForTimeout(3000);

    // Switch to Log tab
    const logTab = page.getByRole('button', { name: /Log \(/ });
    await logTab.click();

    // The first log entry should be expanded by default, showing ▲ indicator
    await expect(page.getByText('▲').first()).toBeVisible();

    // Also when expanded, the description text should be visible
    await expect(page.getByText('OIDC Discovery').first()).toBeVisible();

    // Collapse the first entry by clicking its header (the select-none div)
    await page.getByText('▲').first().click();

    // After collapsing, should show ▼ indicator
    await expect(page.getByText('▼').first()).toBeVisible();

    // Expand again
    await page.getByText('▼').first().click();
    await expect(page.getByText('▲').first()).toBeVisible();
  });

  test('Clear button removes all log entries', async ({ page }) => {
    // Fill in issuer and run discovery to generate log entries
    const issuerInput = page.getByPlaceholder('e.g. https://idp.example.com');
    await issuerInput.fill('https://accounts.google.com');

    const runButton = page.getByRole('button', { name: /Run/ }).first();
    await runButton.click();

    // Wait for discovery to complete
    await page.waitForTimeout(3000);

    // Switch to Log tab
    const logTab = page.getByRole('button', { name: /Log \(/ });
    await logTab.click();

    // Verify entries exist
    await expect(page.getByText(/HTTP Request \/ Response Log/)).toBeVisible();

    // Click Clear
    await page.getByRole('button', { name: 'Clear' }).click();

    // Should show the empty placeholder again
    await expect(
      page.getByText('Run the flow steps to see HTTP requests and responses here.')
    ).toBeVisible();
  });

  test('Log tab label shows entry count when entries exist', async ({ page }) => {
    // Initially, Log tab should not show a count
    const logTabInitial = page.getByRole('button', { name: 'Log', exact: true });
    await expect(logTabInitial).toBeVisible();

    // Fill in issuer and run discovery
    const issuerInput = page.getByPlaceholder('e.g. https://idp.example.com');
    await issuerInput.fill('https://accounts.google.com');

    const runButton = page.getByRole('button', { name: /Run/ }).first();
    await runButton.click();

    // Wait for discovery to complete
    await page.waitForTimeout(3000);

    // Log tab should now show a count in parentheses
    await expect(page.getByRole('button', { name: /Log \(\d+\)/ })).toBeVisible();
  });
});
