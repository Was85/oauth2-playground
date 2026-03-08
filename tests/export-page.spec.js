import { test, expect } from '@playwright/test';

test.describe('Export Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/export');
  });

  test('page renders with heading and description', async ({ page }) => {
    await expect(page.getByText('Export to Code')).toBeVisible();
    await expect(page.getByText('Generate OAuth setup code for your stack')).toBeVisible();
  });

  test('page renders with stack selector buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: /\.NET/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Node\.js/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /React/ })).toBeVisible();
  });

  test('page renders with flow pills', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'PKCE' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'M2M' })).toBeVisible();
  });

  test('page renders with config inputs', async ({ page }) => {
    await expect(page.getByPlaceholder('https://accounts.google.com')).toBeVisible();
    await expect(page.getByPlaceholder('your-client-id')).toBeVisible();
    await expect(page.getByPlaceholder('openid profile email')).toBeVisible();
  });

  test('empty state shows placeholder message', async ({ page }) => {
    await expect(page.getByText('Enter your Issuer URL and Client ID to generate code.')).toBeVisible();
  });

  test('.NET + PKCE generates C# code with OpenIdConnect', async ({ page }) => {
    // .NET should be selected by default
    await expect(page.getByRole('button', { name: /\.NET/ })).toBeVisible();

    // Fill in config
    await page.getByPlaceholder('https://accounts.google.com').fill('https://example.com');
    await page.getByPlaceholder('your-client-id').fill('my-client');

    // Code should appear with OpenIdConnect
    await expect(page.getByText('Program.cs').first()).toBeVisible();
    await expect(page.getByText(/OpenIdConnect/).first()).toBeVisible();
  });

  test('Node.js + M2M generates JavaScript code with client_credentials', async ({ page }) => {
    // Select Node.js
    await page.getByRole('button', { name: /Node\.js/ }).click();

    // Select M2M flow
    await page.getByRole('button', { name: 'M2M' }).click();

    // Fill in config
    await page.getByPlaceholder('https://accounts.google.com').fill('https://example.com');
    await page.getByPlaceholder('your-client-id').fill('my-client');

    // Code should appear with client_credentials
    await expect(page.getByText('server.js').first()).toBeVisible();
    await expect(page.getByText(/client_credentials/).first()).toBeVisible();
  });

  test('selecting React hides M2M pill (only PKCE available)', async ({ page }) => {
    // Verify M2M is visible initially
    await expect(page.getByRole('button', { name: 'M2M' })).toBeVisible();

    // Select React
    await page.getByRole('button', { name: /React/ }).click();

    // M2M pill should disappear
    await expect(page.getByRole('button', { name: 'M2M' })).not.toBeVisible();

    // PKCE pill should still be visible
    await expect(page.getByRole('button', { name: 'PKCE' })).toBeVisible();
  });

  test('Copy Code button exists when code is generated', async ({ page }) => {
    await page.getByPlaceholder('https://accounts.google.com').fill('https://example.com');
    await page.getByPlaceholder('your-client-id').fill('my-client');

    await expect(page.getByRole('button', { name: 'Copy Code' })).toBeVisible();
  });

  test('switching stacks changes generated code', async ({ page }) => {
    // Fill in config first
    await page.getByPlaceholder('https://accounts.google.com').fill('https://example.com');
    await page.getByPlaceholder('your-client-id').fill('my-client');

    // .NET should show Program.cs
    await expect(page.getByText('Program.cs').first()).toBeVisible();

    // Switch to Node.js
    await page.getByRole('button', { name: /Node\.js/ }).click();
    await expect(page.getByText('server.js').first()).toBeVisible();

    // Switch to React
    await page.getByRole('button', { name: /React/ }).click();
    await expect(page.getByText('AuthProvider.jsx').first()).toBeVisible();
  });

  test('React generates code with react-oidc-context', async ({ page }) => {
    await page.getByRole('button', { name: /React/ }).click();

    await page.getByPlaceholder('https://accounts.google.com').fill('https://example.com');
    await page.getByPlaceholder('your-client-id').fill('my-client');

    await expect(page.getByText('AuthProvider.jsx').first()).toBeVisible();
    await expect(page.getByText(/react-oidc-context/).first()).toBeVisible();
  });

  test('Redirect URI input appears for PKCE flow', async ({ page }) => {
    await expect(page.getByText(/redirect uri/i)).toBeVisible();
  });

  test('Redirect URI input is hidden for M2M flow', async ({ page }) => {
    await page.getByRole('button', { name: 'M2M' }).click();

    // Redirect URI label should not be visible for M2M
    // (there's still the label text from the Flow section, so check the input)
    const redirectLabels = page.getByText(/redirect uri/i);
    await expect(redirectLabels).toHaveCount(0);
  });
});
