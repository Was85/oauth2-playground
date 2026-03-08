import { test, expect } from '@playwright/test';

const VALID_JWT =
  'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2V4YW1wbGUuY29tIiwic3ViIjoiMTIzNDU2Nzg5MCIsImF1ZCI6Im15LWFwcCIsImV4cCI6OTk5OTk5OTk5OSwiaWF0IjoxNjE2MjM5MDIyLCJuYW1lIjoiVGVzdCBVc2VyIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIn0.invalid-signature';

test.describe('CodeBlock copy button', () => {
  test('copy button appears on hover and changes to Copied! when clicked', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/decoder');

    const textarea = page.locator('textarea');
    await textarea.fill(VALID_JWT);

    // Wait for decoded output to appear (Header section CodeBlock)
    await expect(page.getByText('Header').first()).toBeVisible();

    // The copy button is inside a CodeBlock with copyable prop
    // It starts with opacity-0 and becomes visible on group hover
    const codeBlockGroup = page.locator('.group').first();
    const copyButton = codeBlockGroup.getByRole('button', { name: 'Copy' });

    // Hover over the code block to reveal the copy button
    await codeBlockGroup.hover();
    await expect(copyButton).toBeVisible();

    // Click copy button
    await copyButton.click();

    // Button text should change to "Copied!"
    await expect(codeBlockGroup.getByRole('button', { name: 'Copied!' })).toBeVisible();
  });
});

test.describe('Card collapsible behavior', () => {
  test('Setup Guide card toggles content on click', async ({ page }) => {
    await page.goto('/');

    // The Setup Guide card title should be visible
    const setupGuideTitle = page.getByText('Setup Guide');
    await expect(setupGuideTitle).toBeVisible();

    // Default is collapsed (defaultOpen=false), so content should be hidden
    // The collapse indicator should show down arrow (closed)
    await expect(page.locator('text=▼').first()).toBeVisible();

    // Numbered steps should NOT be visible when collapsed
    await expect(page.locator('.text-accent.font-bold:text("1.")')).not.toBeVisible();

    // Click to expand
    await setupGuideTitle.click();

    // Now content should be visible - numbered steps appear
    await expect(page.locator('.text-accent.font-bold').filter({ hasText: '1.' }).first()).toBeVisible();
    await expect(page.locator('.text-accent.font-bold').filter({ hasText: '2.' }).first()).toBeVisible();

    // The collapse indicator should show up arrow (open)
    await expect(page.locator('text=▲').first()).toBeVisible();

    // Click again to collapse
    await setupGuideTitle.click();

    // Content should be hidden again
    await expect(page.locator('.text-accent.font-bold').filter({ hasText: '1.' })).not.toBeVisible();

    // Indicator back to down arrow
    await expect(page.locator('text=▼').first()).toBeVisible();
  });
});

test.describe('Pill component active state', () => {
  test('flow pills toggle active styling on click', async ({ page }) => {
    await page.goto('/');

    const pkcePill = page.getByRole('button', { name: 'PKCE' });
    const m2mPill = page.getByRole('button', { name: 'M2M' });

    // PKCE should have active styling (bg-accent class)
    await expect(pkcePill).toHaveClass(/bg-accent/);
    // M2M should NOT have active styling
    await expect(m2mPill).not.toHaveClass(/bg-accent\s/);
    await expect(m2mPill).toHaveClass(/bg-transparent/);

    // Click M2M - it becomes active
    await m2mPill.click();
    await expect(m2mPill).toHaveClass(/bg-accent/);
    await expect(pkcePill).toHaveClass(/bg-transparent/);

    // Click PKCE - it becomes active again
    await pkcePill.click();
    await expect(pkcePill).toHaveClass(/bg-accent/);
    await expect(m2mPill).toHaveClass(/bg-transparent/);
  });
});

