import { test, expect } from '@playwright/test';

const MOCK_DISCOVERY_RESPONSE = {
  issuer: 'http://localhost:8080/realms/test',
  authorization_endpoint: 'http://localhost:8080/realms/test/protocol/openid-connect/auth',
  token_endpoint: 'http://localhost:8080/realms/test/protocol/openid-connect/token',
  userinfo_endpoint: 'http://localhost:8080/realms/test/protocol/openid-connect/userinfo',
  jwks_uri: 'http://localhost:8080/realms/test/protocol/openid-connect/certs',
  end_session_endpoint: 'http://localhost:8080/realms/test/protocol/openid-connect/logout',
  grant_types_supported: ['authorization_code', 'client_credentials'],
  response_types_supported: ['code'],
  subject_types_supported: ['public'],
  id_token_signing_alg_values_supported: ['RS256'],
  code_challenge_methods_supported: ['S256'],
  scopes_supported: ['openid', 'profile', 'email'],
};

test.describe.serial('PKCE Flow with Keycloak', () => {
  /** @type {import('@playwright/test').Page} */
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();

    // Mock the OIDC discovery endpoint so tests don't require a running Keycloak server
    await page.route(
      '**/realms/test/.well-known/openid-configuration',
      (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_DISCOVERY_RESPONSE),
        })
    );
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('select Keycloak and fill in config', async () => {
    await page.goto('/');

    // Select Keycloak provider
    await page.getByRole('button', { name: /Keycloak/ }).click();

    // Fill in Keycloak config
    await page.getByPlaceholder('e.g. http://localhost:8080').fill('http://localhost:8080');
    await page.getByPlaceholder('e.g. master').fill('test');
    await page.getByPlaceholder('From Keycloak admin console').fill('oauth-devtools');

    // Verify fields are filled
    await expect(page.getByPlaceholder('e.g. http://localhost:8080')).toHaveValue('http://localhost:8080');
    await expect(page.getByPlaceholder('e.g. master')).toHaveValue('test');
    await expect(page.getByPlaceholder('From Keycloak admin console')).toHaveValue('oauth-devtools');
  });

  test('run OIDC Discovery and verify endpoints', async () => {
    // Click the first Run button (discovery step)
    const runButton = page.getByRole('button', { name: /Run/ }).first();
    await expect(runButton).toBeVisible({ timeout: 5000 });
    await runButton.click();

    // Wait for discovery to complete - endpoints should appear
    await expect(page.getByText('Discovered Endpoints')).toBeVisible({ timeout: 10000 });

    // Click to expand the endpoints card (collapsed by default)
    await page.getByText('Discovered Endpoints').click();

    // Verify endpoint labels are visible
    await expect(page.getByText('Authorization').first()).toBeVisible();
    await expect(page.getByText('UserInfo', { exact: true })).toBeVisible();
    await expect(page.getByText('JWKS', { exact: true })).toBeVisible();
  });

  // The remaining tests require a running Keycloak server on localhost:8080
  // to handle the full OAuth redirect login flow, which cannot be mocked.

  test.skip('run PKCE step and redirect to Keycloak login', async () => {
    // Requires a running Keycloak server on localhost:8080

    // Click the second Run button (PKCE / Authenticate step)
    const runButtons = page.getByRole('button', { name: /Run/ });
    await runButtons.first().click();

    // Should redirect to Keycloak login page
    await page.waitForURL(/localhost:8080/, { timeout: 15000 });

    // Keycloak login page should be showing
    await expect(page.locator('#username, #kc-form-login, input[name="username"]').first()).toBeVisible({ timeout: 10000 });
  });

  test.skip('login with testuser and verify callback page', async () => {
    // Requires a running Keycloak server on localhost:8080

    // Fill in credentials on Keycloak login page
    await page.locator('#username, input[name="username"]').first().fill('testuser');
    await page.locator('#password, input[name="password"]').first().fill('testpass123');

    // Submit login form
    await page.locator('#kc-login, input[type="submit"], button[type="submit"]').first().click();

    // Should redirect to callback page, then show success
    await page.waitForURL(/\/callback/, { timeout: 15000 });

    await expect(page.getByText('Authentication Successful')).toBeVisible({ timeout: 15000 });
  });

  test.skip('verify redirect back to FlowPage with tokens', async () => {
    // Requires a running Keycloak server on localhost:8080

    // Wait for auto-redirect back to FlowPage
    await page.waitForURL(/\/\?from=callback/, { timeout: 10000 });

    // Tokens should be visible in the Token Inspector
    await expect(page.getByText('Token Inspector')).toBeVisible();

    // Wait for token tabs to appear (access_token and/or id_token)
    await expect(page.getByRole('button', { name: 'access_token' })).toBeVisible({ timeout: 5000 });
  });

  test.skip('Token Inspector shows access_token and id_token tabs', async () => {
    // Requires a running Keycloak server on localhost:8080

    await expect(page.getByRole('button', { name: 'access_token' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'id_token' })).toBeVisible();
  });

  test.skip('JWT header and payload are decoded and displayed', async () => {
    // Requires a running Keycloak server on localhost:8080

    // Click on access_token tab (may already be active)
    await page.getByRole('button', { name: 'access_token' }).click();

    // Should show JWT tag
    await expect(page.getByText('JWT')).toBeVisible();

    // Should show Raw Token section
    await expect(page.getByText('Raw Token')).toBeVisible();

    // Should show Header section
    await expect(page.getByText('Header').first()).toBeVisible();

    // Should show Payload section
    await expect(page.getByText('Payload').first()).toBeVisible();

    // Decoded payload should contain standard claims
    await expect(page.getByText('iss').first()).toBeVisible();
    await expect(page.getByText('sub').first()).toBeVisible();
  });
});
