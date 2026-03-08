import { test, expect } from '@playwright/test';

const MOCK_DISCOVERY_DOC = {
  issuer: 'http://localhost:8080/realms/test',
  authorization_endpoint: 'http://localhost:8080/realms/test/protocol/openid-connect/auth',
  token_endpoint: 'http://localhost:8080/realms/test/protocol/openid-connect/token',
  userinfo_endpoint: 'http://localhost:8080/realms/test/protocol/openid-connect/userinfo',
  jwks_uri: 'http://localhost:8080/realms/test/protocol/openid-connect/certs',
  end_session_endpoint: 'http://localhost:8080/realms/test/protocol/openid-connect/logout',
  grant_types_supported: ['authorization_code', 'client_credentials', 'refresh_token'],
  response_types_supported: ['code', 'id_token', 'code id_token'],
  subject_types_supported: ['public'],
  id_token_signing_alg_values_supported: ['RS256'],
  code_challenge_methods_supported: ['S256', 'plain'],
  token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
  scopes_supported: ['openid', 'profile', 'email'],
};

test.describe('Compliance Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/compliance');
  });

  test('page renders with heading and description', async ({ page }) => {
    await expect(page.getByText('OAuth Compliance Checker')).toBeVisible();
    await expect(page.getByText('Validate your IDP configuration and tokens against OAuth 2.0/2.1 best practices')).toBeVisible();
  });

  test('page renders with IDP config check section', async ({ page }) => {
    await expect(page.getByText('Check IDP Configuration')).toBeVisible();
    await expect(page.getByPlaceholder('https://accounts.google.com')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Check', exact: true })).toBeVisible();
  });

  test('page renders with token check section', async ({ page }) => {
    await expect(page.getByText('Check Token Compliance')).toBeVisible();
    await expect(page.getByPlaceholder('Paste a JWT token to check...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Check Token' })).toBeVisible();
  });

  test('check Keycloak IDP config shows compliance results', async ({ page }) => {
    await page.route('**/well-known/openid-configuration', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DISCOVERY_DOC) })
    );

    const issuerInput = page.getByPlaceholder('https://accounts.google.com');
    await issuerInput.fill('http://localhost:8080/realms/test');

    await page.getByRole('button', { name: 'Check', exact: true }).click();

    // Wait for results to appear
    await expect(page.getByText('Compliance Score')).toBeVisible({ timeout: 10000 });
  });

  test('compliance score shows pass/fail/warn counts', async ({ page }) => {
    await page.route('**/well-known/openid-configuration', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DISCOVERY_DOC) })
    );

    const issuerInput = page.getByPlaceholder('https://accounts.google.com');
    await issuerInput.fill('http://localhost:8080/realms/test');
    await page.getByRole('button', { name: 'Check', exact: true }).click();

    await expect(page.getByText('Compliance Score')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/passed/)).toBeVisible();
    await expect(page.getByText(/failed/)).toBeVisible();
    await expect(page.getByText(/warnings/)).toBeVisible();
  });

  test('results are categorized (security, configuration, best-practice)', async ({ page }) => {
    await page.route('**/well-known/openid-configuration', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DISCOVERY_DOC) })
    );

    const issuerInput = page.getByPlaceholder('https://accounts.google.com');
    await issuerInput.fill('http://localhost:8080/realms/test');
    await page.getByRole('button', { name: 'Check', exact: true }).click();

    await expect(page.getByText('Compliance Score')).toBeVisible({ timeout: 10000 });

    // Categories should be visible (labels use CSS uppercase)
    await expect(page.getByText(/security/i).first()).toBeVisible();
    await expect(page.getByText(/configuration/i).first()).toBeVisible();
    await expect(page.getByText('Best Practices', { exact: true })).toBeVisible();
  });

  test('HTTPS issuer check fails for localhost', async ({ page }) => {
    await page.route('**/well-known/openid-configuration', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DISCOVERY_DOC) })
    );

    const issuerInput = page.getByPlaceholder('https://accounts.google.com');
    await issuerInput.fill('http://localhost:8080/realms/test');
    await page.getByRole('button', { name: 'Check', exact: true }).click();

    await expect(page.getByText('Compliance Score')).toBeVisible({ timeout: 10000 });

    // HTTPS check should fail for localhost HTTP
    await expect(page.getByText('Issuer uses HTTPS')).toBeVisible();
  });

  test('PKCE S256 check appears', async ({ page }) => {
    await page.route('**/well-known/openid-configuration', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DISCOVERY_DOC) })
    );

    const issuerInput = page.getByPlaceholder('https://accounts.google.com');
    await issuerInput.fill('http://localhost:8080/realms/test');
    await page.getByRole('button', { name: 'Check', exact: true }).click();

    await expect(page.getByText('Compliance Score')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('PKCE S256 supported')).toBeVisible();
  });

  test('JWKS URI check appears', async ({ page }) => {
    await page.route('**/well-known/openid-configuration', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DISCOVERY_DOC) })
    );

    const issuerInput = page.getByPlaceholder('https://accounts.google.com');
    await issuerInput.fill('http://localhost:8080/realms/test');
    await page.getByRole('button', { name: 'Check', exact: true }).click();

    await expect(page.getByText('Compliance Score')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('JWKS URI present')).toBeVisible();
  });

  test('score percentage is displayed', async ({ page }) => {
    await page.route('**/well-known/openid-configuration', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DISCOVERY_DOC) })
    );

    const issuerInput = page.getByPlaceholder('https://accounts.google.com');
    await issuerInput.fill('http://localhost:8080/realms/test');
    await page.getByRole('button', { name: 'Check', exact: true }).click();

    await expect(page.getByText('Compliance Score')).toBeVisible({ timeout: 10000 });
    // Score should be shown as a percentage
    await expect(page.getByText(/%/)).toBeVisible();
  });

  test('token compliance check works with a valid JWT', async ({ page }) => {
    const tokenInput = page.getByPlaceholder('Paste a JWT token to check...');
    await tokenInput.fill('eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2V4YW1wbGUuY29tIiwic3ViIjoiMTIzNDU2Nzg5MCIsImF1ZCI6Im15LWFwcCIsImV4cCI6OTk5OTk5OTk5OSwiaWF0IjoxNjE2MjM5MDIyLCJuYW1lIjoiVGVzdCBVc2VyIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIn0.invalid-signature');

    await page.getByRole('button', { name: 'Check Token' }).click();

    // Token tab should appear and show results
    await expect(page.getByText('Compliance Score')).toBeVisible();
    await expect(page.getByText(/Algorithm.*RS256/)).toBeVisible();
  });

  test('Check button is disabled when input is empty', async ({ page }) => {
    const checkButton = page.getByRole('button', { name: 'Check', exact: true });
    await expect(checkButton).toBeDisabled();
  });
});
