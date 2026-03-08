import { test, expect } from '@playwright/test';

// A valid JWT with standard claims (expires far in the future)
const VALID_JWT = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2V4YW1wbGUuY29tIiwic3ViIjoiMTIzNDU2Nzg5MCIsImF1ZCI6Im15LWFwcCIsImV4cCI6OTk5OTk5OTk5OSwiaWF0IjoxNjE2MjM5MDIyLCJuYW1lIjoiVGVzdCBVc2VyIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIn0.invalid-signature';

const INVALID_TOKEN = 'this-is-not-a-jwt-at-all';

test.describe('JWT Decoder Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/decoder');
  });

  test('page renders with input area and Decoded panel', async ({ page }) => {
    await expect(page.locator('h1').filter({ hasText: 'JWT Decoder' })).toBeVisible();
    await expect(page.getByText('Paste a JWT to decode, inspect claims, and verify signatures')).toBeVisible();
    await expect(page.getByText('Decoded')).toBeVisible();
    await expect(page.getByPlaceholder(/eyJhbGci/)).toBeVisible();
    await expect(page.getByText('Paste a JWT on the left to decode it.')).toBeVisible();
  });

  test('pasting a valid JWT shows decoded header and payload', async ({ page }) => {
    const textarea = page.getByPlaceholder(/eyJhbGci/);
    await textarea.fill(VALID_JWT);

    // Header section should appear
    await expect(page.getByText('Header').first()).toBeVisible();

    // Payload section should appear with claim count
    await expect(page.getByText(/Payload.*claims/)).toBeVisible();

    // Decoded header should show algorithm
    await expect(page.getByText('"RS256"').first()).toBeVisible();

    // Decoded payload should show claims
    await expect(page.getByText('https://example.com').first()).toBeVisible();
    await expect(page.getByText('1234567890').first()).toBeVisible();
    await expect(page.getByText('my-app').first()).toBeVisible();
    await expect(page.getByText('Test User').first()).toBeVisible();
    await expect(page.getByText('test@example.com').first()).toBeVisible();
  });

  test('valid JWT shows colored token display', async ({ page }) => {
    const textarea = page.getByPlaceholder(/eyJhbGci/);
    await textarea.fill(VALID_JWT);

    // Color legend should appear
    await expect(page.getByText('Header', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Payload', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Signature', { exact: false }).first()).toBeVisible();
  });

  test('valid JWT shows Valid JWT tag', async ({ page }) => {
    const textarea = page.getByPlaceholder(/eyJhbGci/);
    await textarea.fill(VALID_JWT);
    await expect(page.getByText('Valid JWT')).toBeVisible();
  });

  test('invalid string shows Not a valid JWT error', async ({ page }) => {
    const textarea = page.getByPlaceholder(/eyJhbGci/);
    await textarea.fill(INVALID_TOKEN);
    await expect(page.getByText('Not a valid JWT')).toBeVisible();
    await expect(page.getByText('A JWT must have 3 base64url-encoded parts separated by dots')).toBeVisible();
  });

  test('claim descriptions appear for standard claims', async ({ page }) => {
    const textarea = page.getByPlaceholder(/eyJhbGci/);
    await textarea.fill(VALID_JWT);

    // Standard claim descriptions
    await expect(page.getByText('Issuer — who issued this token')).toBeVisible();
    await expect(page.getByText('Subject — unique user identifier')).toBeVisible();
    await expect(page.getByText('Audience — intended recipient(s)')).toBeVisible();
    await expect(page.getByText('Expiration Time — token expires after this')).toBeVisible();
    await expect(page.getByText('Issued At — when the token was created')).toBeVisible();
    await expect(page.getByText('Full Name')).toBeVisible();
    await expect(page.getByText('Email Address')).toBeVisible();
  });

  test('JWKS URI input and Verify button appear when valid JWT is pasted', async ({ page }) => {
    const textarea = page.getByPlaceholder(/eyJhbGci/);
    await textarea.fill(VALID_JWT);

    await expect(page.getByText('Signature Verification')).toBeVisible();
    await expect(page.getByPlaceholder(/jwks\.json/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Verify' })).toBeVisible();
  });

  test('JWKS URI input and Verify button do NOT appear for invalid token', async ({ page }) => {
    const textarea = page.getByPlaceholder(/eyJhbGci/);
    await textarea.fill(INVALID_TOKEN);
    await expect(page.getByText('Signature Verification')).not.toBeVisible();
  });

  test('Clear button appears when token is entered and clears the input', async ({ page }) => {
    const textarea = page.getByPlaceholder(/eyJhbGci/);
    await textarea.fill(VALID_JWT);

    const clearButton = page.getByRole('button', { name: 'Clear' });
    await expect(clearButton).toBeVisible();
    await clearButton.click();

    // Input should be cleared, decoded panel should show placeholder
    await expect(page.getByText('Paste a JWT on the left to decode it.')).toBeVisible();
  });

  test('algorithm tag is shown for valid JWT', async ({ page }) => {
    const textarea = page.getByPlaceholder(/eyJhbGci/);
    await textarea.fill(VALID_JWT);
    await expect(page.getByText('RS256', { exact: true }).first()).toBeVisible();
  });
});
