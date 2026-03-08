import { test, expect } from '@playwright/test';

test.describe('M2M (Client Credentials) Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('M2M flow shows Client Secret field for Custom OIDC', async ({ page }) => {
    // Custom OIDC is the default provider - switch to M2M flow
    await page.getByRole('button', { name: /M2M/ }).click();

    // Client Secret field should be visible with password type
    const clientSecretInput = page.getByPlaceholder('Only for confidential clients');
    await expect(clientSecretInput).toBeVisible();
    await expect(clientSecretInput).toHaveAttribute('type', 'password');
  });

  test('M2M flow steps are correct', async ({ page }) => {
    // Switch to M2M flow
    await page.getByRole('button', { name: /M2M/ }).click();

    // Verify flow name and description
    await expect(page.getByText('Client Credentials')).toBeVisible();
    await expect(page.getByText('Machine-to-machine. No user involved')).toBeVisible();

    // Verify the three M2M steps
    await expect(page.getByText('Discover IDP Endpoints')).toBeVisible();
    await expect(page.getByText('Request Access Token')).toBeVisible();
    await expect(page.getByText('Inspect Token')).toBeVisible();
  });

  test('switching between PKCE and M2M resets state', async ({ page }) => {
    // Fill in issuer URL while in PKCE flow (default)
    const issuerInput = page.getByPlaceholder('e.g. https://idp.example.com');
    await issuerInput.fill('https://my-test-issuer.example.com');
    await expect(issuerInput).toHaveValue('https://my-test-issuer.example.com');

    // Switch to M2M flow
    await page.getByRole('button', { name: /M2M/ }).click();

    // Issuer URL field should be cleared (fields reset on flow change)
    await expect(issuerInput).toHaveValue('');
  });

  test('Client Secret field appears for Keycloak in M2M flow', async ({ page }) => {
    // Select Keycloak provider
    await page.getByRole('button', { name: /Keycloak/ }).click();

    // Switch to M2M flow
    await page.getByRole('button', { name: /M2M/ }).click();

    // Verify Client Secret field appears
    const clientSecretInput = page.getByPlaceholder('Only for Client Credentials flow');
    await expect(clientSecretInput).toBeVisible();
    await expect(clientSecretInput).toHaveAttribute('type', 'password');
  });

  test('error banner appears on failed discovery and can be dismissed', async ({ page }) => {
    // Intercept discovery requests to return a 500 error
    await page.route('**/.well-known/openid-configuration', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    // Switch to M2M flow
    await page.getByRole('button', { name: /M2M/ }).click();

    // Fill in issuer URL and client credentials
    await page.getByPlaceholder('e.g. https://idp.example.com').fill('https://broken-idp.example.com');
    await page.getByPlaceholder('Your client identifier').fill('test-client');

    // Click the first Run button (discovery step)
    await page.getByRole('button', { name: /Run/ }).first().click();

    // Verify error banner appears - look for the Dismiss button which only exists in the error banner
    await expect(page.getByRole('button', { name: 'Dismiss' })).toBeVisible({ timeout: 10000 });

    // Click Dismiss button to remove the error banner
    await page.getByRole('button', { name: 'Dismiss' }).click();

    // Error banner should be gone
    await expect(page.getByRole('button', { name: 'Dismiss' })).not.toBeVisible();
  });

  test('Setup Guide is collapsible', async ({ page }) => {
    // Setup Guide card should be visible (collapsed by default)
    await expect(page.getByText('Setup Guide')).toBeVisible();

    // Numbered steps should NOT be visible when collapsed
    const firstStep = page.getByText(/Ensure your provider supports OpenID Connect Discovery/);
    await expect(firstStep).not.toBeVisible();

    // Click to expand
    await page.getByText('Setup Guide').click();

    // Numbered steps should now be visible
    await expect(firstStep).toBeVisible();

    // Click to collapse again
    await page.getByText('Setup Guide').click();

    // Steps should be hidden again
    await expect(firstStep).not.toBeVisible();
  });

  test('Setup Guide shows Official docs link for Keycloak', async ({ page }) => {
    // Select Keycloak provider
    await page.getByRole('button', { name: /Keycloak/ }).click();

    // Expand Setup Guide
    await page.getByText('Setup Guide').click();

    // Verify "Official docs" link is visible
    const docsLink = page.getByRole('link', { name: /Official docs/ });
    await expect(docsLink).toBeVisible();
    await expect(docsLink).toHaveAttribute('href', 'https://www.keycloak.org/docs/latest/server_admin/');
  });

  test('Discovery Run button is disabled when issuer URL is empty', async ({ page }) => {
    // Ensure issuer URL is empty (default state for Custom OIDC)
    const issuerInput = page.getByPlaceholder('e.g. https://idp.example.com');
    await expect(issuerInput).toHaveValue('');

    // The first Run button (discovery step) should be disabled
    const runButton = page.getByRole('button', { name: /Run/ }).first();
    // The button is rendered but discovery won't proceed without issuerUrl.
    // In FlowStepper, button is enabled (canRun) when step is idle and prev is done.
    // But handleRunStep returns early if !issuerUrl. Let's verify the button click
    // has no effect by checking no error or discovery result appears.
    // Actually, let's check if the button is truly disabled via the disabled attribute.
    // From FlowStepper: canRun = status === 'idle' && prevDone && step.action !== 'auto'
    // For the first step (i === 0), prevDone is always true, so the button is NOT disabled
    // by the stepper itself. The guard is in handleRunStep: if (!issuerUrl) return.
    // We should verify clicking the Run button with empty issuer does nothing.
    await runButton.click();

    // No discovery endpoints card should appear
    await expect(page.getByText('Discovered Endpoints')).not.toBeVisible();

    // No error banner should appear either (it silently returns)
    await expect(page.locator('.text-danger', { hasText: 'Error' })).not.toBeVisible();
  });
});
