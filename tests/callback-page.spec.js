import { test, expect } from '@playwright/test';

test.describe('CallbackPage', () => {
  test('error query param shows error message', async ({ page }) => {
    await page.goto('/callback?error=access_denied');

    await expect(page.getByText('Authentication Failed')).toBeVisible();
    await expect(page.getByText('Authorization error: access_denied')).toBeVisible();
    await expect(page.getByText('❌')).toBeVisible();
  });

  test('error with error_description shows both', async ({ page }) => {
    await page.goto(
      '/callback?error=access_denied&error_description=User%20cancelled%20the%20login'
    );

    await expect(page.getByText('Authentication Failed')).toBeVisible();
    await expect(
      page.getByText('Authorization error: access_denied — User cancelled the login')
    ).toBeVisible();
  });

  test('no code param shows "No authorization code found"', async ({ page }) => {
    await page.goto('/callback');

    await expect(page.getByText('Authentication Failed')).toBeVisible();
    await expect(
      page.getByText('No authorization code found in callback URL.')
    ).toBeVisible();
    await expect(page.getByText('❌')).toBeVisible();
  });

  test('no flow state in sessionStorage shows "No flow state found"', async ({ page }) => {
    await page.goto('/callback?code=test_code&state=test_state');

    await expect(page.getByText('Authentication Failed')).toBeVisible();
    await expect(
      page.getByText('No flow state found. The flow may have been interrupted.')
    ).toBeVisible();
  });

  test('"Back to Flow Page" button appears on error and navigates to /', async ({ page }) => {
    await page.goto('/callback?error=server_error');

    const backButton = page.getByRole('button', { name: 'Back to Flow Page' });
    await expect(backButton).toBeVisible();

    await backButton.click();
    await expect(page).toHaveURL('/');
  });

  test('processing state shows loading animation dots', async ({ page }) => {
    // Intercept the token endpoint BEFORE navigation so the request stays pending.
    // Use a URL that Playwright can intercept (localhost:99999 would fail at the network
    // level before Playwright's route handler can catch it).
    const tokenUrl = 'http://localhost:5174/mock-token-endpoint';
    await page.route(tokenUrl, () => {
      // Never fulfill or abort — keeps the request pending so status stays 'processing'
    });

    // Set up flow state so the component stays in processing status
    await page.goto('/');
    await page.evaluate((url) => {
      sessionStorage.setItem(
        'oauth-devtools:flow-state',
        JSON.stringify({
          state: 'matching_state',
          codeVerifier: 'test_verifier',
          config: { redirectUri: 'http://localhost:5174/callback', clientId: 'test' },
          discovery: { tokenEndpoint: url },
        })
      );
    }, tokenUrl);

    await page.goto('/callback?code=test_code&state=matching_state');

    await expect(page.getByText('Processing Callback...')).toBeVisible();
    await expect(page.getByText('⏳')).toBeVisible();

    // Three animation dots rendered as divs with animate-pulse class
    const dots = page.locator('.animate-pulse');
    await expect(dots).toHaveCount(3);
  });
});
