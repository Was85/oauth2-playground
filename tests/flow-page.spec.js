import { test, expect } from '@playwright/test';

test.describe('Flow Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('page loads with header, nav, provider selector, flow stepper, and token inspector', async ({ page }) => {
    // Header
    await expect(page.getByText('OAuth DevTools')).toBeVisible();

    // Nav links
    await expect(page.getByRole('link', { name: 'Flows' })).toBeVisible();

    // Provider selector heading
    await expect(page.getByText('Identity Provider')).toBeVisible();

    // Token Inspector section
    await expect(page.getByText('Token Inspector')).toBeVisible();

    // Flow stepper section - default flow is PKCE
    await expect(page.getByText('Authorization Code + PKCE')).toBeVisible();
  });

  test('all 6 provider buttons render', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Microsoft Entra/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Auth0/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Google/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Keycloak/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /🛡️.*Okta/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Custom OIDC Provider/ })).toBeVisible();
  });

  test('selecting Keycloak provider shows Keycloak-specific fields', async ({ page }) => {
    await page.getByRole('button', { name: /Keycloak/ }).click();
    await expect(page.getByText('Keycloak Base URL')).toBeVisible();
    await expect(page.getByText('Realm', { exact: false })).toBeVisible();
    await expect(page.getByText('Client ID')).toBeVisible();
  });

  test('selecting Custom OIDC shows Issuer URL field', async ({ page }) => {
    await page.getByRole('button', { name: /Custom OIDC/ }).click();
    await expect(page.getByText('Issuer URL')).toBeVisible();
  });

  test('selecting Microsoft Entra ID shows Tenant ID field', async ({ page }) => {
    await page.getByRole('button', { name: /Microsoft Entra ID/ }).click();
    await expect(page.getByText('Tenant ID')).toBeVisible();
    await expect(page.getByText('Application (Client) ID')).toBeVisible();
  });

  test('selecting Auth0 shows Auth0 Domain field', async ({ page }) => {
    await page.getByRole('button', { name: /Auth0/ }).click();
    await expect(page.getByText('Auth0 Domain')).toBeVisible();
  });

  test('selecting Google shows Client ID field only', async ({ page }) => {
    await page.getByRole('button', { name: /Google/ }).click();
    await expect(page.getByText('Client ID')).toBeVisible();
    // Google should NOT show Client Secret (only 1 field)
    await expect(page.getByText('Client Secret')).not.toBeVisible();
  });

  test('selecting Okta shows Okta Domain field', async ({ page }) => {
    await page.getByRole('button', { name: /🛡️.*Okta/ }).click();
    await expect(page.getByText('Okta Domain')).toBeVisible();
  });

  test('PKCE and M2M flow pills are visible and work', async ({ page }) => {
    // PKCE pill should be active by default
    const pkcePill = page.getByRole('button', { name: 'PKCE' });
    const m2mPill = page.getByRole('button', { name: 'M2M' });

    await expect(pkcePill).toBeVisible();
    await expect(m2mPill).toBeVisible();

    // Click M2M pill
    await m2mPill.click();
    await expect(page.getByText('Client Credentials')).toBeVisible();
    await expect(page.getByText('Machine-to-machine')).toBeVisible();

    // Click PKCE pill to go back
    await pkcePill.click();
    await expect(page.getByText('Authorization Code + PKCE')).toBeVisible();
  });

  test('Flow and Log tab switching works', async ({ page }) => {
    // Flow tab should be active by default
    const flowTab = page.getByRole('button', { name: 'Flow' });
    const logTab = page.getByRole('button', { name: 'Log', exact: true });

    await expect(flowTab).toBeVisible();
    await expect(logTab).toBeVisible();

    // Flow content visible by default
    await expect(page.getByText('Authorization Code + PKCE')).toBeVisible();

    // Switch to Log tab
    await logTab.click();
    // Flow content should be hidden, log content shown
    await expect(page.getByText('Authorization Code + PKCE')).not.toBeVisible();

    // Switch back to Flow tab
    await flowTab.click();
    await expect(page.getByText('Authorization Code + PKCE')).toBeVisible();
  });

  test('Reset button is visible and clears state', async ({ page }) => {
    const resetButton = page.getByRole('button', { name: 'Reset' });
    await expect(resetButton).toBeVisible();

    // Click reset - should not throw
    await resetButton.click();

    // Flow page should still be showing
    await expect(page.getByText('Authorization Code + PKCE')).toBeVisible();
  });

  test('config inputs are editable', async ({ page }) => {
    // Custom OIDC is default, should show Issuer URL
    await expect(page.getByText('Issuer URL')).toBeVisible();

    const issuerInput = page.getByPlaceholder('e.g. https://idp.example.com');
    await issuerInput.fill('https://example.com');
    await expect(issuerInput).toHaveValue('https://example.com');

    const clientIdInput = page.getByPlaceholder('Your client identifier');
    await clientIdInput.fill('my-client');
    await expect(clientIdInput).toHaveValue('my-client');
  });

  test('Scopes input is editable', async ({ page }) => {
    // Scopes input should have default value
    const scopesInput = page.locator('input[placeholder="openid profile email"]');
    await expect(scopesInput).toBeVisible();
    await scopesInput.fill('openid email');
    await expect(scopesInput).toHaveValue('openid email');
  });

  test('Redirect URI is read-only and auto-configured', async ({ page }) => {
    await expect(page.getByText('Redirect URI')).toBeVisible();
    await expect(page.getByText('auto-configured')).toBeVisible();

    // The redirect URI input should contain /callback
    const redirectInput = page.locator('input[readonly]');
    await expect(redirectInput).toBeVisible();
    const value = await redirectInput.inputValue();
    expect(value).toContain('/callback');
  });

  test('Token Inspector shows placeholder when no tokens', async ({ page }) => {
    await expect(page.getByText('Run the flow to see')).toBeVisible();
  });

  test('PKCE flow steps are shown', async ({ page }) => {
    await expect(page.getByText('Discover IDP Endpoints')).toBeVisible();
    await expect(page.getByText('Authenticate with IDP')).toBeVisible();
    await expect(page.getByText('Inspect Tokens')).toBeVisible();
  });

  test('M2M flow steps are shown when M2M selected', async ({ page }) => {
    await page.getByRole('button', { name: 'M2M' }).click();
    await expect(page.getByText('Discover IDP Endpoints')).toBeVisible();
    await expect(page.getByText('Request Access Token')).toBeVisible();
    await expect(page.getByText('Inspect Token')).toBeVisible();
  });

  test('Setup Guide is shown for providers', async ({ page }) => {
    // Custom OIDC should have a setup guide
    await expect(page.getByText('Setup Guide')).toBeVisible();
  });
});