test.describe('StatusBadge rendering in FlowStepper', () => {
  test('flow steps show Run buttons and first step is enabled', async ({ page }) => {
    await page.goto('/');

    // Flow steps should show "Run →" buttons for runnable steps
    const runButtons = page.getByRole('button', { name: /Run/ }).filter({ hasNotText: /Reset/ });
    await expect(runButtons.first()).toBeVisible();

    // The first Run button (Discover IDP Endpoints) should be enabled
    // Step 1 can always run because i===0 means prevDone is true
    const firstRunButton = runButtons.first();
    await expect(firstRunButton).toBeEnabled();

    // The second Run button should be disabled (previous step not done)
    const secondRunButton = runButtons.nth(1);
    await expect(secondRunButton).toBeDisabled();
  });
});

test.describe('Input password type for sensitive fields', () => {
  test('Client Secret field uses password input type', async ({ page }) => {
    await page.goto('/');

    // Custom OIDC is the default provider and has a Client Secret field marked as sensitive
    const clientSecretLabel = page.getByText('Client Secret');
    await expect(clientSecretLabel).toBeVisible();

    // The input should have type="password" because the field is sensitive
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();

    // Fill a value and verify it renders as a password field (masked)
    await passwordInput.fill('my-secret-value');
    await expect(passwordInput).toHaveValue('my-secret-value');
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });
});

test.describe('Tag component colors on DecoderPage', () => {
  test('Valid JWT and algorithm tags appear after decoding', async ({ page }) => {
    await page.goto('/decoder');

    const textarea = page.locator('textarea');
    await textarea.fill(VALID_JWT);

    // "Valid JWT" tag should appear with success color
    const validTag = page.getByText('Valid JWT');
    await expect(validTag).toBeVisible();
    await expect(validTag).toHaveClass(/text-success/);

    // "RS256" algorithm tag should appear
    const algoTag = page.getByText('RS256', { exact: true }).first();
    await expect(algoTag).toBeVisible();
    await expect(algoTag).toHaveClass(/text-muted/);
  });
});

test.describe('Provider button descriptions', () => {
  test('provider buttons show both name and description text', async ({ page }) => {
    await page.goto('/');

    // Microsoft Entra ID description
    await expect(page.getByText('Azure Active Directory / Microsoft Identity Platform')).toBeVisible();

    // Keycloak description
    await expect(page.getByText('Open-source Identity and Access Management')).toBeVisible();

    // Verify other provider descriptions are present too
    await expect(page.getByText('Auth0 by Okta')).toBeVisible();
    await expect(page.getByText('Okta Identity Platform')).toBeVisible();
    await expect(page.getByText('Google Identity Platform')).toBeVisible();
    await expect(page.getByText('Any OpenID Connect-compliant provider')).toBeVisible();
  });
});

test.describe('Export page code generation with M2M', () => {
  test('Node.js M2M export generates code with client_secret reference', async ({ page }) => {
    await page.goto('/export');

    // Select Node.js + Express stack
    const nodeButton = page.getByRole('button', { name: /Node\.js/ });
    await nodeButton.click();

    // Select M2M flow
    const m2mPill = page.getByRole('button', { name: 'M2M' });
    await m2mPill.click();

    // Fill issuer URL
    const issuerInput = page.getByPlaceholder('https://accounts.google.com');
    await issuerInput.fill('https://example.com');

    // Fill client ID
    const clientIdInput = page.getByPlaceholder('your-client-id');
    await clientIdInput.fill('my-client-id');

    // Generated code should appear and include client_secret reference
    const codeBlock = page.locator('pre');
    await expect(codeBlock).toBeVisible();
    await expect(codeBlock).toContainText('client_secret');
    await expect(codeBlock).toContainText('CLIENT_SECRET');
    await expect(codeBlock).toContainText('client_credentials');

    // The filename should indicate server.js for Node.js
    await expect(page.getByText('server.js', { exact: true }).first()).toBeVisible();
  });
});
